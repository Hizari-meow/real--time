import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { createApp, AppInstance } from '../packages/server/src/server.js';
import { config } from '../packages/server/src/config.js';

describe('PHASE 4: Deep Remediation (Quota, Atomic Outbox & Shared Commenter)', () => {
  let appInstance: AppInstance;
  let serverPort: number;
  let baseUrl: string;
  let prisma: PrismaClient;

  let owner: { id: string; email: string; name: string; token: string; orgId: string };
  let admin: { id: string; email: string; name: string; token: string; orgId: string };
  let member: { id: string; email: string; name: string; token: string; orgId: string };
  let testFileId: string;
  let testWikiId: string;

  before(async () => {
    serverPort = 4092;
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

    appInstance = await createApp();
    await new Promise<void>((resolve) => {
      appInstance.httpServer.listen(serverPort, () => resolve());
    });

    const ownerEmail = `remed_deep_owner_${Date.now()}@collab.local`;
    const resOwner = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ownerEmail,
        password: 'Password123!',
        name: 'Deep Owner',
        orgName: 'Deep Remediation Org',
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

    const createRoleUser = async (name: string, role: string) => {
      const email = `remed_deep_${role}_${Date.now()}@collab.local`;
      await fetch(`${baseUrl}/api/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner.token}`,
          'x-workspace-id': owner.orgId,
        },
        body: JSON.stringify({ name, email, role, department: 'Engineering' }),
      });
      const userRecord = await prisma.user.findUnique({ where: { email } });
      const token = jwt.sign(
        { userId: userRecord!.id, email: userRecord!.email, name: userRecord!.name },
        config.jwt.secret,
        { expiresIn: '1h' }
      );
      return {
        id: userRecord!.id,
        email: userRecord!.email,
        name: userRecord!.name,
        token,
        orgId: owner.orgId,
      };
    };

    admin = await createRoleUser('Deep Admin', 'admin');
    member = await createRoleUser('Deep Member', 'member');

    // Create a base file for share tests
    const fRes = await fetch(`${baseUrl}/api/files/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner.token}`,
        'x-workspace-id': owner.orgId,
      },
      body: JSON.stringify({
        name: 'deep_test_file.txt',
        contentBase64: Buffer.from('Deep Test File Content').toString('base64'),
        mimeType: 'text/plain',
      }),
    });
    testFileId = (await fRes.json()).data.id;

    // Create a base wiki page for approval tests
    const wRes = await fetch(`${baseUrl}/api/wiki`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner.token}`,
        'x-workspace-id': owner.orgId,
      },
      body: JSON.stringify({
        title: 'Deep Test SOP',
        type: 'SOP',
        status: 'draft',
      }),
    });
    testWikiId = (await wRes.json()).data.id;
  });

  after(async () => {
    try {
      const { getOutboxRelay } = await import('../packages/server/src/core/events/index.js');
      getOutboxRelay().stop();
    } catch {}
    if (prisma) await prisma.$disconnect();
    if (appInstance?.gateway) await appInstance.gateway.shutdown();
    if (appInstance?.httpServer) {
      await new Promise<void>((resolve) => appInstance.httpServer.close(() => resolve()));
    }
  });

  test('REM-09: EventBus Domain Events (file.shared & approval.approved) Staged in Outbox', async () => {
    // 9.1 file.shared event emission
    const shareRes = await fetch(`${baseUrl}/api/files/${testFileId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner.token}`,
        'x-workspace-id': owner.orgId,
      },
      body: JSON.stringify({
        linkAccess: 'anyone',
        permission: 'viewer',
        allowDownload: true,
      }),
    });
    assert.strictEqual(shareRes.status, 200);

    const fileSharedEvent = await prisma.outboxEvent.findFirst({
      where: { type: 'file.shared', orgId: owner.orgId },
      orderBy: { occurredAt: 'desc' },
    });
    assert.ok(fileSharedEvent, 'file.shared domain event must be staged in outbox');
    const sharedPayload = JSON.parse(fileSharedEvent.payload);
    assert.strictEqual(sharedPayload.resource.type, 'file');
    assert.strictEqual(sharedPayload.resource.id, testFileId);
    assert.strictEqual(sharedPayload.data.permission, 'viewer');
    assert.strictEqual(sharedPayload.data.s3Key, undefined, 'Event payload must not leak s3Key');

    // 9.2 approval.approved event emission
    const sopRes = await fetch(`${baseUrl}/api/wiki/${testWikiId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${admin.token}`,
        'x-workspace-id': admin.orgId,
      },
      body: JSON.stringify({ status: 'approved' }),
    });
    assert.strictEqual(sopRes.status, 200);

    const approvedEvent = await prisma.outboxEvent.findFirst({
      where: { type: 'approval.approved', orgId: owner.orgId },
      orderBy: { occurredAt: 'desc' },
    });
    assert.ok(approvedEvent, 'approval.approved domain event must be staged in outbox');
    const approvedPayload = JSON.parse(approvedEvent.payload);
    assert.strictEqual(approvedPayload.resource.type, 'wiki_page');
    assert.strictEqual(approvedPayload.resource.id, testWikiId);
    assert.strictEqual(approvedPayload.data.status, 'approved');
  });

  test('REM-10: Granular Public Share Permissions (Viewer 403 vs Editor 200)', async () => {
    const freshFileRes = await fetch(`${baseUrl}/api/files/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner.token}`,
        'x-workspace-id': owner.orgId,
      },
      body: JSON.stringify({
        name: 'shared-doc-deep.txt',
        contentBase64: Buffer.from('Deep Shared Doc Content').toString('base64'),
        mimeType: 'text/plain',
      }),
    });
    const freshFileId = (await freshFileRes.json()).data.id;

    // Share with permission: 'viewer'
    const shareViewer = await fetch(`${baseUrl}/api/files/${freshFileId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner.token}`,
        'x-workspace-id': owner.orgId,
      },
      body: JSON.stringify({
        linkAccess: 'anyone',
        permission: 'viewer',
        allowDownload: true,
      }),
    });
    const token = (await shareViewer.json()).data.shareToken;

    // Public read returns permission: 'viewer' and sanitized response
    const pubGet = await fetch(`${baseUrl}/api/files/shared/${token}`);
    assert.strictEqual(pubGet.status, 200);
    const pubGetData = await pubGet.json();
    assert.strictEqual(pubGetData.data.permission, 'viewer');
    assert.strictEqual(pubGetData.data.s3Key, undefined);
    assert.strictEqual(pubGetData.data.orgId, undefined);

    // Attempting edit via viewer share link -> 403 Forbidden
    const viewerEdit = await fetch(`${baseUrl}/api/files/shared/${token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'malicious-overwrite.txt' }),
    });
    assert.strictEqual(viewerEdit.status, 403, 'Viewer share link must reject metadata edit with 403');

    // Upgrade share to permission: 'editor'
    await fetch(`${baseUrl}/api/files/${freshFileId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner.token}`,
        'x-workspace-id': owner.orgId,
      },
      body: JSON.stringify({
        linkAccess: 'anyone',
        permission: 'editor',
        allowDownload: true,
      }),
    });

    // Public edit via editor share link -> 200 OK
    const editorEdit = await fetch(`${baseUrl}/api/files/shared/${token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'authorized-deep-edit.txt' }),
    });
    assert.strictEqual(editorEdit.status, 200, 'Editor share link must allow edit');
    const editorEditData = await editorEdit.json();
    assert.strictEqual(editorEditData.data.name, 'authorized-deep-edit.txt');
  });

  test('REM-11: Storage Quota Atomic Enforcement, Race Condition & Reservation Cleanup', async () => {
    const { StorageQuotaService } = await import('../packages/server/src/core/files/StorageQuotaService.js');
    const quotaService = StorageQuotaService.getInstance();

    const statsRes = await fetch(`${baseUrl}/api/folders/stats`, {
      headers: {
        Authorization: `Bearer ${owner.token}`,
        'x-workspace-id': owner.orgId,
      },
    });
    const currentUsed = (await statsRes.json()).data.totalStorageUsed;

    // Set tight quota: currentUsed + 50KB allowed
    const tightLimit = currentUsed + 50 * 1024;
    await quotaService.setCustomQuota(owner.orgId, tightLimit);

    try {
      // 1. Upload exceeding quota (60KB) -> 413 Quota Exceeded
      const overBuf = crypto.randomBytes(60 * 1024);
      const overRes = await fetch(`${baseUrl}/api/files/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner.token}`,
          'x-workspace-id': owner.orgId,
        },
        body: JSON.stringify({
          name: 'over_quota.bin',
          contentBase64: overBuf.toString('base64'),
          mimeType: 'application/octet-stream',
        }),
      });
      assert.strictEqual(overRes.status, 413, 'Upload exceeding quota must be rejected with 413');
      const overData = await overRes.json();
      assert.match(overData.error, /vượt quá giới hạn/);

      // Verify reservation was released
      assert.strictEqual(await quotaService.getActiveReservedBytes(owner.orgId), 0, 'Reservation must be zero after rejection');

      // 2. Concurrent race condition: 2 uploads of 35KB competing for 50KB remaining quota
      const fileBuf1 = crypto.randomBytes(35 * 1024);
      const fileBuf2 = crypto.randomBytes(35 * 1024);

      const [res1, res2] = await Promise.all([
        fetch(`${baseUrl}/api/files/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${owner.token}`,
            'x-workspace-id': owner.orgId,
          },
          body: JSON.stringify({
            name: 'concurrent_1.bin',
            contentBase64: fileBuf1.toString('base64'),
            mimeType: 'application/octet-stream',
          }),
        }),
        fetch(`${baseUrl}/api/files/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${owner.token}`,
            'x-workspace-id': owner.orgId,
          },
          body: JSON.stringify({
            name: 'concurrent_2.bin',
            contentBase64: fileBuf2.toString('base64'),
            mimeType: 'application/octet-stream',
          }),
        }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      assert.deepStrictEqual(statuses, [201, 413], 'Exactly one upload must succeed (201) and one fail (413) due to atomic reservation');

      // 3. Verify reservation freed
      assert.strictEqual(await quotaService.getActiveReservedBytes(owner.orgId), 0, 'All reservations should be cleared');
    } finally {
      await quotaService.resetCustomQuota(owner.orgId);
    }
  });

  test('REM-12: Atomic Transactional Outbox Rollback & Event Consistency', async () => {
    const { FileService } = await import('../packages/server/src/core/files/FileService.js');
    const { WikiService } = await import('../packages/server/src/core/wiki/WikiService.js');

    const outboxCountBefore = await prisma.outboxEvent.count();

    // 1. Attempt updating share settings for non-existent file -> Transaction rolls back
    let shareFailed = false;
    try {
      await FileService.getInstance().updateShareSettings('non_existent_file_id', owner.orgId, {
        linkAccess: 'anyone',
        permission: 'viewer',
        allowDownload: true,
      });
    } catch {
      shareFailed = true;
    }
    assert.strictEqual(shareFailed, true);

    const outboxCountAfterShareFail = await prisma.outboxEvent.count();
    assert.strictEqual(outboxCountAfterShareFail, outboxCountBefore, 'No outbox event should be committed when business transaction fails');

    // 2. Successful SOP approval in WikiService commits both approval.approved and sop.published atomically
    const testSop = await WikiService.getInstance().createPage({
      orgId: owner.orgId,
      title: 'Atomic SOP Page Deep Verification',
      type: 'SOP',
      owner: owner.name,
      content: 'Standard operating procedure atomic outbox test',
    });

    const approvedPage = await WikiService.getInstance().updateStatus(testSop.id, owner.orgId, 'approved', admin.name);
    assert.strictEqual(approvedPage?.status, 'approved');

    const approvedEvent = await prisma.outboxEvent.findFirst({
      where: { type: 'approval.approved', orgId: owner.orgId },
      orderBy: { occurredAt: 'desc' },
    });
    assert.ok(approvedEvent, 'approval.approved event must be committed');

    const sopEvent = await prisma.outboxEvent.findFirst({
      where: { type: 'sop.published', orgId: owner.orgId },
      orderBy: { occurredAt: 'desc' },
    });
    assert.ok(sopEvent, 'sop.published event must be committed atomically');
  });

  test('REM-13: Shared-Link Commenter Role & Guest Commenting API', async () => {
    // 1. Create a fresh file and share with permission: 'commenter'
    const fileRes = await fetch(`${baseUrl}/api/files/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner.token}`,
        'x-workspace-id': owner.orgId,
      },
      body: JSON.stringify({
        name: 'contract-review-deep.pdf',
        contentBase64: Buffer.from('Contract terms for client review').toString('base64'),
        mimeType: 'application/pdf',
      }),
    });
    const fileId = (await fileRes.json()).data.id;

    const shareRes = await fetch(`${baseUrl}/api/files/${fileId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner.token}`,
        'x-workspace-id': owner.orgId,
      },
      body: JSON.stringify({
        linkAccess: 'anyone',
        permission: 'commenter',
        allowDownload: true,
      }),
    });
    const token = (await shareRes.json()).data.shareToken;

    // 2. Anonymous client posts comment via shared link token -> 201 Created
    const guestPost = await fetch(`${baseUrl}/api/files/shared/${token}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Điều khoản 4 cần điều chỉnh thời gian thanh toán.',
        authorName: 'Khách hàng TechCorp',
      }),
    });
    assert.strictEqual(guestPost.status, 201, 'Commenter shared link must allow posting comments');
    const guestPostData = await guestPost.json();
    assert.strictEqual(guestPostData.success, true);
    assert.strictEqual(guestPostData.data.content, 'Điều khoản 4 cần điều chỉnh thời gian thanh toán.');
    assert.match(guestPostData.data.authorName, /Khách hàng TechCorp/);
    assert.match(guestPostData.data.authorId, /^guest_/);

    // 3. Anonymous client retrieves comments via shared link token -> 200 OK
    const getComments = await fetch(`${baseUrl}/api/files/shared/${token}/comments`);
    assert.strictEqual(getComments.status, 200);
    const commentsData = await getComments.json();
    assert.ok(commentsData.data.length >= 1);
    assert.strictEqual(commentsData.data[0].content, 'Điều khoản 4 cần điều chỉnh thời gian thanh toán.');

    // 4. Commenter attempt to edit metadata -> 403 Forbidden
    const commenterEdit = await fetch(`${baseUrl}/api/files/shared/${token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'illegal-rename.pdf' }),
    });
    assert.strictEqual(commenterEdit.status, 403, 'Commenter must be forbidden from editing file metadata');

    // 5. Change permission to 'viewer' -> posting comments is now blocked with 403
    await fetch(`${baseUrl}/api/files/${fileId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner.token}`,
        'x-workspace-id': owner.orgId,
      },
      body: JSON.stringify({
        linkAccess: 'anyone',
        permission: 'viewer',
        allowDownload: true,
      }),
    });

    const viewerComment = await fetch(`${baseUrl}/api/files/shared/${token}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Viewer should be blocked' }),
    });
    assert.strictEqual(viewerComment.status, 403, 'Viewer must be forbidden from posting comments');
    assert.match((await viewerComment.json()).error, /viewer/);
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
});

