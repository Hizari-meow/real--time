import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import { PrismaClient } from '@prisma/client';
import WebSocket from 'ws';
import { createApp, AppInstance } from '../packages/server/src/server.js';
import { getOutboxRelay } from '../packages/server/src/core/events/index.js';

describe('PHASE 3: Enterprise Task & Project Engine Test Suite', () => {
  let appInstance: AppInstance;
  let serverPort: number;
  let baseUrl: string;
  let wsUrl: string;
  let prisma: PrismaClient;

  // Test identities
  let ownerA: { id: string; email: string; name: string; token: string; orgId: string };
  let memberB: { id: string; email: string; name: string; token: string; orgId: string };
  let isolatedUser: { id: string; email: string; name: string; token: string; orgId: string };

  let projectId: string;
  let sprintId: string;
  let parentTaskId: string;
  let subtask1Id: string;
  let subtask2Id: string;

  before(async () => {
    serverPort = 4080;
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
      appInstance.httpServer.listen(serverPort, () => {
        resolve();
      });
    });

    // 1. Register Owner A in Workspace Alpha
    const emailA = `test_p3_owner_${Date.now()}@collab.local`;
    const resA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailA,
        password: 'Password123!',
        name: 'Nguyen Van Owner',
        orgName: 'Workspace Alpha Projects',
      }),
    });
    const dataA = await resA.json();
    assert.strictEqual(dataA.success, true);
    ownerA = {
      id: dataA.data.user.userId || dataA.data.user.id,
      email: emailA,
      name: 'Nguyen Van Owner',
      token: dataA.data.tokens.accessToken,
      orgId: dataA.data.workspaces[0].orgId,
    };

    // 2. Register User B and add to Workspace Alpha as Member
    const emailB = `test_p3_member_${Date.now()}@collab.local`;
    const resB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailB,
        password: 'Password123!',
        name: 'Tran Thi B',
        orgName: 'Temp Workspace B',
      }),
    });
    const dataB = await resB.json();
    const userBId = dataB.data.user.userId || dataB.data.user.id;

    await prisma.member.create({
      data: {
        orgId: ownerA.orgId,
        userId: userBId,
        name: 'Tran Thi B',
        email: emailB,
        role: 'member',
        status: 'active',
      },
    });

    // Login User B with Workspace Alpha context
    const loginResB = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailB,
        password: 'Password123!',
      }),
    });
    const loginDataB = await loginResB.json();
    memberB = {
      id: userBId,
      email: emailB,
      name: 'Tran Thi B',
      token: loginDataB.data.tokens.accessToken,
      orgId: ownerA.orgId,
    };

    // 3. Register Isolated User in completely different Workspace
    const emailIso = `test_p3_iso_${Date.now()}@collab.local`;
    const resIso = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailIso,
        password: 'Password123!',
        name: 'Le Isolated',
        orgName: 'Workspace Isolated P3',
      }),
    });
    const dataIso = await resIso.json();
    isolatedUser = {
      id: dataIso.data.user.userId || dataIso.data.user.id,
      email: emailIso,
      name: 'Le Isolated',
      token: dataIso.data.tokens.accessToken,
      orgId: dataIso.data.workspaces[0].orgId,
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

  describe('1. Project Lifecycle, RBAC & Workspace Isolation', () => {
    test('Owner creates a new project: persists in PostgreSQL with owner as admin', async () => {
      const res = await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({
          name: 'Dự án Cải tiến Hệ thống',
          key: 'SYS',
          description: 'Nâng cấp kiến trúc vi dịch vụ và thời gian thực',
        }),
      });

      const body = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.key, 'SYS');
      projectId = body.data.id;

      // Verify in PostgreSQL
      const dbProject = await prisma.project.findUnique({
        where: { id: projectId },
        include: { members: true },
      });
      assert.ok(dbProject, 'Project must exist in PostgreSQL');
      assert.strictEqual(dbProject.orgId, ownerA.orgId);
      assert.strictEqual(dbProject.members[0].userId, ownerA.id);
      assert.strictEqual(dbProject.members[0].role, 'admin');
    });

    test('Workspace Isolation: Isolated User cannot access Project of Workspace Alpha (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/projects/${projectId}`, {
        headers: {
          Authorization: `Bearer ${isolatedUser.token}`,
          'x-workspace-id': isolatedUser.orgId,
        },
      });

      assert.strictEqual(res.status, 403, 'Cross-workspace access must be rejected with 403');
    });

    test('Project Member Management: Admin adds User B as VIEWER', async () => {
      const res = await fetch(`${baseUrl}/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({
          userId: memberB.id,
          role: 'viewer',
        }),
      });

      const body = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(body.data.role, 'viewer');
    });

    test('Project RBAC: VIEWER cannot create task in project (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberB.token}`,
          'x-workspace-id': memberB.orgId,
        },
        body: JSON.stringify({
          projectId,
          title: 'Nhiệm vụ trái phép từ viewer',
        }),
      });

      assert.strictEqual(res.status, 403, 'Viewer must not be able to create task in project');
    });

    test('Project RBAC: Admin promotes User B to MEMBER, who can then create task', async () => {
      // Promote to member
      const updateRes = await fetch(`${baseUrl}/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({
          userId: memberB.id,
          role: 'member',
        }),
      });
      assert.strictEqual(updateRes.status, 201);

      // Now User B creates task
      const taskRes = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberB.token}`,
          'x-workspace-id': memberB.orgId,
        },
        body: JSON.stringify({
          projectId,
          title: 'Nhiệm vụ hợp lệ từ Member',
        }),
      });
      assert.strictEqual(taskRes.status, 201);
    });

    test('Project Archive & Restore: Persists isArchived flag in PostgreSQL', async () => {
      const archiveRes = await fetch(`${baseUrl}/api/projects/${projectId}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({ isArchived: true }),
      });
      assert.strictEqual(archiveRes.status, 200);

      const dbArchived = await prisma.project.findUnique({ where: { id: projectId } });
      assert.strictEqual(dbArchived?.isArchived, true);

      // Restore
      await fetch(`${baseUrl}/api/projects/${projectId}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({ isArchived: false }),
      });
      const dbRestored = await prisma.project.findUnique({ where: { id: projectId } });
      assert.strictEqual(dbRestored?.isArchived, false);
    });
  });

  describe('2. Enterprise Task Management, Status Transitions & Multiple Assignees', () => {
    let testTaskId: string;

    test('Create task with multiple assignees, story points, and labels: persists in PostgreSQL', async () => {
      const res = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({
          projectId,
          title: 'Triển khai bảo mật JWT đa phân vùng',
          description: 'Chi tiết mã hóa và xác thực access token',
          column: 'todo',
          priority: 'urgent',
          storyPoints: 8,
          estimatedMinutes: 240,
          dueDate: '2026-10-20',
          labels: ['Security', 'Core'],
          checklist: [{ id: 'chk_1', text: 'Quét lỗ hổng', completed: false }],
          assignees: [
            { userId: ownerA.id, name: ownerA.name, email: ownerA.email },
            { userId: memberB.id, name: memberB.name, email: memberB.email },
          ],
        }),
      });

      const body = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(body.data.storyPoints, 8);
      assert.strictEqual(body.data.assignees.length, 2);
      testTaskId = body.data.id;

      // Verify assignees in PostgreSQL table task_assignees
      const dbAssignees = await prisma.taskAssignee.findMany({
        where: { taskId: testTaskId },
      });
      assert.strictEqual(dbAssignees.length, 2);
    });

    test('Status transition to DONE sets completedAt; moving away from DONE clears completedAt', async () => {
      // 1. Move to DONE
      const doneRes = await fetch(`${baseUrl}/api/tasks/${testTaskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({
          column: 'done',
        }),
      });
      const doneBody = await doneRes.json();
      assert.strictEqual(doneRes.status, 200);
      assert.strictEqual(doneBody.data.column, 'done');
      assert.ok(doneBody.data.completedAt, 'completedAt must be populated');

      const dbDone = await prisma.task.findUnique({ where: { id: testTaskId } });
      assert.ok(dbDone?.completedAt, 'completedAt must be in PostgreSQL');

      // 2. Move back to in_progress
      const progressRes = await fetch(`${baseUrl}/api/tasks/${testTaskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({
          column: 'in_progress',
        }),
      });
      const progressBody = await progressRes.json();
      assert.strictEqual(progressBody.data.column, 'in_progress');
      assert.strictEqual(progressBody.data.completedAt, undefined);

      const dbProgress = await prisma.task.findUnique({ where: { id: testTaskId } });
      assert.strictEqual(dbProgress?.completedAt, null, 'completedAt must be cleared in PostgreSQL');
    });

    test('Task Activity Log: Status transitions recorded in task_activities table', async () => {
      const activities = await prisma.taskActivity.findMany({
        where: { taskId: testTaskId },
        orderBy: { createdAt: 'desc' },
      });

      assert.ok(activities.length >= 2, 'Activities must record creation and status transitions');
      const statusActivity = activities.find((a) => a.action === 'status_changed');
      assert.ok(statusActivity, 'Must have a status_changed activity record');
    });
  });

  describe('3. Subtasks & Automatic Progress Calculation', () => {
    test('Parent task with subtasks accurately calculates subtaskProgress percentage', async () => {
      // 1. Create Parent Task
      const parentRes = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({
          projectId,
          title: 'Công việc cha: Phát triển cổng thanh toán',
        }),
      });
      const parentData = await parentRes.json();
      parentTaskId = parentData.data.id;

      // 2. Create Subtask 1
      const sub1Res = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({
          projectId,
          parentTaskId,
          title: 'Subtask 1: Tích hợp sandbox API',
          column: 'todo',
        }),
      });
      const sub1Data = await sub1Res.json();
      subtask1Id = sub1Data.data.id;

      // 3. Create Subtask 2
      const sub2Res = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({
          projectId,
          parentTaskId,
          title: 'Subtask 2: Xử lý Webhook giao dịch',
          column: 'todo',
        }),
      });
      const sub2Data = await sub2Res.json();
      subtask2Id = sub2Data.data.id;

      // Check initial progress: 0 of 2 -> 0%
      const get1 = await fetch(`${baseUrl}/api/tasks/${parentTaskId}`, {
        headers: {
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
      });
      const body1 = await get1.json();
      assert.strictEqual(body1.data.subtaskCount, 2);
      assert.strictEqual(body1.data.completedSubtasks, 0);
      assert.strictEqual(body1.data.subtaskProgress, 0);

      // Complete Subtask 1 -> 1 of 2 -> 50%
      await fetch(`${baseUrl}/api/tasks/${subtask1Id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({ column: 'done' }),
      });

      const get2 = await fetch(`${baseUrl}/api/tasks/${parentTaskId}`, {
        headers: {
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
      });
      const body2 = await get2.json();
      assert.strictEqual(body2.data.completedSubtasks, 1);
      assert.strictEqual(body2.data.subtaskProgress, 50);

      // Complete Subtask 2 -> 2 of 2 -> 100%
      await fetch(`${baseUrl}/api/tasks/${subtask2Id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({ column: 'done' }),
      });

      const get3 = await fetch(`${baseUrl}/api/tasks/${parentTaskId}`, {
        headers: {
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
      });
      const body3 = await get3.json();
      assert.strictEqual(body3.data.completedSubtasks, 2);
      assert.strictEqual(body3.data.subtaskProgress, 100);
    });
  });

  describe('4. Task Dependencies & Server-Side Cycle Detection', () => {
    let taskDepA: string;
    let taskDepB: string;
    let taskDepC: string;

    before(async () => {
      // Create Task A, B, C
      const rA = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({ projectId, title: 'Task Dependency A' }),
      });
      const bA = await rA.json();
      taskDepA = bA.data.id;

      const rB = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({ projectId, title: 'Task Dependency B' }),
      });
      const bB = await rB.json();
      taskDepB = bB.data.id;

      const rC = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({ projectId, title: 'Task Dependency C' }),
      });
      const bC = await rC.json();
      taskDepC = bC.data.id;
    });

    test('Add non-cyclic dependencies: B depends on A, C depends on B', async () => {
      // B depends on A
      const resBA = await fetch(`${baseUrl}/api/tasks/${taskDepB}/dependencies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({ dependsOnId: taskDepA, type: 'finish_to_start' }),
      });
      assert.strictEqual(resBA.status, 201);

      // C depends on B
      const resCB = await fetch(`${baseUrl}/api/tasks/${taskDepC}/dependencies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({ dependsOnId: taskDepB, type: 'finish_to_start' }),
      });
      assert.strictEqual(resCB.status, 201);
    });

    test('CYCLE DETECTION: Adding A depends on C is rejected with 400 Bad Request', async () => {
      // Attempt A depends on C -> creates A -> C -> B -> A cycle
      const resAC = await fetch(`${baseUrl}/api/tasks/${taskDepA}/dependencies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({ dependsOnId: taskDepC, type: 'finish_to_start' }),
      });

      const bodyAC = await resAC.json();
      assert.strictEqual(resAC.status, 400, 'Cycle dependency must be rejected with 400');
      assert.ok(
        bodyAC.error.includes('vòng lặp') || bodyAC.error.includes('cycle') || bodyAC.error.includes('Cycle'),
        'Error message must mention cycle'
      );
    });

    test('Self-dependency: Task cannot depend on itself (400 Bad Request)', async () => {
      const resSelf = await fetch(`${baseUrl}/api/tasks/${taskDepA}/dependencies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({ dependsOnId: taskDepA }),
      });
      assert.strictEqual(resSelf.status, 400);
    });

    test('Removing dependency allows previously cyclic link to be established', async () => {
      // Remove C depends on B
      const delRes = await fetch(`${baseUrl}/api/tasks/${taskDepC}/dependencies/${taskDepB}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
      });
      assert.strictEqual(delRes.status, 200);

      // Now adding A depends on C is no longer a cycle!
      const addRes = await fetch(`${baseUrl}/api/tasks/${taskDepA}/dependencies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({ dependsOnId: taskDepC }),
      });
      assert.strictEqual(addRes.status, 201, 'Should succeed now that cycle is broken');
    });
  });

  describe('5. Agile Sprint Engine & Real Burndown Calculation', () => {
    let sprintTask1: string;
    let sprintTask2: string;
    let sprintTask3: string;

    test('Create and start sprint with tasks and story points', async () => {
      // 1. Create Sprint
      const sprintRes = await fetch(`${baseUrl}/api/projects/${projectId}/sprints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({
          name: 'Sprint 1 - Nền tảng vi dịch vụ',
          goal: 'Hoàn thành lõi công việc và hạ tầng realtime',
          startDate: '2026-10-01',
          endDate: '2026-10-10',
        }),
      });
      const sprintData = await sprintRes.json();
      assert.strictEqual(sprintRes.status, 201);
      sprintId = sprintData.data.id;

      // 2. Create 3 tasks with story points in this sprint: 5 SP, 3 SP, 2 SP -> Total: 10 SP
      const t1 = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({
          projectId,
          sprintId,
          title: 'Sprint Task 1: Cấu hình Redis cluster',
          storyPoints: 5,
        }),
      });
      const b1 = await t1.json();
      sprintTask1 = b1.data.id;

      const t2 = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({
          projectId,
          sprintId,
          title: 'Sprint Task 2: Viết tài liệu API',
          storyPoints: 3,
        }),
      });
      const b2 = await t2.json();
      sprintTask2 = b2.data.id;

      const t3 = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({
          projectId,
          sprintId,
          title: 'Sprint Task 3: Tối ưu UI Kanban',
          storyPoints: 2,
        }),
      });
      const b3 = await t3.json();
      sprintTask3 = b3.data.id;

      // 3. Start sprint
      const startRes = await fetch(`${baseUrl}/api/sprints/${sprintId}/start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
      });
      const startData = await startRes.json();
      assert.strictEqual(startRes.status, 200);
      assert.strictEqual(startData.data.status, 'active');
    });

    test('Real Burndown Calculation: reflects actual Story Points and completion timestamps', async () => {
      // Mark Sprint Task 1 (5 SP) as DONE with completedAt set in the sprint range
      await prisma.task.update({
        where: { id: sprintTask1 },
        data: {
          column: 'done',
          completedAt: new Date('2026-10-02T12:00:00Z'),
        },
      });

      // Mark Sprint Task 2 (3 SP) as DONE with completedAt set later in the sprint range
      await prisma.task.update({
        where: { id: sprintTask2 },
        data: {
          column: 'done',
          completedAt: new Date('2026-10-04T15:00:00Z'),
        },
      });

      // Query Burndown API
      const burndownRes = await fetch(`${baseUrl}/api/sprints/${sprintId}/burndown`, {
        headers: {
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
      });

      const burndown = await burndownRes.json();
      assert.strictEqual(burndownRes.status, 200);
      assert.strictEqual(burndown.data.totalStoryPoints, 10, 'Total SP must be 5 + 3 + 2 = 10');
      assert.ok(burndown.data.days.length >= 9, 'Must span from 2026-10-01 to 2026-10-10');
      assert.strictEqual(burndown.data.idealLine[0], 10, 'Ideal line starts at total SP');
      assert.strictEqual(
        burndown.data.idealLine[burndown.data.idealLine.length - 1],
        0,
        'Ideal line ends at 0'
      );

      // Verify actual burndown trajectory:
      // Day 2026-10-01: 10 SP
      // Day 2026-10-02 (Task 1 done): 10 - 5 = 5 SP
      // Day 2026-10-04 (Task 2 done): 5 - 3 = 2 SP
      const day2Index = burndown.data.days.indexOf('2026-10-02');
      const day4Index = burndown.data.days.indexOf('2026-10-04');
      assert.strictEqual(burndown.data.actualLine[day2Index], 5, 'Remaining SP on Day 2 must be 5');
      assert.strictEqual(burndown.data.actualLine[day4Index], 2, 'Remaining SP on Day 4 must be 2');
    });

    test('Complete sprint: status becomes completed and completedAt timestamp is recorded', async () => {
      const res = await fetch(`${baseUrl}/api/sprints/${sprintId}/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.data.status, 'completed');
      assert.ok(body.data.completedAt);
    });
  });

  describe('6. Task Comments & @mention Integration with Phase 1 Notification Hub', () => {
    test('User A comments with @mention for User B: creates Notification in PostgreSQL', async () => {
      const res = await fetch(`${baseUrl}/api/tasks/${parentTaskId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({
          content: 'Xin chào @Tran Thi B bạn vui lòng kiểm tra tiến độ subtask này nhé!',
        }),
      });

      const body = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(body.data.authorName, ownerA.name);

      // Verify comment in PostgreSQL
      const dbComment = await prisma.taskComment.findFirst({
        where: { taskId: parentTaskId },
      });
      assert.ok(dbComment);

      // Verify Notification in PostgreSQL for User B
      const notification = await prisma.notification.findFirst({
        where: {
          userId: memberB.id,
          orgId: ownerA.orgId,
          type: 'mention',
        },
      });
      assert.ok(notification, 'Notification must be created for mentioned user B');
      assert.ok(notification.title.includes(ownerA.name));
    });
  });

  describe('7. Time Tracking (Log Work)', () => {
    test('Log work duration: persists in task_time_logs with accurate hours calculation', async () => {
      const res = await fetch(`${baseUrl}/api/tasks/${parentTaskId}/time-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberB.token}`,
          'x-workspace-id': memberB.orgId,
        },
        body: JSON.stringify({
          durationSeconds: 7200, // 2 hours
          note: 'Thiết kế kiến trúc cơ sở dữ liệu và viết unit test',
        }),
      });

      const body = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(body.data.durationSeconds, 7200);

      // Query time logs endpoint
      const listRes = await fetch(`${baseUrl}/api/tasks/${parentTaskId}/time-logs`, {
        headers: {
          Authorization: `Bearer ${memberB.token}`,
          'x-workspace-id': memberB.orgId,
        },
      });
      const listData = await listRes.json();
      assert.strictEqual(listRes.status, 200);
      assert.strictEqual(listData.data.totalSeconds, 7200);
      assert.strictEqual(listData.data.totalHours, 2);
    });
  });

  describe('8. Server WebSocket Real-Time Synchronization', () => {
    test('User B receives real-time task:created and task:status_changed events via Server WebSocket', async () => {
      // Connect WebSocket for User B
      const clientWsB = new WebSocket(`${wsUrl}?token=${memberB.token}&orgId=${memberB.orgId}`);

      await new Promise<void>((resolve, reject) => {
        clientWsB.on('open', () => resolve());
        clientWsB.on('error', (err) => reject(err));
      });

      const receivedEvents: any[] = [];
      clientWsB.on('message', (raw) => {
        try {
          const parsed = JSON.parse(raw.toString());
          receivedEvents.push(parsed);
        } catch {
          // ignore non-json
        }
      });

      // User A creates a task
      const createRes = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({
          projectId,
          title: 'Realtime Task Sync Test',
          column: 'todo',
        }),
      });
      const createdData = await createRes.json();
      const realtimeTaskId = createdData.data.id;

      // User A moves task to in_progress
      await fetch(`${baseUrl}/api/tasks/${realtimeTaskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerA.token}`,
          'x-workspace-id': ownerA.orgId,
        },
        body: JSON.stringify({
          column: 'in_progress',
        }),
      });

      // Wait up to 1 second for WebSocket events to arrive
      let foundCreated = false;
      let foundStatusChanged = false;

      for (let attempt = 0; attempt < 20; attempt++) {
        foundCreated = receivedEvents.some(
          (e) => e.type === 'task:created' && e.taskId === realtimeTaskId
        );
        foundStatusChanged = receivedEvents.some(
          (e) => e.type === 'task:status_changed' && e.taskId === realtimeTaskId
        );
        if (foundCreated && foundStatusChanged) break;
        await new Promise((r) => setTimeout(r, 50));
      }

      clientWsB.close();

      assert.ok(foundCreated, 'User B must receive task:created over WebSocket');
      assert.ok(foundStatusChanged, 'User B must receive task:status_changed over WebSocket');
    });
  });
});
