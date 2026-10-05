import test from 'node:test';
import assert from 'node:assert';
import * as Y from 'yjs';
import { SnapshotManager } from '../../packages/server/src/storage/snapshot-manager.js';
import { S3StorageService } from '../../packages/server/src/storage/s3-client.js';
import { getPrismaClient } from '../../packages/server/src/storage/db.js';

test('SnapshotManager & Restore: Inactivity debounce, 100-mutation threshold, and S3/PostgreSQL persistence', async (t) => {
  const prisma = getPrismaClient();
  const s3 = S3StorageService.getInstance();
  await s3.ensureBucketExists();

  const testDocId = `snap_test_${Date.now()}`;
  const ydoc = new Y.Doc();
  const text = ydoc.getText('content');
  const snapshotManager = new SnapshotManager(testDocId, ydoc);

  await t.test('100 mutations threshold immediately commits snapshot without waiting for timer', async () => {
    // Perform 100 incremental mutations
    for (let i = 0; i < 100; i++) {
      text.insert(text.length, `item_${i} `);
      snapshotManager.onMutation('test_user_threshold');
    }

    // Give asynchronous commit microtask time to finish
    await new Promise((resolve) => setTimeout(resolve, 350));

    // Verify snapshot in database
    const snapshots = await prisma.documentSnapshot.findMany({
      where: { documentId: testDocId },
    });

    assert.ok(snapshots.length >= 1, 'At least 1 snapshot should be created by 100 mutations threshold');
    const firstSnap = snapshots[0];
    assert.strictEqual(firstSnap.mutationCount, 100, 'Snapshot mutation count should be 100');

    // Verify snapshot blob exists in MinIO
    const blob = await s3.getSnapshot(firstSnap.s3Key);
    assert.ok(blob.length > 0, 'Binary snapshot blob in S3 must be non-empty');

    // Verify history entry
    const history = await prisma.documentHistory.findFirst({
      where: { documentId: testDocId, snapshotId: firstSnap.id },
    });
    assert.ok(history, 'DocumentHistory record must exist for the snapshot');
    assert.strictEqual(history?.authorId, 'test_user_threshold');
  });

  await t.test('5-second inactivity timer triggers snapshot after typing stops', async () => {
    // Perform 5 mutations (less than 100)
    for (let i = 0; i < 5; i++) {
      text.insert(text.length, `idle_${i} `);
      snapshotManager.onMutation('test_user_idle');
    }

    assert.strictEqual(snapshotManager.getMutationCount(), 5, 'Pending mutation count should be 5');

    // Wait for the 5-second inactivity timer to fire (+ 300ms buffer)
    await new Promise((resolve) => setTimeout(resolve, 5400));

    assert.strictEqual(snapshotManager.getMutationCount(), 0, 'Pending mutation count should reset to 0 after commit');

    const snapshots = await prisma.documentSnapshot.findMany({
      where: { documentId: testDocId },
      orderBy: { version: 'desc' },
    });

    assert.strictEqual(snapshots.length, 2, 'Should now have 2 snapshots');
    const latestSnap = snapshots[0];
    assert.strictEqual(latestSnap.mutationCount, 5);

    const history = await prisma.documentHistory.findFirst({
      where: { documentId: testDocId, snapshotId: latestSnap.id },
    });
    assert.ok(history?.changeSummary.includes('5-second inactivity timeout'));
  });

  await t.test('Restore past snapshot: load version 1 snapshot and verify text state', async () => {
    const v1Snapshot = await prisma.documentSnapshot.findFirst({
      where: { documentId: testDocId, version: 1 },
    });
    assert.ok(v1Snapshot, 'Version 1 snapshot must exist');

    const v1Blob = await s3.getSnapshot(v1Snapshot.s3Key);
    const restoredDoc = new Y.Doc();
    Y.applyUpdate(restoredDoc, v1Blob);

    const restoredText = restoredDoc.getText('content').toString();
    assert.ok(restoredText.includes('item_99'), 'Restored text should contain content from version 1');
    assert.ok(!restoredText.includes('idle_0'), 'Restored text should NOT contain content from version 2');
  });

  snapshotManager.destroy();
  ydoc.destroy();
});
