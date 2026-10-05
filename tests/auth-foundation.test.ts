import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import { PrismaClient } from '@prisma/client';
import { createApp, AppInstance } from '../packages/server/src/server.js';

describe('PHASE 0: Authentication, RBAC & Workspace Isolation Test Suite', () => {
  let appInstance: AppInstance;
  let serverPort: number;
  let baseUrl: string;
  let prisma: PrismaClient;

  // Tokens and state across tests
  let ownerToken: string;
  let ownerRefreshToken: string;
  let memberToken: string;
  let isolatedToken: string;
  let createdTaskAId: string;

  before(async () => {
    // Dynamic test port
    serverPort = 4055;
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
  });

  after(async () => {
    await appInstance.gateway.shutdown();
    await new Promise<void>((resolve) => {
      appInstance.httpServer.close(() => resolve());
    });
    await prisma.$disconnect();
    setTimeout(() => process.exit(0), 500);
  });

  describe('1. User Registration & Password Security', () => {
    const testEmail = `test_reg_${Date.now()}@collab.local`;

    test('Rejects registration with short password (< 8 chars)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'short',
          name: 'Short Password User',
        }),
      });

      const body = await res.json();
      assert.strictEqual(res.status, 400);
      assert.strictEqual(body.success, false);
      assert.match(body.error, /8 ký tự/);
    });

    test('Registers a new user, hashes password, creates default workspace & returns JWT tokens', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'SecurePassword123!',
          name: 'Registered Test User',
          orgName: 'Innovate Tech',
        }),
      });

      const body = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(body.success, true);
      assert.ok(body.data.tokens.accessToken);
      assert.ok(body.data.tokens.refreshToken);
      assert.strictEqual(body.data.user.email, testEmail);
      assert.strictEqual(body.data.workspaces[0].role, 'owner');

      // Verify password in PostgreSQL is NOT plaintext
      const dbUser = await prisma.user.findUnique({ where: { email: testEmail } });
      assert.ok(dbUser);
      assert.notStrictEqual(dbUser.passwordHash, 'SecurePassword123!');
      assert.ok(dbUser.passwordHash?.startsWith('$2')); // bcrypt hash
    });

    test('Rejects duplicate email registration with 409 Conflict', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'AnotherPassword123!',
          name: 'Duplicate User',
        }),
      });

      const body = await res.json();
      assert.strictEqual(res.status, 409);
      assert.strictEqual(body.success, false);
      assert.match(body.error, /đã được đăng ký/);
    });
  });

  describe('2. User Login & Audit Logging', () => {
    test('Fails login with invalid password, records LOGIN_FAILED in AuditLog', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'owner@collab.local',
          password: 'WrongPassword!',
        }),
      });

      const body = await res.json();
      assert.strictEqual(res.status, 401);
      assert.strictEqual(body.success, false);

      // Verify AuditLog
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'LOGIN_FAILED',
          actor: 'owner@collab.local',
        },
        orderBy: { createdAt: 'desc' },
      });
      assert.ok(audit);
      assert.strictEqual(audit.status, 'ERROR');
    });

    test('Logs in successfully with seeded owner credentials, records LOGIN in AuditLog', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'owner@collab.local',
          password: 'Password123!',
        }),
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);
      assert.ok(body.data.tokens.accessToken);
      assert.ok(body.data.tokens.refreshToken);
      assert.strictEqual(body.data.user.email, 'owner@collab.local');

      ownerToken = body.data.tokens.accessToken;
      ownerRefreshToken = body.data.tokens.refreshToken;

      // Verify AuditLog
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'LOGIN',
          actor: 'owner@collab.local',
        },
        orderBy: { createdAt: 'desc' },
      });
      assert.ok(audit);
      assert.strictEqual(audit.status, 'SUCCESS');
    });

    test('Logs in successfully with member and isolated user credentials', async () => {
      // Member in org_main
      const resMember = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'member@collab.local',
          password: 'Password123!',
        }),
      });
      const bodyMember = await resMember.json();
      assert.strictEqual(resMember.status, 200);
      memberToken = bodyMember.data.tokens.accessToken;

      // Isolated user in org_isolated
      const resIso = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'isolated_user@collab.local',
          password: 'Password123!',
        }),
      });
      const bodyIso = await resIso.json();
      assert.strictEqual(resIso.status, 200);
      isolatedToken = bodyIso.data.tokens.accessToken;
    });
  });

  describe('3. Session Management, Token Refresh & Logout', () => {
    test('GET /api/auth/me returns authenticated user identity and workspaces', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.user.email, 'owner@collab.local');
      assert.strictEqual(body.data.workspaces[0].orgId, 'org_main');
    });

    test('GET /api/auth/me rejects unauthenticated request with 401', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`);
      assert.strictEqual(res.status, 401);
    });

    test('POST /api/auth/refresh rotates refresh token and issues new access token', async () => {
      const res = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: ownerRefreshToken }),
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);
      assert.ok(body.data.accessToken);
      assert.ok(body.data.refreshToken);
      assert.notStrictEqual(body.data.refreshToken, ownerRefreshToken);

      const oldToken = ownerRefreshToken;
      ownerToken = body.data.accessToken;
      ownerRefreshToken = body.data.refreshToken;

      // Re-using old token must fail due to rotation revocation!
      const reuseRes = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: oldToken }),
      });
      assert.strictEqual(reuseRes.status, 401);
    });

    test('POST /api/auth/logout revokes session', async () => {
      const res = await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: ownerRefreshToken }),
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);

      // Refreshing with revoked token must fail
      const refreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: ownerRefreshToken }),
      });
      assert.strictEqual(refreshRes.status, 401);

      // Log back in to get a fresh owner token for subsequent tests
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'owner@collab.local',
          password: 'Password123!',
        }),
      });
      const loginBody = await loginRes.json();
      ownerToken = loginBody.data.tokens.accessToken;
    });
  });

  describe('4. CRITICAL SECURITY TEST: Workspace Isolation', () => {
    test('User A in Workspace A creates a task in Workspace A', async () => {
      const res = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
          'Content-Type': 'application/json',
          'x-workspace-id': 'org_main',
        },
        body: JSON.stringify({
          title: 'Nhiệm vụ tuyệt mật của Acme Corporation',
          description: 'Chỉ lưu hành nội bộ org_main',
          column: 'todo',
          priority: 'urgent',
        }),
      });

      const body = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.orgId, 'org_main');
      createdTaskAId = body.data.id;
    });

    test('User B in Workspace B knowing task ID CANNOT read task (GET -> 403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/tasks/${createdTaskAId}`, {
        headers: {
          Authorization: `Bearer ${isolatedToken}`,
          'x-workspace-id': 'org_isolated',
        },
      });

      const body = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(body.success, false);
      assert.match(body.error, /không gian làm việc khác/);
    });

    test('User B in Workspace B CANNOT update task in Workspace A (PATCH -> 403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/tasks/${createdTaskAId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${isolatedToken}`,
          'Content-Type': 'application/json',
          'x-workspace-id': 'org_isolated',
        },
        body: JSON.stringify({
          title: 'Hacked by User B!',
        }),
      });

      const body = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(body.success, false);

      // Verify task in DB remained unchanged!
      const task = await prisma.task.findUnique({ where: { id: createdTaskAId } });
      assert.strictEqual(task?.title, 'Nhiệm vụ tuyệt mật của Acme Corporation');
    });

    test('User B in Workspace B CANNOT delete task in Workspace A (DELETE -> 403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/tasks/${createdTaskAId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${isolatedToken}`,
          'x-workspace-id': 'org_isolated',
        },
      });

      const body = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(body.success, false);

      // Verify task in DB still exists!
      const task = await prisma.task.findUnique({ where: { id: createdTaskAId } });
      assert.ok(task);
    });

    test('User B in Workspace B CANNOT view members of Workspace A via x-workspace-id spoofing', async () => {
      const res = await fetch(`${baseUrl}/api/members`, {
        headers: {
          Authorization: `Bearer ${isolatedToken}`,
          'x-workspace-id': 'org_main', // Spoofed header!
        },
      });

      const body = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(body.success, false);
      assert.match(body.error, /không phải thành viên/);
    });
  });

  describe('5. Role-Based Access Control (RBAC)', () => {
    test('Owner / Admin CAN add a new member to workspace', async () => {
      const inviteEmail = `invited_${Date.now()}@collab.local`;
      const res = await fetch(`${baseUrl}/api/members`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
          'Content-Type': 'application/json',
          'x-workspace-id': 'org_main',
        },
        body: JSON.stringify({
          name: 'Thành Viên Mới',
          email: inviteEmail,
          role: 'member',
          department: 'Kỹ Thuật',
        }),
      });

      const body = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.email, inviteEmail);
    });

    test('Regular Member CANNOT add a new member (POST /api/members -> 403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/members`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${memberToken}`,
          'Content-Type': 'application/json',
          'x-workspace-id': 'org_main',
        },
        body: JSON.stringify({
          name: 'Unauthorized Invite',
          email: 'unauthorized@collab.local',
        }),
      });

      const body = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(body.success, false);
      assert.match(body.error, /yêu cầu quyền/);
    });

    test('Regular Member CANNOT delete a member (DELETE /api/members/:id -> 403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/members/usr_guest`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${memberToken}`,
          'x-workspace-id': 'org_main',
        },
      });

      const body = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(body.success, false);
    });
  });

  describe('6. PostgreSQL Persistence Verification (No RAM Source of Truth)', () => {
    test('Created tasks, audit logs, and members persist in PostgreSQL', async () => {
      // Direct PostgreSQL query using a fresh PrismaClient instance
      const freshPrisma = new PrismaClient({
        datasources: {
          db: {
            url:
              process.env.DATABASE_URL ||
              'postgresql://collab_user:collab_secret@localhost:5434/collab_db?schema=public',
          },
        },
      });

      const task = await freshPrisma.task.findUnique({
        where: { id: createdTaskAId },
      });
      assert.ok(task);
      assert.strictEqual(task.orgId, 'org_main');
      assert.strictEqual(task.title, 'Nhiệm vụ tuyệt mật của Acme Corporation');

      const auditLogs = await freshPrisma.auditLog.findMany({
        where: { orgId: 'org_main' },
      });
      assert.ok(auditLogs.length >= 3);

      await freshPrisma.$disconnect();
    });
  });
});
