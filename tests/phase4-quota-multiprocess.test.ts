import { test, describe, before, after, beforeEach } from 'node:test';
import * as assert from 'node:assert';
import crypto from 'node:crypto';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { createApp, AppInstance } from '../packages/server/src/server.js';
import { StorageQuotaService } from '../packages/server/src/core/files/StorageQuotaService.js';

const projectRoot = process.cwd().endsWith('tests') ? path.resolve(process.cwd(), '..') : process.cwd();

function runWorker(code: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const wrappedCode = `
    (async () => {
      try {
        ${code}
      } catch (err: any) {
        console.error('WORKER_ERROR:' + (err.message || err));
        process.exit(1);
      }
    })();
  `;
  return new Promise((resolve) => {
    const child = spawn('npx', ['tsx', '-e', wrappedCode], {
      cwd: projectRoot,
      env: { ...process.env },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('close', (exitCode) => {
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: exitCode ?? 0 });
    });
  });
}

describe('PHASE 4: PostgreSQL Multi-Process Quota Hardening & Concurrency Verification', () => {
  let appInstance: AppInstance;
  let serverPort: number;
  let baseUrl: string;
  let prisma: PrismaClient;
  let quotaService: StorageQuotaService;

  let owner: { id: string; email: string; name: string; token: string; orgId: string };
  let testOrgBId: string;

  before(async () => {
    serverPort = 4096;
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
    appInstance = await createApp();
    await new Promise<void>((resolve) => {
      appInstance.httpServer.listen(serverPort, () => resolve());
    });

    const ownerEmail = `mp_quota_owner_${Date.now()}@collab.local`;
    const resOwner = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ownerEmail,
        password: 'Password123!',
        name: 'MP Quota Owner',
        orgName: 'Multi-Process Quota Org Alpha',
      }),
    });
    const dataOwner = await resOwner.json();
    assert.strictEqual(dataOwner.success, true);
    owner = {
      id: dataOwner.data.user.userId || dataOwner.data.user.id,
      email: dataOwner.data.user.email,
      name: dataOwner.data.user.name,
      token: dataOwner.data.tokens.accessToken,
      orgId: dataOwner.data.workspaces[0].orgId,
    };

    // Register Workspace B for isolation testing
    const emailB = `mp_quota_b_${Date.now()}@collab.local`;
    const resB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailB,
        password: 'Password123!',
        name: 'MP Quota Owner B',
        orgName: 'Multi-Process Quota Org Beta',
      }),
    });
    const dataB = await resB.json();
    testOrgBId = dataB.data.workspaces[0].orgId;
  });

  beforeEach(async () => {
    // Ensure clean quota slate before each test
    await prisma.storageReservation.deleteMany({
      where: { orgId: { in: [owner.orgId, testOrgBId] } },
    });
    await quotaService.resetCustomQuota(owner.orgId);
    await quotaService.resetCustomQuota(testOrgBId);
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

  // ==========================================
  // SECTION 1: MULTI-PROCESS CONCURRENCY TESTS
  // ==========================================

  test('MP-01: Two independent OS processes concurrently competing for remaining quota', async () => {
    // Current usage
    const usage = await quotaService.getWorkspaceUsage(owner.orgId);
    // Set quota to allow exactly ONE 400KB upload: remaining = 500KB
    const quotaLimit = usage.usedBytes + 500 * 1024;
    await quotaService.setCustomQuota(owner.orgId, quotaLimit);

    const uploadId1 = `mp_proc1_${Date.now()}`;
    const uploadId2 = `mp_proc2_${Date.now()}`;

    const workerScript1 = `
      const { StorageQuotaService } = await import('./packages/server/src/core/files/StorageQuotaService.js');
      const svc = StorageQuotaService.getInstance();
      try {
        await svc.reserveQuota('${uploadId1}', '${owner.orgId}', ${400 * 1024});
        console.log('P1:SUCCESS');
        process.exit(0);
      } catch (err: any) {
        console.log('P1:FAIL:' + err.message);
        process.exit(1);
      }
    `;

    const workerScript2 = `
      const { StorageQuotaService } = await import('./packages/server/src/core/files/StorageQuotaService.js');
      const svc = StorageQuotaService.getInstance();
      try {
        await svc.reserveQuota('${uploadId2}', '${owner.orgId}', ${400 * 1024});
        console.log('P2:SUCCESS');
        process.exit(0);
      } catch (err: any) {
        console.log('P2:FAIL:' + err.message);
        process.exit(1);
      }
    `;

    // Launch both independent child processes at the exact same moment
    const [p1Result, p2Result] = await Promise.all([
      runWorker(workerScript1),
      runWorker(workerScript2),
    ]);

    const exitCodes = [p1Result.exitCode, p2Result.exitCode].sort();
    assert.deepStrictEqual(exitCodes, [0, 1], 'Exactly one process must exit 0 and one process exit 1');

    const combinedOutput = p1Result.stdout + '\n' + p2Result.stdout;
    assert.ok(combinedOutput.includes('SUCCESS'), 'One process must succeed');
    assert.ok(combinedOutput.includes('FAIL:Dung lượng lưu trữ của workspace đã vượt quá giới hạn'), 'One process must be rejected with QuotaExceeded');

    // Clean up reservation
    await quotaService.releaseReservation(uploadId1);
    await quotaService.releaseReservation(uploadId2);
    await quotaService.resetCustomQuota(owner.orgId);
  });

  test('MP-02: Multiple smaller uploads across separate processes accumulate and enforce quota boundary', async () => {
    const usage = await quotaService.getWorkspaceUsage(owner.orgId);
    // Allow 300KB
    await quotaService.setCustomQuota(owner.orgId, usage.usedBytes + 300 * 1024);

    const ids = [1, 2, 3, 4].map((i) => `mp_batch_${i}_${Date.now()}`);
    // 4 processes each requesting 100KB (total 400KB > 300KB limit)
    // Exactly 3 must succeed (300KB) and the 4th must fail!
    const promises = ids.map((id) =>
      runWorker(`
        const { StorageQuotaService } = await import('./packages/server/src/core/files/StorageQuotaService.js');
        const svc = StorageQuotaService.getInstance();
        try {
          await svc.reserveQuota('${id}', '${owner.orgId}', ${100 * 1024});
          console.log('BATCH:SUCCESS');
          process.exit(0);
        } catch (err: any) {
          console.log('BATCH:REJECTED');
          process.exit(1);
        }
      `)
    );

    const results = await Promise.all(promises);
    const successes = results.filter((r) => r.stdout.includes('BATCH:SUCCESS')).length;
    const rejections = results.filter((r) => r.stdout.includes('BATCH:REJECTED')).length;

    assert.strictEqual(successes, 3, 'Exactly 3 uploads (300KB) must be accepted');
    assert.strictEqual(rejections, 1, 'The 4th upload exceeding quota must be rejected');

    // Clean up
    for (const id of ids) {
      await quotaService.releaseReservation(id);
    }
    await quotaService.resetCustomQuota(owner.orgId);
  });

  test('MP-03: Retry with same uploadId is idempotent across processes without duplicate reservation', async () => {
    const uploadId = `mp_retry_id_${Date.now()}`;
    await quotaService.reserveQuota(uploadId, owner.orgId, 50 * 1024);

    const reserved1 = await quotaService.getActiveReservedBytes(owner.orgId);
    assert.strictEqual(reserved1, 50 * 1024);

    // Second process retrying the exact same uploadId
    const retryResult = await runWorker(`
      const { StorageQuotaService } = await import('./packages/server/src/core/files/StorageQuotaService.js');
      const svc = StorageQuotaService.getInstance();
      try {
        await svc.reserveQuota('${uploadId}', '${owner.orgId}', ${50 * 1024});
        console.log('RETRY:SUCCESS');
        process.exit(0);
      } catch (err: any) {
        console.log('RETRY:FAIL');
        process.exit(1);
      }
    `);

    assert.strictEqual(retryResult.exitCode, 0);
    assert.ok(retryResult.stdout.includes('RETRY:SUCCESS'));

    // Reserved bytes must still be 50KB, not 100KB!
    const reserved2 = await quotaService.getActiveReservedBytes(owner.orgId);
    assert.strictEqual(reserved2, 50 * 1024, 'Retry must not double count reserved quota');

    await quotaService.releaseReservation(uploadId);
  });

  test('MP-04: Committed reservation does not double-count storage in getWorkspaceUsage', async () => {
    const usageBefore = await quotaService.getWorkspaceUsage(owner.orgId);
    const uploadId = `mp_commit_test_${Date.now()}`;

    // 1. Reserve 25KB
    await quotaService.reserveQuota(uploadId, owner.orgId, 25 * 1024);
    const usageReserved = await quotaService.getWorkspaceUsage(owner.orgId);
    assert.strictEqual(usageReserved.reservedBytes, 25 * 1024);

    // 2. Commit file and reservation
    const file = await prisma.fileRecord.create({
      data: {
        id: uploadId,
        orgId: owner.orgId,
        name: 'test_commit.bin',
        s3Key: `orgs/${owner.orgId}/files/${uploadId}/test_commit.bin`,
        byteSize: 25 * 1024,
        mimeType: 'application/octet-stream',
      },
    });

    await quotaService.commitReservation(uploadId);

    // 3. Verify total storage usage:
    // usedBytes increased by 25KB, reservedBytes became 0! Total = usedBytes (no double counting).
    const usageAfter = await quotaService.getWorkspaceUsage(owner.orgId);
    assert.strictEqual(usageAfter.reservedBytes, 0, 'Reserved bytes must drop to 0 after commit');
    assert.strictEqual(usageAfter.usedBytes, usageBefore.usedBytes + 25 * 1024, 'Used bytes must reflect new file');

    // Clean up
    await prisma.fileRecord.delete({ where: { id: file.id } });
  });

  test('MP-05: Multi-tenant workspace isolation - separate workspaces do not lock or interfere with each other', async () => {
    const idA = `mp_iso_a_${Date.now()}`;
    const idB = `mp_iso_b_${Date.now()}`;

    const [workerA, workerB] = await Promise.all([
      runWorker(`
        const { StorageQuotaService } = await import('./packages/server/src/core/files/StorageQuotaService.js');
        const svc = StorageQuotaService.getInstance();
        await svc.reserveQuota('${idA}', '${owner.orgId}', ${20 * 1024});
        console.log('WORKER_A:DONE');
      `),
      runWorker(`
        const { StorageQuotaService } = await import('./packages/server/src/core/files/StorageQuotaService.js');
        const svc = StorageQuotaService.getInstance();
        await svc.reserveQuota('${idB}', '${testOrgBId}', ${20 * 1024});
        console.log('WORKER_B:DONE');
      `),
    ]);

    assert.ok(workerA.stdout.includes('WORKER_A:DONE'));
    assert.ok(workerB.stdout.includes('WORKER_B:DONE'));

    assert.strictEqual(await quotaService.getActiveReservedBytes(owner.orgId), 20 * 1024);
    assert.strictEqual(await quotaService.getActiveReservedBytes(testOrgBId), 20 * 1024);

    await quotaService.releaseReservation(idA);
    await quotaService.releaseReservation(idB);
  });

  test('MP-06: Exact quota boundary verification (exact remaining succeeds, 1 byte over fails)', async () => {
    const usage = await quotaService.getWorkspaceUsage(owner.orgId);
    const limit = usage.usedBytes + 10000;
    await quotaService.setCustomQuota(owner.orgId, limit);

    const exactId = `mp_exact_${Date.now()}`;
    const overId = `mp_over_${Date.now()}`;

    // Exactly 10000 bytes remaining -> exactly 10000 bytes requested must succeed
    await quotaService.reserveQuota(exactId, owner.orgId, 10000);
    assert.strictEqual(await quotaService.getActiveReservedBytes(owner.orgId), 10000);

    // 1 byte more requested must fail
    let failed = false;
    try {
      await quotaService.reserveQuota(overId, owner.orgId, 1);
    } catch {
      failed = true;
    }
    assert.strictEqual(failed, true, '1 byte over quota must be rejected');

    await quotaService.releaseReservation(exactId);
    await quotaService.resetCustomQuota(owner.orgId);
  });

  test('MP-07: Rejected upload leaves zero active reservations in PostgreSQL', async () => {
    const usage = await quotaService.getWorkspaceUsage(owner.orgId);
    await quotaService.setCustomQuota(owner.orgId, usage.usedBytes + 10 * 1024);

    const rejectedId = `mp_reject_${Date.now()}`;
    try {
      await quotaService.reserveQuota(rejectedId, owner.orgId, 50 * 1024);
    } catch {}

    const row = await prisma.storageReservation.findUnique({
      where: { id: rejectedId },
    });
    assert.strictEqual(row, null, 'Rejected upload must roll back reservation row in PostgreSQL');
    assert.strictEqual(await quotaService.getActiveReservedBytes(owner.orgId), 0);

    await quotaService.resetCustomQuota(owner.orgId);
  });

  // ==========================================
  // SECTION 2: FAILURE & RECOVERY TESTS
  // ==========================================

  test('MP-08: S3 upload failure releases reservation immediately', async () => {
    const failId = `mp_s3_fail_${Date.now()}`;
    await quotaService.reserveQuota(failId, owner.orgId, 60 * 1024);
    assert.strictEqual(await quotaService.getActiveReservedBytes(owner.orgId), 60 * 1024);

    // Simulate S3 failure
    await quotaService.releaseReservation(failId);
    assert.strictEqual(await quotaService.getActiveReservedBytes(owner.orgId), 0, 'Reservation must be freed on S3 failure');

    const row = await prisma.storageReservation.findUnique({ where: { id: failId } });
    assert.strictEqual(row?.status, 'released');
  });

  test('MP-09: Stream abortion / client disconnect releases reservation', async () => {
    const abortId = `mp_abort_${Date.now()}`;
    await quotaService.reserveQuota(abortId, owner.orgId, 80 * 1024);
    assert.strictEqual(await quotaService.getActiveReservedBytes(owner.orgId), 80 * 1024);

    // Stream error triggers release
    await quotaService.releaseReservation(abortId);
    assert.strictEqual(await quotaService.getActiveReservedBytes(owner.orgId), 0);
  });

  test('MP-10: Database persistence failure releases reservation and triggers rollback', async () => {
    const dbFailId = `mp_dbfail_${Date.now()}`;
    await quotaService.reserveQuota(dbFailId, owner.orgId, 45 * 1024);

    // Simulate DB failure catch block
    await quotaService.releaseReservation(dbFailId);
    assert.strictEqual(await quotaService.getActiveReservedBytes(owner.orgId), 0);
  });

  test('MP-11: Process crash recovery - expired reservations are automatically reclaimed without data loss', async () => {
    const crashedUploadId = `mp_crashed_${Date.now()}`;

    // Simulate a process that reserved quota, crashed, and never called commit or release
    // We create a reservation with expiresAt in the PAST (simulating timeout expiration)
    await prisma.storageReservation.create({
      data: {
        id: crashedUploadId,
        orgId: owner.orgId,
        bytes: BigInt(75 * 1024),
        status: 'pending',
        expiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago!
      },
    });

    // 1. getActiveReservedBytes ignores expired pending reservations automatically
    const active = await quotaService.getActiveReservedBytes(owner.orgId);
    assert.strictEqual(active, 0, 'Expired reservations from crashed processes must not block active quota');

    // 2. pruneStaleReservations marks it as 'expired'
    const pruned = await quotaService.pruneStaleReservations(owner.orgId);
    assert.ok(pruned >= 1, 'Prune must reclaim expired reservations');

    const row = await prisma.storageReservation.findUnique({ where: { id: crashedUploadId } });
    assert.strictEqual(row?.status, 'expired');
  });

  test('MP-12: Prune stale reservations is idempotent and preserves active leases', async () => {
    const activeId = `mp_active_lease_${Date.now()}`;
    await quotaService.reserveQuota(activeId, owner.orgId, 30 * 1024);

    // Running prune multiple times
    await quotaService.pruneStaleReservations();
    await quotaService.pruneStaleReservations();

    // Active reservation with future expiresAt must remain intact!
    const activeRow = await prisma.storageReservation.findUnique({ where: { id: activeId } });
    assert.strictEqual(activeRow?.status, 'pending');
    assert.strictEqual(await quotaService.getActiveReservedBytes(owner.orgId), 30 * 1024);

    await quotaService.releaseReservation(activeId);
  });

  test('MP-13: Retry after failure does not create duplicate file records or leaked reservations', async () => {
    const uploadId = `mp_retry_file_${Date.now()}`;

    // First attempt fails during upload
    await quotaService.reserveQuota(uploadId, owner.orgId, 40 * 1024);
    await quotaService.releaseReservation(uploadId);

    // Second attempt succeeds
    await quotaService.reserveQuota(uploadId, owner.orgId, 40 * 1024);
    const file = await prisma.fileRecord.create({
      data: {
        id: uploadId,
        orgId: owner.orgId,
        name: 'retry_success.bin',
        s3Key: `orgs/${owner.orgId}/files/${uploadId}/retry_success.bin`,
        byteSize: 40 * 1024,
        mimeType: 'application/octet-stream',
      },
    });
    await quotaService.commitReservation(uploadId);

    const count = await prisma.fileRecord.count({ where: { id: uploadId } });
    assert.strictEqual(count, 1, 'Only exactly 1 file record must exist');
    assert.strictEqual(await quotaService.getActiveReservedBytes(owner.orgId), 0, 'No dangling reservations');

    await prisma.fileRecord.delete({ where: { id: file.id } });
  });
});
