import { WebSocket } from 'ws';
import { RedisPool } from '../../redis/redis-client.js';
import { config } from '../../config.js';

interface SocketMeta {
  userId: string;
  orgId: string;
  name: string;
}

export interface TaskSocketEvent {
  type:
    | 'task:created'
    | 'task:updated'
    | 'task:status_changed'
    | 'task:deleted'
    | 'project:created'
    | 'project:updated'
    | 'project:archived'
    | 'project:deleted'
    | 'sprint:created'
    | 'sprint:started'
    | 'sprint:completed'
    | 'comment:added'
    | 'timelog:added'
    | 'dependency:added'
    | 'dependency:removed';
  orgId: string;
  projectId?: string;
  taskId?: string;
  data: any;
  timestamp: string;
}

export class TaskSocketManager {
  private static instance: TaskSocketManager | null = null;

  // orgId -> Set of WebSockets
  private orgSockets = new Map<string, Set<WebSocket>>();
  // userId -> Set of WebSockets
  private userSockets = new Map<string, Set<WebSocket>>();
  // WeakMap for socket metadata
  private socketMeta = new WeakMap<WebSocket, SocketMeta>();

  private redisChannel = 'collab:task:cluster_events';
  private isRedisSubscribed = false;

  private constructor() {
    this.initRedisSubscription();
  }

  public static getInstance(): TaskSocketManager {
    if (!TaskSocketManager.instance) {
      TaskSocketManager.instance = new TaskSocketManager();
    }
    return TaskSocketManager.instance;
  }

  private initRedisSubscription(): void {
    if (this.isRedisSubscribed) return;
    try {
      const redis = RedisPool.getInstance();
      redis.subscriber.subscribe(this.redisChannel, (err) => {
        if (err) {
          console.warn('[TaskSocketManager] Redis subscribe error, fallback to local:', err.message);
        } else {
          this.isRedisSubscribed = true;
        }
      });

      redis.subscriber.on('message', (channel, messageStr) => {
        if (channel !== this.redisChannel) return;
        try {
          const envelope = JSON.parse(messageStr);
          if (envelope.originNodeId === config.nodeId) return; // skip self echo
          this.broadcastLocal(envelope.orgId, envelope.event, envelope.excludeUserId);
        } catch {
          // ignore corrupted redis message
        }
      });
    } catch {
      // Redis might be offline in mock/testing
    }
  }

  public registerSocket(userId: string, orgId: string, name: string, socket: WebSocket): void {
    if (!this.orgSockets.has(orgId)) {
      this.orgSockets.set(orgId, new Set());
    }
    this.orgSockets.get(orgId)!.add(socket);

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socket);

    this.socketMeta.set(socket, { userId, orgId, name });

    socket.on('close', () => {
      this.unregisterSocket(socket);
    });

    socket.on('error', () => {
      this.unregisterSocket(socket);
    });
  }

  public unregisterSocket(socket: WebSocket): void {
    const meta = this.socketMeta.get(socket);
    if (!meta) return;

    const orgSet = this.orgSockets.get(meta.orgId);
    if (orgSet) {
      orgSet.delete(socket);
      if (orgSet.size === 0) this.orgSockets.delete(meta.orgId);
    }

    const userSet = this.userSockets.get(meta.userId);
    if (userSet) {
      userSet.delete(socket);
      if (userSet.size === 0) this.userSockets.delete(meta.userId);
    }

    this.socketMeta.delete(socket);
  }

  /**
   * Broadcast an event to all connected clients in the same organization
   */
  public broadcastToOrg(orgId: string, event: TaskSocketEvent, excludeUserId?: string): void {
    // 1. Broadcast locally
    this.broadcastLocal(orgId, event, excludeUserId);

    // 2. Publish to Redis for cluster distribution
    try {
      const redis = RedisPool.getInstance();
      const payload = JSON.stringify({
        originNodeId: config.nodeId,
        orgId,
        excludeUserId,
        event,
      });
      redis.publisher.publish(this.redisChannel, payload).catch(() => {});
    } catch {
      // Ignore if Redis is down
    }
  }

  private broadcastLocal(orgId: string, event: TaskSocketEvent, excludeUserId?: string): void {
    const sockets = this.orgSockets.get(orgId);
    if (!sockets || sockets.size === 0) return;

    const message = JSON.stringify(event);
    for (const socket of sockets) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      const meta = this.socketMeta.get(socket);
      if (excludeUserId && meta?.userId === excludeUserId) continue;

      try {
        socket.send(message);
      } catch (err) {
        console.error('[TaskSocketManager] Failed to send message to socket:', err);
      }
    }
  }
}
