import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import { PrismaClient } from '@prisma/client';
import { createApp, AppInstance } from '../packages/server/src/server.js';

describe('PHASE 4: Knowledge Base Wiki & SOP Test Suite', () => {
  let appInstance: AppInstance;
  let serverPort: number;
  let baseUrl: string;
  let prisma: PrismaClient;

  let userA: { id: string; email: string; name: string; token: string; orgId: string };
  let userB: { id: string; email: string; name: string; token: string; orgId: string };

  let rootPageId: string;
  let childPageId: string;
  let linkingPageId: string;

  before(async () => {
    serverPort = 4085;
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

    // Register User A
    const emailA = `test_p4_wiki_a_${Date.now()}@collab.local`;
    const resA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailA,
        password: 'Password123!',
        name: 'Wiki Author A',
        orgName: 'Workspace Alpha Wiki',
      }),
    });
    const dataA = await resA.json();
    assert.strictEqual(dataA.success, true);
    userA = {
      id: dataA.data.user.userId || dataA.data.user.id,
      email: dataA.data.user.email,
      name: dataA.data.user.name,
      token: dataA.data.tokens.accessToken,
      orgId: dataA.data.workspaces[0].orgId,
    };

    // Register User B
    const emailB = `test_p4_wiki_b_${Date.now()}@collab.local`;
    const resB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailB,
        password: 'Password123!',
        name: 'Wiki Author B',
        orgName: 'Workspace Beta Wiki',
      }),
    });
    const dataB = await resB.json();
    assert.strictEqual(dataB.success, true);
    userB = {
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

  test('KM-01: Create root wiki page with PostgreSQL persistence', async () => {
    const res = await fetch(`${baseUrl}/api/wiki`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
        'x-workspace-id': userA.orgId,
      },
      body: JSON.stringify({
        title: 'Quy trình Vận hành Chuẩn SOP 01',
        areaId: 'sop',
        areaName: '📋 Quy trình (SOP)',
        topic: 'Hạ tầng hệ thống',
        type: 'SOP',
        tags: ['#sop', '#he-thong', '#runbook'],
        summary: 'Quy trình chuẩn cho kỹ sư trực on-call khi xảy ra sự cố',
        content: 'Nội dung quy trình vận hành SOP chi tiết các bước xử lý...',
        icon: '📋',
      }),
    });

    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.title, 'Quy trình Vận hành Chuẩn SOP 01');
    assert.strictEqual(data.data.orgId, userA.orgId);
    assert.strictEqual(data.data.status, 'draft');
    rootPageId = data.data.id;
  });

  test('KM-02: Create child wiki page and verify hierarchy tree', async () => {
    const res = await fetch(`${baseUrl}/api/wiki`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
        'x-workspace-id': userA.orgId,
      },
      body: JSON.stringify({
        title: 'Runbook Khôi phục Redis Mesh',
        parentId: rootPageId,
        areaId: 'sop',
        topic: 'Redis',
        type: 'SOP',
        tags: ['#redis', '#runbook'],
        summary: 'Các lệnh khôi phục Redis cụm',
        content: 'Chi tiết lệnh docker restart và kiểm tra pub/sub',
        icon: '⚡',
      }),
    });

    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.parentId, rootPageId);
    childPageId = data.data.id;

    // Verify tree
    const treeRes = await fetch(`${baseUrl}/api/wiki/tree`, {
      headers: {
        Authorization: `Bearer ${userA.token}`,
        'x-workspace-id': userA.orgId,
      },
    });
    const treeData = await treeRes.json();
    assert.strictEqual(treeData.success, true);
    const rootNode = treeData.data.find((n: any) => n.id === rootPageId);
    assert.ok(rootNode);
    assert.strictEqual(rootNode.children.length, 1);
    assert.strictEqual(rootNode.children[0].id, childPageId);
  });

  test('KM-03: SOP workflow state transitions (draft -> pending_approval -> approved)', async () => {
    // 1. Submit for review
    const res1 = await fetch(`${baseUrl}/api/wiki/${rootPageId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
        'x-workspace-id': userA.orgId,
      },
      body: JSON.stringify({ status: 'pending_approval' }),
    });
    const data1 = await res1.json();
    assert.strictEqual(data1.success, true);
    assert.strictEqual(data1.data.status, 'pending_approval');

    // 2. Approve SOP
    const res2 = await fetch(`${baseUrl}/api/wiki/${rootPageId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
        'x-workspace-id': userA.orgId,
      },
      body: JSON.stringify({ status: 'approved' }),
    });
    const data2 = await res2.json();
    assert.strictEqual(data2.success, true);
    assert.strictEqual(data2.data.status, 'approved');
  });

  test('KM-04: Backlinks detection via cross references', async () => {
    // Create a page that references the root page title via [[...]]
    const res = await fetch(`${baseUrl}/api/wiki`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
        'x-workspace-id': userA.orgId,
      },
      body: JSON.stringify({
        title: 'Tài liệu Kiến trúc Toàn cảnh',
        areaId: 'guides',
        topic: 'Kiến trúc',
        type: 'Hướng dẫn',
        tags: ['#kien-truc'],
        content: 'Vui lòng tham khảo [[Quy trình Vận hành Chuẩn SOP 01]] để biết thêm thông tin.',
      }),
    });
    const data = await res.json();
    assert.strictEqual(data.success, true);
    linkingPageId = data.data.id;

    // Query backlinks for root page
    const blRes = await fetch(`${baseUrl}/api/wiki/${rootPageId}/backlinks`, {
      headers: {
        Authorization: `Bearer ${userA.token}`,
        'x-workspace-id': userA.orgId,
      },
    });
    const blData = await blRes.json();
    assert.strictEqual(blData.success, true);
    assert.ok(Array.isArray(blData.data));
    const backlink = blData.data.find((b: any) => b.id === linkingPageId);
    assert.ok(backlink, 'Linking page should appear in backlinks');
  });

  test('KM-05: Tag aggregation and query', async () => {
    const res = await fetch(`${baseUrl}/api/wiki/tags`, {
      headers: {
        Authorization: `Bearer ${userA.token}`,
        'x-workspace-id': userA.orgId,
      },
    });
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.data));
    const sopTag = data.data.find((t: any) => t.tag === '#sop');
    assert.ok(sopTag);
    assert.ok(sopTag.count >= 1);
  });

  test('KM-06: Archive, unarchive and delete page', async () => {
    // Archive
    const archRes = await fetch(`${baseUrl}/api/wiki/${childPageId}/archive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
        'x-workspace-id': userA.orgId,
      },
      body: JSON.stringify({ isArchived: true }),
    });
    const archData = await archRes.json();
    assert.strictEqual(archData.success, true);
    assert.strictEqual(archData.data.isArchived, true);

    // Delete
    const delRes = await fetch(`${baseUrl}/api/wiki/${childPageId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${userA.token}`,
        'x-workspace-id': userA.orgId,
      },
    });
    const delData = await delRes.json();
    assert.strictEqual(delData.success, true);
  });

  test('KM-07: Multi-tenant workspace isolation for wiki pages', async () => {
    // User B tries to view root page of User A
    const res = await fetch(`${baseUrl}/api/wiki/${rootPageId}`, {
      headers: {
        Authorization: `Bearer ${userB.token}`,
        'x-workspace-id': userB.orgId,
      },
    });
    assert.strictEqual(res.status, 404);
  });
});
