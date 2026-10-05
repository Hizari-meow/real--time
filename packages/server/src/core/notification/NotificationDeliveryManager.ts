import { WebSocket } from 'ws';

export interface NotificationPayload {
  type: 'notification:created' | 'notification:read' | 'notification:read_all' | 'notification:count';
  data: any;
  unreadCount?: number;
}

export class NotificationDeliveryManager {
  private static instance: NotificationDeliveryManager | null = null;
  // Map of userId -> Set of active WebSocket connections
  private userSockets = new Map<string, Set<WebSocket>>();
  // Map of userId -> active orgId for that session
  private userOrgs = new Map<string, string>();

  public static getInstance(): NotificationDeliveryManager {
    if (!NotificationDeliveryManager.instance) {
      NotificationDeliveryManager.instance = new NotificationDeliveryManager();
    }
    return NotificationDeliveryManager.instance;
  }

  public registerSocket(userId: string, orgId: string, socket: WebSocket): void {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socket);
    this.userOrgs.set(userId, orgId);

    socket.on('close', () => {
      this.unregisterSocket(userId, socket);
    });

    socket.on('error', () => {
      this.unregisterSocket(userId, socket);
    });
  }

  public unregisterSocket(userId: string, socket: WebSocket): void {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socket);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
        this.userOrgs.delete(userId);
      }
    }
  }

  public isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return !!sockets && sockets.size > 0;
  }

  public getActiveUserCount(): number {
    return this.userSockets.size;
  }

  /**
   * Send a realtime notification to a specific user.
   * If the user has multiple open tabs or windows, delivers to all of them.
   * Returns true if at least one socket received the notification, false if offline.
   */
  public sendToUser(userId: string, payload: NotificationPayload): boolean {
    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.size === 0) {
      return false;
    }

    const message = JSON.stringify(payload);
    let delivered = false;

    for (const socket of sockets) {
      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(message);
          delivered = true;
        } catch (err) {
          console.error(`[NotificationDeliveryManager] Failed to send to socket for user ${userId}:`, err);
        }
      }
    }

    return delivered;
  }
}
