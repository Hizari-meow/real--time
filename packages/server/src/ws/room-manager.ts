import { WebSocket } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import {
  MSG_SYNC,
  MSG_AWARENESS,
  createBinaryPacket,
  parseBinaryPacket,
} from '@collab/shared';
import { RedisBackplane, RemoteMessageCallback } from '../redis/backplane.js';
import { SnapshotManager } from '../storage/snapshot-manager.js';
import { S3StorageService } from '../storage/s3-client.js';
import { getPrismaClient } from '../storage/db.js';

export interface ClientContext {
  socket: WebSocket;
  userId: string;
  name: string;
  color: string;
}

export class DocumentRoom {
  public readonly id: string;
  public readonly doc: Y.Doc;
  public readonly snapshotManager: SnapshotManager;
  private backplane: RedisBackplane;
  private clients: Map<WebSocket, ClientContext> = new Map();
  private remoteCallback: RemoteMessageCallback;
  private s3 = S3StorageService.getInstance();
  private prisma = getPrismaClient();

  // Awareness state
  public readonly awareness: awarenessProtocol.Awareness;
  private pendingAwarenessClients: Set<number> = new Set();
  private awarenessThrottleTimer: NodeJS.Timeout | null = null;
  private lastAwarenessEmit = 0;

  constructor(id: string, backplane: RedisBackplane) {
    this.id = id;
    this.backplane = backplane;
    this.doc = new Y.Doc();
    this.snapshotManager = new SnapshotManager(id, this.doc);
    this.awareness = new awarenessProtocol.Awareness(this.doc);

    // Setup Redis callback handler
    this.remoteCallback = (type: 'update' | 'awareness' | 'reset', payload: Uint8Array) => {
      this.handleRemoteMessage(type, payload);
    };

    this.setupDocListeners();
    this.setupAwarenessListeners();
  }

