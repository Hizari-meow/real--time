import * as Y from 'yjs';
import crypto from 'node:crypto';
import {
  SNAPSHOT_IDLE_TIMEOUT_MS,
  SNAPSHOT_MUTATION_THRESHOLD,
} from '@collab/shared';
import { getPrismaClient } from './db.js';
import { S3StorageService } from './s3-client.js';

export class SnapshotManager {
  private docId: string;
  private doc: Y.Doc;
  private mutationCount = 0;
  private idleTimer: NodeJS.Timeout | null = null;
  private isCommitting = false;
  private lastAuthorId: string | null = null;
  private prisma = getPrismaClient();
  private s3 = S3StorageService.getInstance();

  constructor(docId: string, doc: Y.Doc) {
    this.docId = docId;
    this.doc = doc;
  }

  /**
   * Tracks an incoming mutation and evaluates debounce conditions
   */
  public onMutation(authorId?: string): void {
    this.mutationCount++;
    if (authorId) {
      this.lastAuthorId = authorId;
    }

    // Condition 1: Exceeded 100 aggregated mutations
    if (this.mutationCount >= SNAPSHOT_MUTATION_THRESHOLD) {
      if (this.idleTimer) {
        clearTimeout(this.idleTimer);
        this.idleTimer = null;
      }
      this.commitSnapshot(`Aggregated ${SNAPSHOT_MUTATION_THRESHOLD} mutations threshold`).catch(
        (err) => console.error(`[SnapshotManager][${this.docId}] Threshold commit failed:`, err)
      );
      return;
    }

    // Condition 2: Reset 5-second inactivity timer
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    this.idleTimer = setTimeout(() => {
      this.idleTimer = null;
      this.commitSnapshot('5-second inactivity timeout').catch((err) =>
        console.error(`[SnapshotManager][${this.docId}] Idle commit failed:`, err)
      );
    }, SNAPSHOT_IDLE_TIMEOUT_MS);
  }

  /**
   * Flushes any uncommitted state immediately (e.g. on client disconnection / room eviction)
   */
  public async flushImmediately(reason = 'Immediate eviction flush'): Promise<void> {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    if (this.mutationCount > 0) {
      try {
        await this.commitSnapshot(reason);
      } catch (err) {
        console.error(`[SnapshotManager][${this.docId}] Flush failed:`, err);
      }
    }
  }

  /**
   * Executes atomic snapshot persistence: S3 binary write + PostgreSQL transaction
   */
  public async commitSnapshot(reason: string): Promise<void> {
    if (this.isCommitting || this.mutationCount === 0) {
      return;
    }

    this.isCommitting = true;
    const aggregatedCount = this.mutationCount;
    this.mutationCount = 0;

    try {
      // 1. Encode binary CRDT state vector
      const binaryState = Y.encodeStateAsUpdate(this.doc);
      const byteSize = binaryState.byteLength;
      const checksum = crypto.createHash('sha256').update(binaryState).digest('hex');

      // Skip document creation for internal chat rooms or kanban sync rooms
      if (this.docId.startsWith('zalo_room_') || this.docId.startsWith('workspace_kanban_')) {
        return;
      }

      // 2. Resolve document record in PostgreSQL (outside transaction)
      let document = await this.prisma.document.findUnique({
        where: { id: this.docId },
      });

      if (!document) {
        const systemUser = await this.prisma.user.upsert({
          where: { email: 'system@collab.local' },
          update: {},
          create: {
            email: 'system@collab.local',
            name: 'System Orchestrator',
          },
        });

        let initialTitle = `Document ${this.docId.slice(0, 8)}`;
        if (this.docId === 'doc_rfc_consensus') initialTitle = 'Báo Cáo Kiến Trúc Đồng Thuận Phân Tán CRDT v4';
        else if (this.docId === 'doc_sop_01') initialTitle = 'Quy Trình Vận Hành Tiêu Chuẩn Hệ Thống (SOP-01)';
        else if (this.docId === 'sheet_fin_q4') initialTitle = 'Bảng Tính Dự Báo Tài Chính & Doanh Thu Q4-2026';
        else if (this.docId === 'sheet_budget_2027') initialTitle = 'Bảng Kế Hoạch Ngân Sách Dự Án Năm 2027';
        else if (this.docId === 'mockup_ui_canvas' || this.docId === 'workspace_whiteboard_mockup_ui_canvas') initialTitle = 'Bản Vẽ Thiết Kế UI Workspace & Slide Trang Chủ';
        else if (this.docId === 'workspace_whiteboard_canvas_v3' || this.docId === 'open_brainstorm') initialTitle = 'Bảng Trắng Brainstorm Sơ Đồ Hệ Thống';

        document = await this.prisma.document.upsert({
          where: { id: this.docId },
          update: {},
          create: {
            id: this.docId,
            title: initialTitle,
            ownerId: systemUser.id,
            currentVersion: 0,
          },
        });
      }

      // 3. Resolve author foreign key if specified
      let resolvedAuthorId: string | null = null;
      if (this.lastAuthorId) {
        try {
          const user = await this.prisma.user.upsert({
            where: { id: this.lastAuthorId },
            update: {},
            create: {
              id: this.lastAuthorId,
              name: `Collaborator ${this.lastAuthorId.slice(0, 6)}`,
              email: `${this.lastAuthorId}@collab.local`,
            },
          });
          resolvedAuthorId = user.id;
        } catch {
          resolvedAuthorId = null;
        }
      }

      // 4. Atomic PostgreSQL transaction with row-locking increment to prevent race conditions across nodes
      await this.prisma.$transaction(async (tx) => {
        const updatedDoc = await tx.document.update({
          where: { id: this.docId },
          data: {
            currentVersion: { increment: 1 },
            updatedAt: new Date(),
          },
          select: { currentVersion: true },
        });

        const nextVersion = updatedDoc.currentVersion;
        const s3Key = `snapshots/${this.docId}/doc_${this.docId}_v${nextVersion}_${Date.now()}.bin`;

        // 5. Write binary blob to MinIO / S3
        await this.s3.saveSnapshot(s3Key, binaryState);

        const snapshot = await tx.documentSnapshot.create({
          data: {
            documentId: this.docId,
            version: nextVersion,
            s3Key,
            byteSize,
            checksum,
            mutationCount: aggregatedCount,
          },
        });

        await tx.documentHistory.create({
          data: {
            documentId: this.docId,
            version: nextVersion,
            authorId: resolvedAuthorId,
            snapshotId: snapshot.id,
            changeSummary: reason,
          },
        });

        await tx.document.update({
          where: { id: this.docId },
          data: { latestS3Key: s3Key },
        });

        console.log(
          `[SnapshotManager][${this.docId}] Committed v${nextVersion} (${byteSize} bytes, ${aggregatedCount} mutations, key: ${s3Key})`
        );
      });
    } catch (err) {
      // Restore mutation count on failure so next cycle retries
      this.mutationCount += aggregatedCount;
      console.error(`[SnapshotManager][${this.docId}] Snapshot persistence failed:`, err);
    } finally {
      this.isCommitting = false;
    }
  }

  public getMutationCount(): number {
    return this.mutationCount;
  }

  public destroy(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }
}
