import { WebSocket } from 'ws';
import { ChatService } from './ChatService.js';
import { RedisPool } from '../../redis/redis-client.js';
import { config } from '../../config.js';

interface SocketMeta {
  userId: string;
  orgId: string;
  name: string;
}

export class ChatSocketManager {
  private static instance: ChatSocketManager | null = null;

  // orgId -> Set of sockets
  private orgSockets = new Map<string, Set<WebSocket>>();
  // userId -> Set of sockets
  private userSockets = new Map<string, Set<WebSocket>>();
  // channelId -> Set of sockets
  private channelSubscribers = new Map<string, Set<WebSocket>>();
  // WeakMap for socket metadata
  private socketMeta = new WeakMap<WebSocket, SocketMeta>();
  // WeakMap for channels joined by a socket
  private socketChannels = new WeakMap<WebSocket, Set<string>>();

  private redisChannel = 'collab:chat:cluster_events';
  private isRedisSubscribed = false;

  private constructor() {
    this.initRedisSubscription();
  }

  public static getInstance(): ChatSocketManager {
    if (!ChatSocketManager.instance) {
      ChatSocketManager.instance = new ChatSocketManager();
    }
    return ChatSocketManager.instance;
  }

  /**
   * Cross-node clustering via Redis Pub/Sub
   */
  private initRedisSubscription(): void {
    if (this.isRedisSubscribed) return;
    try {
      const redis = RedisPool.getInstance();
      redis.subscriber.subscribe(this.redisChannel, (err) => {
        if (err) {
          console.warn('[ChatSocketManager] Redis subscribe error, fallback to local-only:', err.message);
        } else {
          this.isRedisSubscribed = true;
        }
      });

      redis.subscriber.on('message', (channel, messageStr) => {
        if (channel !== this.redisChannel) return;
        try {
          const envelope = JSON.parse(messageStr);
          // Ignore events originated from this node to prevent echo
          if (envelope.originNodeId === config.nodeId) return;

          this.dispatchLocal(envelope.target, envelope.payload, envelope.excludeUserId);
        } catch {
          // ignore corrupted redis message
        }
      });
    } catch {
      // Redis might not be available in unit test environments
    }
  }

  /**
   * Broadcast payload to Redis cluster for multi-node setups
   */
  private publishCluster(target: { type: 'channel' | 'org' | 'user'; id: string }, payload: any, excludeUserId?: string): void {
    try {
      const redis = RedisPool.getInstance();
      const message = JSON.stringify({
        originNodeId: config.nodeId,
        target,
        payload,
        excludeUserId,
      });
      redis.publisher.publish(this.redisChannel, message).catch(() => {});
    } catch {
      // Ignore if Redis is unavailable
    }
  }

  /**
   * Register an authenticated WebSocket connection
   */
  public registerSocket(userId: string, orgId: string, name: string, socket: WebSocket): void {
    this.socketMeta.set(socket, { userId, orgId, name });
    this.socketChannels.set(socket, new Set());

    // 1. Add to orgSockets
    if (!this.orgSockets.has(orgId)) {
      this.orgSockets.set(orgId, new Set());
    }
    this.orgSockets.get(orgId)!.add(socket);

    // 2. Add to userSockets
    const isFirstConnectionForUser = !this.userSockets.has(userId) || this.userSockets.get(userId)!.size === 0;
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socket);

    // 3. Handle Presence: Broadcast online if first socket
    if (isFirstConnectionForUser) {
      this.broadcastToOrg(orgId, {
        type: 'presence:update',
        data: { userId, status: 'online' },
      });
    }

    // 4. Hook close & error listeners
    socket.on('close', () => {
      this.unregisterSocket(socket);
    });

