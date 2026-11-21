import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import { PrismaClient } from '@prisma/client';
import { createApp, AppInstance } from '../packages/server/src/server.js';

describe('PHASE 4: Document Comments & Mentions Test Suite', () => {
  let appInstance: AppInstance;
  let serverPort: number;
  let baseUrl: string;
  let prisma: PrismaClient;

  let authorA: { id: string; email: string; name: string; token: string; orgId: string };
  let memberA: { id: string; email: string; name: string; token: string; orgId: string };
  let userB: { id: string; email: string; name: string; token: string; orgId: string };

  let documentId: string;
  let commentId: string;
  let replyId: string;

  before(async () => {
    serverPort = 4086;
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

    // Register Author A in Org A
    const emailA = `test_p4_cmt_a_${Date.now()}@collab.local`;
    const resA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailA,
        password: 'Password123!',
        name: 'Nguyen Van Author',
        orgName: 'Workspace Alpha Comments',
      }),
    });
    const dataA = await resA.json();
    assert.strictEqual(dataA.success, true);
    authorA = {
      id: dataA.data.user.userId || dataA.data.user.id,
      email: dataA.data.user.email,
      name: dataA.data.user.name,
      token: dataA.data.tokens.accessToken,
      orgId: dataA.data.workspaces[0].orgId,
    };

    // Register Member A and add to Org A
    const emailMem = `test_p4_cmt_mem_${Date.now()}@collab.local`;
    const resMem = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailMem,
        password: 'Password123!',
        name: 'Tran Thi Member',
        orgName: 'Temp Workspace Mem',
      }),
    });
    const dataMem = await resMem.json();
    assert.strictEqual(dataMem.success, true);
    const memberAId = dataMem.data.user.userId || dataMem.data.user.id;

    await prisma.member.create({
      data: {
        orgId: authorA.orgId,
        userId: memberAId,
        name: 'Tran Thi Member',
        email: emailMem,
        role: 'member',
        status: 'active',
      },
    });

    memberA = {
      id: memberAId,
      email: emailMem,
      name: 'Tran Thi Member',
      token: dataMem.data.tokens.accessToken,
      orgId: authorA.orgId,
    };

    // Register User B in Org B (for isolation test)
    const emailB = `test_p4_cmt_b_${Date.now()}@collab.local`;
    const resB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailB,
        password: 'Password123!',
        name: 'Isolated User B',
        orgName: 'Workspace Beta Comments',
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

    documentId = `doc_p4_test_${Date.now()}`;
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

  test('DC-01: Create Contextual Comment with DOM anchor', async () => {
    const anchorData = {
      selectedText: 'Hội tụ CRDT dưới 5ms',
      isSuggestion: false,
      isTask: false,
    };

    const res = await fetch(`${baseUrl}/api/documents/${documentId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorA.token}`,
        'x-workspace-id': authorA.orgId,
      },
      body: JSON.stringify({
        content: 'Cần bổ sung biểu đồ benchmark latency cho đoạn này!',
        anchorJson: JSON.stringify(anchorData),
        authorName: authorA.name,
      }),
    });

    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.documentId, documentId);
    assert.strictEqual(data.data.authorId, authorA.id);
    assert.strictEqual(data.data.status, 'open');
    assert.ok(data.data.anchorJson.includes('Hội tụ CRDT dưới 5ms'));
    commentId = data.data.id;
  });

  test('DC-02: Create Thread Reply to existing comment', async () => {
    const res = await fetch(`${baseUrl}/api/documents/${documentId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberA.token}`,
        'x-workspace-id': memberA.orgId,
      },
      body: JSON.stringify({
        content: 'Đã hoàn thành benchmark trên môi trường staging rồi nhé.',
        parentId: commentId,
        authorName: memberA.name,
      }),
    });

    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.parentId, commentId);
    replyId = data.data.id;
  });

  test('DC-03: Retrieve nested comment hierarchy with replies', async () => {
    const res = await fetch(`${baseUrl}/api/documents/${documentId}/comments`, {
      headers: {
        Authorization: `Bearer ${authorA.token}`,
        'x-workspace-id': authorA.orgId,
      },
    });

    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.length, 1);
    const rootComment = data.data[0];
    assert.strictEqual(rootComment.id, commentId);
    assert.strictEqual(rootComment.replies.length, 1);
    assert.strictEqual(rootComment.replies[0].id, replyId);
  });

  test('DC-04: Mention in comment triggers Notification dispatch', async () => {
    // Post comment mentioning memberA
    const res = await fetch(`${baseUrl}/api/documents/${documentId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorA.token}`,
        'x-workspace-id': authorA.orgId,
      },
      body: JSON.stringify({
        content: `@Member nhờ bạn kiểm tra lại phần bảo mật nhé`,
        authorName: authorA.name,
      }),
    });

    const data = await res.json();
    assert.strictEqual(data.success, true);

    // Verify notification was created for memberA
    const notifs = await prisma.notification.findMany({
      where: {
        orgId: authorA.orgId,
        userId: memberA.id,
      },
    });
    assert.ok(notifs.length >= 1, 'Mentioned user should receive notification');
    const mentionNotif = notifs.find((n) => n.title.includes('nhắc'));
    assert.ok(mentionNotif, 'Should have mention notification');
  });

  test('DC-05: Resolve and Delete comment', async () => {
    // Resolve
    const res1 = await fetch(`${baseUrl}/api/documents/${documentId}/comments/${commentId}/resolve`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${authorA.token}`,
        'x-workspace-id': authorA.orgId,
      },
    });
    const data1 = await res1.json();
    assert.strictEqual(data1.success, true);
    assert.strictEqual(data1.data.status, 'resolved');

    // Delete
    const res2 = await fetch(`${baseUrl}/api/documents/${documentId}/comments/${replyId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${memberA.token}`,
        'x-workspace-id': memberA.orgId,
      },
    });
    const data2 = await res2.json();
    assert.strictEqual(data2.success, true);
  });

  test('DC-06: Multi-tenant workspace isolation for document comments', async () => {
    // User B in Org B tries to access Org A's document comments
    const res = await fetch(`${baseUrl}/api/documents/${documentId}/comments`, {
      headers: {
        Authorization: `Bearer ${userB.token}`,
        'x-workspace-id': userB.orgId,
      },
    });
    const data = await res.json();
    assert.strictEqual(data.success, true);
    // User B receives empty list because documents are scoped by Org B
    assert.strictEqual(data.data.length, 0);
  });
});
