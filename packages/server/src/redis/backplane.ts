import { RedisPool } from './redis-client.js';
import { config } from '../config.js';
import {
  RedisInterNodeMessage,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from '@collab/shared';

export type RemoteMessageCallback = (
  type: 'update' | 'awareness' | 'reset',
  payload: Uint8Array
) => void;

export class RedisBackplane {
  private pool: RedisPool;
  private subscribers: Map<string, Set<RemoteMessageCallback>> = new Map();
  private channelRefCounts: Map<string, number> = new Map();

  constructor() {
    this.pool = RedisPool.getInstance();
    this.setupMessageDispatcher();
  }

  private getChannelName(docId: string): string {
    return `room:doc:${docId}`;
  }

  private setupMessageDispatcher(): void {
    this.pool.subscriber.on('message', (channel: string, message: string) => {
      if (!channel.startsWith('room:doc:')) {
        return;
      }

      const docId = channel.replace('room:doc:', '');
      const callbacks = this.subscribers.get(docId);
      if (!callbacks || callbacks.size === 0) {
        return;
      }

      try {
        const parsed: RedisInterNodeMessage = JSON.parse(message);

        // Feedback loop prevention: discard messages emitted by this gateway instance
        if (parsed.nodeId === config.nodeId) {
          return;
        }

        const payload = base64ToUint8Array(parsed.payloadBase64);
        for (const cb of callbacks) {
          cb(parsed.type, payload);
        }
      } catch (err) {
        console.error(`[RedisBackplane][${config.nodeId}] Failed to process inbound message on ${channel}:`, err);
      }
    });
  }

  /**
   * Dynamically subscribes to document updates across gateway nodes
   */
  public async subscribe(docId: string, callback: RemoteMessageCallback): Promise<void> {
    const channel = this.getChannelName(docId);
    let callbacks = this.subscribers.get(docId);

    if (!callbacks) {
      callbacks = new Set();
      this.subscribers.set(docId, callbacks);
    }

    callbacks.add(callback);

    const currentCount = this.channelRefCounts.get(channel) || 0;
    this.channelRefCounts.set(channel, currentCount + 1);

    if (currentCount === 0) {
      console.log(`[RedisBackplane][${config.nodeId}] Subscribing to Redis channel: ${channel}`);
      await this.pool.subscriber.subscribe(channel);
    }
  }

  /**
   * Lazy unsubscription: executed when the last active socket on this node leaves the room
   */
  public async unsubscribe(docId: string, callback: RemoteMessageCallback): Promise<void> {
    const channel = this.getChannelName(docId);
    const callbacks = this.subscribers.get(docId);

    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscribers.delete(docId);
      }
    }

    const currentCount = (this.channelRefCounts.get(channel) || 1) - 1;
    if (currentCount <= 0) {
      this.channelRefCounts.delete(channel);
      console.log(`[RedisBackplane][${config.nodeId}] Zero local subscribers remaining. Lazy UNSUBSCRIBE from: ${channel}`);
      try {
        await this.pool.subscriber.unsubscribe(channel);
      } catch (err) {
        console.error(`[RedisBackplane][${config.nodeId}] Error unsubscribing from ${channel}:`, err);
      }
    } else {
      this.channelRefCounts.set(channel, currentCount);
    }
  }

  /**
   * Publishes binary CRDT mutations or awareness frames to all peer gateway nodes
   */
  public async publish(
    docId: string,
    type: 'update' | 'awareness' | 'reset',
    payload: Uint8Array
  ): Promise<void> {
    const channel = this.getChannelName(docId);
    const message: RedisInterNodeMessage = {
      nodeId: config.nodeId,
      documentId: docId,
      type,
      payloadBase64: uint8ArrayToBase64(payload),
      timestamp: Date.now(),
    };

    try {
      await this.pool.publisher.publish(channel, JSON.stringify(message));
    } catch (err) {
      console.error(`[RedisBackplane][${config.nodeId}] Failed to publish to ${channel}:`, err);
    }
  }
}
