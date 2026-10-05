import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import { PrismaClient } from '@prisma/client';
import WebSocket from 'ws';
import { createApp, AppInstance } from '../packages/server/src/server.js';
import { getOutboxRelay } from '../packages/server/src/core/events/index.js';

describe('PHASE 3 INDEPENDENT FINAL ACCEPTANCE GATE VERIFICATION', () => {
  let appInstance: AppInstance;
  let serverPort: number;
  let baseUrl: string;
  let wsUrl: string;
  let prisma: PrismaClient;

  // Test users
  let ownerA: { id: string; email: string; name: string; token: string; orgId: string };
  let memberA: { id: string; email: string; name: string; token: string; orgId: string };
  let viewerA: { id: string; email: string; name: string; token: string; orgId: string };
  let userB: { id: string; email: string; name: string; token: string; orgId: string }; // Workspace B (Isolated)

  let projectAlphaId: string;

  before(async () => {
    serverPort = 4099;
    process.env.PORT = String(serverPort);
    baseUrl = `http://localhost:${serverPort}`;
    wsUrl = `ws://localhost:${serverPort}/ws`;

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
    const emailOwnerA = `audit_owner_a_${Date.now()}@collab.local`;
    const resOA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailOwnerA,
        password: 'Password123!',
        name: 'Alpha Owner',
        orgName: 'Workspace Alpha Audit',
      }),
    });
    const dataOA = await resOA.json();
    assert.strictEqual(dataOA.success, true);
    ownerA = {
      id: dataOA.data.user.userId || dataOA.data.user.id,
      email: emailOwnerA,
      name: 'Alpha Owner',
      token: dataOA.data.tokens.accessToken,
      orgId: dataOA.data.workspaces[0].orgId,
    };

    // 2. Setup Member in Workspace Alpha
    const emailMemA = `audit_member_a_${Date.now()}@collab.local`;
    const resMA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailMemA,
        password: 'Password123!',
        name: 'Alpha Member',
        orgName: 'Temp Org M',
      }),
    });
    const dataMA = await resMA.json();
    const memId = dataMA.data.user.userId || dataMA.data.user.id;
    await prisma.member.create({
      data: {
        orgId: ownerA.orgId,
        userId: memId,
        name: 'Alpha Member',
        email: emailMemA,
        role: 'member',
        status: 'active',
      },
    });
    const loginMA = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailMemA, password: 'Password123!' }),
    });
    const loginDataMA = await loginMA.json();
    memberA = {
      id: memId,
      email: emailMemA,
      name: 'Alpha Member',
      token: loginDataMA.data.tokens.accessToken,
      orgId: ownerA.orgId,
    };

    // 3. Setup Viewer in Workspace Alpha
    const emailViewA = `audit_viewer_a_${Date.now()}@collab.local`;
    const resVA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailViewA,
        password: 'Password123!',
        name: 'Alpha Viewer',
        orgName: 'Temp Org V',
      }),
    });
    const dataVA = await resVA.json();
    const viewId = dataVA.data.user.userId || dataVA.data.user.id;
    await prisma.member.create({
      data: {
        orgId: ownerA.orgId,
        userId: viewId,
        name: 'Alpha Viewer',
        email: emailViewA,
        role: 'member',
        status: 'active',
      },
    });
    const loginVA = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailViewA, password: 'Password123!' }),
    });
    const loginDataVA = await loginVA.json();
    viewerA = {
      id: viewId,
      email: emailViewA,
      name: 'Alpha Viewer',
      token: loginDataVA.data.tokens.accessToken,
      orgId: ownerA.orgId,
    };

    // 4. Setup Isolated User in Workspace Beta
    const emailB = `audit_user_b_${Date.now()}@collab.local`;
    const resB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailB,
        password: 'Password123!',
        name: 'Beta User',
        orgName: 'Workspace Beta Audit',
      }),
    });
    const dataB = await resB.json();
    userB = {
      id: dataB.data.user.userId || dataB.data.user.id,
      email: emailB,
      name: 'Beta User',
      token: dataB.data.tokens.accessToken,
      orgId: dataB.data.workspaces[0].orgId,
    };
  });

  after(async () => {
    getOutboxRelay().stop();
    await prisma.$disconnect();
    await appInstance.gateway.shutdown();
    await new Promise<void>((resolve) => {
      appInstance.httpServer.close(() => resolve());
    });
    setTimeout(() => process.exit(0), 500);
  });

  describe('GATE 1: Database Persistence Across Server Restarts', () => {
    let persistTaskId: string;
    let persistProjectId: string;

    test('1.1. Create project, task, assignee, comment, activity, timeLog and verify in PostgreSQL', async () => {
      // Create Project
      const prjRes = await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({
          name: 'Dự án Kiểm định Lưu trữ',
          key: 'PER',
          description: 'Kiểm tra độ bền vững cơ sở dữ liệu',
        }),
      });
      const prjData = await prjRes.json();
      assert.strictEqual(prjRes.status, 201);
      persistProjectId = prjData.data.id;
      projectAlphaId = persistProjectId;

      // Create Task with Assignee
      const taskRes = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({
          projectId: persistProjectId,
          title: 'Công việc kiểm thử độ bền DB',
          description: 'Nội dung chi tiết',
          column: 'todo',
          priority: 'high',
          storyPoints: 5,
          estimatedMinutes: 300,
          assignees: [{ userId: memberA.id, name: memberA.name, email: memberA.email }],
        }),
      });
      const taskData = await taskRes.json();
      assert.strictEqual(taskRes.status, 201);
      persistTaskId = taskData.data.id;

      // Add Comment
      const cmtRes = await fetch(`${baseUrl}/api/tasks/${persistTaskId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({ content: 'Bình luận kiểm tra persistence' }),
      });
      assert.strictEqual(cmtRes.status, 201);

      // Add Time Log
      const timeRes = await fetch(`${baseUrl}/api/tasks/${persistTaskId}/time-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberA.token}`,
          'x-workspace-id': memberA.orgId,
        },
        body: JSON.stringify({ durationSeconds: 3600, note: '1 giờ làm việc' }),
      });
      assert.strictEqual(timeRes.status, 201);

      // Directly verify in PostgreSQL database
      const dbTask = await prisma.task.findUnique({
        where: { id: persistTaskId },
        include: {
          assignees: true,
          comments: true,
          activities: true,
          timeLogs: true,
        },
      });

      assert.ok(dbTask, 'Task must exist in PostgreSQL');
      assert.strictEqual(dbTask.assignees.length, 1);
      assert.strictEqual(dbTask.comments.length, 1);
      assert.strictEqual(dbTask.timeLogs.length, 1);
      assert.ok(dbTask.activities.length >= 2, 'Activities must be logged in PostgreSQL');
    });

    test('1.2. Simulate Server Restart: Fresh client re-queries data from PostgreSQL without data loss', async () => {
      // Disconnect and create a brand new PrismaClient instance
      const freshPrisma = new PrismaClient({
        datasources: {
          db: {
            url:
              process.env.DATABASE_URL ||
              'postgresql://collab_user:collab_secret@localhost:5434/collab_db?schema=public',
          },
        },
      });

      try {
        const reloadedTask = await freshPrisma.task.findUnique({
          where: { id: persistTaskId },
          include: {
            assignees: true,
            comments: true,
            timeLogs: true,
            project: true,
          },
        });

        assert.ok(reloadedTask, 'Task must persist across restart in PostgreSQL');
        assert.strictEqual(reloadedTask.project?.id, persistProjectId);
        assert.strictEqual(reloadedTask.storyPoints, 5);
        assert.strictEqual(reloadedTask.assignees[0].userId, memberA.id);
        assert.strictEqual(reloadedTask.comments[0].content, 'Bình luận kiểm tra persistence');
        assert.strictEqual(reloadedTask.timeLogs[0].durationSeconds, 3600);
      } finally {
        await freshPrisma.$disconnect();
      }
    });
  });

  describe('GATE 2: Project Role-Based Access Control (PROJECT_ADMIN, MEMBER, VIEWER)', () => {
    before(async () => {
      // Assign memberA as role: 'member' in project
      await fetch(`${baseUrl}/api/projects/${projectAlphaId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({ userId: memberA.id, role: 'member' }),
      });

      // Assign viewerA as role: 'viewer' in project
      await fetch(`${baseUrl}/api/projects/${projectAlphaId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({ userId: viewerA.id, role: 'viewer' }),
      });
    });

    test('2.1. PROJECT_VIEWER can read project & tasks, but CANNOT mutate (403 Forbidden)', async () => {
      // Can GET project
      const getPrj = await fetch(`${baseUrl}/api/projects/${projectAlphaId}`, {
        headers: {
          Authorization: `Bearer ${viewerA.token}`,
          'x-workspace-id': viewerA.orgId,
        },
      });
      assert.strictEqual(getPrj.status, 200, 'Viewer can read project');

      // CANNOT POST task -> 403
      const postTask = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${viewerA.token}`,
          'x-workspace-id': viewerA.orgId,
        },
        body: JSON.stringify({
          projectId: projectAlphaId,
          title: 'Vi phạm quyền viewer',
        }),
      });
      assert.strictEqual(postTask.status, 403, 'Viewer cannot create task in project');

      // CANNOT create sprint -> 403
      const postSprint = await fetch(`${baseUrl}/api/projects/${projectAlphaId}/sprints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${viewerA.token}`,
          'x-workspace-id': viewerA.orgId,
        },
        body: JSON.stringify({
          name: 'Sprint từ viewer',
          startDate: '2026-10-01',
          endDate: '2026-10-10',
        }),
      });
      assert.strictEqual(postSprint.status, 403, 'Viewer cannot create sprint');

      // CANNOT archive project -> 403
      const archivePrj = await fetch(`${baseUrl}/api/projects/${projectAlphaId}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${viewerA.token}`,
          'x-workspace-id': viewerA.orgId,
        },
        body: JSON.stringify({ isArchived: true }),
      });
      assert.strictEqual(archivePrj.status, 403, 'Viewer cannot archive project');

      // CANNOT delete project -> 403
      const deletePrj = await fetch(`${baseUrl}/api/projects/${projectAlphaId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${viewerA.token}`,
          'x-workspace-id': viewerA.orgId,
        },
      });
      assert.strictEqual(deletePrj.status, 403, 'Viewer cannot delete project');
    });

    test('2.2. PROJECT_MEMBER can create/update tasks, but CANNOT modify project settings/archive (403 Forbidden)', async () => {
      // CAN create task
      const postTask = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberA.token}`,
          'x-workspace-id': memberA.orgId,
        },
        body: JSON.stringify({
          projectId: projectAlphaId,
          title: 'Task hợp lệ từ Member',
        }),
      });
      assert.strictEqual(postTask.status, 201, 'Member can create task');
      const taskBody = await postTask.json();

      // CAN update task
      const patchTask = await fetch(`${baseUrl}/api/tasks/${taskBody.data.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberA.token}`,
          'x-workspace-id': memberA.orgId,
        },
        body: JSON.stringify({ column: 'in_progress' }),
      });
      assert.strictEqual(patchTask.status, 200, 'Member can update task');

      // CANNOT archive project -> 403
      const archivePrj = await fetch(`${baseUrl}/api/projects/${projectAlphaId}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberA.token}`,
          'x-workspace-id': memberA.orgId,
        },
        body: JSON.stringify({ isArchived: true }),
      });
      assert.strictEqual(archivePrj.status, 403, 'Member cannot archive project');

      // CANNOT delete project -> 403
      const deletePrj = await fetch(`${baseUrl}/api/projects/${projectAlphaId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${memberA.token}`,
          'x-workspace-id': memberA.orgId,
        },
      });
      assert.strictEqual(deletePrj.status, 403, 'Member cannot delete project');
    });

    test('2.3. PROJECT_ADMIN (Owner) can perform administrative operations', async () => {
      // Owner can update project metadata
      const updatePrj = await fetch(`${baseUrl}/api/projects/${projectAlphaId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({ description: 'Mô tả đã được cập nhật bởi Admin' }),
      });
      assert.strictEqual(updatePrj.status, 200, 'Admin can update project metadata');
    });
  });

  describe('GATE 3: Workspace Isolation Under Malicious Spoofing Attacks', () => {
    let alphaTaskId: string;

    before(async () => {
      const res = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({
          projectId: projectAlphaId,
          title: 'Dữ liệu tuyệt mật của Workspace Alpha',
        }),
      });
      const data = await res.json();
      alphaTaskId = data.data.id;
    });

    test('3.1. User B in Workspace B cannot GET Project of Workspace Alpha (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/projects/${projectAlphaId}`, {
        headers: {
          Authorization: `Bearer ${userB.token}`,
          'x-workspace-id': userB.orgId,
        },
      });
      assert.strictEqual(res.status, 403);
    });

    test('3.2. User B in Workspace B cannot GET Task of Workspace Alpha (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/tasks/${alphaTaskId}`, {
        headers: {
          Authorization: `Bearer ${userB.token}`,
          'x-workspace-id': userB.orgId,
        },
      });
      assert.strictEqual(res.status, 403);
    });

    test('3.3. User B in Workspace B cannot PATCH Task of Workspace Alpha (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/tasks/${alphaTaskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userB.token}`,
          'x-workspace-id': userB.orgId,
        },
        body: JSON.stringify({ column: 'done' }),
      });
      assert.strictEqual(res.status, 403);
    });

    test('3.4. User B in Workspace B cannot DELETE Task of Workspace Alpha (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/tasks/${alphaTaskId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${userB.token}`,
          'x-workspace-id': userB.orgId,
        },
      });
      assert.strictEqual(res.status, 403);
    });

    test('3.5. Spoofing Attack: User B sends x-workspace-id: Workspace Alpha -> Rejected 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/tasks/${alphaTaskId}`, {
        headers: {
          Authorization: `Bearer ${userB.token}`,
          'x-workspace-id': ownerA.orgId, // Maliciously spoofing Workspace Alpha
        },
      });
      assert.strictEqual(res.status, 403, 'Header spoofing must be detected and rejected with 403');
    });

    test('3.6. Body Spoofing Attack: User B creates task referencing projectId of Alpha -> Rejected', async () => {
      const res = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userB.token}`,
          'x-workspace-id': userB.orgId,
        },
        body: JSON.stringify({
          projectId: projectAlphaId, // Malicious reference across workspaces
          title: 'Injected task across workspace',
        }),
      });
      assert.strictEqual(res.status, 403);
    });
  });

  describe('GATE 4: Task Lifecycle & completedAt Timestamp Handling', () => {
    let lifecycleTaskId: string;

    test('4.1. Transition todo -> in_progress: completedAt remains null', async () => {
      const createRes = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({
          projectId: projectAlphaId,
          title: 'Kiểm tra completedAt lifecycle',
          column: 'todo',
        }),
      });
      const data = await createRes.json();
      lifecycleTaskId = data.data.id;

      // Move to in_progress
      await fetch(`${baseUrl}/api/tasks/${lifecycleTaskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({ column: 'in_progress' }),
      });

      const db1 = await prisma.task.findUnique({ where: { id: lifecycleTaskId } });
      assert.strictEqual(db1?.completedAt, null);
    });

    test('4.2. Transition in_progress -> done: completedAt is populated in PostgreSQL', async () => {
      const res = await fetch(`${baseUrl}/api/tasks/${lifecycleTaskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({ column: 'done' }),
      });
      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.ok(body.data.completedAt, 'API must return completedAt');

      const dbDone = await prisma.task.findUnique({ where: { id: lifecycleTaskId } });
      assert.ok(dbDone?.completedAt instanceof Date, 'completedAt must be a valid Date in PostgreSQL');
    });

    test('4.3. Transition done -> in_progress: completedAt is reset to null in PostgreSQL', async () => {
      const res = await fetch(`${baseUrl}/api/tasks/${lifecycleTaskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({ column: 'in_progress' }),
      });
      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.data.completedAt, undefined);

      const dbReopened = await prisma.task.findUnique({ where: { id: lifecycleTaskId } });
      assert.strictEqual(dbReopened?.completedAt, null, 'completedAt must be null in PostgreSQL');
    });
  });

  describe('GATE 5: Subtask Progress Calculation (3 Subtasks)', () => {
    let parentId: string;
    let s1: string, s2: string, s3: string;

    test('5.1. Create parent with 3 subtasks and verify 0%, 33%, 67%, 100% progression', async () => {
      // 1. Parent
      const pRes = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({
          projectId: projectAlphaId,
          title: 'Parent 3 Subtasks Audit',
        }),
      });
      parentId = (await pRes.json()).data.id;

      // 2. Child 1, 2, 3
      const createChild = async (title: string) => {
        const r = await fetch(`${baseUrl}/api/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ownerA.token}`,
            'x-workspace-id': ownerA.orgId,
          },
          body: JSON.stringify({
            projectId: projectAlphaId,
            parentTaskId: parentId,
            title,
            column: 'todo',
          }),
        });
        return (await r.json()).data.id;
      };

      s1 = await createChild('Subtask 1');
      s2 = await createChild('Subtask 2');
      s3 = await createChild('Subtask 3');

      // Check 0 / 3 -> 0%
      let getParent = await fetch(`${baseUrl}/api/tasks/${parentId}`, {
        headers: { Authorization: `Bearer ${ownerA.token}`, 'x-workspace-id': ownerA.orgId },
      });
      let bodyP = await getParent.json();
      assert.strictEqual(bodyP.data.subtaskCount, 3);
      assert.strictEqual(bodyP.data.completedSubtasks, 0);
      assert.strictEqual(bodyP.data.subtaskProgress, 0);

      // Complete Child 1 -> 1 / 3 = 33%
      await fetch(`${baseUrl}/api/tasks/${s1}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerA.token}`, 'x-workspace-id': ownerA.orgId },
        body: JSON.stringify({ column: 'done' }),
      });
      getParent = await fetch(`${baseUrl}/api/tasks/${parentId}`, {
        headers: { Authorization: `Bearer ${ownerA.token}`, 'x-workspace-id': ownerA.orgId },
      });
      bodyP = await getParent.json();
      assert.strictEqual(bodyP.data.completedSubtasks, 1);
      assert.strictEqual(bodyP.data.subtaskProgress, 33);

      // Complete Child 2 -> 2 / 3 = 67%
      await fetch(`${baseUrl}/api/tasks/${s2}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerA.token}`, 'x-workspace-id': ownerA.orgId },
        body: JSON.stringify({ column: 'done' }),
      });
      getParent = await fetch(`${baseUrl}/api/tasks/${parentId}`, {
        headers: { Authorization: `Bearer ${ownerA.token}`, 'x-workspace-id': ownerA.orgId },
      });
      bodyP = await getParent.json();
      assert.strictEqual(bodyP.data.completedSubtasks, 2);
      assert.strictEqual(bodyP.data.subtaskProgress, 67);

      // Complete Child 3 -> 3 / 3 = 100%
      await fetch(`${baseUrl}/api/tasks/${s3}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerA.token}`, 'x-workspace-id': ownerA.orgId },
        body: JSON.stringify({ column: 'done' }),
      });
      getParent = await fetch(`${baseUrl}/api/tasks/${parentId}`, {
        headers: { Authorization: `Bearer ${ownerA.token}`, 'x-workspace-id': ownerA.orgId },
      });
      bodyP = await getParent.json();
      assert.strictEqual(bodyP.data.completedSubtasks, 3);
      assert.strictEqual(bodyP.data.subtaskProgress, 100);
    });
  });

  describe('GATE 6: Multiple Assignees Synchronization', () => {
    test('6.1. Assign multiple users, verify in PostgreSQL table task_assignees', async () => {
      const res = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({
          projectId: projectAlphaId,
          title: 'Multiple Assignees Audit',
          assignees: [
            { userId: ownerA.id, name: ownerA.name, email: ownerA.email },
            { userId: memberA.id, name: memberA.name, email: memberA.email },
            { userId: viewerA.id, name: viewerA.name, email: viewerA.email },
          ],
        }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201);
      const taskId = data.data.id;

      // Verify in PostgreSQL table task_assignees
      const dbAssignees = await prisma.taskAssignee.findMany({
        where: { taskId },
      });
      assert.strictEqual(dbAssignees.length, 3, 'Must have 3 records in task_assignees');
      const userIds = dbAssignees.map((a) => a.userId).sort();
      const expectedIds = [ownerA.id, memberA.id, viewerA.id].sort();
      assert.deepStrictEqual(userIds, expectedIds);
    });
  });

  describe('GATE 7: Multi-Level Task Dependency & Cycle Detection (A -> B -> C -> D -> A)', () => {
    let tA: string, tB: string, tC: string, tD: string;

    before(async () => {
      const makeTask = async (title: string) => {
        const r = await fetch(`${baseUrl}/api/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerA.token}`, 'x-workspace-id': ownerA.orgId },
          body: JSON.stringify({ projectId: projectAlphaId, title }),
        });
        return (await r.json()).data.id;
      };

      tA = await makeTask('Chain Task A');
      tB = await makeTask('Chain Task B');
      tC = await makeTask('Chain Task C');
      tD = await makeTask('Chain Task D');
    });

    test('7.1. Build chain A -> B -> C -> D (3 dependencies)', async () => {
      // B depends on A
      const r1 = await fetch(`${baseUrl}/api/tasks/${tB}/dependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerA.token}`, 'x-workspace-id': ownerA.orgId },
        body: JSON.stringify({ dependsOnId: tA, type: 'finish_to_start' }),
      });
      assert.strictEqual(r1.status, 201);

      // C depends on B
      const r2 = await fetch(`${baseUrl}/api/tasks/${tC}/dependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerA.token}`, 'x-workspace-id': ownerA.orgId },
        body: JSON.stringify({ dependsOnId: tB, type: 'start_to_start' }),
      });
      assert.strictEqual(r2.status, 201);

      // D depends on C
      const r3 = await fetch(`${baseUrl}/api/tasks/${tD}/dependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerA.token}`, 'x-workspace-id': ownerA.orgId },
        body: JSON.stringify({ dependsOnId: tC, type: 'finish_to_finish' }),
      });
      assert.strictEqual(r3.status, 201);
    });

    test('7.2. Multi-level Cycle: Adding A depends on D completes cycle A -> B -> C -> D -> A and MUST be REJECTED (400)', async () => {
      const res = await fetch(`${baseUrl}/api/tasks/${tA}/dependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerA.token}`, 'x-workspace-id': ownerA.orgId },
        body: JSON.stringify({ dependsOnId: tD, type: 'finish_to_start' }),
      });

      const body = await res.json();
      assert.strictEqual(res.status, 400, 'Multi-level dependency cycle must be rejected with HTTP 400');
      assert.ok(body.error.includes('vòng lặp') || body.error.includes('cycle'));
    });
  });

  describe('GATE 8: Story Points & Mathematical Burndown Calculation (16 SP)', () => {
    let sprintAuditId: string;
    let task1_3pt: string;
    let task2_5pt: string;
    let task3_8pt: string;

    test('8.1. Create Sprint, assign tasks (3, 5, 8 SP = 16 SP) and verify real calculated Burndown', async () => {
      // 1. Create Sprint
      const spRes = await fetch(`${baseUrl}/api/projects/${projectAlphaId}/sprints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerA.token}`, 'x-workspace-id': ownerA.orgId },
        body: JSON.stringify({
          name: 'Sprint Audit 16 Points',
          startDate: '2026-10-01',
          endDate: '2026-10-06',
        }),
      });
      const spData = await spRes.json();
      sprintAuditId = spData.data.id;

      // 2. Create Tasks: 3 SP, 5 SP, 8 SP -> Total: 16 SP
      const makeSprintTask = async (title: string, storyPoints: number) => {
        const r = await fetch(`${baseUrl}/api/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerA.token}`, 'x-workspace-id': ownerA.orgId },
          body: JSON.stringify({
            projectId: projectAlphaId,
            sprintId: sprintAuditId,
            title,
            storyPoints,
          }),
        });
        return (await r.json()).data.id;
      };

      task1_3pt = await makeSprintTask('Task 1 (3 points)', 3);
      task2_5pt = await makeSprintTask('Task 2 (5 points)', 5);
      task3_8pt = await makeSprintTask('Task 3 (8 points)', 8);

      // Start Sprint
      await fetch(`${baseUrl}/api/sprints/${sprintAuditId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${ownerA.token}`, 'x-workspace-id': ownerA.orgId },
      });

      // Complete Task 1 (3 SP) on 2026-10-02
      await prisma.task.update({
        where: { id: task1_3pt },
        data: { column: 'done', completedAt: new Date('2026-10-02T10:00:00Z') },
      });

      // Complete Task 2 (5 SP) on 2026-10-04
      await prisma.task.update({
        where: { id: task2_5pt },
        data: { column: 'done', completedAt: new Date('2026-10-04T10:00:00Z') },
      });

      // Query Burndown API
      const bdRes = await fetch(`${baseUrl}/api/sprints/${sprintAuditId}/burndown`, {
        headers: { Authorization: `Bearer ${ownerA.token}`, 'x-workspace-id': ownerA.orgId },
      });
      const bd = await bdRes.json();

      assert.strictEqual(bdRes.status, 200);
      assert.strictEqual(bd.data.totalStoryPoints, 16, 'Total story points must be exactly 3 + 5 + 8 = 16');

      const d1Idx = bd.data.days.indexOf('2026-10-01');
      const d2Idx = bd.data.days.indexOf('2026-10-02');
      const d4Idx = bd.data.days.indexOf('2026-10-04');

      assert.strictEqual(bd.data.actualLine[d1Idx], 16, 'Day 1: 0 completed -> 16 remaining');
      assert.strictEqual(bd.data.actualLine[d2Idx], 13, 'Day 2: 3 points completed -> 13 remaining');
      assert.strictEqual(bd.data.actualLine[d4Idx], 8, 'Day 4: 3 + 5 = 8 completed -> 8 remaining');
      assert.strictEqual(bd.data.idealLine[0], 16, 'Ideal line starts at 16');
      assert.strictEqual(bd.data.idealLine[bd.data.idealLine.length - 1], 0, 'Ideal line ends at 0');
    });
  });

  describe('GATE 9: Time Tracking (Sum of 30m + 45m + 60m = 135m)', () => {
    let timeTaskId: string;

    before(async () => {
      const r = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerA.token}`, 'x-workspace-id': ownerA.orgId },
        body: JSON.stringify({ projectId: projectAlphaId, title: 'Time Tracking Math Audit' }),
      });
      timeTaskId = (await r.json()).data.id;
    });

    test('9.1. Log 1800s (30m), 2700s (45m), 3600s (60m) -> Total = 8100s (135m / 2.3h)', async () => {
      const logWork = async (durationSeconds: number, note: string) => {
        const r = await fetch(`${baseUrl}/api/tasks/${timeTaskId}/time-logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberA.token}`, 'x-workspace-id': memberA.orgId },
          body: JSON.stringify({ durationSeconds, note }),
        });
        assert.strictEqual(r.status, 201);
      };

      await logWork(1800, '30 phút khảo sát');
      await logWork(2700, '45 phút thiết kế');
      await logWork(3600, '60 phút cài đặt');

      // Fetch time logs
      const listRes = await fetch(`${baseUrl}/api/tasks/${timeTaskId}/time-logs`, {
        headers: { Authorization: `Bearer ${memberA.token}`, 'x-workspace-id': memberA.orgId },
      });
      const listData = await listRes.json();
      assert.strictEqual(listRes.status, 200);
      assert.strictEqual(listData.data.totalSeconds, 8100, 'Total seconds must be 1800 + 2700 + 3600 = 8100');
      assert.strictEqual(listData.data.logs.length, 3);
      assert.strictEqual(listData.data.logs[0].durationMinutes + listData.data.logs[1].durationMinutes + listData.data.logs[2].durationMinutes, 135);
    });
  });

  describe('GATE 10: Task Comment, @mention & Notification Hub Integration', () => {
    let commentTaskId: string;

    before(async () => {
      const r = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerA.token}`, 'x-workspace-id': ownerA.orgId },
        body: JSON.stringify({ projectId: projectAlphaId, title: 'Task with Mention Audit' }),
      });
      commentTaskId = (await r.json()).data.id;
    });

    test('10.1. User A comments mentioning User B: Notification created in PostgreSQL with type mention', async () => {
      const res = await fetch(`${baseUrl}/api/tasks/${commentTaskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerA.token}`, 'x-workspace-id': ownerA.orgId },
        body: JSON.stringify({
          content: 'Kính gửi @Alpha Member xin hãy kiểm tra kết quả audit này.',
        }),
      });
      assert.strictEqual(res.status, 201);

      // Verify Notification in PostgreSQL
      const notif = await prisma.notification.findFirst({
        where: {
          orgId: ownerA.orgId,
          userId: memberA.id,
          type: 'mention',
        },
        orderBy: { createdAt: 'desc' },
      });

      assert.ok(notif, 'Notification must be recorded in PostgreSQL for mentioned member');
      assert.strictEqual(notif.actorId, ownerA.id);
      assert.strictEqual(notif.isPriority, true);
    });

    test('10.2. Cross-Workspace Mention Isolation: Mentioning a name from Workspace B creates NO notification in B', async () => {
      const res = await fetch(`${baseUrl}/api/tasks/${commentTaskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerA.token}`, 'x-workspace-id': ownerA.orgId },
        body: JSON.stringify({
          content: 'Thử mention @Beta User từ workspace khác.',
        }),
      });
      assert.strictEqual(res.status, 201);

      // Verify User B (in Workspace B) did NOT receive notification
      const notifB = await prisma.notification.findFirst({
        where: {
          userId: userB.id,
          orgId: ownerA.orgId,
        },
      });
      assert.strictEqual(notifB, null, 'User in other workspace must never receive cross-workspace notifications');
    });
  });

  describe('GATE 11: Real-time Server WebSocket Synchronization', () => {
    test('11.1. Client receives task:created and task:status_changed over WebSocket without polling', async () => {
      const clientWs = new WebSocket(`${wsUrl}?token=${memberA.token}&orgId=${memberA.orgId}`);

      await new Promise<void>((resolve, reject) => {
        clientWs.on('open', () => resolve());
        clientWs.on('error', (err) => reject(err));
      });

      const events: any[] = [];
      clientWs.on('message', (raw) => {
        try {
          events.push(JSON.parse(raw.toString()));
        } catch {}
      });

      // Owner creates a task
      const createRes = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerA.token}`, 'x-workspace-id': ownerA.orgId },
        body: JSON.stringify({ projectId: projectAlphaId, title: 'WS Broadcast Audit Task' }),
      });
      const tId = (await createRes.json()).data.id;

      // Owner updates column to review
      await fetch(`${baseUrl}/api/tasks/${tId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerA.token}`, 'x-workspace-id': ownerA.orgId },
        body: JSON.stringify({ column: 'review' }),
      });

      // Wait for WS events
      let gotCreated = false;
      let gotStatus = false;
      for (let i = 0; i < 20; i++) {
        gotCreated = events.some((e) => e.type === 'task:created' && e.taskId === tId);
        gotStatus = events.some((e) => e.type === 'task:status_changed' && e.taskId === tId && e.data?.column === 'review');
        if (gotCreated && gotStatus) break;
        await new Promise((r) => setTimeout(r, 50));
      }

      clientWs.close();

      assert.ok(gotCreated, 'WebSocket must receive task:created');
      assert.ok(gotStatus, 'WebSocket must receive task:status_changed');
    });
  });
});
