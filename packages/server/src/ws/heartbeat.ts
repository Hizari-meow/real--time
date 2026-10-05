import { WebSocket } from 'ws';
import {
  HEARTBEAT_PING_INTERVAL_MS,
  HEARTBEAT_PONG_TIMEOUT_MS,
} from '@collab/shared';

export interface HeartbeatSocket extends WebSocket {
  isAlive: boolean;
  pongTimeoutTimer?: NodeJS.Timeout | null;
}

export class HeartbeatSupervisor {
  private intervalTimer: NodeJS.Timeout | null = null;
  private watchedSockets: Set<HeartbeatSocket> = new Set();

  constructor() {
    this.startSupervisor();
  }

  public register(socket: HeartbeatSocket): void {
    socket.isAlive = true;
    this.watchedSockets.add(socket);

    socket.on('pong', () => {
      socket.isAlive = true;
      if (socket.pongTimeoutTimer) {
        clearTimeout(socket.pongTimeoutTimer);
        socket.pongTimeoutTimer = null;
      }
    });

    socket.on('close', () => {
      this.unregister(socket);
    });

    socket.on('error', () => {
      this.unregister(socket);
    });
  }

  public unregister(socket: HeartbeatSocket): void {
    if (socket.pongTimeoutTimer) {
      clearTimeout(socket.pongTimeoutTimer);
      socket.pongTimeoutTimer = null;
    }
    this.watchedSockets.delete(socket);
  }

  private startSupervisor(): void {
    this.intervalTimer = setInterval(() => {
      for (const socket of this.watchedSockets) {
        if (!socket.isAlive) {
          console.warn('[HeartbeatSupervisor] Terminating unresponsive socket.');
          this.unregister(socket);
          socket.terminate();
          continue;
        }

        socket.isAlive = false;
        try {
          socket.ping();
        } catch (err) {
          console.warn('[HeartbeatSupervisor] Failed to send ping frame, terminating:', err);
          this.unregister(socket);
          socket.terminate();
          continue;
        }

        // Enforce 5-second pong deadline
        socket.pongTimeoutTimer = setTimeout(() => {
          if (!socket.isAlive) {
            console.warn('[HeartbeatSupervisor] Pong deadline exceeded (5s). Terminating socket.');
            this.unregister(socket);
            socket.terminate();
          }
        }, HEARTBEAT_PONG_TIMEOUT_MS);
      }
    }, HEARTBEAT_PING_INTERVAL_MS);
  }

  public stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    for (const socket of this.watchedSockets) {
      this.unregister(socket);
    }
    this.watchedSockets.clear();
  }
}
