import * as awarenessProtocol from 'y-protocols/awareness';
import * as Y from 'yjs';
import { AWARENESS_THROTTLE_MS, MSG_AWARENESS, createBinaryPacket } from '@collab/shared';

export type AwarenessBroadcastFn = (packet: Uint8Array, originSocket?: any) => void;
export type AwarenessRedisPublishFn = (payload: Uint8Array) => void;

export class ThrottledAwarenessHandler {
  public readonly awareness: awarenessProtocol.Awareness;
  private broadcastLocal: AwarenessBroadcastFn;
  private publishRedis: AwarenessRedisPublishFn;
  private pendingClients: Set<number> = new Set();
  private throttleTimer: NodeJS.Timeout | null = null;
  private lastEmitTime = 0;

  constructor(
    doc: Y.Doc,
    broadcastLocal: AwarenessBroadcastFn,
    publishRedis: AwarenessRedisPublishFn
  ) {
    this.awareness = new awarenessProtocol.Awareness(doc);
    this.broadcastLocal = broadcastLocal;
    this.publishRedis = publishRedis;

    // Listen to changes in awareness state
    this.awareness.on(
      'update',
      (
        { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
        origin: any
      ) => {
        // Collect all affected client IDs
        for (const id of added) this.pendingClients.add(id);
        for (const id of updated) this.pendingClients.add(id);
        for (const id of removed) this.pendingClients.add(id);

        // Schedule throttled flush (strict 50ms window)
        this.scheduleThrottledFlush(origin);
      }
    );
  }

  private scheduleThrottledFlush(origin: any): void {
    const now = Date.now();
    const elapsed = now - this.lastEmitTime;

    if (elapsed >= AWARENESS_THROTTLE_MS && !this.throttleTimer) {
      // Immediate flush if throttle interval has elapsed
      this.flushPendingAwareness(origin);
      this.lastEmitTime = Date.now();
    } else if (!this.throttleTimer) {
      // Schedule trailing-edge flush for the remainder of the 50ms window
      const delay = Math.max(0, AWARENESS_THROTTLE_MS - elapsed);
      this.throttleTimer = setTimeout(() => {
        this.throttleTimer = null;
        this.flushPendingAwareness(origin);
        this.lastEmitTime = Date.now();
      }, delay);
    }
  }

  private flushPendingAwareness(origin: any): void {
    if (this.pendingClients.size === 0) return;

    const clients = Array.from(this.pendingClients);
    this.pendingClients.clear();

    const update = awarenessProtocol.encodeAwarenessUpdate(this.awareness, clients);
    const packet = createBinaryPacket(MSG_AWARENESS, update);

    // Broadcast down to local WebSocket clients
    this.broadcastLocal(packet, origin);

    // If change did not originate from Redis, push to Redis backplane
    if (origin !== 'redis') {
      this.publishRedis(update);
    }
  }

  /**
   * Applies an awareness update received from a client socket or Redis
   */
  public applyUpdate(update: Uint8Array, origin: any): void {
    awarenessProtocol.applyAwarenessUpdate(this.awareness, update, origin);
  }

  public destroy(): void {
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }
    this.awareness.destroy();
  }
}
