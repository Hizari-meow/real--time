import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import { PrismaClient } from '@prisma/client';
import WebSocket from 'ws';
import crypto from 'node:crypto';
import { createApp, AppInstance } from '../packages/server/src/server.js';
import {
  EventBus,
  OutboxRelay,
  getEventBus,
  getOutboxRelay,
  publishDomainEvent,
  PrismaOutboxStorage,
} from '../packages/server/src/core/events/index.js';
import { MentionService } from '../packages/server/src/core/mention/MentionService.js';
import { NotificationService } from '../packages/server/src/core/notification/NotificationService.js';

describe('PHASE 1: Server Event Infrastructure & Unified Notification Hub Test Suite', () => {
  let appInstance: AppInstance;
  let serverPort: number;
  let baseUrl: string;
  let wsUrl: string;
  let prisma: PrismaClient;

  // Test users & tokens
  let userA: { id: string; email: string; name: string; token: string; orgId: string };
  let userB: { id: string; email: string; name: string; token: string; orgId: string };
  let isolatedUser: { id: string; email: string; name: string; token: string; orgId: string };

  before(async () => {
    serverPort = 4056;
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

    // Register User A (Workspace Alpha)
    const emailA = `test_p1_a_${Date.now()}@collab.local`;
    const resA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailA,
        password: 'Password123!',
        name: 'Nguyen Van A',
        orgName: 'Workspace Alpha',
      }),
    });
    const bodyA = await resA.json();
    assert.strictEqual(resA.status, 201, 'User A registration should succeed');
    userA = {
      id: bodyA.data.user.userId || bodyA.data.user.id,
      email: emailA,
      name: 'Nguyen Van A',
      token: bodyA.data.tokens.accessToken,
      orgId: bodyA.data.workspaces[0].orgId,
    };

    // Register User B and add to Workspace Alpha as Member
    const emailB = `test_p1_b_${Date.now()}@collab.local`;
    const resB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailB,
        password: 'Password123!',
        name: 'Tran Thi B',
        orgName: 'Workspace B Personal',
      }),
    });
    const bodyB = await resB.json();
    assert.strictEqual(resB.status, 201, 'User B registration should succeed');

    const userBId = bodyB.data.user.userId || bodyB.data.user.id;

    // Add User B to Workspace Alpha
    await prisma.member.create({
      data: {
        orgId: userA.orgId,
        userId: userBId,
        name: 'Tran Thi B',
        email: emailB,
        role: 'member',
      },
    });

    userB = {
      id: userBId,
      email: emailB,
      name: 'Tran Thi B',
      token: bodyB.data.tokens.accessToken,
      orgId: userA.orgId, // Working in Alpha
    };

    // Register Isolated User (Workspace Isolated)
    const emailIso = `test_p1_iso_${Date.now()}@collab.local`;
    const resIso = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailIso,
        password: 'Password123!',
        name: 'Isolated User',
        orgName: 'Workspace Isolated',
      }),
    });
    const bodyIso = await resIso.json();
    assert.strictEqual(resIso.status, 201, 'Isolated user registration should succeed');
    isolatedUser = {
      id: bodyIso.data.user.userId || bodyIso.data.user.id,
      email: emailIso,
      name: 'Isolated User',
      token: bodyIso.data.tokens.accessToken,
      orgId: bodyIso.data.workspaces[0].orgId,
    };
  });

  after(async () => {
    await appInstance.gateway.shutdown();
    await new Promise<void>((resolve) => {
      appInstance.httpServer.close(() => resolve());
    });
    await prisma.$disconnect();
    setTimeout(() => process.exit(0), 500);
  });

  describe('1. Server Event Infrastructure & Outbox Pattern', () => {
    test('Stages domain event to PostgreSQL Outbox table with processedAt=null', async () => {
      const eventType = 'test.event.outbox';
      const eventId = `evt_${crypto.randomUUID()}`;

      const outboxStorage = new PrismaOutboxStorage(prisma);
      const relay = new OutboxRelay(outboxStorage, new EventBus());

      const envelope: any = {
        id: eventId,
        type: eventType,
        version: 1,
        orgId: userA.orgId,
        actor: { type: 'user', id: userA.id },
        occurredAt: new Date().toISOString(),
        resource: { type: 'test', id: 't1' },
        data: { foo: 'bar', timestamp: Date.now() },
        origin: { chainDepth: 0 },
      };

      const record = await relay.stageEvent(envelope);
      assert.strictEqual(record.id, eventId);
      assert.strictEqual(record.type, eventType);

      // Verify in PostgreSQL
      const dbEvent = await prisma.outboxEvent.findUnique({ where: { id: eventId } });
      assert.ok(dbEvent, 'Event must exist in PostgreSQL OutboxEvent table');
      assert.strictEqual(dbEvent.processedAt, null, 'Staged event must have processedAt null');
      assert.strictEqual(dbEvent.orgId, userA.orgId);
    });

    test('OutboxRelay processes pending events and updates processedAt timestamp', async () => {
      const bus = new EventBus();
      const outboxStorage = new PrismaOutboxStorage(prisma);
      const relay = new OutboxRelay(outboxStorage, bus);

      let receivedEvent: any = null;
      bus.subscribe('test.relay.process', (ev) => {
        receivedEvent = ev;
      });

      const testId = `evt_relay_${crypto.randomUUID()}`;
      await relay.stageEvent({
        id: testId,
        type: 'test.relay.process',
        version: 1,
        orgId: userA.orgId,
        actor: { type: 'user', id: userA.id },
        occurredAt: new Date().toISOString(),
        resource: { type: 'test', id: 'r1' },
        data: { message: 'hello from relay test' },
        origin: { chainDepth: 0 },
      });

      try {
        const processedCount = await relay.processBatch(10, userA.orgId);
        assert.ok(processedCount >= 1, 'Should have processed at least 1 pending event');

        // Check PostgreSQL record status
        const updated = await prisma.outboxEvent.findUnique({ where: { id: testId } });
        assert.ok(updated);
        assert.ok(updated.processedAt !== null, 'processedAt timestamp must be recorded');

        // Check EventBus delivery
        assert.ok(receivedEvent, 'EventBus subscriber must have received the event');
        assert.strictEqual(receivedEvent.data.message, 'hello from relay test');
      } finally {
        await prisma.outboxEvent.delete({ where: { id: testId } }).catch(() => {});
      }
    });

    test('publishDomainEvent helper stages to outbox and dispatches synchronously to EventBus', async () => {
      const bus = getEventBus();
      let captured: any = null;
      const testSub = (ev: any) => {
        captured = ev;
      };
      bus.subscribe('test.helper.publish', testSub);

      const published = await publishDomainEvent({
        type: 'test.helper.publish',
        orgId: userA.orgId,
        actor: { type: 'user', id: userA.id, name: userA.name },
        resource: { type: 'test', id: 'h1' },
        data: { action: 'helper_test', num: 42 },
      });

      assert.ok(published.id);
      assert.ok(captured, 'EventBus should receive the published event');
      assert.strictEqual(captured.data.action, 'helper_test');

      bus.unsubscribe('test.helper.publish', testSub);
    });
  });

  describe('2. Mention Parsing & Workspace Member Resolution', () => {
    const mentionService = MentionService.getInstance();

    test('Extracts @mention tokens from text accurately', () => {
      const text = 'Chào @linh và @hoang_dev! Vui lòng kiểm tra PR của @alice.tech nhé. Email user@test.com không phải mention.';
      const mentions = mentionService.extractMentionTokens(text);

      assert.ok(mentions.includes('linh'));
      assert.ok(mentions.includes('hoang_dev'));
      assert.ok(mentions.includes('alice.tech'));
    });

    test('Resolves mentioned users against active workspace members in PostgreSQL', async () => {
      // User A and User B are both members of Workspace Alpha
      // Mention User B's name/email in a comment
      const text = `Hey @${userB.email} and @unknown_user_9999 please check this`;
      const tokens = mentionService.extractMentionTokens(text);
      const mentionedMembers = await mentionService.resolveMentionedUsers(userA.orgId, tokens, userA.id);

      assert.strictEqual(mentionedMembers.length, 1, 'Should only resolve 1 valid workspace member');
      assert.strictEqual(mentionedMembers[0].userId, userB.id);
      assert.strictEqual(mentionedMembers[0].email, userB.email);
    });

    test('Excludes author self-mentions so user does not notify themselves', async () => {
      // User A mentions themselves
      const text = `Self task assigned to @${userA.email} and @${userB.email}`;
      const tokens = mentionService.extractMentionTokens(text);
      const mentioned = await mentionService.resolveMentionedUsers(userA.orgId, tokens, userA.id);

      assert.strictEqual(mentioned.length, 1, 'Self-mention must be excluded');
      assert.strictEqual(mentioned[0].userId, userB.id);
    });

    test('Does not resolve users from other workspaces (workspace isolation)', async () => {
      // Isolated User is NOT a member of Workspace Alpha
      const text = `Attempt to tag @${isolatedUser.email} from another workspace`;
      const tokens = mentionService.extractMentionTokens(text);
      const mentioned = await mentionService.resolveMentionedUsers(userA.orgId, tokens, userA.id);

      assert.strictEqual(mentioned.length, 0, 'Users from different workspace must NOT be resolved');
    });
  });

  describe('3. Notification Hub & PostgreSQL Persistence', () => {
    const notifService = NotificationService.getInstance();
    let createdNotifId: string;

    test('Creates notification and persists in PostgreSQL', async () => {
      const notif = await notifService.createNotification({
        userId: userB.id,
        orgId: userA.orgId,
        actorId: userA.id,
        title: 'Bình luận mới',
        body: 'Nguyen Van A đã nhắc đến bạn trong tài liệu',
        type: 'mention',
        metadata: { docId: 'doc_123' },
      });

      assert.ok(notif);
      assert.ok(notif.id);
      assert.strictEqual(notif.userId, userB.id);
      assert.strictEqual(notif.orgId, userA.orgId);
      assert.strictEqual(notif.isRead, false);
      createdNotifId = notif.id;

      // Verify in DB directly
      const dbNotif = await prisma.notification.findUnique({ where: { id: notif.id } });
      assert.ok(dbNotif, 'Notification must be stored in PostgreSQL');
      assert.strictEqual(dbNotif.title, 'Bình luận mới');
      assert.strictEqual(dbNotif.isRead, false);
    });

    test('Fetches notifications via GET /api/notifications with workspace isolation', async () => {
      // User B in Workspace Alpha should see the notification
      const res = await fetch(`${baseUrl}/api/notifications`, {
        headers: {
          Authorization: `Bearer ${userB.token}`,
          'x-workspace-id': userA.orgId,
        },
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);
      assert.ok(Array.isArray(body.data.items), 'body.data.items must be an array');
      const found = body.data.items.find((n: any) => n.id === createdNotifId);
      assert.ok(found, 'Created notification should be returned for User B');
    });

    test('GET /api/notifications/unread-count returns accurate count from PostgreSQL', async () => {
      const res = await fetch(`${baseUrl}/api/notifications/unread-count`, {
        headers: {
          Authorization: `Bearer ${userB.token}`,
          'x-workspace-id': userA.orgId,
        },
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);
      assert.ok(body.data.unreadCount >= 1, 'Unread count must be >= 1');
    });

    test('Cross-workspace isolation: Querying from another workspace returns 0 notifications', async () => {
      // Isolated user querying their own workspace should NOT see User B's notification
      const res = await fetch(`${baseUrl}/api/notifications`, {
        headers: {
          Authorization: `Bearer ${isolatedUser.token}`,
          'x-workspace-id': isolatedUser.orgId,
        },
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(body.data.items));
      const found = body.data.items.find((n: any) => n.id === createdNotifId);
      assert.strictEqual(found, undefined, 'Isolated workspace must not see notifications from Alpha');
    });

    test('PATCH /api/notifications/:id/read marks notification as read in PostgreSQL', async () => {
      const res = await fetch(`${baseUrl}/api/notifications/${createdNotifId}/read`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${userB.token}`,
          'x-workspace-id': userA.orgId,
        },
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.isRead, true);

      // Verify in DB
      const dbNotif = await prisma.notification.findUnique({ where: { id: createdNotifId } });
      assert.ok(dbNotif);
      assert.strictEqual(dbNotif.isRead, true);
      assert.ok(dbNotif.readAt !== null, 'readAt timestamp must be set');
    });

    test('PATCH /api/notifications/read-all marks all unread as read and resets unread count to 0', async () => {
      // Create 2 new unread notifications for User B
      await notifService.createNotification({
        userId: userB.id,
        orgId: userA.orgId,
        title: 'Task mới 1',
        body: 'Mô tả task 1',
        type: 'task',
      });
      await notifService.createNotification({
        userId: userB.id,
        orgId: userA.orgId,
        title: 'Task mới 2',
        body: 'Mô tả task 2',
        type: 'task',
      });

      const countBefore = await notifService.getUnreadCount(userB.id, userA.orgId);
      assert.ok(countBefore >= 2);

      // Call mark all as read API
      const res = await fetch(`${baseUrl}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${userB.token}`,
          'x-workspace-id': userA.orgId,
        },
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);
      assert.ok(body.data.markedCount >= 2);

      // Verify unread count is 0 in DB
      const countAfter = await notifService.getUnreadCount(userB.id, userA.orgId);
      assert.strictEqual(countAfter, 0);
    });
  });

  describe('4. Realtime Targeted WebSocket Notification Delivery', () => {
    test('WebSocket connection authenticates and receives targeted notification for specific recipient', async () => {
      // Connect WebSocket for User B
      const wsB = new WebSocket(`${wsUrl}?token=${encodeURIComponent(userB.token)}&orgId=${encodeURIComponent(userA.orgId)}`);
      
      await new Promise<void>((resolve, reject) => {
        wsB.on('open', () => resolve());
        wsB.on('error', (err) => reject(err));
      });

      // Prepare listener for User B
      const receivedMessagesB: any[] = [];
      wsB.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          receivedMessagesB.push(parsed);
        } catch {}
      });

      // Also connect WebSocket for Isolated User to verify they DO NOT receive User B's notification
      const wsIso = new WebSocket(`${wsUrl}?token=${encodeURIComponent(isolatedUser.token)}&orgId=${encodeURIComponent(isolatedUser.orgId)}`);
      await new Promise<void>((resolve, reject) => {
        wsIso.on('open', () => resolve());
        wsIso.on('error', (err) => reject(err));
      });

      const receivedMessagesIso: any[] = [];
      wsIso.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          receivedMessagesIso.push(parsed);
        } catch {}
      });

      // Send a notification targeted specifically to User B
      const notifService = NotificationService.getInstance();
      const testNotif = await notifService.createNotification({
        userId: userB.id,
        orgId: userA.orgId,
        actorId: userA.id,
        title: 'Realtime Alert for User B',
        body: 'Targeted delivery verification',
        type: 'system',
      });

      assert.ok(testNotif);

      // Wait up to 600ms for WS message
      await new Promise((r) => setTimeout(r, 600));

      // Verify User B received notification:created
      const notifMsgB = receivedMessagesB.find((m) => m.type === 'notification:created' && m.data?.id === testNotif.id);
      assert.ok(notifMsgB, 'User B WebSocket MUST receive the targeted notification');
      assert.strictEqual(notifMsgB.data.title, 'Realtime Alert for User B');

      // Verify Isolated User did NOT receive User B's notification (Targeted delivery!)
      const notifMsgIso = receivedMessagesIso.find((m) => m.data?.id === testNotif.id);
      assert.strictEqual(notifMsgIso, undefined, 'Isolated User MUST NOT receive private notification for User B');

      wsB.close();
      wsIso.close();
    });

    test('Offline delivery: Notification persists in PostgreSQL when user is offline', async () => {
      // User B is now offline (sockets closed)
      const notifService = NotificationService.getInstance();
      const offlineNotif = await notifService.createNotification({
        userId: userB.id,
        orgId: userA.orgId,
        title: 'Offline message',
        body: 'Delivered while disconnected',
        type: 'comment',
      });

      assert.ok(offlineNotif);

      // Verify it exists in PostgreSQL
      const dbNotif = await prisma.notification.findUnique({ where: { id: offlineNotif.id } });
      assert.ok(dbNotif);
      assert.strictEqual(dbNotif.isRead, false);

      // Verify unread count via REST API
      const res = await fetch(`${baseUrl}/api/notifications/unread-count`, {
        headers: {
          Authorization: `Bearer ${userB.token}`,
          'x-workspace-id': userA.orgId,
        },
      });
      const body = await res.json();
      assert.ok(body.data.unreadCount >= 1, 'Offline notification is counted in unread count');
    });
  });

  describe('5. Cross-Module Domain Event Trigger Flow', () => {
    test('Task assignment via EventBus automatically creates notification for assignee', async () => {
      const notifService = NotificationService.getInstance();
      const countBefore = await notifService.getUnreadCount(userB.id, userA.orgId);

      // Publish task.assigned domain event
      await publishDomainEvent({
        type: 'task.assigned',
        orgId: userA.orgId,
        actor: { type: 'user', id: userA.id, name: userA.name },
        resource: { type: 'task', id: 'task_auto_test_1' },
        data: {
          taskId: 'task_auto_test_1',
          title: 'Thiết kế giao diện Phase 1',
          assigneeId: userB.id,
          priority: 'urgent',
        },
      });

      // Allow EventBus async handler to execute
      await new Promise((r) => setTimeout(r, 400));

      const countAfter = await notifService.getUnreadCount(userB.id, userA.orgId);
      assert.strictEqual(countAfter, countBefore + 1, 'Assignee unread count should increase by 1');

      // Check notification details in DB
      const latestNotif = await prisma.notification.findFirst({
        where: {
          userId: userB.id,
          orgId: userA.orgId,
          type: 'task',
        },
        orderBy: { createdAt: 'desc' },
      });

      assert.ok(latestNotif);
      assert.match(latestNotif.title, /Thiết kế giao diện Phase 1/);
    });

    test('Member added event creates notification for new member', async () => {
      const notifService = NotificationService.getInstance();

      await publishDomainEvent({
        type: 'member.added',
        orgId: userA.orgId,
        actor: { type: 'user', id: userA.id, name: userA.name },
        resource: { type: 'member', id: userB.id },
        data: {
          userId: userB.id,
          orgName: 'Workspace Alpha',
        },
      });

      await new Promise((r) => setTimeout(r, 400));

      const memberNotif = await prisma.notification.findFirst({
        where: {
          userId: userB.id,
          orgId: userA.orgId,
          type: 'system',
        },
        orderBy: { createdAt: 'desc' },
      });

      assert.ok(memberNotif);
      assert.match(memberNotif.title, /Chào mừng bạn gia nhập/);
    });
  });
});
