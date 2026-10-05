/**
 * Protocol and Distributed Operational Constants
 */

// Wire Message Discriminator (Byte [0])
export const MSG_SYNC = 0;
export const MSG_AWARENESS = 1;
export const MSG_AUTH = 2;
export const MSG_HEARTBEAT_PING = 3;
export const MSG_HEARTBEAT_PONG = 4;

// Connection & Health Watchdog Thresholds
export const HEARTBEAT_PING_INTERVAL_MS = 25000; // 25 seconds
export const HEARTBEAT_PONG_TIMEOUT_MS = 5000;    // 5 seconds

// Ephemeral Presence Throttling Window
export const AWARENESS_THROTTLE_MS = 50; // 50 milliseconds

// Debounced Snapshot Persistence Thresholds
export const SNAPSHOT_IDLE_TIMEOUT_MS = 5000;      // 5 seconds of inactivity
export const SNAPSHOT_MUTATION_THRESHOLD = 100;     // 100 aggregated mutations

// Exponential Backoff Defaults
export const BACKOFF_BASE_MS = 1000;
export const BACKOFF_MAX_MS = 30000;

// MinIO S3 Defaults
export const DEFAULT_SNAPSHOT_BUCKET = 'document-snapshots';
