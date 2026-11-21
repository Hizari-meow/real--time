import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { createApp, AppInstance } from '../packages/server/src/server.js';
import { config } from '../packages/server/src/config.js';

describe('PHASE 4: Remediation Verification & Security Hardening Test Suite', () => {
  let appInstance: AppInstance;
  let serverPort: number;
  let baseUrl: string;
  let prisma: PrismaClient;

  let owner: { id: string; email: string; name: string; token: string; orgId: string };
  let admin: { id: string; email: string; name: string; token: string; orgId: string };
  let member: { id: string; email: string; name: string; token: string; orgId: string };
  let guest: { id: string; email: string; name: string; token: string; orgId: string };

  let testFileId: string;
  let testWikiId: string;
  let testDocId: string;

  before(async () => {
    serverPort = 4087;
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
      appInstance.httpServer.listen(serverPort, () => {
        resolve();
      });
    });

    try {
      // 1. Register Owner & Create Workspace
      const ownerEmail = `remed_owner_${Date.now()}@collab.local`;
      const resOwner = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ownerEmail,
          password: 'Password123!',
          name: 'Workspace Owner',
          orgName: 'Remediation Hardening Org',
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

      // Helper to create members with specific roles
      const createRoleUser = async (name: string, role: string) => {
        const email = `remed_${role}_${Date.now()}@collab.local`;
        const invRes = await fetch(`${baseUrl}/api/members`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${owner.token}`,
            'x-workspace-id': owner.orgId,
          },
          body: JSON.stringify({
            name,
            email,
            role,
            department: 'Engineering',
          }),
        });
        const invData = await invRes.json();
        assert.strictEqual(invData.success, true, `Failed to invite ${role}: ${JSON.stringify(invData)}`);

        const userRecord = await prisma.user.findUnique({ where: { email } });
        assert.ok(userRecord, `User record for ${email} should exist`);

        const token = jwt.sign(
          { userId: userRecord.id, email: userRecord.email, name: userRecord.name },
          config.jwt.secret,
          { expiresIn: '1h' }
        );

        return {
          id: userRecord.id,
          email: userRecord.email,
          name: userRecord.name,
          token,
          orgId: owner.orgId,
        };
      };

      admin = await createRoleUser('Workspace Admin', 'admin');
      member = await createRoleUser('Workspace Member', 'member');
      guest = await createRoleUser('Workspace Guest', 'guest');

      // Base document ID for comment tests
      testDocId = `doc_remed_${Date.now()}`;
    } catch (err) {
      console.error('[BEFORE HOOK FAILED]:', err);
      throw err;
    }
  });

  after(async () => {
    try {
      const { getOutboxRelay } = await import('../packages/server/src/core/events/index.js');
      getOutboxRelay().stop();
    } catch {}
    await prisma.$disconnect();
    if (appInstance?.gateway) await appInstance.gateway.shutdown();
    if (appInstance?.httpServer) {
      await new Promise<void>((resolve) => {
        appInstance.httpServer.close(() => resolve());
      });
    }
  });

  const apiReq = (method: string, url: string, user?: { token: string; orgId: string }, body?: any) => {
    const headers: Record<string, string> = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (user?.token) headers['Authorization'] = `Bearer ${user.token}`;
    if (user?.orgId) headers['x-workspace-id'] = user.orgId;
    return fetch(`${baseUrl}${url}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  test('REM-01: RBAC Matrix Enforcement on Phase 4 Resources', async () => {
    // 1.1 Guest upload -> 403
    const guestUpload = await apiReq('POST', '/api/files/upload', guest, {
      name: 'guest-unauthorized.txt', contentBase64: Buffer.from('guest data').toString('base64'),
    });
    assert.strictEqual(guestUpload.status, 403, 'Guest should receive 403 on file upload');

    // 1.2 Member upload -> 201
    const memberUpload = await apiReq('POST', '/api/files/upload', member, {
      name: 'member-authorized.txt', contentBase64: Buffer.from('member valid data').toString('base64'), mimeType: 'text/plain',
    });
    assert.strictEqual(memberUpload.status, 201, 'Member should receive 201 on file upload');
    testFileId = (await memberUpload.json()).data.id;

    // 1.3 Guest folder -> 403
    const guestFolder = await apiReq('POST', '/api/folders', guest, { name: 'Guest Folder' });
    assert.strictEqual(guestFolder.status, 403, 'Guest should receive 403 on folder creation');

    // 1.4 Member folder -> 201
    const memberFolder = await apiReq('POST', '/api/folders', member, { name: 'Member Team Folder' });
    assert.strictEqual(memberFolder.status, 201, 'Member should receive 201 on folder creation');

    // 1.5 Guest wiki -> 403
    const guestWiki = await apiReq('POST', '/api/wiki', guest, { title: 'Guest Wiki' });
    assert.strictEqual(guestWiki.status, 403, 'Guest should receive 403 on wiki creation');

    // 1.6 Member wiki -> 201
    const memberWiki = await apiReq('POST', '/api/wiki', member, {
      title: 'Quy trình vận hành chuẩn SOP-01', type: 'sop', status: 'draft',
    });
    assert.strictEqual(memberWiki.status, 201, 'Member should receive 201 on wiki creation');
    testWikiId = (await memberWiki.json()).data.id;

    // 1.7 Member approve SOP -> 403
    const memberApprove = await apiReq('PATCH', `/api/wiki/${testWikiId}/status`, member, { status: 'approved' });
    assert.strictEqual(memberApprove.status, 403, 'Member cannot approve SOP workflows');

    // 1.8 Admin approve SOP -> 200
    const adminApprove = await apiReq('PATCH', `/api/wiki/${testWikiId}/status`, admin, { status: 'approved' });
    assert.strictEqual(adminApprove.status, 200, 'Admin can approve SOP workflows');
    assert.strictEqual((await adminApprove.json()).data.status, 'approved');

    // 1.9 Guest comment -> 403
    const guestComment = await apiReq('POST', `/api/documents/${testDocId}/comments`, guest, { content: 'Guest comment' });
    assert.strictEqual(guestComment.status, 403, 'Guest cannot create document comments');

    // 1.10 Member comment -> 201
    const memberComment = await apiReq('POST', `/api/documents/${testDocId}/comments`, member, { content: 'Member feedback comment' });
    assert.strictEqual(memberComment.status, 201, 'Member can create document comments');

    // 1.11 Member purge -> 403
    const memberPurge = await apiReq('DELETE', `/api/files/${testFileId}/purge`, member);
    assert.strictEqual(memberPurge.status, 403, 'Member cannot permanently purge files');
  });

  test('REM-02: Public Share Link Access Control & Response Sanitization', async () => {
    // 2.1 Restricted share
    const shareRestricted = await apiReq('POST', `/api/files/${testFileId}/share`, owner, {
      linkAccess: 'restricted', allowDownload: true,
    });
    const token = (await shareRestricted.json()).data.shareToken;
    assert.ok(token, 'Share token should be generated');

    const pubRestricted = await fetch(`${baseUrl}/api/files/shared/${token}`);
    assert.strictEqual(pubRestricted.status, 400);
    assert.match((await pubRestricted.json()).error, /hạn chế quyền truy cập/);

    // 2.2 Organization share
    await apiReq('POST', `/api/files/${testFileId}/share`, owner, {
      linkAccess: 'organization', allowDownload: true,
    });
    assert.strictEqual((await fetch(`${baseUrl}/api/files/shared/${token}`)).status, 400);
    const pubOrgAuth = await apiReq('GET', `/api/files/shared/${token}`, member);
    assert.strictEqual(pubOrgAuth.status, 200);

    // 2.3 Password-protected share
    await apiReq('POST', `/api/files/${testFileId}/share`, owner, {
      linkAccess: 'anyone', allowDownload: true, password: 'SecretSharePassword123!',
    });
    const pubPassInit = await fetch(`${baseUrl}/api/files/shared/${token}`);
    assert.strictEqual(pubPassInit.status, 401);
    assert.strictEqual((await pubPassInit.json()).requiresPassword, true);

    const pubPassCorrect = await fetch(`${baseUrl}/api/files/shared/${token}?password=SecretSharePassword123!`);
    assert.strictEqual(pubPassCorrect.status, 200);
    const pubPassData = (await pubPassCorrect.json()).data;
    assert.strictEqual(pubPassData.key, undefined, 'Public share response must not expose internal key');
    assert.strictEqual(pubPassData.s3Key, undefined, 'Public share response must not expose internal s3Key');
    assert.strictEqual(pubPassData.orgId, undefined, 'Public share response must not expose internal orgId');
    assert.ok(pubPassData.name, 'Public response should contain file name');
  });

  test('REM-03: Real File Preview Endpoint (Text, CSV, Image, Unsupported)', async () => {
    // 3.1 Text Preview
    const textFile = await apiReq('POST', '/api/files/upload', owner, {
      name: 'rfc_architecture.txt',
      contentBase64: Buffer.from('Architecture Design RFC 2026 Content').toString('base64'),
      mimeType: 'text/plain',
    });
    const textPreview = (await (await apiReq('GET', `/api/files/${(await textFile.json()).data.id}/preview`, owner)).json()).data;
    assert.strictEqual(textPreview.previewType, 'text');
    assert.strictEqual(textPreview.content, 'Architecture Design RFC 2026 Content');

    // 3.2 CSV Preview
    const csvContent = 'A,B,C\nVal1,Val2,Val3\n100,200,300';
    const csvFile = await apiReq('POST', '/api/files/upload', owner, {
      name: 'financial_q4.csv', contentBase64: Buffer.from(csvContent).toString('base64'), mimeType: 'text/csv',
    });
    const csvPreview = (await (await apiReq('GET', `/api/files/${(await csvFile.json()).data.id}/preview`, owner)).json()).data;
    assert.strictEqual(csvPreview.previewType, 'csv');
    assert.strictEqual(csvPreview.rows.length, 3);
    assert.deepStrictEqual(csvPreview.rows[0], ['A', 'B', 'C']);

    // 3.3 Image Preview
    const imgFile = await apiReq('POST', '/api/files/upload', owner, {
      name: 'logo.png', contentBase64: Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64'), mimeType: 'image/png',
    });
    const imgPreview = (await (await apiReq('GET', `/api/files/${(await imgFile.json()).data.id}/preview`, owner)).json()).data;
    assert.strictEqual(imgPreview.previewType, 'image');
    assert.ok(imgPreview.url);

    // 3.4 Unsupported Binary Preview
    const binFile = await apiReq('POST', '/api/files/upload', owner, {
      name: 'archive.bin', contentBase64: Buffer.from([0x00, 0x01, 0x02]).toString('base64'), mimeType: 'application/octet-stream',
    });
    const binPreview = (await (await apiReq('GET', `/api/files/${(await binFile.json()).data.id}/preview`, owner)).json()).data;
    assert.strictEqual(binPreview.previewType, 'unsupported');
    assert.ok(binPreview.message);
  });

  test('REM-04: Large File Upload (> 100KB) & SHA-256 Hash Integrity', async () => {
    // Generate 180KB of random data
    const largeBuffer = crypto.randomBytes(180 * 1024);
    const expectedSha256 = crypto.createHash('sha256').update(largeBuffer).digest('hex');

    const uploadRes = await fetch(`${baseUrl}/api/files/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner.token}`,
        'x-workspace-id': owner.orgId,
      },
      body: JSON.stringify({
        name: 'large_dataset.bin',
        contentBase64: largeBuffer.toString('base64'),
        mimeType: 'application/octet-stream',
      }),
    });

    assert.strictEqual(uploadRes.status, 201, 'Should handle > 100KB payload without 413 error');
    const uploadData = await uploadRes.json();
    assert.strictEqual(uploadData.data.size, 180 * 1024);

    // Verify SHA-256 integrity hash in version entry
    assert.ok(uploadData.data.versions && uploadData.data.versions.length > 0);
    assert.strictEqual(uploadData.data.versions[0].sha256, expectedSha256);
  });

  test('REM-05: Storage Quota & Workspace Statistics Endpoint', async () => {
    const statsRes = await fetch(`${baseUrl}/api/folders/stats`, {
      headers: {
        Authorization: `Bearer ${owner.token}`,
        'x-workspace-id': owner.orgId,
      },
    });

    assert.strictEqual(statsRes.status, 200);
    const statsData = await statsRes.json();
    assert.strictEqual(statsData.success, true);
    assert.ok(statsData.data.totalStorageUsed > 180 * 1024, 'Storage used should aggregate byte size');
    assert.ok(statsData.data.totalFiles >= 4, 'Total files count should match');
    assert.strictEqual(statsData.data.quotaBytes, 10 * 1024 * 1024 * 1024);
    assert.ok(typeof statsData.data.usagePercentage === 'number');
  });

  test('REM-06: Port 3005 Next.js Proxy Integration Verification', async () => {
    const webRes = await fetch('http://localhost:3005/api/folders/stats', {
      headers: {
        Authorization: `Bearer ${owner.token}`,
        'x-workspace-id': owner.orgId,
      },
    });

    assert.strictEqual(webRes.status, 200, 'Port 3005 Next.js proxy should forward /api calls cleanly');
    const webData = await webRes.json();
    assert.strictEqual(webData.success, true);
    assert.ok(webData.data.totalStorageUsed > 0);
  });

  test('REM-07: Multipart Streaming Upload & S3 Object Rollback on Failure', async () => {
    // 7.1 Multipart form upload
    const fileBytes = crypto.randomBytes(48 * 1024);
    const expectedHash = crypto.createHash('sha256').update(fileBytes).digest('hex');

    const form = new FormData();
    form.append('file', new Blob([fileBytes], { type: 'application/pdf' }), 'multipart-stream.pdf');
    form.append('category', 'document');

    const uploadRes = await fetch(`${baseUrl}/api/files/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${owner.token}`,
        'x-workspace-id': owner.orgId,
      },
      body: form,
    });

    assert.strictEqual(uploadRes.status, 201, 'Multipart stream upload should return 201');
    const uploadData = await uploadRes.json();
    assert.strictEqual(uploadData.success, true);
    assert.strictEqual(uploadData.data.name, 'multipart-stream.pdf');
    assert.strictEqual(uploadData.data.size, 48 * 1024);
    assert.strictEqual(uploadData.data.versions[0].sha256, expectedHash);

    // 7.2 S3 Object Rollback on DB persistence failure
    const { FileStreamService } = await import('../packages/server/src/core/files/FileStreamService.js');
    const { s3 } = await import('../packages/server/src/storage/s3-client.js');
    const { getPrismaClient } = await import('../packages/server/src/storage/db.js');
    const { Readable } = await import('node:stream');

    const dbClient = getPrismaClient();
    const originalCreate = dbClient.fileRecord.create.bind(dbClient.fileRecord);
    let capturedKey: string | null = null;
    (dbClient.fileRecord as any).create = async (args: any) => {
      capturedKey = args?.data?.s3Key;
      throw new Error('Simulated DB Insertion Error for Rollback Test');
    };

    let caughtError = false;
    try {
      const rollbackStream = Readable.from(Buffer.from('rollback-test-payload'));
      await FileStreamService.getInstance().uploadStream({
        orgId: owner.orgId,
        ownerId: owner.id,
        name: 'should-rollback.bin',
        mimeType: 'application/octet-stream',
        category: 'other',
        fileStream: rollbackStream,
      });
    } catch (err: any) {
      caughtError = true;
      assert.match(err.message, /Simulated DB Insertion Error/);
    } finally {
      (dbClient.fileRecord as any).create = originalCreate;
    }

    assert.strictEqual(caughtError, true, 'uploadStream must propagate the DB failure');
    assert.ok(capturedKey, 'Captured s3Key should exist');

    let s3Exists = true;
    try {
      await s3.getObject(capturedKey!);
    } catch {
      s3Exists = false;
    }
    assert.strictEqual(s3Exists, false, 'S3 object should be deleted during rollback');
  });

  test('REM-08: Wiki Hierarchy Cycle Detection (Self, Descendant, Cross-Workspace)', async () => {
    const createWiki = async (title: string, parentId?: string | null) => {
      const res = await fetch(`${baseUrl}/api/wiki`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner.token}`,
          'x-workspace-id': owner.orgId,
        },
        body: JSON.stringify({ title, parentId: parentId || null }),
      });
      const data = await res.json();
      return data.data;
    };

    const p1 = await createWiki('Wiki Tree P1 Root');
    const p2 = await createWiki('Wiki Tree P2 Level 1', p1.id);
    const p3 = await createWiki('Wiki Tree P3 Level 2', p2.id);

    // Self-parenting attempt -> 400 Bad Request
    const selfMove = await fetch(`${baseUrl}/api/wiki/${p1.id}/move`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner.token}`,
        'x-workspace-id': owner.orgId,
      },
      body: JSON.stringify({ parentId: p1.id }),
    });
    assert.strictEqual(selfMove.status, 400);
    const selfData = await selfMove.json();
    assert.match(selfData.error, /Trang không thể là cha của chính nó/);

    // Descendant cycle: Moving P1 to P3 -> 400 Bad Request
    const cycleMove = await fetch(`${baseUrl}/api/wiki/${p1.id}/move`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner.token}`,
        'x-workspace-id': owner.orgId,
      },
      body: JSON.stringify({ parentId: p3.id }),
    });
    assert.strictEqual(cycleMove.status, 400);
    const cycleData = await cycleMove.json();
    assert.match(cycleData.error, /chu trình/);

    // Cross-workspace parenting -> 400 Bad Request
    const otherUserRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `other_org_${Date.now()}@collab.local`,
        password: 'Password123!',
        name: 'Other Org User',
        orgName: 'Second Foreign Org',
      }),
    });
    const otherData = await otherUserRes.json();
    const otherOrgId = otherData.data.workspaces[0].orgId;

    const otherOrgWiki = await prisma.wikiPage.create({
      data: {
        id: `wiki-other-${Date.now()}`,
        orgId: otherOrgId,
        title: 'Foreign Org Wiki',
        owner: 'other-user',
        content: 'content',
      },
    });

    const foreignMove = await fetch(`${baseUrl}/api/wiki/${p1.id}/move`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner.token}`,
        'x-workspace-id': owner.orgId,
      },
      body: JSON.stringify({ parentId: otherOrgWiki.id }),
    });
    assert.strictEqual(foreignMove.status, 400);
    const foreignData = await foreignMove.json();
    assert.match(foreignData.error, /không tồn tại trong không gian làm việc/);

    // Valid reparenting to root -> 200 OK
    const rootMove = await fetch(`${baseUrl}/api/wiki/${p3.id}/move`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${owner.token}`,
        'x-workspace-id': owner.orgId,
      },
      body: JSON.stringify({ parentId: null }),
    });
    assert.strictEqual(rootMove.status, 200);
    const rootData = await rootMove.json();
    assert.strictEqual(rootData.data.parentId, null);
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


