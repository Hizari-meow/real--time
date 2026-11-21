import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import { PrismaClient } from '@prisma/client';
import { createApp, AppInstance } from '../packages/server/src/server.js';

describe('PHASE 4: File Management & Cloud Drive Test Suite', () => {
  let appInstance: AppInstance;
  let serverPort: number;
  let baseUrl: string;
  let prisma: PrismaClient;

  let ownerA: { id: string; email: string; name: string; token: string; orgId: string };
  let ownerB: { id: string; email: string; name: string; token: string; orgId: string };

  let folderId: string;
  let fileId: string;
  let shareToken: string;

  before(async () => {
    serverPort = 4084;
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

    // Register User A (Org A)
    const emailA = `test_p4_user_a_${Date.now()}@collab.local`;
    const resA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailA,
        password: 'Password123!',
        name: 'File Manager User A',
        orgName: 'Workspace Alpha Drive',
      }),
    });
    const dataA = await resA.json();
    assert.strictEqual(dataA.success, true);
    ownerA = {
      id: dataA.data.user.userId || dataA.data.user.id,
      email: dataA.data.user.email,
      name: dataA.data.user.name,
      token: dataA.data.tokens.accessToken,
      orgId: dataA.data.workspaces[0].orgId,
    };

    // Register User B (Org B)
    const emailB = `test_p4_user_b_${Date.now()}@collab.local`;
    const resB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailB,
        password: 'Password123!',
        name: 'File Manager User B',
        orgName: 'Workspace Beta Drive',
      }),
    });
    const dataB = await resB.json();
    assert.strictEqual(dataB.success, true);
    ownerB = {
      id: dataB.data.user.userId || dataB.data.user.id,
      email: dataB.data.user.email,
      name: dataB.data.user.name,
      token: dataB.data.tokens.accessToken,
      orgId: dataB.data.workspaces[0].orgId,
    };
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
    setTimeout(() => process.exit(0), 500);
  });

  test('FM-01: Create Folder with hierarchy and category', async () => {
    const res = await fetch(`${baseUrl}/api/folders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerA.token}`,
        'x-workspace-id': ownerA.orgId,
      },
      body: JSON.stringify({
        name: 'Tài liệu Dự án Alpha',
        category: 'project',
        color: '#3b82f6',
      }),
    });

    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.name, 'Tài liệu Dự án Alpha');
    assert.strictEqual(data.data.category, 'project');
    assert.strictEqual(data.data.orgId, ownerA.orgId);
    folderId = data.data.id;
  });

  test('FM-02: Upload file to folder via MinIO S3', async () => {
    const fileContent = 'Nội dung file kiểm thử Phase 4 Cloud Drive';
    const contentBase64 = Buffer.from(fileContent).toString('base64');

    const res = await fetch(`${baseUrl}/api/files/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerA.token}`,
        'x-workspace-id': ownerA.orgId,
      },
      body: JSON.stringify({
        name: 'test_document_phase4.txt',
        contentBase64,
        mimeType: 'text/plain',
        category: 'document',
        folderId,
      }),
    });

    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.name, 'test_document_phase4.txt');
    assert.strictEqual(data.data.category, 'document');
    assert.strictEqual(data.data.orgId, ownerA.orgId);
    assert.strictEqual(data.data.folderId, folderId);
    assert.strictEqual(data.data.versions.length, 1);
    fileId = data.data.id;
  });

  test('FM-03: Download file and verify exact byte content', async () => {
    const res = await fetch(`${baseUrl}/api/files/${fileId}/download`, {
      headers: {
        Authorization: `Bearer ${ownerA.token}`,
        'x-workspace-id': ownerA.orgId,
      },
    });

    assert.strictEqual(res.status, 200);
    const text = await res.text();
    assert.strictEqual(text, 'Nội dung file kiểm thử Phase 4 Cloud Drive');
  });

  test('FM-04: Multi-tenant workspace isolation for files', async () => {
    // User B in Org B tries to access file of User A in Org A
    const res = await fetch(`${baseUrl}/api/files/${fileId}`, {
      headers: {
        Authorization: `Bearer ${ownerB.token}`,
        'x-workspace-id': ownerB.orgId,
      },
    });

    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(res.status, 404);
  });

  test('FM-05: Upload new version and verify version history', async () => {
    const newContent = 'Nội dung file đã cập nhật phiên bản 2.0';
    const contentBase64 = Buffer.from(newContent).toString('base64');

    const res = await fetch(`${baseUrl}/api/files/${fileId}/versions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerA.token}`,
        'x-workspace-id': ownerA.orgId,
      },
      body: JSON.stringify({
        contentBase64,
        mimeType: 'text/plain',
        changeSummary: 'Nâng cấp nội dung phiên bản 2',
      }),
    });

    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.versions.length, 2);
    assert.strictEqual(data.data.versions[0].version, 2);
    assert.strictEqual(data.data.versions[0].changeSummary, 'Nâng cấp nội dung phiên bản 2');

    // Download latest version
    const dlRes = await fetch(`${baseUrl}/api/files/${fileId}/download`, {
      headers: {
        Authorization: `Bearer ${ownerA.token}`,
        'x-workspace-id': ownerA.orgId,
      },
    });
    const dlText = await dlRes.text();
    assert.strictEqual(dlText, newContent);
  });

  test('FM-06: File sharing settings and password protected link access', async () => {
    const res = await fetch(`${baseUrl}/api/files/${fileId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerA.token}`,
        'x-workspace-id': ownerA.orgId,
      },
      body: JSON.stringify({
        linkAccess: 'anyone',
        allowDownload: true,
        password: 'SecretSharePassword123',
      }),
    });

    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.linkAccess, 'anyone');
    assert.strictEqual(data.data.hasPassword, true);

    shareToken = data.data.shareToken;

    // Public link without password -> 401 requires password
    const pubRes1 = await fetch(`${baseUrl}/api/files/shared/${shareToken}`);
    const pubData1 = await pubRes1.json();
    assert.strictEqual(pubData1.success, false);
    assert.strictEqual(pubData1.requiresPassword, true);

    // Public link with correct password -> 200
    const pubRes2 = await fetch(`${baseUrl}/api/files/shared/${shareToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'SecretSharePassword123' }),
    });
    const pubData2 = await pubRes2.json();
    assert.strictEqual(pubData2.success, true);
    assert.strictEqual(pubData2.data.name, 'test_document_phase4.txt');
  });

  test('FM-07: Trash, restore and permanent purge cycle', async () => {
    // Move to Trash
    const trashRes = await fetch(`${baseUrl}/api/files/${fileId}/trash`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerA.token}`,
        'x-workspace-id': ownerA.orgId,
      },
    });
    const trashData = await trashRes.json();
    assert.strictEqual(trashData.success, true);

    // Verify excluded from active files
    const listRes1 = await fetch(`${baseUrl}/api/files`, {
      headers: {
        Authorization: `Bearer ${ownerA.token}`,
        'x-workspace-id': ownerA.orgId,
      },
    });
    const listData1 = await listRes1.json();
    const activeFile = listData1.data.find((f: any) => f.id === fileId);
    assert.strictEqual(activeFile, undefined);

    // Restore from trash
    const restoreRes = await fetch(`${baseUrl}/api/files/${fileId}/restore`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerA.token}`,
        'x-workspace-id': ownerA.orgId,
      },
    });
    const restoreData = await restoreRes.json();
    assert.strictEqual(restoreData.success, true);

    // Verify present in active list
    const listRes2 = await fetch(`${baseUrl}/api/files`, {
      headers: {
        Authorization: `Bearer ${ownerA.token}`,
        'x-workspace-id': ownerA.orgId,
      },
    });
    const listData2 = await listRes2.json();
    const restoredFile = listData2.data.find((f: any) => f.id === fileId);
    assert.ok(restoredFile);

    // Purge file
    const purgeRes = await fetch(`${baseUrl}/api/files/${fileId}/purge`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${ownerA.token}`,
        'x-workspace-id': ownerA.orgId,
      },
    });
    const purgeData = await purgeRes.json();
    assert.strictEqual(purgeData.success, true);
  });
});
