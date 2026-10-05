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
  calculateBackoffDelay,
  ConnectionStatus,
  AWARENESS_THROTTLE_MS,
} from '@collab/shared';

export interface ProviderOptions {
  url: string;
  docId: string;
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  userId: string;
  name: string;
  color: string;
  onStatusChange?: (status: ConnectionStatus) => void;
  onSynced?: () => void;
}

export class ResilientWebSocketProvider {
  public readonly doc: Y.Doc;
  public readonly awareness: awarenessProtocol.Awareness;
  private url: string;
  private docId: string;
  private userId: string;
  private name: string;
  private color: string;
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'DISCONNECTED';
  private reconnectAttempt = 0;
  private reconnectTimer: any = null;
  private isDestroyed = false;
  private outbox: Uint8Array[] = [];
  private onStatusChange?: (status: ConnectionStatus) => void;
  private onSynced?: () => void;
  private isSynced = false;

  // Throttled awareness
  private pendingAwarenessClients: Set<number> = new Set();
  private awarenessThrottleTimer: any = null;
  private lastAwarenessEmit = 0;

  constructor(opts: ProviderOptions) {
    this.doc = opts.doc;
    this.awareness = opts.awareness;
    this.url = opts.url;
    this.docId = opts.docId;
    this.userId = opts.userId;
    this.name = opts.name;
    this.color = opts.color;
    this.onStatusChange = opts.onStatusChange;
    this.onSynced = opts.onSynced;

    // Set initial local awareness
    this.awareness.setLocalStateField('user', {
      id: this.userId,
      name: this.name,
      color: this.color,
    });

    this.setupDocListeners();
    this.setupAwarenessListeners();
    this.connect();
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.onStatusChange?.(status);
    }
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  private connect(): void {
    if (this.isDestroyed || typeof window === 'undefined') return;

    if (this.reconnectAttempt === 0) {
      this.setStatus('CONNECTING');
    } else {
      this.setStatus('RECONNECTING');
    }

    const wsUrl = new URL(this.url);
    wsUrl.searchParams.set('docId', this.docId);
    wsUrl.searchParams.set('userId', this.userId);
    wsUrl.searchParams.set('name', this.name);
    wsUrl.searchParams.set('color', this.color);

    try {
      this.ws = new WebSocket(wsUrl.toString());
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        console.log(`[ResilientWebSocketProvider] Connected to ${wsUrl.host}`);
        this.reconnectAttempt = 0;
        this.setStatus('CONNECTED');

        // 1. Send SyncStep1 with our local state vector
        const syncEncoder = encoding.createEncoder();
        syncProtocol.writeSyncStep1(syncEncoder, this.doc);
        this.sendBinary(createBinaryPacket(MSG_SYNC, encoding.toUint8Array(syncEncoder)));

        // 2. Flush offline mutation outbox
        while (this.outbox.length > 0) {
          const update = this.outbox.shift();
          if (update) {
            const encoder = encoding.createEncoder();
            syncProtocol.writeUpdate(encoder, update);
            this.sendBinary(createBinaryPacket(MSG_SYNC, encoding.toUint8Array(encoder)));
          }
        }

        // 3. Send current local awareness
        const localAwareness = awarenessProtocol.encodeAwarenessUpdate(this.awareness, [
          this.doc.clientID,
        ]);
        this.sendBinary(createBinaryPacket(MSG_AWARENESS, localAwareness));
      };

      this.ws.onmessage = (event: MessageEvent) => {
        if (!(event.data instanceof ArrayBuffer)) {
          return;
        }

        const uint8 = new Uint8Array(event.data);
        try {
          const { msgType, payload } = parseBinaryPacket(uint8);

          if (msgType === MSG_SYNC) {
            const decoder = decoding.createDecoder(payload);
            const encoder = encoding.createEncoder();
            const syncMsgType = syncProtocol.readSyncMessage(decoder, encoder, this.doc, this);

            if (encoding.length(encoder) > 0) {
              this.sendBinary(createBinaryPacket(MSG_SYNC, encoding.toUint8Array(encoder)));
            }

            if (!this.isSynced && syncMsgType === syncProtocol.messageYjsSyncStep2) {
              this.isSynced = true;
              this.onSynced?.();
            }
          } else if (msgType === MSG_AWARENESS) {
            awarenessProtocol.applyAwarenessUpdate(this.awareness, payload, this);
          }
        } catch (err) {
          console.error('[ResilientWebSocketProvider] Message parse error:', err);
        }
      };

      this.ws.onclose = () => {
        this.handleDisconnection();
      };

      this.ws.onerror = (err) => {
        console.warn('[ResilientWebSocketProvider] Socket error:', err);
        this.handleDisconnection();
      };
    } catch (err) {
      console.error('[ResilientWebSocketProvider] Connection failed:', err);
      this.handleDisconnection();
    }
  }

  private handleDisconnection(): void {
    if (this.isDestroyed) return;

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws = null;
    }

    this.setStatus('RECONNECTING');

    if (!this.reconnectTimer) {
      const delay = calculateBackoffDelay(this.reconnectAttempt++);
      console.log(
        `[ResilientWebSocketProvider] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt})...`
      );
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, delay);
    }
  }

  private sendBinary(data: Uint8Array): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(data);
      } catch (err) {
        console.error('[ResilientWebSocketProvider] Send error:', err);
      }
    }
  }

  private setupDocListeners(): void {
    this.doc.on('update', (update: Uint8Array, origin: any) => {
      // Ignore updates applied from remote sync messages
      if (origin === this) return;

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const encoder = encoding.createEncoder();
        syncProtocol.writeUpdate(encoder, update);
        this.sendBinary(createBinaryPacket(MSG_SYNC, encoding.toUint8Array(encoder)));
      } else {
        // Enqueue update to offline outbox for automatic convergence upon reconnection
        this.outbox.push(update);
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
        if (origin === this) return;

        for (const id of added) this.pendingAwarenessClients.add(id);
        for (const id of updated) this.pendingAwarenessClients.add(id);
        for (const id of removed) this.pendingAwarenessClients.add(id);

        this.scheduleAwarenessFlush();
      }
    );
  }

  private scheduleAwarenessFlush(): void {
    const now = Date.now();
    const elapsed = now - this.lastAwarenessEmit;

    if (elapsed >= AWARENESS_THROTTLE_MS && !this.awarenessThrottleTimer) {
      this.flushAwareness();
      this.lastAwarenessEmit = Date.now();
    } else if (!this.awarenessThrottleTimer) {
      const delay = Math.max(0, AWARENESS_THROTTLE_MS - elapsed);
      this.awarenessThrottleTimer = setTimeout(() => {
        this.awarenessThrottleTimer = null;
        this.flushAwareness();
        this.lastAwarenessEmit = Date.now();
      }, delay);
    }
  }

  private flushAwareness(): void {
    if (this.pendingAwarenessClients.size === 0) return;

    const clients = Array.from(this.pendingAwarenessClients);
    this.pendingAwarenessClients.clear();

    const update = awarenessProtocol.encodeAwarenessUpdate(this.awareness, clients);
    this.sendBinary(createBinaryPacket(MSG_AWARENESS, update));
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.awarenessThrottleTimer) {
      clearTimeout(this.awarenessThrottleTimer);
      this.awarenessThrottleTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('DISCONNECTED');
  }
}
