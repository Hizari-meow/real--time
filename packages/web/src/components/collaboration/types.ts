export type ChannelCategory = 'project' | 'team' | 'topic' | 'guest' | 'external' | 'dm';

export type UserPresenceStatus = 'online' | 'meeting' | 'away' | 'dnd' | 'focus';

export interface PresenceUser {
  id: string;
  name: string;
  avatarColor: string;
  status: UserPresenceStatus;
  statusText?: string;
  role: string;
  department: string;
}

export interface WorkplaceChannel {
  id: string;
  name: string;
  category: ChannelCategory;
  categoryLabel: string;
  isPrivate: boolean;
  description: string;
  memberCount: number;
  isGuest?: boolean;
  guestOrganization?: string;
  unreadCount?: number;
  isMuted?: boolean;
  isPinned?: boolean;
  hasActiveHuddle?: boolean;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface WorkplaceMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  senderRole?: string;
  content: string;
  timestamp: number;
  type: 'text' | 'file' | 'bot' | 'bot_alert' | 'task_created' | 'huddle_event' | 'image' | 'voice' | 'audio';
  reactions: MessageReaction[];
  threadCount?: number;
  threadLastReplyAt?: number;
  threadParticipants?: string[];
  isPinned?: boolean;
  isBookmarked?: boolean;
  attachment?: {
    name?: string;
    size?: string;
    type?: 'pdf' | 'doc' | 'image' | 'code' | 'audio' | string;
    url?: string;
    fileName?: string;
    fileSize?: string;
    fileType?: string;
  };
  botInfo?: {
    source: 'github' | 'jira' | 'sentry' | 'crm';
    eventTitle: string;
    eventMeta: string;
    statusBadge: string;
  };
  taskInfo?: {
    taskId: string;
    taskTitle: string;
    assigneeName: string;
    deadline: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
  };
}

export interface ThreadReply {
  id: string;
  messageId: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  content: string;
  timestamp: number;
  reactions: MessageReaction[];
}

export interface HuddleParticipant {
  id: string;
  name: string;
  color: string;
  isMuted: boolean;
  isSpeaking: boolean;
  isScreenSharing?: boolean;
}

export interface HuddleSession {
  id: string;
  channelId: string;
  channelName: string;
  participants: HuddleParticipant[];
  startedAt: number;
  isActive: boolean;
}

export interface VideoMeetingParticipant {
  id: string;
  name: string;
  color: string;
  role: string;
  isMuted: boolean;
  isVideoOn: boolean;
  isHandRaised: boolean;
  reaction?: string;
}

export interface BreakoutRoom {
  id: string;
  name: string;
  participants: string[];
}

export interface LiveCaptionItem {
  id: string;
  speaker: string;
  text: string;
  timestamp: string;
}

export interface ContextualComment {
  id: string;
  documentId: string;
  documentTitle: string;
  targetText?: string;
  selectedText?: string;
  suggestedReplacement?: string;
  lineContext?: string;
  authorId?: string;
  authorName: string;
  authorColor: string;
  authorRole?: string;
  content: string;
  timestamp: number;
  resolved: boolean;
  isVoiceComment?: boolean;
  voiceDurationSec?: number;
  isVideoComment?: boolean;
  videoDurationSec?: number;
  mediaType?: 'document' | 'spreadsheet' | 'design';
  cellLocation?: string;
  isSuggestion?: boolean;
  suggestionOriginal?: string;
  suggestionNew?: string;
  suggestionStatus?: 'pending' | 'accepted' | 'rejected';
  reactions?: {
    emoji: string;
    count: number;
    users: string[];
  }[];
  replies?: {
    id: string;
    authorName: string;
    authorColor: string;
    content: string;
    timestamp: number;
  }[];
  mentions?: string[];
  assignedTask?: {
    taskId: string;
    assignee: string;
    deadline: string;
  };
}

export interface NotificationItem {
  id: string;
  type: 'mention' | 'comment' | 'task' | 'meeting' | 'system' | 'dm' | 'watch';
  title: string;
  body: string;
  content?: string;
  senderName: string;
  senderColor: string;
  timestamp: number;
  targetUrl: string;
  targetLabel: string;
  targetDocId?: string;
  isRead: boolean;
  isPriority?: boolean;
  channelName?: string;
}

export interface NotificationPreferences {
  doNotDisturb: boolean;
  focusModeUntil: number | null;
  digestMorning: boolean;
  digestEvening: boolean;
  emailNotifications: boolean;
  desktopPush: boolean;
}
