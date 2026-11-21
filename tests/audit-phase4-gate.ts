import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { createApp, AppInstance } from '../packages/server/src/server.js';

describe('PHASE 4 INDEPENDENT FINAL ACCEPTANCE GATE VERIFICATION', () => {
  let appInstance: AppInstance;
  let serverPort: number;
  let baseUrl: string;
  let prisma: PrismaClient;

  let ownerA: { id: string; email: string; name: string; token: string; orgId: string };
  let memberA: { id: string; email: string; name: string; token: string; orgId: string };
  let userB: { id: string; email: string; name: string; token: string; orgId: string };

  let folderId: string;
  let fileId: string;
  let shareToken: string;
  let wikiRootId: string;
  let wikiChildId: string;
  let docCommentId: string;

  before(async () => {
    serverPort = 4094;
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

    // 1. Setup Workspace Alpha Owner
    const emailA = `gate_p4_owner_${Date.now()}@collab.local`;
    const resA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailA,
        password: 'Password123!',
        name: 'Gate Owner Alpha',
        orgName: 'Workspace Alpha Phase4 Gate',
      }),
    });
    const dataA = await resA.json();
    assert.strictEqual(dataA.success, true);
    ownerA = {
      id: dataA.data.user.userId || dataA.data.user.id,
      email: emailA,
      name: dataA.data.user.name,
      token: dataA.data.tokens.accessToken,
      orgId: dataA.data.workspaces[0].orgId,
    };

    // 2. Setup Member A in Workspace Alpha
    const emailMem = `gate_p4_mem_${Date.now()}@collab.local`;
    const resMem = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailMem,
        password: 'Password123!',
        name: 'Gate Member Alpha',
        orgName: 'Temp Workspace Gate',
      }),
    });
    const dataMem = await resMem.json();
    const memId = dataMem.data.user.userId || dataMem.data.user.id;

    await prisma.member.create({
      data: {
        orgId: ownerA.orgId,
        userId: memId,
        name: 'Gate Member Alpha',
        email: emailMem,
        role: 'member',
        status: 'active',
      },
    });

    memberA = {
      id: memId,
      email: emailMem,
      name: 'Gate Member Alpha',
      token: dataMem.data.tokens.accessToken,
      orgId: ownerA.orgId,
    };

    // 3. Setup User B in completely isolated Workspace Beta
    const emailB = `gate_p4_user_b_${Date.now()}@collab.local`;
    const resB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailB,
        password: 'Password123!',
        name: 'Gate User Beta',
        orgName: 'Workspace Beta Phase4 Gate',
      }),
    });
    const dataB = await resB.json();
    assert.strictEqual(dataB.success, true);
    userB = {
      id: dataB.data.user.userId || dataB.data.user.id,
      email: emailB,
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

  describe('GATE 1: File Management & Cloud Drive Engine (M4)', () => {
    test('1.1: Folder Hierarchy & MinIO Binary Upload with S3 Key Isolation', async () => {
      // Create folder
      const folderRes = await fetch(`${baseUrl}/api/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({
          name: 'Tài liệu Kỹ thuật Phase 4',
          category: 'project',
          color: '#3b82f6',
        }),
      });
      const folderData = await folderRes.json();
      assert.strictEqual(folderData.success, true);
      folderId = folderData.data.id;

      // Upload binary text file to MinIO
      const textContent = 'Gate Verification: Real-Time Collaborative Workspace Phase 4 Drive Engine';
      const contentBase64 = Buffer.from(textContent).toString('base64');

      const uploadRes = await fetch(`${baseUrl}/api/files/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({
          name: 'gate_spec_v1.txt',
          contentBase64,
          mimeType: 'text/plain',
          category: 'document',
          folderId,
        }),
      });

      const uploadData = await uploadRes.json();
      assert.strictEqual(uploadData.success, true);
      assert.strictEqual(uploadData.data.orgId, ownerA.orgId);
      assert.strictEqual(uploadData.data.folderId, folderId);
      assert.strictEqual(uploadData.data.versions.length, 1);
      assert.ok(uploadData.data.key.startsWith(`orgs/${ownerA.orgId}/files/`));
      fileId = uploadData.data.id;

      // Download and verify exact binary stream
      const dlRes = await fetch(`${baseUrl}/api/files/${fileId}/download`, {
        headers: {
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
      });
      assert.strictEqual(dlRes.status, 200);
      const dlText = await dlRes.text();
      assert.strictEqual(dlText, textContent);
    });

    test('1.2: Version History & Binary Streaming Verification', async () => {
      const v2Content = 'Gate Verification: Phase 4 Version 2.0 with Incremental Changelog';
      const contentBase64 = Buffer.from(v2Content).toString('base64');

      const v2Res = await fetch(`${baseUrl}/api/files/${fileId}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({
          contentBase64,
          mimeType: 'text/plain',
          changeSummary: 'Cập nhật phiên bản Gate 2.0',
        }),
      });
      const v2Data = await v2Res.json();
      assert.strictEqual(v2Data.success, true);
      assert.strictEqual(v2Data.data.versions.length, 2);
      assert.strictEqual(v2Data.data.versions[0].version, 2);

      // Verify download delivers v2
      const dlRes = await fetch(`${baseUrl}/api/files/${fileId}/download`, {
        headers: {
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
      });
      const dlText = await dlRes.text();
      assert.strictEqual(dlText, v2Content);
    });

    test('1.3: Password Protected Sharing & Cross-Workspace Isolation', async () => {
      // Create share link with bcrypt password
      const shareRes = await fetch(`${baseUrl}/api/files/${fileId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({
          linkAccess: 'anyone',
          allowDownload: true,
          password: 'GatePassword4!',
        }),
      });
      const shareData = await shareRes.json();
      assert.strictEqual(shareData.success, true);
      assert.strictEqual(shareData.data.hasPassword, true);
      shareToken = shareData.data.shareToken;

      // Unauthenticated access without password -> 401 requires password
      const pubRes1 = await fetch(`${baseUrl}/api/files/shared/${shareToken}`);
      const pubData1 = await pubRes1.json();
      assert.strictEqual(pubData1.success, false);
      assert.strictEqual(pubData1.requiresPassword, true);

      // Unauthenticated access with password -> 200
      const pubRes2 = await fetch(`${baseUrl}/api/files/shared/${shareToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'GatePassword4!' }),
      });
      const pubData2 = await pubRes2.json();
      assert.strictEqual(pubData2.success, true);
      assert.strictEqual(pubData2.data.name, 'gate_spec_v1.txt');

      // Tenant isolation: User B in Workspace Beta CANNOT access file directly
      const betaRes = await fetch(`${baseUrl}/api/files/${fileId}`, {
        headers: {
          Authorization: `Bearer ${userB.token}`,
          'x-workspace-id': userB.orgId,
        },
      });
      assert.strictEqual(betaRes.status, 404);
    });

    test('1.4: Trash & Permanent Purge Lifecycle', async () => {
      // Trash
      const trashRes = await fetch(`${baseUrl}/api/files/${fileId}/trash`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
      });
      assert.strictEqual((await trashRes.json()).success, true);

      // Purge
      const purgeRes = await fetch(`${baseUrl}/api/files/${fileId}/purge`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
      });
      assert.strictEqual((await purgeRes.json()).success, true);
    });
  });

  describe('GATE 2: Knowledge Base Wiki & SOP Engine (M6)', () => {
    test('2.1: PostgreSQL Tree Hierarchy & Backlink Cross-Referencing', async () => {
      // Create root SOP page
      const p1Res = await fetch(`${baseUrl}/api/wiki`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({
          title: 'SOP-01 Gate Master Process',
          areaId: 'sop',
          topic: 'Kiến trúc',
          type: 'SOP',
          tags: ['#sop', '#gate'],
          summary: 'Tài liệu quy trình chuẩn hệ thống',
          content: 'Nội dung quy trình gốc cho Gate Audit',
          icon: '📋',
        }),
      });
      const p1Data = await p1Res.json();
      assert.strictEqual(p1Data.success, true);
      wikiRootId = p1Data.data.id;

      // Create child page with parentId
      const p2Res = await fetch(`${baseUrl}/api/wiki`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({
          title: 'Sub-Runbook Redis Cluster',
          parentId: wikiRootId,
          areaId: 'sop',
          topic: 'Redis',
          type: 'SOP',
          tags: ['#redis'],
          summary: 'Tài liệu con',
          content: 'Xem thêm tại [[SOP-01 Gate Master Process]] để vận hành.',
          icon: '⚡',
        }),
      });
      const p2Data = await p2Res.json();
      assert.strictEqual(p2Data.success, true);
      wikiChildId = p2Data.data.id;

      // Verify tree hierarchy
      const treeRes = await fetch(`${baseUrl}/api/wiki/tree`, {
        headers: {
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
      });
      const treeData = await treeRes.json();
      const rootNode = treeData.data.find((n: any) => n.id === wikiRootId);
      assert.ok(rootNode);
      assert.strictEqual(rootNode.children.length, 1);
      assert.strictEqual(rootNode.children[0].id, wikiChildId);

      // Verify automatic backlink discovery on Root Page
      const blRes = await fetch(`${baseUrl}/api/wiki/${wikiRootId}/backlinks`, {
        headers: {
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
      });
      const blData = await blRes.json();
      assert.ok(blData.data.some((b: any) => b.id === wikiChildId));
    });

    test('2.2: SOP Lifecycle States & Workspace Isolation', async () => {
      // Submit for review
      const res1 = await fetch(`${baseUrl}/api/wiki/${wikiRootId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({ status: 'pending_approval' }),
      });
      assert.strictEqual((await res1.json()).data.status, 'pending_approval');

      // Approve SOP
      const res2 = await fetch(`${baseUrl}/api/wiki/${wikiRootId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({ status: 'approved' }),
      });
      assert.strictEqual((await res2.json()).data.status, 'approved');

      // Tenant isolation: User B in Workspace Beta CANNOT access
      const isoRes = await fetch(`${baseUrl}/api/wiki/${wikiRootId}`, {
        headers: {
          Authorization: `Bearer ${userB.token}`,
          'x-workspace-id': userB.orgId,
        },
      });
      assert.strictEqual(isoRes.status, 404);
    });
  });

  describe('GATE 3: Contextual Document Comments & Mentions (CE-13..15)', () => {
    test('3.1: DOM Anchor Persistence & Notification Dispatch on @Mention', async () => {
      const docId = `gate_doc_${Date.now()}`;
      const anchorData = {
        selectedText: 'Kiến trúc CRDT State Vector tối ưu',
        isSuggestion: false,
      };

      // Post comment mentioning memberA
      const commentRes = await fetch(`${baseUrl}/api/documents/${docId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({
          content: 'Ghi chú quan trọng: @Member nhờ kiểm tra đồng bộ!',
          anchorJson: JSON.stringify(anchorData),
          authorName: ownerA.name,
        }),
      });

      const commentData = await commentRes.json();
      assert.strictEqual(commentData.success, true);
      assert.strictEqual(commentData.data.status, 'open');
      assert.ok(commentData.data.anchorJson.includes('Kiến trúc CRDT'));
      docCommentId = commentData.data.id;

      // Verify notification created for memberA
      const notifs = await prisma.notification.findMany({
        where: { orgId: ownerA.orgId, userId: memberA.id },
      });
      assert.ok(notifs.some((n) => n.title.includes('nhắc')));
    });

    test('3.2: Thread Reply, Resolve and Workspace Boundary', async () => {
      const docId = `gate_doc_thread_${Date.now()}`;

      // Create root comment
      const cRes = await fetch(`${baseUrl}/api/documents/${docId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({
          content: 'Bình luận gốc',
          authorName: ownerA.name,
        }),
      });
      const cData = await cRes.json();
      const parentId = cData.data.id;

      // Create reply
      const rRes = await fetch(`${baseUrl}/api/documents/${docId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberA.token}`,
          'x-workspace-id': memberA.orgId,
        },
        body: JSON.stringify({
          content: 'Phản hồi từ Gate Member',
          parentId,
          authorName: memberA.name,
        }),
      });
      assert.strictEqual((await rRes.json()).data.parentId, parentId);

      // Verify list returns threaded hierarchy
      const listRes = await fetch(`${baseUrl}/api/documents/${docId}/comments`, {
        headers: {
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
      });
      const listData = await listRes.json();
      assert.strictEqual(listData.data.length, 1);
      assert.strictEqual(listData.data[0].replies.length, 1);

      // Resolve comment
      const resolveRes = await fetch(`${baseUrl}/api/documents/${docId}/comments/${parentId}/resolve`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
      });
      assert.strictEqual((await resolveRes.json()).data.status, 'resolved');
    });
  });

  describe('GATE 4: Code Architecture & Modularization Integrity', () => {
    test('4.1: Strictly enforce file length < 800 lines across all Phase 4 modules', () => {
      const pathsToCheck = [
        'packages/server/src/core/files/FileService.ts',
        'packages/server/src/core/files/FolderService.ts',
        'packages/server/src/core/wiki/WikiService.ts',
        'packages/server/src/core/document/DocumentCommentService.ts',
        'packages/server/src/routes/files.ts',
        'packages/server/src/routes/folders.ts',
        'packages/server/src/routes/wiki.ts',
        'packages/server/src/routes/comments.ts',
        'packages/web/src/components/drive/CloudDriveExplorer.tsx',
        'packages/web/src/components/drive/useDriveState.ts',
        'packages/web/src/components/drive/DriveSidebar.tsx',
        'packages/web/src/components/drive/DriveToolbar.tsx',
        'packages/web/src/components/drive/DriveFileList.tsx',
        'packages/web/src/components/wiki/InternalWikiKnowledgeBase.tsx',
        'packages/web/src/components/wiki/useWikiState.ts',
        'packages/web/src/components/wiki/WikiSidebar.tsx',
        'packages/web/src/components/wiki/WikiPageDetail.tsx',
        'packages/web/src/components/wiki/WikiPageModal.tsx',
        'packages/web/src/components/editor/DocCommentsDrawer.tsx',
        'packages/web/src/components/editor/useDocComments.ts',
        'packages/web/src/components/editor/DocCommentCard.tsx',
      ];

      const rootDir = fs.existsSync(path.resolve(process.cwd(), 'packages'))
        ? process.cwd()
        : path.resolve(process.cwd(), '..');

      for (const relPath of pathsToCheck) {
        const fullPath = path.resolve(rootDir, relPath);
        assert.ok(fs.existsSync(fullPath), `File must exist: ${relPath}`);
        const content = fs.readFileSync(fullPath, 'utf8');
        const lineCount = content.split('\n').length;
        assert.ok(
          lineCount < 800,
          `File ${relPath} has ${lineCount} lines, which exceeds the strict 800 line limit!`
        );
      }
    });
  });
});
