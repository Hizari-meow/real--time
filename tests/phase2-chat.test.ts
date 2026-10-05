import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import { PrismaClient } from '@prisma/client';
import WebSocket from 'ws';
import { createApp, AppInstance } from '../packages/server/src/server.js';
import { getOutboxRelay } from '../packages/server/src/core/events/index.js';

describe('PHASE 2: Real Chat Engine — Server WebSocket Chat & PostgreSQL Test Suite', () => {
  let appInstance: AppInstance;
  let serverPort: number;
  let baseUrl: string;
  let wsUrl: string;
  let prisma: PrismaClient;

  // Test users & workspaces
  let userA: { id: string; email: string; name: string; token: string; orgId: string };
  let userB: { id: string; email: string; name: string; token: string; orgId: string };
  let isolatedUser: { id: string; email: string; name: string; token: string; orgId: string };

  let publicChannelId: string;
  let privateChannelId: string;

  before(async () => {
    serverPort = 4070;
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

    // 1. Register User A (Workspace Alpha Owner)
    const emailA = `test_p2_a_${Date.now()}@collab.local`;
    const resA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailA,
        password: 'Password123!',
        name: 'Nguyen Van A',
        orgName: 'Workspace Alpha Chat',
      }),
    });
    const dataA = await resA.json();
    assert.strictEqual(dataA.success, true, 'User A registration should succeed');
    userA = {
      id: dataA.data.user.userId || dataA.data.user.id,
      email: emailA,
      name: 'Nguyen Van A',
      token: dataA.data.tokens.accessToken,
      orgId: dataA.data.workspaces[0].orgId,
    };

    // 2. Register User B and add to Workspace Alpha as Member
    const emailB = `test_p2_b_${Date.now()}@collab.local`;
    const resB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailB,
        password: 'Password123!',
        name: 'Tran Thi B',
        orgName: 'Temporary Org',
      }),
    });
    const dataB = await resB.json();
    assert.strictEqual(dataB.success, true, 'User B registration should succeed');
    const userBId = dataB.data.user.userId || dataB.data.user.id;

    // Add User B to Workspace Alpha
    await prisma.member.create({
      data: {
        orgId: userA.orgId,
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
    userB = {
      id: userBId,
      email: emailB,
      name: 'Tran Thi B',
      token: loginDataB.data.tokens.accessToken,
      orgId: userA.orgId,
    };

    // 3. Register Isolated User in Workspace Beta
    const emailIso = `test_p2_iso_${Date.now()}@collab.local`;
    const resIso = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailIso,
        password: 'Password123!',
        name: 'Isolated User',
        orgName: 'Workspace Beta Isolated',
      }),
    });
    const dataIso = await resIso.json();
    isolatedUser = {
      id: dataIso.data.user.userId || dataIso.data.user.id,
      email: emailIso,
      name: 'Isolated User',
      token: dataIso.data.tokens.accessToken,
      orgId: dataIso.data.workspaces[0].orgId,
    };
  });

  after(async () => {
    getOutboxRelay().stop();
    await appInstance.gateway.shutdown();
    await new Promise<void>((resolve) => {
      appInstance.httpServer.close(() => resolve());
    });
    await prisma.$disconnect();
    setTimeout(() => process.exit(0), 500);
  });

  // =========================================================================
  // 1. Channel Management & Access Control
  // =========================================================================
  describe('1. Channel Management & Access Control', () => {
    test('User A can create a public channel and it persists in PostgreSQL', async () => {
      const res = await fetch(`${baseUrl}/api/chat/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userA.token}`,
          'x-workspace-id': userA.orgId,
        },
        body: JSON.stringify({
          name: 'cong-nghe-moi',
          type: 'public',
          topic: 'Thảo luận công nghệ mới',
        }),
      });

      const body = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.name, 'cong-nghe-moi');
      assert.strictEqual(body.data.type, 'public');

      publicChannelId = body.data.id;

      // Verify in PostgreSQL
      const dbChan = await prisma.channel.findUnique({
        where: { id: publicChannelId },
      });
      assert.ok(dbChan, 'Channel must exist in PostgreSQL');
      assert.strictEqual(dbChan.orgId, userA.orgId);
    });

    test('User A can create a private channel where only User A is a member', async () => {
      const res = await fetch(`${baseUrl}/api/chat/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userA.token}`,
          'x-workspace-id': userA.orgId,
        },
        body: JSON.stringify({
          name: 'bi-mat-alpha',
          type: 'private',
          topic: 'Kênh riêng tư của User A',
        }),
      });

      const body = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.type, 'private');

      privateChannelId = body.data.id;

      // Verify channel members in PostgreSQL
      const members = await prisma.channelMember.findMany({
        where: { channelId: privateChannelId },
      });
      assert.strictEqual(members.length, 1);
      assert.strictEqual(members[0].userId, userA.id);
    });

    test('User B lists channels: sees public channel, but cannot see private channel', async () => {
      const res = await fetch(`${baseUrl}/api/chat/channels`, {
        headers: {
          Authorization: `Bearer ${userB.token}`,
          'x-workspace-id': userB.orgId,
        },
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);

      const channelIds = body.data.map((c: any) => c.id);
      assert.ok(channelIds.includes(publicChannelId), 'User B should see public channel');
      assert.ok(!channelIds.includes(privateChannelId), 'User B must NOT see private channel they are not member of');
    });

    test('User B is blocked with 403 Forbidden when trying to access private channel messages', async () => {
      const res = await fetch(`${baseUrl}/api/chat/channels/${privateChannelId}/messages`, {
        headers: {
          Authorization: `Bearer ${userB.token}`,
          'x-workspace-id': userB.orgId,
        },
      });

      assert.strictEqual(res.status, 403, 'Must return 403 Forbidden for non-member of private channel');
      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.ok(body.error.includes('Truy cập bị từ chối'));
    });

    test('User from isolated workspace is blocked with 403 Forbidden accessing channel in other org', async () => {
      const res = await fetch(`${baseUrl}/api/chat/channels/${publicChannelId}/messages`, {
        headers: {
          Authorization: `Bearer ${isolatedUser.token}`,
          'x-workspace-id': isolatedUser.orgId,
        },
      });

      assert.strictEqual(res.status, 403, 'Must return 403 Forbidden for cross-workspace access');
    });
  });

  // =========================================================================
  // 2. Direct Message (1:1 DM)
  // =========================================================================
  describe('2. Direct Message (1:1 DM)', () => {
    let dmChannelId: string;

    test('User A can create or get a 1:1 DM channel with User B', async () => {
      const res = await fetch(`${baseUrl}/api/chat/dm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userA.token}`,
          'x-workspace-id': userA.orgId,
        },
        body: JSON.stringify({
          targetUserId: userB.id,
        }),
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.type, 'dm');

      dmChannelId = body.data.id;

      // Both users should be channel members
      const members = await prisma.channelMember.findMany({
        where: { channelId: dmChannelId },
      });
      assert.strictEqual(members.length, 2);
      const userIds = members.map((m) => m.userId);
      assert.ok(userIds.includes(userA.id));
      assert.ok(userIds.includes(userB.id));
    });

    test('Calling /api/chat/dm again returns the existing DM channel idempotently', async () => {
      const res = await fetch(`${baseUrl}/api/chat/dm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userB.token}`,
          'x-workspace-id': userB.orgId,
        },
        body: JSON.stringify({
          targetUserId: userA.id,
        }),
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.data.id, dmChannelId, 'Must return the same DM channel without duplicates');
    });
  });

  // =========================================================================
  // 3. Server WebSocket Real-Time Chat & Persistence
  // =========================================================================
  describe('3. Server WebSocket Real-Time Chat & Persistence', () => {
    let wsA: WebSocket;
    let wsB: WebSocket;
    let createdMessageId: string;

    test('Connect WebSocket clients for User A and User B and join channel', async () => {
      wsA = new WebSocket(`${wsUrl}?token=${encodeURIComponent(userA.token)}&orgId=${encodeURIComponent(userA.orgId)}`);
      wsB = new WebSocket(`${wsUrl}?token=${encodeURIComponent(userB.token)}&orgId=${encodeURIComponent(userB.orgId)}`);

      await Promise.all([
        new Promise<void>((resolve) => wsA.on('open', resolve)),
        new Promise<void>((resolve) => wsB.on('open', resolve)),
      ]);

      // Join public channel
      wsA.send(JSON.stringify({ type: 'chat:join_channel', channelId: publicChannelId }));
      wsB.send(JSON.stringify({ type: 'chat:join_channel', channelId: publicChannelId }));

      // Wait a moment for join acknowledgment
      await new Promise((r) => setTimeout(r, 100));
    });

    test('User A sends message via WebSocket: persists in PostgreSQL and delivers to User B in realtime', async () => {
      const messageContent = 'Xin chào team! Tin nhắn kiểm thử WebSocket thời gian thực.';

      const receivePromise = new Promise<any>((resolve) => {
        const handler = (data: WebSocket.Data) => {
          try {
            const parsed = JSON.parse(data.toString());
            if (parsed.type === 'chat:message_received' && parsed.channelId === publicChannelId) {
              wsB.off('message', handler);
              resolve(parsed.data);
            }
          } catch {}
        };
        wsB.on('message', handler);
      });

      // Send message from Client A
      wsA.send(
        JSON.stringify({
          type: 'chat:send_message',
          channelId: publicChannelId,
          content: messageContent,
          clientTempId: 'temp_123',
        })
      );

      const received = await receivePromise;
      assert.ok(received, 'User B must receive the message');
      assert.strictEqual(received.content, messageContent);
      assert.strictEqual(received.channelId, publicChannelId);
      assert.strictEqual(received.senderId, userA.id);
      assert.ok(typeof received.seq === 'number', 'Message must have a sequence number');

      createdMessageId = received.id;

      // Verify directly in PostgreSQL
      const dbMsg = await prisma.message.findUnique({
        where: { id: createdMessageId },
      });
      assert.ok(dbMsg, 'Message must be persisted in PostgreSQL');
      assert.strictEqual(dbMsg.content, messageContent);
      assert.strictEqual(dbMsg.channelId, publicChannelId);
      assert.strictEqual(dbMsg.parentId, null);
    });

    test('Thread Reply via WebSocket: persists in PostgreSQL with parentId and updates reply count', async () => {
      const replyContent = 'Phản hồi chủ đề: Tôi đã nhận được tin nhắn!';

      const replyReceivePromise = new Promise<any>((resolve) => {
        const handler = (data: WebSocket.Data) => {
          try {
            const parsed = JSON.parse(data.toString());
            if (
              parsed.type === 'chat:thread_reply_received' &&
              parsed.parentMessageId === createdMessageId
            ) {
              wsA.off('message', handler);
              resolve(parsed.data);
            }
          } catch {}
        };
        wsA.on('message', handler);
      });

      // Send thread reply from Client B
      wsB.send(
        JSON.stringify({
          type: 'chat:reply_thread',
          channelId: publicChannelId,
          parentMessageId: createdMessageId,
          content: replyContent,
        })
      );

      const receivedReply = await replyReceivePromise;
      assert.ok(receivedReply, 'User A must receive thread reply');
      assert.strictEqual(receivedReply.content, replyContent);
      assert.strictEqual(receivedReply.parentId, createdMessageId);
      assert.strictEqual(receivedReply.senderId, userB.id);

      // Verify in PostgreSQL
      const dbReply = await prisma.message.findUnique({
        where: { id: receivedReply.id },
      });
      assert.ok(dbReply, 'Thread reply must be persisted in PostgreSQL');
      assert.strictEqual(dbReply.parentId, createdMessageId);

      // Verify thread replies endpoint
      const threadRes = await fetch(`${baseUrl}/api/chat/messages/${createdMessageId}/thread`, {
        headers: {
          Authorization: `Bearer ${userA.token}`,
          'x-workspace-id': userA.orgId,
        },
      });
      const threadBody = await threadRes.json();
      assert.strictEqual(threadBody.success, true);
      assert.strictEqual(threadBody.data.length, 1);
      assert.strictEqual(threadBody.data[0].id, receivedReply.id);

      // Verify parent message has threadCount: 1 in channel message list
      const chanMsgsRes = await fetch(`${baseUrl}/api/chat/channels/${publicChannelId}/messages`, {
        headers: {
          Authorization: `Bearer ${userA.token}`,
          'x-workspace-id': userA.orgId,
        },
      });
      const chanMsgsBody = await chanMsgsRes.json();
      const parentInList = chanMsgsBody.data.messages.find((m: any) => m.id === createdMessageId);
      assert.ok(parentInList);
      assert.strictEqual(parentInList.threadCount, 1);
    });

    test('Emoji Reactions: Toggle emoji reaction persists in PostgreSQL and broadcasts to channel', async () => {
      const emojiReactionPromise = new Promise<any>((resolve) => {
        const handler = (data: WebSocket.Data) => {
          try {
            const parsed = JSON.parse(data.toString());
            if (
              parsed.type === 'chat:reaction_updated' &&
              parsed.messageId === createdMessageId
            ) {
              wsA.off('message', handler);
              resolve(parsed.data.reactions);
            }
          } catch {}
        };
        wsA.on('message', handler);
      });

      // User B adds reaction '🚀'
      wsB.send(
        JSON.stringify({
          type: 'chat:reaction',
          messageId: createdMessageId,
          emoji: '🚀',
        })
      );

      const reactions = await emojiReactionPromise;
      assert.ok(Array.isArray(reactions));
      const rocketReaction = reactions.find((r: any) => r.emoji === '🚀');
      assert.ok(rocketReaction);
      assert.strictEqual(rocketReaction.count, 1);
      assert.ok(rocketReaction.users.includes(userB.id));

      // Verify in PostgreSQL
      const dbReactions = await prisma.messageReaction.findMany({
        where: { messageId: createdMessageId, emoji: '🚀' },
      });
      assert.strictEqual(dbReactions.length, 1);
      assert.strictEqual(dbReactions[0].userId, userB.id);

      // User B toggles reaction again -> removes it
      const removePromise = new Promise<any>((resolve) => {
        const handler = (data: WebSocket.Data) => {
          try {
            const parsed = JSON.parse(data.toString());
            if (
              parsed.type === 'chat:reaction_updated' &&
              parsed.messageId === createdMessageId
            ) {
              wsA.off('message', handler);
              resolve(parsed.data.reactions);
            }
          } catch {}
        };
        wsA.on('message', handler);
      });

      wsB.send(
        JSON.stringify({
          type: 'chat:reaction',
          messageId: createdMessageId,
          emoji: '🚀',
        })
      );

      const updatedReactions = await removePromise;
      const rocketAfter = updatedReactions.find((r: any) => r.emoji === '🚀');
      assert.strictEqual(rocketAfter, undefined, 'Reaction should be removed when toggled');

      // Verify in PostgreSQL
      const dbReactionsAfter = await prisma.messageReaction.findMany({
        where: { messageId: createdMessageId, emoji: '🚀' },
      });
      assert.strictEqual(dbReactionsAfter.length, 0);
    });

    test('Typing indicator: broadcast to other channel subscribers without echoing to sender', async () => {
      let senderReceivedEcho = false;

      const echoHandler = (data: WebSocket.Data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.type === 'chat:user_typing') {
            senderReceivedEcho = true;
          }
        } catch {}
      };
      wsA.on('message', echoHandler);

      const peerTypingPromise = new Promise<any>((resolve) => {
        const handler = (data: WebSocket.Data) => {
          try {
            const parsed = JSON.parse(data.toString());
            if (parsed.type === 'chat:user_typing' && parsed.channelId === publicChannelId) {
              wsB.off('message', handler);
              resolve(parsed.data);
            }
          } catch {}
        };
        wsB.on('message', handler);
      });

      // User A types in public channel
      wsA.send(
        JSON.stringify({
          type: 'chat:typing',
          channelId: publicChannelId,
          isTyping: true,
        })
      );

      const typingData = await peerTypingPromise;
      assert.strictEqual(typingData.userId, userA.id);
      assert.strictEqual(typingData.isTyping, true);

      // Verify sender did not receive echo
      await new Promise((r) => setTimeout(r, 100));
      wsA.off('message', echoHandler);
      assert.strictEqual(senderReceivedEcho, false, 'Sender should not receive echo of their own typing');
    });

    test('User Presence: Online and Offline status tracking across sockets', async () => {
      // Both users are connected, check presence endpoint
      const presenceRes = await fetch(`${baseUrl}/api/chat/presence`, {
        headers: {
          Authorization: `Bearer ${userA.token}`,
          'x-workspace-id': userA.orgId,
        },
      });
      const presenceBody = await presenceRes.json();
      assert.strictEqual(presenceBody.success, true);
      assert.ok(presenceBody.data.onlineUserIds.includes(userA.id));
      assert.ok(presenceBody.data.onlineUserIds.includes(userB.id));

      // User B disconnects socket
      const offlinePromise = new Promise<any>((resolve) => {
        const handler = (data: WebSocket.Data) => {
          try {
            const parsed = JSON.parse(data.toString());
            if (parsed.type === 'presence:update' && parsed.data.userId === userB.id) {
              wsA.off('message', handler);
              resolve(parsed.data);
            }
          } catch {}
        };
        wsA.on('message', handler);
      });

      wsB.close();

      const offlineData = await offlinePromise;
      assert.strictEqual(offlineData.userId, userB.id);
      assert.strictEqual(offlineData.status, 'offline');

      // Clean up User A socket
      wsA.close();
    });
  });

  // =========================================================================
  // 4. Mention & Phase 1 Notification Hub Integration
  // =========================================================================
  describe('4. Mention & Phase 1 Notification Hub Integration', () => {
    test('Sending a message with @Mention creates a real Notification in PostgreSQL for mentioned member', async () => {
      // User A mentions User B: "@Tran Thi B vui lòng xem qua tài liệu kiến trúc!"
      const mentionContent = `@${userB.name} vui lòng kiểm tra kiến trúc hệ thống chat!`;

      const sendRes = await fetch(`${baseUrl}/api/chat/channels/${publicChannelId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userA.token}`,
          'x-workspace-id': userA.orgId,
        },
        body: JSON.stringify({
          content: mentionContent,
        }),
      });

      const sendBody = await sendRes.json();
      assert.strictEqual(sendRes.status, 201);
      assert.strictEqual(sendBody.success, true);

      // Wait a moment for EventBus and MentionService async processing
      await new Promise((r) => setTimeout(r, 300));

      // Check Notification table in PostgreSQL for User B
      const notifications = await prisma.notification.findMany({
        where: {
          userId: userB.id,
          orgId: userB.orgId,
          type: 'mention',
        },
        orderBy: { createdAt: 'desc' },
      });

      assert.ok(notifications.length > 0, 'Notification should be created for mentioned user');
      const latestNotif = notifications[0];
      assert.strictEqual(latestNotif.userId, userB.id);
      assert.strictEqual(latestNotif.orgId, userA.orgId);
      assert.ok(latestNotif.body.includes('kiến trúc hệ thống chat'));
      assert.strictEqual(latestNotif.isRead, false);

      // Also verify via GET /api/notifications endpoint
      const notifRes = await fetch(`${baseUrl}/api/notifications`, {
        headers: {
          Authorization: `Bearer ${userB.token}`,
          'x-workspace-id': userB.orgId,
        },
      });
      const notifBody = await notifRes.json();
      assert.strictEqual(notifBody.success, true);
      assert.ok(notifBody.data.items.length > 0);
      assert.ok(notifBody.data.unreadCount >= 1);
    });
  });
});
