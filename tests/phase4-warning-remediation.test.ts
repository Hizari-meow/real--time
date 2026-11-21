import { test, describe, before, after, beforeEach } from 'node:test';
import * as assert from 'node:assert';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { createApp, AppInstance } from '../packages/server/src/server.js';
import { StorageQuotaService } from '../packages/server/src/core/files/StorageQuotaService.js';
import { FileService } from '../packages/server/src/core/files/FileService.js';
import { OrphanStorageReaper } from '../packages/server/src/core/files/OrphanStorageReaper.js';
import { S3StorageService } from '../packages/server/src/storage/s3-client.js';

describe('PHASE 4: Warning Remediation & Reliability Verification Suite', () => {
  let appInstance: AppInstance;
  let serverPort: number;
  let baseUrl: string;
  let prisma: PrismaClient;
  let quotaService: StorageQuotaService;
  let fileService: FileService;
  let s3: S3StorageService;

  let owner: { id: string; email: string; name: string; token: string; orgId: string };
  let orgB: { id: string; email: string; name: string; token: string; orgId: string };

  before(async () => {
    serverPort = 4099;
    process.env.PORT = String(serverPort);
    baseUrl = `http://localhost:${serverPort}`;

    prisma = new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.DATABASE_URL ||
            'postgresql://collab_user:collab_secret@localhost:5434/collab_db?schema=public',
        },
      },
    });

    quotaService = StorageQuotaService.getInstance();
    fileService = FileService.getInstance();
    s3 = S3StorageService.getInstance();

    appInstance = await createApp();
    await new Promise<void>((resolve) => {
      appInstance.httpServer.listen(serverPort, () => resolve());
    });

    // Register Workspace Alpha
    const emailA = `warn_owner_a_${Date.now()}@collab.local`;
    const resA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailA,
        password: 'Password123!',
        name: 'Warning Owner Alpha',
        orgName: 'Warning Remediation Org Alpha',
      }),
    });
    const dataA = await resA.json();
    assert.strictEqual(dataA.success, true);
    owner = {
      id: dataA.data.user.userId || dataA.data.user.id,
      email: dataA.data.user.email,
      name: dataA.data.user.name,
      token: dataA.data.tokens.accessToken,
      orgId: dataA.data.workspaces[0].orgId,
    };

    // Register Workspace Beta (for cross-tenant checks)
    const emailB = `warn_owner_b_${Date.now()}@collab.local`;
    const resB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailB,
        password: 'Password123!',
        name: 'Warning Owner Beta',
        orgName: 'Warning Remediation Org Beta',
      }),
    });
    const dataB = await resB.json();
    assert.strictEqual(dataB.success, true);
    orgB = {
      id: dataB.data.user.userId || dataB.data.user.id,
      email: dataB.data.user.email,
      name: dataB.data.user.name,
      token: dataB.data.tokens.accessToken,
      orgId: dataB.data.workspaces[0].orgId,
    };
  });

  after(async () => {
    if (appInstance?.httpServer) {
      await new Promise<void>((resolve) => appInstance.httpServer.close(() => resolve()));
    }
    if (prisma) {
      await prisma.$disconnect();
    }
    setTimeout(() => process.exit(0), 100);
  });

  beforeEach(async () => {
    await prisma.storageReservation.deleteMany({
      where: { orgId: { in: [owner.orgId, orgB.orgId] } },
    });
    await quotaService.resetCustomQuota(owner.orgId);
    await quotaService.resetCustomQuota(orgB.orgId);
  });

  // ==========================================
  // SECTION A: expandReservation CONCURRENCY
  // ==========================================

  test('WARN-01: Concurrent expandReservation calls on same uploadId serialize without losing increments', async () => {
    const uploadId = `expand_test_${Date.now()}`;
    const initialBytes = 100 * 1024;
    await quotaService.reserveQuota(uploadId, owner.orgId, initialBytes);

    // Concurrently trigger 3 expansion requests of 50KB each
    const delta = 50 * 1024;
    await Promise.all([
      quotaService.expandReservation(uploadId, owner.orgId, delta),
      quotaService.expandReservation(uploadId, owner.orgId, delta),
      quotaService.expandReservation(uploadId, owner.orgId, delta),
    ]);

    const res = await prisma.storageReservation.findUnique({
      where: { id: uploadId },
    });
    assert.ok(res);
    const expectedTotal = initialBytes + 3 * delta; // 100KB + 150KB = 250KB
    assert.strictEqual(Number(res.bytes), expectedTotal, 'All concurrent increments must be preserved atomically');

    await quotaService.releaseReservation(uploadId);
  });

  test('WARN-02: expandReservation rejects cross-tenant manipulation when expectedOrgId mismatches', async () => {
    const uploadId = `expand_sec_${Date.now()}`;
    await quotaService.reserveQuota(uploadId, owner.orgId, 50 * 1024);

    let rejected = false;
    try {
      // Attacker from orgB attempts to expand uploadId of owner.orgId
      await quotaService.expandReservation(uploadId, orgB.orgId, 20 * 1024);
    } catch (err: any) {
      rejected = true;
      assert.ok(err.message.includes('Sai thông tin workspace'));
    }
    assert.strictEqual(rejected, true, 'Cross-tenant expansion must be blocked');

    await quotaService.releaseReservation(uploadId);
  });

  // ==========================================
  // SECTION B: HEARTBEAT MECHANISM
  // ==========================================

  test('WARN-03: heartbeatReservation extends lease and verifies tenant ownership', async () => {
    const uploadId = `hb_test_${Date.now()}`;
    await quotaService.reserveQuota(uploadId, owner.orgId, 40 * 1024);

    // Initial lease
    const initialRow = await prisma.storageReservation.findUnique({ where: { id: uploadId } });
    assert.ok(initialRow);

    // Wait a brief moment and send heartbeat
    await new Promise((r) => setTimeout(r, 50));
    const newExpiresAt = await quotaService.heartbeatReservation(uploadId, owner.orgId);
    assert.ok(newExpiresAt.getTime() > initialRow.expiresAt.getTime(), 'Heartbeat must extend expiresAt');

    // Cross-tenant attempt must fail
    let crossRejected = false;
    try {
      await quotaService.heartbeatReservation(uploadId, orgB.orgId);
    } catch (err: any) {
      crossRejected = true;
      assert.ok(err.message.includes('Không tìm thấy bản ghi'));
    }
    assert.strictEqual(crossRejected, true, 'Heartbeat must reject mismatching workspace orgId');

    await quotaService.releaseReservation(uploadId);
  });

  test('WARN-04: REST endpoint POST /api/files/upload/:uploadId/heartbeat validates auth and extends lease', async () => {
    const uploadId = `hb_rest_${Date.now()}`;
    await quotaService.reserveQuota(uploadId, owner.orgId, 30 * 1024);

    // Valid authenticated call from owner
    const res = await fetch(`${baseUrl}/api/files/upload/${uploadId}/heartbeat`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${owner.token}`,
        'x-workspace-id': owner.orgId,
      },
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.uploadId, uploadId);

    // Spoofed call from User B (orgB) trying to heartbeat uploadId of Org A
    const resSpoof = await fetch(`${baseUrl}/api/files/upload/${uploadId}/heartbeat`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${orgB.token}`,
        'x-workspace-id': orgB.orgId,
      },
    });
    assert.strictEqual(resSpoof.status, 404, 'Spoofed tenant heartbeat must be rejected with 404');

    await quotaService.releaseReservation(uploadId);
  });

  // ==========================================
  // SECTION C: restoreFromTrash QUOTA CHECK
  // ==========================================

  test('WARN-05: restoreFromTrash enforces exact quota boundary and blocks overflow with 413', async () => {
    // 1. Create a 100KB file in owner.orgId
    const file100KB = await fileService.uploadFile({
      orgId: owner.orgId,
      name: 'restore_test_100kb.bin',
      contentBase64: Buffer.alloc(100 * 1024, 'a').toString('base64'),
      mimeType: 'application/octet-stream',
      ownerId: owner.id,
      ownerName: owner.name,
    });

    // 2. Move file to trash
    await fileService.moveToTrash(file100KB.id, owner.orgId);
    const usageAfterTrash = await quotaService.getWorkspaceUsage(owner.orgId);

    // 3. Set custom quota so remaining space is exactly 100KB
    await quotaService.setCustomQuota(owner.orgId, usageAfterTrash.usedBytes + 100 * 1024);

    // 4. Exact remaining space: restoring 100KB file succeeds!
    const restored = await fileService.restoreFromTrash(file100KB.id, owner.orgId);
    assert.strictEqual(restored.isDeleted, false, 'Exact quota boundary allows file restoration');

    // 5. Move back to trash, and shrink remaining space by 1 byte (now remaining is 100KB - 1 byte)
    await fileService.moveToTrash(file100KB.id, owner.orgId);
    await quotaService.setCustomQuota(owner.orgId, usageAfterTrash.usedBytes + 100 * 1024 - 1);

    // 6. Restoring 100KB file must be REJECTED because it exceeds quota by 1 byte
    let restoreFailed = false;
    try {
      await fileService.restoreFromTrash(file100KB.id, owner.orgId);
    } catch (err: any) {
      restoreFailed = true;
      assert.strictEqual(err.statusCode, 413);
      assert.ok(err.message.includes('Dung lượng workspace không đủ'));
    }
    assert.strictEqual(restoreFailed, true, 'Restoring file exceeding quota by 1 byte must be rejected');

    // Verify file REMAINS in trash and quota is not corrupted
    const recordAfter = await prisma.fileRecord.findUnique({ where: { id: file100KB.id } });
    assert.strictEqual(recordAfter?.isDeleted, true, 'File must remain in trash upon failed restore');

    // Clean up
    await fileService.permanentDelete(file100KB.id, owner.orgId);
    await quotaService.resetCustomQuota(owner.orgId);
  });

  test('WARN-06: REST POST /api/files/:id/restore returns HTTP 413 on quota overflow', async () => {
    const file = await fileService.uploadFile({
      orgId: owner.orgId,
      name: 'restore_http_test.bin',
      contentBase64: Buffer.alloc(50 * 1024, 'x').toString('base64'),
      mimeType: 'application/octet-stream',
      ownerId: owner.id,
      ownerName: owner.name,
    });

    await fileService.moveToTrash(file.id, owner.orgId);
    const usage = await quotaService.getWorkspaceUsage(owner.orgId);
    // Set quota to leave only 10KB free (file requires 50KB)
    await quotaService.setCustomQuota(owner.orgId, usage.usedBytes + 10 * 1024);

    const res = await fetch(`${baseUrl}/api/files/${file.id}/restore`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${owner.token}`,
        'x-workspace-id': owner.orgId,
      },
    });

    assert.strictEqual(res.status, 413, 'Must return HTTP 413 Payload Too Large');
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.ok(data.error.includes('Dung lượng workspace không đủ'));

    // Clean up
    await fileService.permanentDelete(file.id, owner.orgId);
    await quotaService.resetCustomQuota(owner.orgId);
  });

  // ==========================================
  // SECTION D: ORPHAN STORAGE REAPER
  // ==========================================

  test('WARN-07: OrphanStorageReaper reclaims unlinked MinIO objects older than safe age threshold', async () => {
    const reaper = OrphanStorageReaper.getInstance();

    // 1. Create a VALID file (persisted in DB and MinIO)
    const validFileId = crypto.randomUUID();
    const validKey = `orgs/${owner.orgId}/files/${validFileId}/valid_doc.txt`;
    await s3.uploadFile(validKey, Buffer.from('Hello Valid File'));
    await prisma.fileRecord.create({
      data: {
        id: validFileId,
        orgId: owner.orgId,
        name: 'valid_doc.txt',
        s3Key: validKey,
        byteSize: 16,
        mimeType: 'text/plain',
        versionsJson: JSON.stringify([{ version: 1, s3Key: validKey }]),
      },
    });

    // 2. Create an IN-FLIGHT object with active reservation
    const inFlightId = crypto.randomUUID();
    const inFlightKey = `orgs/${owner.orgId}/files/${inFlightId}/inflight.bin`;
    await s3.uploadFile(inFlightKey, Buffer.from('In flight binary data'));
    await quotaService.reserveQuota(inFlightId, owner.orgId, 50 * 1024);

    // 3. Create an ORPHAN object (simulating hard SIGKILL crash: S3 written, but DB failed, no reservation)
    const orphanId = crypto.randomUUID();
    const orphanKey = `orgs/${owner.orgId}/files/${orphanId}/crashed_orphan.bin`;
    await s3.uploadFile(orphanKey, Buffer.from('Orphaned payload from crashed process'));

    // Run reconciliation with minAgeMinutes: 0 (for testing execution)
    const metrics = await reaper.reconcileOrphans({
      orgId: owner.orgId,
      minAgeMinutes: 0,
      dryRun: false,
    });

    assert.ok(metrics.scannedCount >= 3, 'Must scan all keys');
    assert.ok(metrics.validCount >= 1, 'Valid file must be recognized');
    assert.ok(metrics.activeInFlightCount >= 1, 'In-flight reservation must be preserved');
    assert.ok(metrics.orphanedCount >= 1, 'Orphaned object must be identified');
    assert.ok(metrics.deletedCount >= 1, 'Orphaned object must be deleted from S3');

    // Verify S3 state: valid and in-flight exist; orphan is deleted!
    const fileList = await s3.listFiles(`orgs/${owner.orgId}/files/`);
    const keys = fileList.map((f) => f.key);
    assert.ok(keys.includes(validKey), 'Valid file MUST still exist in S3');
    assert.ok(keys.includes(inFlightKey), 'In-flight file MUST still exist in S3');
    assert.ok(!keys.includes(orphanKey), 'Orphaned file MUST have been purged from S3');

    // Clean up
    await fileService.permanentDelete(validFileId, owner.orgId);
    await quotaService.releaseReservation(inFlightId);
    await s3.deleteObject(inFlightKey);
  });

  // ==========================================
  // SECTION E & F: CONTENTION BENCHMARK
  // ==========================================

  test('WARN-08: Resource-bounded concurrency contention benchmark (10 concurrent workers)', async () => {
    const numWorkers = 10;
    const workerQuota = 50 * 1024;
    // Set custom quota to accommodate exactly 6 workers (300KB)
    const usage = await quotaService.getWorkspaceUsage(owner.orgId);
    await quotaService.setCustomQuota(owner.orgId, usage.usedBytes + 6 * workerQuota);

    const ids = Array.from({ length: numWorkers }, (_, i) => `contention_w_${i}_${Date.now()}`);

    const startTime = Date.now();
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          await quotaService.reserveQuota(id, owner.orgId, workerQuota);
          return { id, success: true };
        } catch {
          return { id, success: false };
        }
      })
    );
    const duration = Date.now() - startTime;

    const successes = results.filter((r) => r.success).length;
    const failures = results.filter((r) => !r.success).length;

    assert.strictEqual(successes, 6, 'Exactly 6 workers must be granted quota');
    assert.strictEqual(failures, 4, 'Remaining 4 workers must be rejected');
    assert.ok(duration < 2000, `10 concurrent transactions should complete quickly (took ${duration}ms)`);

    // Clean up
    for (const r of results) {
      if (r.success) await quotaService.releaseReservation(r.id);
    }
    await quotaService.resetCustomQuota(owner.orgId);
  });
});
