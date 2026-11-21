import { Readable, PassThrough } from 'node:stream';
import crypto from 'node:crypto';
import { getPrismaClient } from '../../storage/db.js';
import { S3StorageService } from '../../storage/s3-client.js';
import { StorageQuotaService } from './StorageQuotaService.js';
import { publishDomainEvent } from '../events/event-system.js';

export interface StreamUploadInput {
  orgId: string;
  name: string;
  fileStream: Readable;
  mimeType?: string;
  category?: string;
  folderId?: string | null;
  ownerId?: string | null;
  ownerName?: string;
  maxBytes?: number;
  estimatedBytes?: number;
}

export class FileStreamService {
  private static instance: FileStreamService;

  public static getInstance(): FileStreamService {
    if (!FileStreamService.instance) {
      FileStreamService.instance = new FileStreamService();
    }
    return FileStreamService.instance;
  }

  /**
   * Upload file by streaming directly to MinIO S3 while computing byteSize and SHA-256 on the fly.
   * Atomically reserves workspace quota before uploading and releases upon failure.
   * If PostgreSQL persistence fails, automatically cleans up the newly uploaded S3 object.
   */
  public async uploadStream(input: StreamUploadInput) {
    const s3 = S3StorageService.getInstance();
    const prisma = getPrismaClient();
    const quotaService = StorageQuotaService.getInstance();

    const fileId = crypto.randomUUID();
    const cleanName = (input.name || 'unnamed_file').trim();
    const s3Key = `orgs/${input.orgId}/files/${fileId}/${cleanName}`;
    const maxBytes = input.maxBytes || 50 * 1024 * 1024; // 50MB limit

    // 0. Pre-upload atomic quota check and reservation
    let currentReserved = Math.min(input.estimatedBytes || maxBytes, maxBytes);
    await quotaService.reserveQuota(fileId, input.orgId, currentReserved);

    let byteSize = 0;
    const hash = crypto.createHash('sha256');
    const passThrough = new PassThrough();
    let sizeExceeded = false;
    let quotaErrorMsg: string | null = null;

    // Background heartbeat to maintain reservation lease active for long-running streaming uploads
    const heartbeatTimer = setInterval(() => {
      quotaService.heartbeatReservation(fileId, input.orgId).catch((hErr: any) => {
        console.warn(`[FileStreamService] Heartbeat renewal notice for ${fileId}:`, hErr.message);
      });
    }, 60 * 1000); // Send heartbeat every 60s (lease is 10 minutes)

    let heartbeatStopped = false;
    const stopHeartbeat = () => {
      if (!heartbeatStopped) {
        heartbeatStopped = true;
        clearInterval(heartbeatTimer);
      }
    };

    input.fileStream.on('close', stopHeartbeat);
    input.fileStream.on('error', stopHeartbeat);
    passThrough.on('close', stopHeartbeat);
    passThrough.on('error', stopHeartbeat);

    input.fileStream.on('data', (chunk: Buffer) => {
      byteSize += chunk.length;
      if (byteSize > maxBytes) {
        sizeExceeded = true;
        input.fileStream.destroy(new Error(`Tệp vượt quá giới hạn cho phép (${maxBytes} bytes)`));
        passThrough.destroy(new Error(`Tệp vượt quá giới hạn`));
        stopHeartbeat();
        return;
      }

      if (byteSize > currentReserved) {
        const delta = byteSize - currentReserved;
        currentReserved = byteSize;
        quotaService.expandReservation(fileId, input.orgId, delta).catch((qErr: any) => {
          sizeExceeded = true;
          quotaErrorMsg = qErr.message;
          input.fileStream.destroy(qErr);
          passThrough.destroy(qErr);
          stopHeartbeat();
        });
      }

      hash.update(chunk);
    });

    input.fileStream.pipe(passThrough);

    const safeMimeType = input.mimeType || 'application/octet-stream';

    // 1. Upload binary stream to MinIO
    try {
      await s3.uploadStream(s3Key, passThrough, safeMimeType);
    } catch (err: any) {
      stopHeartbeat();
      quotaService.releaseReservation(fileId);
      if (quotaErrorMsg) {
        throw new Error(quotaErrorMsg);
      }
      if (sizeExceeded) {
        throw new Error(`Kích thước tệp vượt quá giới hạn cho phép (${Math.round(maxBytes / (1024 * 1024))}MB)`);
      }
      throw new Error(`Lỗi khi tải tệp lên MinIO S3: ${err.message}`);
    } finally {
      stopHeartbeat();
    }

    const sha256 = hash.digest('hex');

    // 2. Persist FileRecord in PostgreSQL with automatic S3 rollback and quota release on failure
    const initialVersion = {
      version: 1,
      s3Key,
      size: byteSize,
      sha256,
      updatedAt: new Date().toISOString(),
      updatedBy: input.ownerName || 'System',
      changeSummary: 'Phiên bản ban đầu tải lên qua multipart binary stream',
    };

    let record: any;
    try {
      record = await prisma.fileRecord.create({
        data: {
          id: fileId,
          orgId: input.orgId,
          folderId: input.folderId || null,
          ownerId: input.ownerId || null,
          name: cleanName,
          s3Key,
          byteSize,
          mimeType: safeMimeType,
          category: input.category || 'other',
          ownerName: input.ownerName || 'System',
          isStarred: false,
          isDeleted: false,
          versionsJson: JSON.stringify([initialVersion]),
          shareSettingsJson: JSON.stringify({
            linkAccess: 'organization',
            permission: 'viewer',
            allowDownload: true,
          }),
        },
      });

      // DB write succeeded: commit quota reservation into permanent record
      await quotaService.commitReservation(fileId);
    } catch (dbErr: any) {
      // ROLLBACK: Release reservation and delete newly created S3 object to prevent orphan objects!
      await quotaService.releaseReservation(fileId);
      console.warn(`[FileStreamService] DB persistence failed for file ${fileId}. Rolling back S3 object ${s3Key}:`, dbErr.message);
      try {
        await s3.deleteObject(s3Key);
        console.log(`[FileStreamService] Successfully rolled back orphaned S3 object ${s3Key}`);
      } catch (cleanupErr: any) {
        console.error(`[FileStreamService] CRITICAL: Failed to clean up orphaned S3 object ${s3Key}:`, cleanupErr);
      }
      throw new Error(`Lỗi khi lưu trữ thông tin tệp vào CSDL: ${dbErr.message}`);
    }

    // 3. Emit transactional domain event
    await publishDomainEvent({
      type: 'file.uploaded',
      orgId: input.orgId,
      actor: { type: 'user', id: input.ownerId || 'system', name: input.ownerName },
      resource: { type: 'file', id: record.id, name: record.name },
      data: {
        fileId: record.id,
        name: record.name,
        size: record.byteSize,
        category: record.category,
      },
    });

    return {
      id: record.id,
      orgId: record.orgId,
      name: record.name,
      key: record.s3Key,
      size: record.byteSize,
      mimeType: record.mimeType,
      category: record.category,
      folderId: record.folderId || undefined,
      ownerId: record.ownerId || undefined,
      ownerName: record.ownerName,
      isStarred: record.isStarred,
      isDeleted: record.isDeleted,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      url: `/api/files/${record.id}/download`,
      versions: [initialVersion],
      shareSettings: {
        linkAccess: 'organization',
        permission: 'viewer',
        allowDownload: true,
      },
    };
  }
}
