import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server } from 'node:http';
import { URL } from 'node:url';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { getCollaboratorColor } from '@collab/shared';
import { HeartbeatSupervisor, HeartbeatSocket } from './heartbeat.js';
import { RoomManager, ClientContext } from './room-manager.js';
import { config } from '../config.js';
import { NotificationDeliveryManager } from '../core/notification/NotificationDeliveryManager.js';
import { ChatSocketManager } from '../core/chat/ChatSocketManager.js';
import { TaskSocketManager } from '../core/task/TaskSocketManager.js';

function parseCookies(cookieHeader?: string): Record<string, string> {
  const map: Record<string, string> = {};
  if (!cookieHeader) return map;
  cookieHeader.split(';').forEach((part) => {
    const [rawKey, ...rawVal] = part.split('=');
    const key = rawKey?.trim();
    if (key) {
      map[key] = decodeURIComponent(rawVal.join('=').trim());
    }
  });
  return map;
}

export class WebSocketGateway {
  private wss: WebSocketServer;
  private heartbeat: HeartbeatSupervisor;
  private roomManager: RoomManager;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ noServer: true });
    this.heartbeat = new HeartbeatSupervisor();
    this.roomManager = RoomManager.getInstance();

    this.setupUpgradeHandler(server);
    this.setupConnectionHandler();
  }

  private setupUpgradeHandler(server: Server): void {
    server.on('upgrade', (request: IncomingMessage, socket, head) => {
      const { pathname } = new URL(request.url || '/', `http://${request.headers.host}`);

      if (pathname === '/ws' || pathname === '/ws/') {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });
  }

  private setupConnectionHandler(): void {
    this.wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
      const socket = ws as HeartbeatSocket;
      this.heartbeat.register(socket);

      // Parse query params and cookies
      const parsedUrl = new URL(req.url || '/', `http://${req.headers.host}`);
      const cookies = parseCookies(req.headers.cookie);

      // Token can come from query param `token` or cookie `collab_access_token`
      const rawToken = parsedUrl.searchParams.get('token') || cookies['collab_access_token'];
      let authenticatedUser: { userId: string; email: string; name: string } | null = null;

      if (rawToken) {
        try {
          const decoded = jwt.verify(rawToken, config.jwt.secret) as {
            userId: string;
            email: string;
            name: string;
          };
          if (decoded && decoded.userId) {
            authenticatedUser = {
              userId: decoded.userId,
              email: decoded.email,
              name: decoded.name,
            };
          }
        } catch {
          // Token expired or invalid - ignore for anonymous doc room access
        }
      }

      const docId = parsedUrl.searchParams.get('docId') || parsedUrl.searchParams.get('room');
      const orgId = parsedUrl.searchParams.get('orgId') || 'org_main';
      const userId = authenticatedUser?.userId || parsedUrl.searchParams.get('userId') || `user_${crypto.randomUUID().slice(0, 8)}`;
      const name = authenticatedUser?.name || parsedUrl.searchParams.get('name') || `Collaborator ${userId.slice(-4)}`;
      const color = parsedUrl.searchParams.get('color') || getCollaboratorColor(userId);

      // Register socket in NotificationDeliveryManager, ChatSocketManager and TaskSocketManager if user is authenticated
      if (authenticatedUser) {
        NotificationDeliveryManager.getInstance().registerSocket(authenticatedUser.userId, orgId, socket);
        ChatSocketManager.getInstance().registerSocket(authenticatedUser.userId, orgId, authenticatedUser.name, socket);
        TaskSocketManager.getInstance().registerSocket(authenticatedUser.userId, orgId, authenticatedUser.name, socket);
      }

      // If no docId and no authenticated user, reject connection
      if (!docId && !authenticatedUser) {
        console.warn('[WebSocketGateway] Connection rejected: Missing docId parameter and unauthenticated.');
        socket.close(1008, 'Missing docId parameter or authentication');
        return;
      }

      // If this is a standalone notification/presence/chat connection without a docId
      if (!docId) {
        // Send connection acknowledgment
        socket.send(
          JSON.stringify({
            type: 'connected',
            userId,
            orgId,
            timestamp: new Date().toISOString(),
          })
        );

        socket.on('message', async (data: Buffer | ArrayBuffer | Buffer[]) => {
          try {
            const text = data.toString();
            const msg = JSON.parse(text);
            if (msg.type === 'ping') {
              socket.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
              return;
            }

            // Handle chat and presence messages
            await ChatSocketManager.getInstance().handleMessage(socket, msg);
          } catch {
            // Ignore non-json or unhandled messages
          }
        });

        socket.on('close', () => {
          this.heartbeat.unregister(socket);
        });

        socket.on('error', (err) => {
          console.error(`[WebSocketGateway] Socket error for notification/chat client ${userId}:`, err);
          this.heartbeat.unregister(socket);
        });

        return;
      }

      // If docId is provided, join CRDT / Yjs document room
      const clientCtx: ClientContext = {
        socket,
        userId,
        name,
        color,
      };

      try {
        const room = await this.roomManager.getOrCreateRoom(docId);
        room.addClient(clientCtx);

        socket.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
          let uint8: Uint8Array;
          if (Buffer.isBuffer(data)) {
            uint8 = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
          } else if (data instanceof ArrayBuffer) {
            uint8 = new Uint8Array(data);
          } else {
            uint8 = new Uint8Array(Buffer.concat(data));
          }

          room.handleClientMessage(socket, uint8);
        });

        socket.on('close', async () => {
          this.heartbeat.unregister(socket);
          await this.roomManager.removeClientFromRoom(docId, socket);
        });

        socket.on('error', async (err) => {
          console.error(`[WebSocketGateway] Socket error for ${userId} in ${docId}:`, err);
          this.heartbeat.unregister(socket);
          await this.roomManager.removeClientFromRoom(docId, socket);
        });
      } catch (err) {
        console.error(`[WebSocketGateway] Failed to initialize room for doc ${docId}:`, err);
        socket.close(1011, 'Internal Server Error initializing document room');
      }
    });
  }

  public async shutdown(): Promise<void> {
    this.heartbeat.stop();
    this.wss.close();
  }
}