  public async initialize(): Promise<void> {
    // 1. Load latest state snapshot from storage if available
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: this.id },
      });

      if (document && document.latestS3Key) {
        console.log(`[DocumentRoom][${this.id}] Loading snapshot: ${document.latestS3Key}`);
        const snapshotData = await this.s3.getSnapshot(document.latestS3Key);
        Y.applyUpdate(this.doc, snapshotData, 'initial-load');
      }
    } catch (err) {
      console.warn(`[DocumentRoom][${this.id}] Note: No prior snapshot loaded (${err})`);
    }

    // 2. Subscribe to Redis backplane for inter-node sync
    await this.backplane.subscribe(this.id, this.remoteCallback);
  }

  private setupDocListeners(): void {
    this.doc.on('update', (update: Uint8Array, origin: any) => {
      // 1. If mutation did not originate from Redis, publish to Redis backplane and track snapshot
      if (origin !== 'redis' && origin !== 'initial-load') {
        const authorId = origin?.userId;
        this.snapshotManager.onMutation(authorId);
        this.backplane.publish(this.id, 'update', update).catch((err) =>
          console.error(`[DocumentRoom][${this.id}] Redis publish error:`, err)
        );
      }

      // 2. Broadcast binary update to local connected sockets (except origin socket)
      const encoder = encoding.createEncoder();
      syncProtocol.writeUpdate(encoder, update);
      const packet = createBinaryPacket(MSG_SYNC, encoding.toUint8Array(encoder));

      const originSocket = origin?.socket;
      for (const [clientSocket] of this.clients) {
        if (clientSocket !== originSocket && clientSocket.readyState === WebSocket.OPEN) {
          try {
            clientSocket.send(packet);
          } catch (err) {
            console.error(`[DocumentRoom][${this.id}] Error sending update to client:`, err);
          }
        }
      }
    });
  }

  private setupAwarenessListeners(): void {
    this.awareness.on(
      'update',
      (
        { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
        origin: any
      ) => {
        for (const id of added) this.pendingAwarenessClients.add(id);
        for (const id of updated) this.pendingAwarenessClients.add(id);
        for (const id of removed) this.pendingAwarenessClients.add(id);

        this.scheduleAwarenessFlush(origin);
      }
    );
  }

  private scheduleAwarenessFlush(origin: any): void {
    const now = Date.now();
    const elapsed = now - this.lastAwarenessEmit;

    if (elapsed >= 50 && !this.awarenessThrottleTimer) {
      this.flushAwareness(origin);
      this.lastAwarenessEmit = Date.now();
    } else if (!this.awarenessThrottleTimer) {
      const delay = Math.max(0, 50 - elapsed);
      this.awarenessThrottleTimer = setTimeout(() => {
        this.awarenessThrottleTimer = null;
        this.flushAwareness(origin);
        this.lastAwarenessEmit = Date.now();
      }, delay);
    }
  }

  private flushAwareness(origin: any): void {
    if (this.pendingAwarenessClients.size === 0) return;

    const clients = Array.from(this.pendingAwarenessClients);
    this.pendingAwarenessClients.clear();

    const update = awarenessProtocol.encodeAwarenessUpdate(this.awareness, clients);
    const packet = createBinaryPacket(MSG_AWARENESS, update);

    const originSocket = origin?.socket;
    for (const [clientSocket] of this.clients) {
      if (clientSocket !== originSocket && clientSocket.readyState === WebSocket.OPEN) {
        try {
          clientSocket.send(packet);
        } catch (err) {
          console.error(`[DocumentRoom][${this.id}] Error sending awareness to client:`, err);
        }
      }
    }

    if (origin !== 'redis') {
      this.backplane.publish(this.id, 'awareness', update).catch((err) =>
        console.error(`[DocumentRoom][${this.id}] Redis awareness publish error:`, err)
      );
    }
  }

  private handleRemoteMessage(type: 'update' | 'awareness' | 'reset', payload: Uint8Array): void {
    if (type === 'update') {
      // Apply update to local Y.Doc with origin 'redis'
      Y.applyUpdate(this.doc, payload, 'redis');
    } else if (type === 'awareness') {
      // Apply remote awareness
      awarenessProtocol.applyAwarenessUpdate(this.awareness, payload, 'redis');
    } else if (type === 'reset') {
      // State reset (e.g. version milestone restore)
      console.log(`[DocumentRoom][${this.id}] Applying remote state reset`);
      Y.applyUpdate(this.doc, payload, 'redis');

      // Send complete SyncStep2 to all local clients to reconcile UI
      const encoder = encoding.createEncoder();
      syncProtocol.writeSyncStep2(encoder, this.doc);
      const packet = createBinaryPacket(MSG_SYNC, encoding.toUint8Array(encoder));

      for (const [clientSocket] of this.clients) {
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(packet);
        }
      }
    }
  }

  public addClient(ctx: ClientContext): void {
    this.clients.set(ctx.socket, ctx);

    // 1. Send SyncStep1 to initiate CRDT synchronization
    const syncEncoder = encoding.createEncoder();
    syncProtocol.writeSyncStep1(syncEncoder, this.doc);
    ctx.socket.send(createBinaryPacket(MSG_SYNC, encoding.toUint8Array(syncEncoder)));

    // 2. Send current awareness states
    const states = this.awareness.getStates();
    if (states.size > 0) {
      const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(
        this.awareness,
        Array.from(states.keys())
      );
      ctx.socket.send(createBinaryPacket(MSG_AWARENESS, awarenessUpdate));
    }

    console.log(
      `[DocumentRoom][${this.id}] Client connected (${ctx.userId}). Active room clients: ${this.clients.size}`
    );
  }

  public handleClientMessage(socket: WebSocket, data: Uint8Array): void {
    const ctx = this.clients.get(socket);
    if (!ctx) return;

    try {
      const { msgType, payload } = parseBinaryPacket(data);

      if (msgType === MSG_SYNC) {
        const decoder = decoding.createDecoder(payload);
        const encoder = encoding.createEncoder();
        const syncMsgType = syncProtocol.readSyncMessage(decoder, encoder, this.doc, {
          socket,
          userId: ctx.userId,
        });

        if (encoding.length(encoder) > 0) {
          socket.send(createBinaryPacket(MSG_SYNC, encoding.toUint8Array(encoder)));
        }
      } else if (msgType === MSG_AWARENESS) {
        awarenessProtocol.applyAwarenessUpdate(this.awareness, payload, { socket, userId: ctx.userId });
      }
    } catch (err) {
      console.error(`[DocumentRoom][${this.id}] Error handling binary message:`, err);
    }
  }

  public async removeClient(socket: WebSocket): Promise<boolean> {
    const ctx = this.clients.get(socket);
    this.clients.delete(socket);

    if (ctx) {
      console.log(
        `[DocumentRoom][${this.id}] Client disconnected (${ctx.userId}). Remaining room clients: ${this.clients.size}`
      );
    }

    // Check if room is empty on this node
    if (this.clients.size === 0) {
      console.log(`[DocumentRoom][${this.id}] Evacuating room on this node. Flushing snapshot and unsubscribing Redis.`);
      await this.destroy();
      return true; // Indicates room was destroyed
    }

    return false;
  }

  public async destroy(): Promise<void> {
    if (this.awarenessThrottleTimer) {
      clearTimeout(this.awarenessThrottleTimer);
      this.awarenessThrottleTimer = null;
    }

    // 1. Flush pending mutations immediately to MinIO and PostgreSQL
    await this.snapshotManager.flushImmediately('Room evacuation on gateway node');

    // 2. Unsubscribe this node from Redis backplane channel
    await this.backplane.unsubscribe(this.id, this.remoteCallback);

    // 3. Destroy awareness and doc to release heap memory
    this.awareness.destroy();
    this.snapshotManager.destroy();
    this.doc.destroy();
  }

  public getClientCount(): number {
    return this.clients.size;
  }
}

