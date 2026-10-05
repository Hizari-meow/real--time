export type ConnectionStatus =
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'RECONNECTING';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  color: string;
  avatarUrl?: string | null;
}

export interface CursorPosition {
  anchor: number;
  head: number;
}

export interface ClientAwarenessState {
  user: {
    id: string;
    name: string;
    color: string;
    avatarUrl?: string | null;
  };
  cursor: CursorPosition | null;
  updatedAt: number;
}

export interface DocumentDTO {
  id: string;
  title: string;
  currentVersion: number;
  ownerId: string;
  latestS3Key?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentHistoryDTO {
  id: string;
  documentId: string;
  version: number;
  authorId?: string | null;
  authorName?: string | null;
  changeSummary: string;
  snapshotId?: string | null;
  createdAt: string;
}

export interface DocumentSnapshotDTO {
  id: string;
  documentId: string;
  version: number;
  s3Key: string;
  byteSize: number;
  checksum: string;
  mutationCount: number;
  createdAt: string;
}

export interface RedisInterNodeMessage {
  nodeId: string;
  documentId: string;
  type: 'update' | 'awareness' | 'reset';
  payloadBase64: string;
  timestamp: number;
}