    socket.on('error', () => {
      this.unregisterSocket(socket);
    });
  }

  /**
   * Clean up socket state on disconnect
   */
  public unregisterSocket(socket: WebSocket): void {
    const meta = this.socketMeta.get(socket);
    if (!meta) return;

    const { userId, orgId } = meta;

    // 1. Remove from all subscribed channels
    const channels = this.socketChannels.get(socket);
    if (channels) {
      for (const channelId of channels) {
        const subs = this.channelSubscribers.get(channelId);
        if (subs) {
          subs.delete(socket);
          if (subs.size === 0) {
            this.channelSubscribers.delete(channelId);
          }
        }
      }
    }

    // 2. Remove from orgSockets
    const orgSet = this.orgSockets.get(orgId);
    if (orgSet) {
      orgSet.delete(socket);
      if (orgSet.size === 0) {
        this.orgSockets.delete(orgId);
      }
    }

    // 3. Remove from userSockets
    const userSet = this.userSockets.get(userId);
    let isUserNowOffline = false;
    if (userSet) {
      userSet.delete(socket);
      if (userSet.size === 0) {
        this.userSockets.delete(userId);
        isUserNowOffline = true;
      }
    }

    // 4. Handle Presence: Broadcast offline if 0 sockets remain
    if (isUserNowOffline) {
      this.broadcastToOrg(orgId, {
        type: 'presence:update',
        data: { userId, status: 'offline' },
      });
    }
  }

  /**
   * Dispatch payload locally to target sockets
   */
  private dispatchLocal(
    target: { type: 'channel' | 'org' | 'user'; id: string },
    payload: any,
    excludeUserId?: string
  ): void {
    const message = JSON.stringify(payload);
    let targetSet: Set<WebSocket> | undefined;

    if (target.type === 'channel') {
      targetSet = this.channelSubscribers.get(target.id);
    } else if (target.type === 'org') {
      targetSet = this.orgSockets.get(target.id);
    } else if (target.type === 'user') {
      targetSet = this.userSockets.get(target.id);
    }

    if (!targetSet) return;

    for (const s of targetSet) {
      if (s.readyState === WebSocket.OPEN) {
        if (excludeUserId) {
          const m = this.socketMeta.get(s);
          if (m && m.userId === excludeUserId) {
            continue;
          }
        }
        try {
          s.send(message);
        } catch {
          // ignore socket write failure
        }
      }
    }
  }

  /**
   * Broadcast to all local and cluster subscribers of a channel
   */
  public broadcastToChannel(channelId: string, payload: any, excludeUserId?: string): void {
    this.dispatchLocal({ type: 'channel', id: channelId }, payload, excludeUserId);
    this.publishCluster({ type: 'channel', id: channelId }, payload, excludeUserId);
  }

  /**
   * Broadcast to all members of an org
   */
  public broadcastToOrg(orgId: string, payload: any): void {
    this.dispatchLocal({ type: 'org', id: orgId }, payload);
    this.publishCluster({ type: 'org', id: orgId }, payload);
  }

  /**
   * Get list of currently online user IDs in workspace
   */
  public getOnlineUserIds(orgId: string): string[] {
    const online = new Set<string>();
    const sockets = this.orgSockets.get(orgId);
    if (!sockets) return [];

    for (const s of sockets) {
      if (s.readyState === WebSocket.OPEN) {
        const meta = this.socketMeta.get(s);
        if (meta) online.add(meta.userId);
      }
    }

    return Array.from(online);
  }

  /**
   * Handle incoming WebSocket JSON chat messages
   */
  public async handleMessage(socket: WebSocket, msg: any): Promise<void> {
    const meta = this.socketMeta.get(socket);
    if (!meta) {
      socket.send(JSON.stringify({ type: 'chat:error', error: 'Chưa xác thực người dùng' }));
      return;
    }

    const { userId, orgId, name } = meta;
    const chatService = ChatService.getInstance();

    switch (msg.type) {
      // 1. Join Channel
      case 'chat:join_channel': {
        const { channelId } = msg;
        if (!channelId) return;

        const authCheck = await chatService.canAccessChannel(userId, orgId, channelId);
        if (!authCheck.allowed) {
          socket.send(
            JSON.stringify({
              type: 'chat:error',
              error: `Truy cập kênh bị từ chối: ${authCheck.reason}`,
              channelId,
            })
          );
          return;
        }

        if (!this.channelSubscribers.has(channelId)) {
          this.channelSubscribers.set(channelId, new Set());
        }
        this.channelSubscribers.get(channelId)!.add(socket);

        const joinedSet = this.socketChannels.get(socket);
        if (joinedSet) joinedSet.add(channelId);

        socket.send(
          JSON.stringify({
            type: 'chat:joined_channel',
            data: { channelId },
          })
        );
        break;
      }

      // 2. Leave Channel
      case 'chat:leave_channel': {
        const { channelId } = msg;
        if (!channelId) return;

        const subs = this.channelSubscribers.get(channelId);
        if (subs) {
          subs.delete(socket);
        }
        const joinedSet = this.socketChannels.get(socket);
        if (joinedSet) joinedSet.delete(channelId);

        socket.send(
          JSON.stringify({
            type: 'chat:left_channel',
            data: { channelId },
          })
        );
        break;
      }

      // 3. Send Message
      case 'chat:send_message': {
        const { channelId, content, messageType, parentId, clientTempId } = msg;
        if (!channelId || !content) {
          socket.send(
            JSON.stringify({
              type: 'chat:error',
              error: 'channelId và content là bắt buộc',
            })
          );
          return;
        }

        try {
          const created = await chatService.sendMessage(userId, orgId, channelId, {
            content,
            type: messageType || 'text',
            parentId,
            senderName: name,
          });

          // Acknowledge back to sender
          socket.send(
            JSON.stringify({
              type: 'chat:message_sent',
              data: created,
              clientTempId,
            })
          );

          // Broadcast to all channel subscribers
          if (parentId) {
            this.broadcastToChannel(channelId, {
              type: 'chat:thread_reply_received',
              channelId,
              parentMessageId: parentId,
              data: created,
            });
          } else {
            this.broadcastToChannel(channelId, {
              type: 'chat:message_received',
              channelId,
              data: created,
            });
          }
        } catch (err: any) {
          socket.send(
            JSON.stringify({
              type: 'chat:error',
              error: err.message || 'Lỗi gửi tin nhắn',
              clientTempId,
            })
          );
        }
        break;
      }

      // 4. Thread Reply
      case 'chat:reply_thread': {
        const { channelId, parentMessageId, content, clientTempId } = msg;
        if (!channelId || !parentMessageId || !content) {
          socket.send(
            JSON.stringify({
              type: 'chat:error',
              error: 'channelId, parentMessageId và content là bắt buộc',
            })
          );
          return;
        }

        try {
          const created = await chatService.sendMessage(userId, orgId, channelId, {
            content,
            parentId: parentMessageId,
            senderName: name,
          });

          socket.send(
            JSON.stringify({
              type: 'chat:thread_reply_sent',
              data: created,
              clientTempId,
            })
          );

          this.broadcastToChannel(channelId, {
            type: 'chat:thread_reply_received',
            channelId,
            parentMessageId,
            data: created,
          });
        } catch (err: any) {
          socket.send(
            JSON.stringify({
              type: 'chat:error',
              error: err.message || 'Lỗi gửi phản hồi chủ đề',
              clientTempId,
            })
          );
        }
        break;
      }

      // 5. Reaction Toggle
      case 'chat:reaction': {
        const { messageId, emoji } = msg;
        if (!messageId || !emoji) return;

        try {
          const result = await chatService.toggleReaction(userId, orgId, messageId, emoji);

          this.broadcastToChannel(result.channelId, {
            type: 'chat:reaction_updated',
            channelId: result.channelId,
            messageId,
            data: { reactions: result.reactions },
          });
        } catch (err: any) {
          socket.send(
            JSON.stringify({
              type: 'chat:error',
              error: err.message || 'Lỗi cập nhật biểu cảm',
            })
          );
        }
        break;
      }

      // 6. Typing Indicator
      case 'chat:typing': {
        const { channelId, isTyping } = msg;
        if (!channelId) return;

        // Broadcast ephemeral typing status to others in channel
        this.broadcastToChannel(
          channelId,
          {
            type: 'chat:user_typing',
            channelId,
            data: {
              userId,
              userName: name,
              isTyping: !!isTyping,
            },
          },
          userId // exclude sender
        );
        break;
      }

      // 7. Get Online Presence
      case 'presence:get_online': {
        const onlineUserIds = this.getOnlineUserIds(orgId);
        socket.send(
          JSON.stringify({
            type: 'presence:online_list',
            data: { userIds: onlineUserIds },
          })
        );
        break;
      }

      default:
        break;
    }
  }
}