export class RoomManager {
  private static instance: RoomManager;
  private rooms: Map<string, DocumentRoom> = new Map();
  private roomInitPromises: Map<string, Promise<DocumentRoom>> = new Map();
  private backplane: RedisBackplane;

  private constructor() {
    this.backplane = new RedisBackplane();
  }

  public static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  public async getOrCreateRoom(docId: string): Promise<DocumentRoom> {
    const existing = this.rooms.get(docId);
    if (existing) {
      return existing;
    }

    let initPromise = this.roomInitPromises.get(docId);
    if (!initPromise) {
      initPromise = (async () => {
        try {
          const room = new DocumentRoom(docId, this.backplane);
          await room.initialize();
          this.rooms.set(docId, room);
          return room;
        } finally {
          this.roomInitPromises.delete(docId);
        }
      })();
      this.roomInitPromises.set(docId, initPromise);
    }

    return initPromise;
  }

  public getRoom(docId: string): DocumentRoom | undefined {
    return this.rooms.get(docId);
  }

  public async removeClientFromRoom(docId: string, socket: WebSocket): Promise<void> {
    const room = this.rooms.get(docId);
    if (room) {
      const destroyed = await room.removeClient(socket);
      if (destroyed) {
        this.rooms.delete(docId);
      }
    }
  }

  public async restoreDocumentState(docId: string, stateVector: Uint8Array): Promise<void> {
    const existingRoom = this.rooms.get(docId);
    if (existingRoom) {
      // Apply state to local active room
      Y.applyUpdate(existingRoom.doc, stateVector, 'restore-action');
    }

    // Broadcast reset to peer nodes via Redis backplane
    await this.backplane.publish(docId, 'reset', stateVector);
  }

  public getActiveRoomCount(): number {
    return this.rooms.size;
  }
}
