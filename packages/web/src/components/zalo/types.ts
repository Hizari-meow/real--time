export type ZaloMessageType = 'text' | 'image' | 'file' | 'voice' | 'sticker' | 'system' | 'doc' | 'task' | 'location' | 'contact';

export interface ZaloUser {
  id: string;
  name: string;
  avatarUrl?: string;
  color: string;
  phone?: string;
  role?: 'leader' | 'deputy' | 'member';
  isOnline?: boolean;
  lastSeen?: number;
}

export interface ZaloReactionItem {
  emoji: string;
  userIds: string[];
}

export interface ZaloMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  senderAvatar?: string;
  type: ZaloMessageType;
  content: string;
  mediaUrl?: string;
  mediaMeta?: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    duration?: number;
    width?: number;
    height?: number;
    title?: string;
    docId?: string;
    version?: number;
    taskId?: string;
    taskTitle?: string;
    assigneeName?: string;
    column?: string;
    priority?: string;
    latitude?: number;
    longitude?: number;
    locationName?: string;
    contactName?: string;
    contactPhone?: string;
    contactColor?: string;
  };
  timestamp: number;
  reactions: Record<string, string[]>;
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
    type?: ZaloMessageType;
  } | null;
  isRecalled?: boolean;
  isPinned?: boolean;
  readBy?: string[];
  expiresAt?: number;
  disappearingDuration?: number;
}

export interface ZaloConversation {
  id: string;
  type: 'group' | 'direct';
  name: string;
  avatarUrl?: string;
  members: ZaloUser[];
  pinnedMessageId?: string | null;
  isPinned?: boolean;
  isMuted?: boolean;
  unreadCount?: number;
  isLocked?: boolean;
  pinCode?: string;
  disappearingDuration?: number;
  lastMessage?: {
    text: string;
    senderName: string;
    timestamp: number;
  };
}

export type ZaloCallStatus = 'idle' | 'ringing' | 'connected' | 'ended' | 'declined';

export interface ZaloCallSession {
  id: string;
  roomId: string;
  callerId: string;
  callerName: string;
  callerColor: string;
  callType: 'audio' | 'video';
  status: ZaloCallStatus;
  startTime?: number | null;
  startedAt?: number | null;
  connectedAt?: number | null;
  duration?: number;
  participants?: string[];
}
