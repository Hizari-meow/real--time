import {
  BACKOFF_BASE_MS,
  BACKOFF_MAX_MS,
  MSG_SYNC,
  MSG_AWARENESS,
  MSG_AUTH,
  MSG_HEARTBEAT_PING,
  MSG_HEARTBEAT_PONG,
} from './constants.js';

/**
 * Calculates exponential backoff with random jitter to prevent Thundering Herd on reconnects.
 * Delay = (2^attempt * baseMs) + random(0, 1000ms) capped at maxMs
 */
export function calculateBackoffDelay(
  attempt: number,
  baseMs: number = BACKOFF_BASE_MS,
  maxMs: number = BACKOFF_MAX_MS
): number {
  const boundedAttempt = Math.min(attempt, 10);
  const exponential = Math.min(maxMs, baseMs * Math.pow(2, boundedAttempt));
  const jitter = Math.floor(Math.random() * 1000);
  return exponential + jitter;
}

/**
 * Encodes a 1-byte message type header + raw binary payload
 */
export function createBinaryPacket(msgType: number, payload: Uint8Array): Uint8Array {
  const packet = new Uint8Array(payload.length + 1);
  packet[0] = msgType;
  packet.set(payload, 1);
  return packet;
}

/**
 * Parses a binary packet into { msgType, payload }
 */
export function parseBinaryPacket(data: Uint8Array): { msgType: number; payload: Uint8Array } {
  if (data.length < 1) {
    throw new Error('Packet too short: missing message type byte');
  }
  const msgType = data[0];
  const payload = data.subarray(1);
  return { msgType, payload };
}

/**
 * Converts a Uint8Array to a Base64 string for safe Redis string transport
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts a Base64 string back to a Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

const COLLABORATOR_PALETTE = [
  '#2563eb', // blue
  '#dc2626', // red
  '#16a34a', // green
  '#d97706', // amber
  '#9333ea', // purple
  '#0891b2', // cyan
  '#db2777', // pink
  '#ea580c', // orange
  '#4f46e5', // indigo
  '#059669', // emerald
];

export function getCollaboratorColor(idOrSeed: string): string {
  let hash = 0;
  for (let i = 0; i < idOrSeed.length; i++) {
    hash = (hash << 5) - hash + idOrSeed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % COLLABORATOR_PALETTE.length;
  return COLLABORATOR_PALETTE[index];
}
