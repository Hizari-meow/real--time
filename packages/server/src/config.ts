import dotenv from 'dotenv';
import crypto from 'node:crypto';

// Load environment variables
dotenv.config();

export interface ServerConfig {
  nodeId: string;
  port: number;
  databaseUrl: string;
  redisUrl: string;
  minio: {
    endpoint: string;
    port: number;
    accessKey: string;
    secretKey: string;
    bucket: string;
    useSSL: boolean;
  };
  jwt: {
    secret: string;
    refreshSecret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
}

export const config: ServerConfig = {
  nodeId: process.env.NODE_ID || `node_${crypto.randomUUID().slice(0, 8)}`,
  port: parseInt(process.env.PORT || '4001', 10),
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://collab_user:collab_secret@localhost:5434/collab_db?schema=public',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6380',
  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadminpassword',
    bucket: process.env.MINIO_BUCKET || 'document-snapshots',
    useSSL: process.env.MINIO_USE_SSL === 'true',
  },
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      (process.env.NODE_ENV === 'production'
        ? (() => {
            throw new Error('FATAL: JWT_SECRET environment variable is mandatory in production');
          })()
        : 'collab_jwt_super_secret_key_2026_phase0'),
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      (process.env.NODE_ENV === 'production'
        ? (() => {
            throw new Error('FATAL: JWT_REFRESH_SECRET environment variable is mandatory in production');
          })()
        : 'collab_jwt_refresh_secret_key_2026_phase0'),
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
};
