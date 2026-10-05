export type ChannelType = 'public' | 'private' | 'dm' | 'group_dm';

export interface ChannelSummary {
  id: string;
  orgId: string;
  spaceId?: string | null;
  name: string;
  type: ChannelType;
  topic?: string | null;
  isArchived: boolean;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
  members?: {
    userId: string;
    role: string;
    notifLevel: string;
    isMuted: boolean;
  }[];
}

export interface AggregatedReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface FormattedMessage {
  id: string;
  channelId: string;
  parentId?: string | null;
  seq: number;
  senderId: string;
  senderName: string;
  senderColor?: string | null;
  senderRole?: string | null;
  content: string;
  type: string;
  reactions: AggregatedReaction[];
  threadCount: number;
  threadLastReplyAt?: string | null;
  createdAt: string;
}

export interface CreateChannelInput {
  name: string;
  type?: ChannelType;
  topic?: string;
  spaceId?: string;
  memberIds?: string[];
}

export interface SendMessageInput {
  content: string;
  type?: string;
  parentId?: string;
  senderName?: string;
  senderColor?: string;
  senderRole?: string;
}
