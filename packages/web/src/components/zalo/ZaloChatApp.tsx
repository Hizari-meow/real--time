'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import {
  Search,
  Plus,
  Send,
  Smile,
  Image as ImageIcon,
  Paperclip,
  Mic,
  Phone,
  Video,
  Users,
  Pin,
  Reply,
  Undo2,
  Trash2,
  CheckCheck,
  Info,
  X,
  FileText,
  Download,
  Bell,
  BellOff,
  LogOut,
  UserPlus,
  ArrowLeft,
  Settings,
  PhoneOff,
  PhoneIncoming,
  CheckSquare,
  ExternalLink,
  Sparkles,
  MapPin,
  Forward,
  UserCheck,
  MessageSquare,
  BookUser,
  PanelRightClose,
  PanelRightOpen,
  Cloud,
  Star,
  Check,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Hourglass,
  Activity,
  Server,
  ShieldCheck,
} from 'lucide-react';
import {
  ZaloUser,
  ZaloConversation,
  ZaloMessage,
  ZaloMessageType,
  ZaloCallSession,
} from './types';
import {
  PRESET_USERS,
  getConversationsForUser,
  INITIAL_MESSAGES,
  getMyCloudRoomId,
} from './mockData';
import { AudioWaveformPlayer } from './AudioWaveformPlayer';
import { ImageViewerModal } from './ImageViewerModal';
import { StickerPicker } from './StickerPicker';
import { CreateGroupModal } from './CreateGroupModal';
import { RealtimeCallModal } from './RealtimeCallModal';
import { CreateTaskFromMessageModal } from './CreateTaskFromMessageModal';
import { ShareDocumentModal } from './ShareDocumentModal';
import { ForwardMessageModal } from './ForwardMessageModal';
import { ShareLocationModal } from './ShareLocationModal';
import { ShareContactModal } from './ShareContactModal';
import { AICopilotDrawer } from '../ai/AICopilotDrawer';
import { ResilientWebSocketProvider } from '../../lib/yjs-provider';
import { getUnifiedUsers } from '../../lib/domain-event-bus';

const REACTION_EMOJIS = ['👍', '❤️', '😄', '😮', '😢', '😡'];

/**
 * Deduplicates messages by ID and sorts chronologically
 */
function deduplicateMessages(list: ZaloMessage[]): ZaloMessage[] {
  const map = new Map<string, ZaloMessage>();
  for (const item of list) {
    if (item && item.id) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Loads cached messages from localStorage or falls back to INITIAL_MESSAGES
 */
function getRoomMessagesFromStorage(roomId: string): ZaloMessage[] {
  if (typeof window === 'undefined') return INITIAL_MESSAGES[roomId] || [];
  try {
    const raw = localStorage.getItem(`collab_zalo_messages_${roomId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return deduplicateMessages(parsed);
      }
    }
  } catch (err) {
    console.warn(`[getRoomMessagesFromStorage] Error parsing cache for ${roomId}:`, err);
  }
  return INITIAL_MESSAGES[roomId] || [];
}

/**
 * Persists room messages to localStorage synchronously
 */
function saveRoomMessagesToStorage(roomId: string, msgs: ZaloMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`collab_zalo_messages_${roomId}`, JSON.stringify(msgs));
  } catch (err) {
    console.warn(`[saveRoomMessagesToStorage] Error saving cache for ${roomId}:`, err);
  }
}

/**
 * Format timestamp nicely like Zalo
 */
function formatMsgTime(timestamp: number): string {
  const d = new Date(timestamp);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  if (isToday) return `${hours}:${mins}`;
  return `${d.getDate()}/${d.getMonth() + 1} ${hours}:${mins}`;
}

/**
 * Format file sizes cleanly
 */
function formatFileSize(bytes?: number): string {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function ZaloChatApp() {
  const router = useRouter();

  // Current logged in user (per session/tab)
  const [currentUser, setCurrentUser] = useState<ZaloUser>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const queryUser = urlParams.get('user');
      if (queryUser) {
        const found = PRESET_USERS.find((u) => u.id === queryUser);
        if (found) return found;
      }
      const sessionUser = sessionStorage.getItem('collab_chat_user');
      if (sessionUser) {
        const found = PRESET_USERS.find((u) => u.id === sessionUser);
        if (found) return found;
      }
    }
    return PRESET_USERS[0]; // Default: Nguyễn Văn Nam
  });

  const [allUsers, setAllUsers] = useState<ZaloUser[]>(() => {
    if (typeof window !== 'undefined') {
      const u = getUnifiedUsers();
      if (u.length > 0) return u as any;
    }
    return PRESET_USERS;
  });
  const [userSwitcherOpen, setUserSwitcherOpen] = useState(false);

  // Authentic Zalo Leftmost Navigation Tabs:
  // 'chat' (Tin nhắn) | 'contacts' (Danh bạ) | 'starred' (Tin đánh dấu)
  const [navTab, setNavTab] = useState<'chat' | 'contacts' | 'starred'>('chat');

  // Conversations state dynamically derived for current user
  const [conversations, setConversations] = useState<ZaloConversation[]>(() => {
    if (typeof window !== 'undefined') {
      const u = getUnifiedUsers();
      if (u.length > 0) return getConversationsForUser(PRESET_USERS[0], u as any);
    }
    return getConversationsForUser(PRESET_USERS[0]);
  });

  // Synchronize dynamic company members and conversations from central directory
  useEffect(() => {
    const syncUsersAndConversations = () => {
      const u = getUnifiedUsers();
      if (u.length > 0) {
        setAllUsers(u as any);
        setConversations(getConversationsForUser(currentUser, u as any));
      }
    };
    syncUsersAndConversations();
    window.addEventListener('collab_members_updated', syncUsersAndConversations);
    window.addEventListener('storage', syncUsersAndConversations);
    return () => {
      window.removeEventListener('collab_members_updated', syncUsersAndConversations);
      window.removeEventListener('storage', syncUsersAndConversations);
    };
  }, [currentUser]);
  const [activeRoomId, setActiveRoomId] = useState<string>('group_tech');
  const [searchFilter, setSearchFilter] = useState('');
  const [conversationTab, setConversationTab] = useState<'all' | 'unread'>('all');
  const [contactSearch, setContactSearch] = useState('');

  // Messages state with instant cache hydration (ZERO white screen)
  const [messages, setMessages] = useState<ZaloMessage[]>(() =>
    getRoomMessagesFromStorage('group_tech')
  );
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ZaloMessage | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // In-chat search state
  const [inChatSearchOpen, setInChatSearchOpen] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');

  // Mobile navigation state
  const [mobileTab, setMobileTab] = useState<'conversations' | 'chat'>('conversations');

  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  // Settings Modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [previewEnabled, setPreviewEnabled] = useState(true);

  // Modals & Panels
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);
  const [mediaTab, setMediaTab] = useState<'media' | 'files'>('media');
  const [viewingImage, setViewingImage] = useState<{ url: string; caption?: string } | null>(null);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [forwardModalMessage, setForwardModalMessage] = useState<ZaloMessage | null>(null);
  const [shareLocationOpen, setShareLocationOpen] = useState(false);
  const [shareContactOpen, setShareContactOpen] = useState(false);

  // 2-in-1 Integration Modals
  const [taskModalMessage, setTaskModalMessage] = useState<ZaloMessage | null>(null);
  const [shareDocModalOpen, setShareDocModalOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

  // Security & PIN Lock State
  const [unlockedRooms, setUnlockedRooms] = useState<Set<string>>(new Set());
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pendingLockRoom, setPendingLockRoom] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isSettingPinModalOpen, setIsSettingPinModalOpen] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');

  // Cluster Telemetry Modal State
  const [isTelemetryModalOpen, setIsTelemetryModalOpen] = useState(false);
  const [pingLatency, setPingLatency] = useState<number>(2.4);

  // Real-time call session state (synchronized over Yjs)
  const [activeCallSession, setActiveCallSession] = useState<ZaloCallSession | null>(null);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Yjs CRDT & Provider refs
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<ResilientWebSocketProvider | null>(null);
  const chatArrayRef = useRef<Y.Array<ZaloMessage> | null>(null);
  const callMapRef = useRef<Y.Map<any> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSendingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Update conversations whenever currentUser changes
  useEffect(() => {
    const newConvs = getConversationsForUser(currentUser);
    setConversations(newConvs);

    // If activeRoomId doesn't belong to the new user's roster, switch to group_tech
    if (!newConvs.some((c) => c.id === activeRoomId)) {
      handleSelectConversation('group_tech');
    }
  }, [currentUser]);

  // Read URL query parameter or session on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const queryUser = urlParams.get('user');
    if (queryUser) {
      const found = allUsers.find((u) => u.id === queryUser);
      if (found && found.id !== currentUser.id) {
        setCurrentUser(found);
        sessionStorage.setItem('collab_chat_user', found.id);
      }
    }
  }, [allUsers, currentUser.id]);

  // Switch active user
  const handleSwitchUser = (user: ZaloUser) => {
    setCurrentUser(user);
    sessionStorage.setItem('collab_chat_user', user.id);
    setUserSwitcherOpen(false);

    const newConvs = getConversationsForUser(user);
    setConversations(newConvs);
    if (!newConvs.some((c) => c.id === activeRoomId)) {
      handleSelectConversation('group_tech');
    }
  };

  const handleOpenTabAsUser = (user: ZaloUser) => {
    if (typeof window !== 'undefined') {
      window.open(`/chat?user=${user.id}`, '_blank');
      setUserSwitcherOpen(false);
    }
  };

  /**
   * Exit Chat cleanly back to Collaborative Workspace
   */
  const handleExitChat = () => {
    if (activeCallSession && activeCallSession.status === 'connected') {
      if (
        confirm(
          'Cuộc gọi đang diễn ra. Bạn có chắc muốn ngắt cuộc gọi và thoát về Không gian làm việc?'
        )
      ) {
        handleEndCall(0);
        router.push('/');
      }
    } else {
      router.push('/');
    }
  };

  // Current active conversation object
  const activeConversation = useMemo(() => {
    return (
      conversations.find((c) => c.id === activeRoomId) ||
      conversations[0] || {
        id: 'group_tech',
        type: 'group',
        name: 'Nhóm Kỹ Thuật',
        members: PRESET_USERS,
      }
    );
  }, [conversations, activeRoomId]);

  /**
   * Room selection handler with instant cache loading - prevents blank screen
   */
  const handleSelectConversation = (roomId: string) => {
    if (roomId === activeRoomId) return;

    // Check PIN Lock
    const target = conversations.find((c) => c.id === roomId);
    if (target?.isLocked && !unlockedRooms.has(roomId)) {
      setPendingLockRoom(roomId);
      setPinInput('');
      setPinError('');
      setIsPinModalOpen(true);
      return;
    }

    // 1. Immediately hydrate messages from local cache for instant feedback
    const cached = getRoomMessagesFromStorage(roomId);
    setMessages(cached);

    // 2. Set active room ID
    setActiveRoomId(roomId);
    setMobileTab('chat');
    setInChatSearchOpen(false);
    setInChatSearchQuery('');

    // 3. Reset unread counter
    setConversations((prev) =>
      prev.map((item) => (item.id === roomId ? { ...item, unreadCount: 0 } : item))
    );
  };

  /**
   * PIN Verification handler
   */
  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingLockRoom) return;
    const target = conversations.find((c) => c.id === pendingLockRoom);
    const correctPin = target?.pinCode || '1234';
    if (pinInput === correctPin) {
      setUnlockedRooms((prev) => new Set(prev).add(pendingLockRoom));
      setIsPinModalOpen(false);
      const roomToOpen = pendingLockRoom;
      setPendingLockRoom(null);

      const cached = getRoomMessagesFromStorage(roomToOpen);
      setMessages(cached);
      setActiveRoomId(roomToOpen);
      setMobileTab('chat');
      setInChatSearchOpen(false);
      setInChatSearchQuery('');
    } else {
      setPinError('Mã PIN không đúng! Vui lòng thử lại (Mặc định: 1234)');
    }
  };

  /**
   * Save newly configured PIN for active conversation
   */
  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPinInput.trim() || newPinInput.trim().length < 4) {
      alert('Vui lòng nhập mã PIN gồm ít nhất 4 chữ số');
      return;
    }
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeRoomId ? { ...c, isLocked: true, pinCode: newPinInput.trim() } : c
      )
    );
    setUnlockedRooms((prev) => new Set(prev).add(activeRoomId));
    setIsSettingPinModalOpen(false);
    setNewPinInput('');
    alert(`Đã kích hoạt khóa mã PIN bảo vệ cho ${activeConversation.name}!`);
  };

  // Disappearing messages background purge interval
  useEffect(() => {
    const purgeInterval = setInterval(() => {
      const now = Date.now();
      setMessages((prev) => {
        const remaining = prev.filter((m) => !m.expiresAt || m.expiresAt > now);
        if (remaining.length !== prev.length) {
          saveRoomMessagesToStorage(activeRoomId, remaining);
          return remaining;
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(purgeInterval);
  }, [activeRoomId]);

  /**
   * 1-click open "Cloud của tôi" (Classic Zalo feature)
   */
  const handleOpenMyCloud = () => {
    setNavTab('chat');
    const cloudRoomId = getMyCloudRoomId(currentUser.id);
    handleSelectConversation(cloudRoomId);
  };

  /**
   * Connect to Yjs and WebSocket Gateway for the active room with persistent fallback
   */
  useEffect(() => {
    if (providerRef.current) {
      providerRef.current.destroy();
      providerRef.current = null;
    }
    if (ydocRef.current) {
      ydocRef.current.destroy();
    }

    // Always ensure local state has cached data immediately
    const cachedMessages = getRoomMessagesFromStorage(activeRoomId);
    setMessages(cachedMessages);

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.hostname}:8080/ws`;
    const docId = `zalo_room_${activeRoomId}`;

    const awareness = new awarenessProtocol.Awareness(ydoc);
    awareness.setLocalState({
      user: {
        id: currentUser.id,
        name: currentUser.name,
        color: currentUser.color,
      },
      typing: false,
    });

    const chatArray = ydoc.getArray<ZaloMessage>('zalo_messages');
    chatArrayRef.current = chatArray;

    const syncMessages = () => {
      const currentList = chatArray.toArray();
      if (currentList.length > 0) {
        const merged = deduplicateMessages([...cachedMessages, ...currentList]);
        setMessages(merged);
        saveRoomMessagesToStorage(activeRoomId, merged);
      } else {
        // If Yjs array is empty, keep cached messages visible and seed Yjs
        if (cachedMessages.length > 0) {
          ydoc.transact(() => {
            const existingIds = new Set(chatArray.toArray().map((m) => m.id));
            const toAdd = cachedMessages.filter((s) => !existingIds.has(s.id));
            if (toAdd.length > 0) {
              chatArray.push(toAdd);
            }
          });
        }
      }
    };

    const provider = new ResilientWebSocketProvider({
      url: wsUrl,
      docId,
      doc: ydoc,
      awareness,
      userId: currentUser.id,
      name: currentUser.name,
      color: currentUser.color,
      onSynced: () => {
        syncMessages();
      },
    });
    providerRef.current = provider;

    chatArray.observe(syncMessages);
    syncMessages();

    // Calling Map
    const callMap = ydoc.getMap<any>('zalo_call_session');
    callMapRef.current = callMap;

    const syncCallSession = () => {
      const session = callMap.get('current_call') as ZaloCallSession | undefined;
      if (session) {
        if (session.status === 'ringing' || session.status === 'connected') {
          setActiveCallSession(session);
        } else if (session.status === 'ended' || session.status === 'declined') {
          setActiveCallSession(null);
        }
      } else {
        setActiveCallSession(null);
      }
    };

    callMap.observe(syncCallSession);
    syncCallSession();

    // Typing awareness
    const handleAwarenessChange = () => {
      const states = provider.awareness.getStates();
      const typers: string[] = [];
      states.forEach((state: any) => {
        if (state.user && state.user.id !== currentUser.id && state.typing === true) {
          typers.push(state.user.name || 'Một người bạn');
        }
      });
      setTypingUsers(Array.from(new Set(typers)));
    };

    provider.awareness.on('change', handleAwarenessChange);

    return () => {
      chatArray.unobserve(syncMessages);
      callMap.unobserve(syncCallSession);
      provider.awareness.off('change', handleAwarenessChange);
      provider.destroy();
      ydoc.destroy();
      callMapRef.current = null;
      setActiveCallSession(null);
    };
  }, [activeRoomId, currentUser]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Typing indicator trigger with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    // Detect @mention
    const lastAtPos = val.lastIndexOf('@');
    if (lastAtPos !== -1 && lastAtPos === val.length - 1) {
      setMentionQuery('');
    } else if (mentionQuery !== null) {
      if (lastAtPos === -1) {
        setMentionQuery(null);
      } else {
        const query = val.slice(lastAtPos + 1).toLowerCase();
        setMentionQuery(query);
      }
    }

    if (!providerRef.current) return;
    providerRef.current.awareness.setLocalStateField('typing', true);

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = setTimeout(() => {
      providerRef.current?.awareness.setLocalStateField('typing', false);
    }, 2000);
  };

  const handleSelectMention = (user: ZaloUser) => {
    if (mentionQuery === null) return;
    const lastAtPos = inputText.lastIndexOf('@');
    if (lastAtPos !== -1) {
      const newText = inputText.slice(0, lastAtPos) + `@${user.name} `;
      setInputText(newText);
    }
    setMentionQuery(null);
  };

  /**
   * Send message with instantaneous local commit and Yjs broadcast
   */
  const handleSendMessage = useCallback(
    (
      type: ZaloMessageType = 'text',
      contentOverride?: string,
      mediaUrl?: string,
      mediaMeta?: any
    ) => {
      if (isSendingRef.current) return;

      const text = contentOverride !== undefined ? contentOverride : inputText.trim();
      if (!text && !mediaUrl) return;

      isSendingRef.current = true;
      setTimeout(() => {
        isSendingRef.current = false;
      }, 150);

      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      providerRef.current?.awareness.setLocalStateField('typing', false);

      const newMessage: ZaloMessage = {
        id: 'zmsg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        roomId: activeRoomId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderColor: currentUser.color,
        type,
        content: text,
        mediaUrl,
        mediaMeta,
        timestamp: Date.now(),
        reactions: {},
        expiresAt:
          activeConversation.disappearingDuration && activeConversation.disappearingDuration > 0
            ? Date.now() + activeConversation.disappearingDuration * 1000
            : undefined,
        disappearingDuration: activeConversation.disappearingDuration || undefined,
        replyTo: replyingTo
          ? {
              id: replyingTo.id,
              senderName: replyingTo.senderName,
              text: replyingTo.content.slice(0, 80),
              type: replyingTo.type,
            }
          : null,
        isRecalled: false,
        isPinned: false,
        readBy: [currentUser.id],
      };

      // 1. Instant local commit (prevents any message loss)
      setMessages((prev) => {
        const next = [...prev, newMessage];
        saveRoomMessagesToStorage(activeRoomId, next);
        return next;
      });

      // 2. Yjs real-time broadcast
      if (chatArrayRef.current) {
        try {
          chatArrayRef.current.push([newMessage]);
        } catch (e) {
          console.error('[handleSendMessage] Yjs push error:', e);
        }
      }

      // 3. Update conversations lastMessage snippet
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeRoomId
            ? {
                ...c,
                lastMessage: {
                  text:
                    type === 'image'
                      ? '[Hình ảnh]'
                      : type === 'file'
                      ? `[Tệp: ${mediaMeta?.fileName || 'Tệp tin'}]`
                      : type === 'voice'
                      ? '[Tin nhắn thoại]'
                      : type === 'location'
                      ? `[Vị trí: ${mediaMeta?.locationName || text}]`
                      : type === 'contact'
                      ? `[Danh thiếp: ${mediaMeta?.contactName || text}]`
                      : type === 'doc'
                      ? `[Tài liệu: ${mediaMeta?.title || text}]`
                      : type === 'task'
                      ? `[Công việc: ${mediaMeta?.taskTitle || text}]`
                      : text,
                  senderName: currentUser.name,
                  timestamp: Date.now(),
                },
              }
            : c
        )
      );

      setInputText('');
      setReplyingTo(null);
      setStickerPickerOpen(false);
      setMentionQuery(null);
    },
    [activeRoomId, currentUser, inputText, replyingTo]
  );

  const handleForwardMessage = (targetRoomId: string) => {
    if (!forwardModalMessage) return;

    const clonedMsg: ZaloMessage = {
      ...forwardModalMessage,
      id: 'zmsg_fwd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      roomId: targetRoomId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderColor: currentUser.color,
      timestamp: Date.now(),
      reactions: {},
      isPinned: false,
      readBy: [currentUser.id],
    };

    if (targetRoomId === activeRoomId) {
      setMessages((prev) => {
        const next = [...prev, clonedMsg];
        saveRoomMessagesToStorage(targetRoomId, next);
        return next;
      });
      chatArrayRef.current?.push([clonedMsg]);
    } else {
      const existing = getRoomMessagesFromStorage(targetRoomId);
      saveRoomMessagesToStorage(targetRoomId, [...existing, clonedMsg]);
    }

    setForwardModalMessage(null);
    alert(`Đã chuyển tiếp tin nhắn thành công!`);
  };

  const handleShareLocation = (locationName: string, lat: number, lng: number) => {
    handleSendMessage('location', `📍 Vị trí: ${locationName}`, undefined, {
      latitude: lat,
      longitude: lng,
      locationName,
    });
    setShareLocationOpen(false);
  };

  const handleShareContact = (user: ZaloUser) => {
    handleSendMessage('contact', `👤 Danh thiếp: ${user.name}`, undefined, {
      contactName: user.name,
      contactPhone: user.phone || '0900 000 000',
      contactColor: user.color,
    });
    setShareContactOpen(false);
  };

  const handleToggleReaction = (messageId: string, emoji: string) => {
    setMessages((prev) => {
      const next = prev.map((m) => {
        if (m.id !== messageId) return m;
        const currentReactions = { ...(m.reactions || {}) };
        const userList = currentReactions[emoji] ? [...currentReactions[emoji]] : [];
        const existIdx = userList.indexOf(currentUser.id);
        if (existIdx > -1) {
          userList.splice(existIdx, 1);
          if (userList.length === 0) delete currentReactions[emoji];
          else currentReactions[emoji] = userList;
        } else {
          userList.push(currentUser.id);
          currentReactions[emoji] = userList;
        }
        return { ...m, reactions: currentReactions };
      });
      saveRoomMessagesToStorage(activeRoomId, next);
      return next;
    });

    if (chatArrayRef.current && ydocRef.current) {
      ydocRef.current.transact(() => {
        const arr = chatArrayRef.current!;
        const items = arr.toArray();
        const index = items.findIndex((m) => m.id === messageId);
        if (index === -1) return;

        const target = { ...items[index] };
        const reactions = { ...(target.reactions || {}) };
        const userList = reactions[emoji] ? [...reactions[emoji]] : [];

        const existIdx = userList.indexOf(currentUser.id);
        if (existIdx > -1) {
          userList.splice(existIdx, 1);
          if (userList.length === 0) delete reactions[emoji];
          else reactions[emoji] = userList;
        } else {
          userList.push(currentUser.id);
          reactions[emoji] = userList;
        }

        target.reactions = reactions;
        arr.delete(index, 1);
        arr.insert(index, [target]);
      });
    }
  };

  const handleRecallMessage = (messageId: string) => {
    setMessages((prev) => {
      const next = prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              isRecalled: true,
              content: 'Tin nhắn đã được thu hồi',
              mediaUrl: undefined,
              mediaMeta: undefined,
            }
          : m
      );
      saveRoomMessagesToStorage(activeRoomId, next);
      return next;
    });

    if (chatArrayRef.current && ydocRef.current) {
      ydocRef.current.transact(() => {
        const arr = chatArrayRef.current!;
        const items = arr.toArray();
        const index = items.findIndex((m) => m.id === messageId);
        if (index === -1) return;

        const target = { ...items[index] };
        target.isRecalled = true;
        target.content = 'Tin nhắn đã được thu hồi';
        target.mediaUrl = undefined;
        target.mediaMeta = undefined;

        arr.delete(index, 1);
        arr.insert(index, [target]);
      });
    }
  };

  const handleTogglePinMessage = (messageId: string) => {
    setMessages((prev) => {
      const next = prev.map((m) =>
        m.id === messageId ? { ...m, isPinned: !m.isPinned } : m
      );
      saveRoomMessagesToStorage(activeRoomId, next);
      return next;
    });

    if (chatArrayRef.current && ydocRef.current) {
      ydocRef.current.transact(() => {
        const arr = chatArrayRef.current!;
        const items = arr.toArray();
        const index = items.findIndex((m) => m.id === messageId);
        if (index === -1) return;

        const target = { ...items[index] };
        target.isPinned = !target.isPinned;

        arr.delete(index, 1);
        arr.insert(index, [target]);

        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeRoomId
              ? { ...c, pinnedMessageId: target.isPinned ? target.id : null }
              : c
          )
        );
      });
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessages((prev) => {
      const next = prev.filter((m) => m.id !== messageId);
      saveRoomMessagesToStorage(activeRoomId, next);
      return next;
    });

    if (chatArrayRef.current && ydocRef.current) {
      ydocRef.current.transact(() => {
        const arr = chatArrayRef.current!;
        const items = arr.toArray();
        const index = items.findIndex((m) => m.id === messageId);
        if (index > -1) {
          arr.delete(index, 1);
        }
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      handleSendMessage('image', file.name, dataUrl, {
        fileName: file.name,
        fileSize: file.size,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    handleSendMessage('file', file.name, undefined, {
      fileName: file.name,
      fileSize: file.size,
      fileType: extension || 'file',
    });
    e.target.value = '';
  };

  const startRecording = () => {
    setIsRecording(true);
    setRecordSeconds(0);
    recordTimerRef.current = setInterval(() => {
      setRecordSeconds((s) => s + 1);
    }, 1000);
  };

  const stopAndSendRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setIsRecording(false);
    const duration = Math.max(1, recordSeconds);
    handleSendMessage('voice', `Tin nhắn thoại (${duration}s)`, undefined, { duration });
    setRecordSeconds(0);
  };

  const cancelRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setIsRecording(false);
    setRecordSeconds(0);
  };

  // Real-time Calling Handlers
  const handleInitiateCall = (type: 'audio' | 'video') => {
    if (!callMapRef.current) return;
    const newSession: ZaloCallSession = {
      id: 'call_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      roomId: activeRoomId,
      callerId: currentUser.id,
      callerName: currentUser.name,
      callerColor: currentUser.color,
      callType: type,
      status: 'ringing',
      startedAt: Date.now(),
    };
    callMapRef.current.set('current_call', newSession);
  };

  const handleAcceptCall = () => {
    if (!callMapRef.current || !activeCallSession) return;
    const updated: ZaloCallSession = {
      ...activeCallSession,
      status: 'connected',
      connectedAt: Date.now(),
    };
    callMapRef.current.set('current_call', updated);
  };

  const handleDeclineCall = () => {
    if (!callMapRef.current || !activeCallSession) return;
    const updated: ZaloCallSession = {
      ...activeCallSession,
      status: 'declined',
    };
    callMapRef.current.set('current_call', updated);
    handleSendMessage(
      'text',
      `❌ Cuộc gọi ${activeCallSession.callType === 'video' ? 'video' : 'thoại'} đã bị từ chối`
    );
  };

  const handleEndCall = (durationSecs: number) => {
    if (!callMapRef.current || !activeCallSession) return;
    const updated: ZaloCallSession = {
      ...activeCallSession,
      status: 'ended',
      duration: durationSecs,
    };
    callMapRef.current.set('current_call', updated);
    const mins = Math.floor(durationSecs / 60);
    const secs = durationSecs % 60;
    const durationStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    handleSendMessage(
      'text',
      `📞 Cuộc gọi ${activeCallSession.callType === 'video' ? 'video' : 'thoại'} đã kết thúc (${durationStr})`
    );
  };

  // 2-in-1 Integration: Convert Message to Task
  const handleCreateTaskFromMessage = (taskData: {
    title: string;
    description: string;
    column: any;
    priority: any;
    assigneeId: string;
    dueDate?: string;
  }) => {
    const assignee =
      allUsers.find((u) => u.id === taskData.assigneeId)?.name || 'Thành viên';

    // Persist to local queue and dispatch custom event for Kanban
    try {
      const existing = JSON.parse(localStorage.getItem('collab_kanban_external_tasks') || '[]');
      const newTask = {
        id: `task-chat-${Date.now()}`,
        title: taskData.title,
        description: taskData.description,
        column: taskData.column || 'todo',
        priority: taskData.priority || 'normal',
        assigneeId: taskData.assigneeId,
        assigneeName: assignee,
        dueDate: taskData.dueDate,
        labels: ['Từ Chat Zalo'],
        checklist: [],
        commentsCount: 0,
        createdAt: new Date().toISOString(),
      };
      existing.push(newTask);
      localStorage.setItem('collab_kanban_external_tasks', JSON.stringify(existing));
      window.dispatchEvent(new CustomEvent('collab_task_created', { detail: newTask }));

      // Also sync to backend API
      fetch('http://localhost:8080/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      }).catch(() => {});
    } catch (e) {
      console.warn('Could not store task locally', e);
    }

    handleSendMessage('task', `📋 Công việc mới: ${taskData.title}`, undefined, {
      taskTitle: taskData.title,
      assigneeName: assignee,
      column: taskData.column,
      priority: taskData.priority,
    });
  };

  // 2-in-1 Integration: Share Document Card in Chat
  const handleShareDocument = (doc: { id: string; title: string; currentVersion: number }) => {
    handleSendMessage('doc', `📄 Chia sẻ tài liệu: ${doc.title}`, undefined, {
      docId: doc.id,
      title: doc.title,
      version: doc.currentVersion,
    });
  };

  const handleCreateGroup = (name: string, memberIds: string[]) => {
    const selectedMembers = allUsers.filter((u) => memberIds.includes(u.id));
    const newGroupId = 'group_' + Date.now();
    const creationMsg: ZaloMessage = {
      id: 'zmsg_create_' + Date.now(),
      roomId: newGroupId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderColor: currentUser.color,
      type: 'text',
      content: `🎉 ${currentUser.name} đã tạo nhóm "${name}"`,
      timestamp: Date.now(),
      reactions: {},
      isPinned: true,
      readBy: [currentUser.id],
    };

    saveRoomMessagesToStorage(newGroupId, [creationMsg]);

    const newConv: ZaloConversation = {
      id: newGroupId,
      type: 'group',
      name,
      members: selectedMembers,
      isPinned: false,
      isMuted: false,
      unreadCount: 0,
      lastMessage: {
        text: `${currentUser.name} đã tạo nhóm`,
        senderName: currentUser.name,
        timestamp: Date.now(),
      },
    };

    setConversations((prev) => [newConv, ...prev]);
    handleSelectConversation(newGroupId);
  };

  const pinnedMessage = useMemo(() => {
    return messages.find((m) => m.isPinned);
  }, [messages]);

  const sharedMedia = useMemo(() => {
    return messages.filter((m) => m.type === 'image' && m.mediaUrl);
  }, [messages]);

  const sharedFiles = useMemo(() => {
    return messages.filter((m) => m.type === 'file' && m.mediaMeta);
  }, [messages]);

  // Starred / Pinned messages across conversations for the 'starred' tab
  const allStarredMessages = useMemo(() => {
    const starred: { msg: ZaloMessage; roomName: string }[] = [];
    for (const c of conversations) {
      const roomMsgs = getRoomMessagesFromStorage(c.id);
      for (const m of roomMsgs) {
        if (m.isPinned) {
          starred.push({ msg: m, roomName: c.name });
        }
      }
    }
    return starred;
  }, [conversations, messages]);

  // Filtered in-chat search results
  const inChatSearchResults = useMemo(() => {
    if (!inChatSearchQuery.trim()) return [];
    return messages.filter((m) =>
      m.content.toLowerCase().includes(inChatSearchQuery.toLowerCase())
    );
  }, [messages, inChatSearchQuery]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-zinc-900 font-sans select-none antialiased">
      {/* ============================================================== */}
      {/* 1. LEFT UTILITY RAIL (Zalo Brand Blue #0068ff / 68px)          */}
      {/*    NO duplicate external platform links; ONLY Zalo features    */}
      {/* ============================================================== */}
      <aside className="hidden md:flex w-[68px] bg-[#0068ff] flex-col items-center justify-between py-4 shrink-0 z-20 shadow-md">
        {/* Top: Avatar of Current User */}
        <div className="flex flex-col items-center gap-5 w-full">
          <div className="relative">
            <button
              onClick={() => setUserSwitcherOpen(!userSwitcherOpen)}
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white/40 hover:ring-white transition-all transform active:scale-95"
              style={{ backgroundColor: currentUser.color }}
              title={`Tài khoản hiện tại: ${currentUser.name} (Nhấp để đổi danh tính)`}
            >
              {currentUser.name.slice(0, 1).toUpperCase()}
            </button>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-[#0068ff]" />

            {/* User Switcher Popover */}
            {userSwitcherOpen && (
              <div className="absolute left-14 top-0 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-zinc-200 p-2.5 animate-in fade-in duration-150 text-left text-zinc-900">
                <div className="px-3 py-2 border-b border-zinc-100">
                  <p className="text-xs font-bold text-zinc-900">Chuyển đổi danh tính</p>
                  <p className="text-[11px] text-zinc-500">
                    Mở nhiều tab để thử nghiệm chat và gọi điện thời gian thực
                  </p>
                </div>

                <div className="py-1.5 space-y-1">
                  {allUsers.map((u) => {
                    const isSelf = u.id === currentUser.id;
                    return (
                      <div
                        key={u.id}
                        className={`flex items-center justify-between p-2 rounded-xl transition-colors ${
                          isSelf
                            ? 'bg-blue-50 border border-blue-200/60 text-blue-900'
                            : 'hover:bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        <button
                          onClick={() => handleSwitchUser(u)}
                          className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                        >
                          <div
                            className="w-7 h-7 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0"
                            style={{ backgroundColor: u.color }}
                          >
                            {u.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-semibold truncate">{u.name}</p>
                            <p className="text-[10px] text-zinc-400 font-mono">{u.phone}</p>
                          </div>
                        </button>

                        <button
                          onClick={() => handleOpenTabAsUser(u)}
                          className="px-2 py-1 text-[10px] font-semibold text-blue-600 hover:bg-blue-100/60 rounded-lg shrink-0 ml-1 transition-colors"
                          title="Mở tab mới với người dùng này"
                        >
                          Mở Tab ↗
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="w-8 h-px bg-white/20" />

          {/* Core Zalo Navigation Tabs */}
          <div className="flex flex-col items-center gap-3 w-full px-2">
            {/* 1. Tin nhắn (Chat) */}
            <button
              onClick={() => setNavTab('chat')}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                navTab === 'chat'
                  ? 'bg-white/25 text-white shadow-inner ring-1 ring-white/30'
                  : 'text-white/75 hover:bg-white/15 hover:text-white'
              }`}
              title="Tin nhắn (Chats)"
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            {/* 2. Danh bạ (Contacts) */}
            <button
              onClick={() => setNavTab('contacts')}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                navTab === 'contacts'
                  ? 'bg-white/25 text-white shadow-inner ring-1 ring-white/30'
                  : 'text-white/75 hover:bg-white/15 hover:text-white'
              }`}
              title="Danh bạ đồng nghiệp & nhóm"
            >
              <BookUser className="w-5 h-5" />
            </button>

            {/* 3. Cloud của tôi (My Cloud - staple Zalo feature) */}
            <button
              onClick={handleOpenMyCloud}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                activeRoomId === getMyCloudRoomId(currentUser.id)
                  ? 'bg-white/25 text-white shadow-inner ring-1 ring-white/30'
                  : 'text-white/75 hover:bg-white/15 hover:text-white'
              }`}
              title="Cloud của tôi (Lưu trữ cá nhân)"
            >
              <Cloud className="w-5 h-5" />
            </button>

            {/* 4. Tin đánh dấu / Quan trọng */}
            <button
              onClick={() => setNavTab('starred')}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                navTab === 'starred'
                  ? 'bg-white/25 text-white shadow-inner ring-1 ring-white/30'
                  : 'text-white/75 hover:bg-white/15 hover:text-white'
              }`}
              title="Tin nhắn quan trọng & đã ghim"
            >
              <Star className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bottom Actions: Cài đặt & Nút Thoát khỏi Chat */}
        <div className="flex flex-col items-center gap-2.5 w-full px-2">
          {/* Cài đặt Zalo */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-white/75 hover:bg-white/15 hover:text-white transition-all"
            title="Cài đặt trò chuyện"
          >
            <Settings className="w-5 h-5" />
          </button>

          <div className="w-8 h-px bg-white/20" />

          {/* Nút Thoát ra Không gian làm việc (Exit Button) */}
          <button
            onClick={handleExitChat}
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-rose-200 hover:bg-rose-500/20 hover:text-white transition-all group"
            title="Thoát khỏi Chat (Về Không gian làm việc)"
          >
            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* 2. SECOND COLUMN: CONVERSATION LIST OR CONTACTS ROSTER (340px) */}
      {/* ============================================================== */}
      <section
        className={`w-full md:w-[340px] bg-white border-r border-zinc-200 flex flex-col shrink-0 ${
          mobileTab === 'chat' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Mobile Top Navigation Header */}
        <div className="md:hidden h-14 px-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50 shrink-0">
          <div className="flex items-center gap-2 font-bold text-xs text-zinc-900">
            <div className="w-7 h-7 rounded-xl bg-[#0068ff] text-white flex items-center justify-center font-bold text-[11px]">
              Zalo
            </div>
            <span>Tin nhắn</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setNavTab(navTab === 'chat' ? 'contacts' : 'chat')}
              className="p-1.5 rounded-xl text-zinc-600 hover:bg-zinc-200"
              title="Đổi tab"
            >
              {navTab === 'chat' ? (
                <BookUser className="w-4 h-4 text-blue-600" />
              ) : (
                <MessageSquare className="w-4 h-4 text-blue-600" />
              )}
            </button>
            <button
              onClick={handleExitChat}
              className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50"
              title="Thoát"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Panel Header depending on navTab */}
        {navTab === 'chat' ? (
          <>
            {/* Search & New Group Header */}
            <div className="h-16 px-4 border-b border-zinc-100 flex items-center justify-between gap-2 bg-white">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Tìm kiếm cuộc trò chuyện..."
                  className="w-full bg-[#f1f3f6] border-none rounded-xl pl-9 pr-7 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-sans"
                />
                {searchFilter && (
                  <button
                    onClick={() => setSearchFilter('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setIsGroupModalOpen(true)}
                className="w-9 h-9 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0068ff] flex items-center justify-center transition-colors shrink-0"
                title="Tạo nhóm trò chuyện mới"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Tabs: Tất cả | Chưa đọc */}
            <div className="flex items-center gap-6 px-4 pt-2.5 pb-2 text-xs font-medium border-b border-zinc-100 bg-white">
              <button
                onClick={() => setConversationTab('all')}
                className={`pb-1 transition-colors relative font-semibold ${
                  conversationTab === 'all'
                    ? 'text-[#0068ff] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#0068ff]'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setConversationTab('unread')}
                className={`pb-1 transition-colors relative font-semibold ${
                  conversationTab === 'unread'
                    ? 'text-[#0068ff] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#0068ff]'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Chưa đọc
              </button>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-white">
              {conversations
                .filter((c) => {
                  if (conversationTab === 'unread' && (!c.unreadCount || c.unreadCount === 0)) {
                    return false;
                  }
                  return c.name.toLowerCase().includes(searchFilter.toLowerCase());
                })
                .map((c) => {
                  const isActive = c.id === activeRoomId;
                  const isCloud = c.id.startsWith('cloud_');
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleSelectConversation(c.id)}
                      className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
                        isActive
                          ? 'bg-[#e5efff] text-slate-900 border border-blue-200/60 shadow-xs'
                          : 'hover:bg-[#f4f5f7] text-zinc-700'
                      }`}
                    >
                      <div className="relative shrink-0">
                        {isCloud ? (
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-400 to-[#0068ff] text-white flex items-center justify-center shadow-xs">
                            <Cloud className="w-6 h-6" />
                          </div>
                        ) : c.type === 'group' ? (
                          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-[#0068ff] flex items-center justify-center font-bold text-sm border border-blue-200">
                            <Users className="w-6 h-6" />
                          </div>
                        ) : (
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-base shadow-xs"
                            style={{ backgroundColor: c.members[0]?.color || '#0068ff' }}
                          >
                            {c.name.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        {!isCloud && c.type === 'direct' && c.members[0]?.isOnline && (
                          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4
                            className={`text-xs truncate ${
                              isActive ? 'font-bold text-slate-900' : 'font-semibold text-zinc-800'
                            }`}
                          >
                            {c.name}
                          </h4>
                          {c.lastMessage && (
                            <span className="text-[10px] text-zinc-400 font-mono shrink-0 ml-1">
                              {formatMsgTime(c.lastMessage.timestamp)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <p className="text-[11px] text-zinc-500 truncate pr-2">
                            {c.lastMessage
                              ? `${
                                  c.lastMessage.senderName === currentUser.name ? 'Bạn: ' : ''
                                }${c.lastMessage.text}`
                              : 'Bắt đầu cuộc trò chuyện'}
                          </p>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {c.isLocked && (
                              <span title="Đã khóa bằng mã PIN">
                                <Lock className="w-3.5 h-3.5 text-zinc-400" />
                              </span>
                            )}
                            {c.disappearingDuration && c.disappearingDuration > 0 && (
                              <span title="Tin nhắn tự hủy đang bật">
                                <Hourglass className="w-3.5 h-3.5 text-amber-500" />
                              </span>
                            )}
                            {c.isPinned && (
                              <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            )}
                            {c.unreadCount ? (
                              <span className="min-w-4 h-4 px-1 rounded-full bg-[#0068ff] text-white text-[10px] font-bold flex items-center justify-center">
                                {c.unreadCount}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </>
        ) : navTab === 'contacts' ? (
          /* Contacts Roster View (Zalo Danh bạ) */
          <>
            <div className="h-16 px-4 border-b border-zinc-100 flex items-center justify-between gap-2 bg-white">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Tìm kiếm danh bạ..."
                  className="w-full bg-[#f1f3f6] border-none rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-sans"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4 bg-white">
              {/* Groups section */}
              <div>
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-2 mb-1.5">
                  Nhóm làm việc ({conversations.filter((c) => c.type === 'group').length})
                </p>
                <div className="space-y-1">
                  {conversations
                    .filter(
                      (c) =>
                        c.type === 'group' &&
                        c.name.toLowerCase().includes(contactSearch.toLowerCase())
                    )
                    .map((g) => (
                      <div
                        key={g.id}
                        onClick={() => {
                          setNavTab('chat');
                          handleSelectConversation(g.id);
                        }}
                        className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-zinc-100 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#0068ff] flex items-center justify-center font-bold text-sm">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-zinc-900">{g.name}</p>
                            <p className="text-[10px] text-zinc-400">{g.members.length} thành viên</p>
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold text-blue-600">Nhắn tin →</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Direct Colleagues Section */}
              <div>
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-2 mb-1.5">
                  Đồng nghiệp ({allUsers.filter((u) => u.id !== currentUser.id).length})
                </p>
                <div className="space-y-1">
                  {allUsers
                    .filter(
                      (u) =>
                        u.id !== currentUser.id &&
                        u.name.toLowerCase().includes(contactSearch.toLowerCase())
                    )
                    .map((user) => {
                      const directConv = conversations.find(
                        (c) => c.type === 'direct' && c.members.some((m) => m.id === user.id)
                      );
                      return (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-zinc-100 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative">
                              <div
                                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm"
                                style={{ backgroundColor: user.color }}
                              >
                                {user.name.slice(0, 1).toUpperCase()}
                              </div>
                              {user.isOnline && (
                                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                              )}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-semibold text-zinc-900 truncate">
                                {user.name}
                              </p>
                              <p className="text-[10px] text-zinc-400 font-mono">{user.phone}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                if (directConv) {
                                  setNavTab('chat');
                                  handleSelectConversation(directConv.id);
                                }
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 text-[#0068ff] rounded-xl transition-colors"
                            >
                              Nhắn tin
                            </button>
                            <button
                              onClick={() => {
                                if (directConv) {
                                  handleSelectConversation(directConv.id);
                                  handleInitiateCall('audio');
                                }
                              }}
                              className="p-1.5 text-zinc-500 hover:text-emerald-600 hover:bg-zinc-200/60 rounded-xl transition-colors"
                              title="Gọi thoại"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Starred Messages View */
          <>
            <div className="h-16 px-4 border-b border-zinc-100 flex items-center justify-between bg-white">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Tin đánh dấu ({allStarredMessages.length})</span>
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-white">
              {allStarredMessages.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 text-xs">
                  <Star className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                  <p>Chưa có tin nhắn nào được đánh dấu sao hoặc ghim.</p>
                </div>
              ) : (
                allStarredMessages.map(({ msg, roomName }) => (
                  <div
                    key={msg.id}
                    onClick={() => {
                      setNavTab('chat');
                      handleSelectConversation(msg.roomId);
                    }}
                    className="p-3 rounded-2xl bg-zinc-50 hover:bg-blue-50 border border-zinc-200/80 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-[#0068ff]">{roomName}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {formatMsgTime(msg.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-800 line-clamp-2">{msg.content}</p>
                    <p className="text-[10px] text-zinc-400 mt-1">Từ: {msg.senderName}</p>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </section>

      {/* ============================================================== */}
      {/* 3. MAIN CHAT STREAM (Neutral Soft Canvas #f4f5f7)              */}
      {/* ============================================================== */}
      <main
        className={`flex-1 flex flex-col bg-[#f4f5f7] min-w-0 relative ${
          mobileTab === 'conversations' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Top Chat Header */}
        <header className="h-16 px-4 md:px-6 bg-white border-b border-zinc-200 flex items-center justify-between shrink-0 z-10 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            {/* Back Button to conversation list on mobile */}
            <button
              type="button"
              onClick={() => setMobileTab('conversations')}
              className="md:hidden p-2 -ml-2 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors shrink-0"
              title="Quay lại danh sách hội thoại"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="relative shrink-0">
              {activeConversation.id.startsWith('cloud_') ? (
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-400 to-[#0068ff] text-white flex items-center justify-center shadow-xs">
                  <Cloud className="w-5 h-5" />
                </div>
              ) : activeConversation.type === 'group' ? (
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#0068ff] flex items-center justify-center font-bold text-sm border border-blue-200">
                  <Users className="w-5 h-5" />
                </div>
              ) : (
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-xs"
                  style={{
                    backgroundColor: activeConversation.members[0]?.color || '#0068ff',
                  }}
                >
                  {activeConversation.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              {!activeConversation.id.startsWith('cloud_') &&
                activeConversation.type === 'direct' &&
                activeConversation.members[0]?.isOnline && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold text-zinc-900 truncate max-w-[140px] sm:max-w-xs md:max-w-md">
                  {activeConversation.name}
                </h2>
                {activeConversation.isLocked && (
                  <span title="Đã khóa bằng mã PIN" className="shrink-0">
                    <Lock className="w-3.5 h-3.5 text-zinc-500" />
                  </span>
                )}
                {activeConversation.disappearingDuration && activeConversation.disappearingDuration > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
                    <Hourglass className="w-2.5 h-2.5 animate-spin" />
                    <span>
                      Tự hủy{' '}
                      {activeConversation.disappearingDuration < 60
                        ? `${activeConversation.disappearingDuration}s`
                        : activeConversation.disappearingDuration < 3600
                        ? `${activeConversation.disappearingDuration / 60}m`
                        : '24h'}
                    </span>
                  </span>
                )}
                {activeConversation.type === 'group' && (
                  <span className="hidden sm:inline-flex text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-md shrink-0">
                    {activeConversation.members.length} người
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-zinc-500 flex items-center gap-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">
                  {activeConversation.id.startsWith('cloud_')
                    ? 'Không gian lưu trữ cá nhân của bạn'
                    : activeConversation.type === 'direct'
                    ? activeConversation.members[0]?.isOnline
                      ? 'Đang hoạt động'
                      : 'Hoạt động gần đây'
                    : `${activeConversation.members.length} thành viên • Trực tuyến`}
                </span>
              </p>
            </div>
          </div>

          {/* Action Header Icons */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Cluster Telemetry Dashboard */}
            <button
              onClick={() => setIsTelemetryModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold transition-colors"
              title="Giám sát Cụm máy chủ quy mô lớn (NGINX, Redis, WebSockets, PostgreSql, MinIO)"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span className="hidden md:inline">Cụm: &lt;3ms</span>
            </button>

            {/* Search in chat toggle */}
            <button
              onClick={() => setInChatSearchOpen(!inChatSearchOpen)}
              className={`p-2 rounded-xl transition-colors ${
                inChatSearchOpen
                  ? 'text-[#0068ff] bg-blue-50'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
              title="Tìm kiếm tin nhắn trong hội thoại"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* AI Copilot */}
            <button
              onClick={() => setCopilotOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-xs font-semibold transition-colors"
              title="Trợ lý AI"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden sm:inline">AI Copilot</span>
            </button>

            {/* Audio call (only for non-cloud rooms) */}
            {!activeConversation.id.startsWith('cloud_') && (
              <>
                <button
                  onClick={() => handleInitiateCall('audio')}
                  className="p-2 rounded-xl text-zinc-600 hover:text-emerald-600 hover:bg-zinc-100 transition-colors"
                  title="Cuộc gọi thoại thời gian thực"
                >
                  <Phone className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleInitiateCall('video')}
                  className="p-2 rounded-xl text-zinc-600 hover:text-blue-600 hover:bg-zinc-100 transition-colors"
                  title="Cuộc gọi video thời gian thực"
                >
                  <Video className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Info Drawer Toggle */}
            <button
              onClick={() => setIsInfoDrawerOpen(!isInfoDrawerOpen)}
              className={`p-2 rounded-xl transition-colors ${
                isInfoDrawerOpen
                  ? 'text-[#0068ff] bg-blue-50'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
              title="Thông tin hội thoại"
            >
              {isInfoDrawerOpen ? (
                <PanelRightClose className="w-4 h-4" />
              ) : (
                <PanelRightOpen className="w-4 h-4" />
              )}
            </button>
          </div>
        </header>

        {/* In-Chat Search Bar */}
        {inChatSearchOpen && (
          <div className="px-6 py-2.5 bg-white border-b border-zinc-200 flex items-center justify-between gap-3 text-xs animate-in slide-in-from-top-1 z-10 shadow-xs">
            <div className="flex items-center gap-2 flex-1">
              <Search className="w-4 h-4 text-zinc-400" />
              <input
                type="text"
                autoFocus
                value={inChatSearchQuery}
                onChange={(e) => setInChatSearchQuery(e.target.value)}
                placeholder="Tìm kiếm nội dung tin nhắn..."
                className="w-full text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none bg-transparent"
              />
            </div>
            <div className="flex items-center gap-2 text-zinc-400 shrink-0">
              {inChatSearchQuery && (
                <span className="text-[11px] font-medium text-zinc-500">
                  {inChatSearchResults.length} kết quả
                </span>
              )}
              <button
                onClick={() => {
                  setInChatSearchOpen(false);
                  setInChatSearchQuery('');
                }}
                className="p-1 hover:text-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Pinned Message Floating Banner */}
        {pinnedMessage && (
          <div className="px-6 py-2 bg-amber-50/90 border-b border-amber-200/80 backdrop-blur-md flex items-center justify-between text-xs text-amber-900 z-10 animate-in slide-in-from-top-1">
            <div className="flex items-center gap-2 truncate">
              <Pin className="w-3.5 h-3.5 text-amber-600 fill-amber-600 shrink-0" />
              <span className="font-bold text-amber-800">Tin ghim:</span>
              <span className="truncate">{pinnedMessage.content}</span>
            </div>
            <button
              onClick={() => handleTogglePinMessage(pinnedMessage.id)}
              className="text-[11px] text-amber-700 hover:underline font-semibold shrink-0 ml-2"
            >
              Gỡ ghim
            </button>
          </div>
        )}

        {/* Message Stream Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-center my-3">
            <span className="px-3 py-1 bg-zinc-200/80 text-zinc-600 border border-zinc-200 rounded-full text-[10px] font-semibold tracking-wider uppercase">
              Hôm nay
            </span>
          </div>

          {messages.map((msg, index) => {
            const isSelf = msg.senderId === currentUser.id;
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const isSameSender =
              prevMsg &&
              prevMsg.senderId === msg.senderId &&
              Math.abs(msg.timestamp - prevMsg.timestamp) < 1000 * 60 * 2;

            const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;
            const isCallNotice =
              msg.content.startsWith('📞') || msg.content.startsWith('❌ Cuộc gọi');

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 group relative ${isSelf ? 'justify-end' : 'justify-start'} ${
                  isSameSender ? 'mt-1' : 'mt-3.5'
                }`}
              >
                {!isSelf && (
                  <div className="w-8 shrink-0 flex flex-col justify-end">
                    {!isSameSender ? (
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-xs"
                        style={{ backgroundColor: msg.senderColor || '#0068ff' }}
                        title={msg.senderName}
                      >
                        {msg.senderName.slice(0, 1).toUpperCase()}
                      </div>
                    ) : (
                      <div className="w-8" />
                    )}
                  </div>
                )}

                <div
                  className={`max-w-[75%] sm:max-w-md flex flex-col ${
                    isSelf ? 'items-end' : 'items-start'
                  }`}
                >
                  {!isSelf && !isSameSender && activeConversation.type === 'group' && (
                    <span
                      className="text-[11px] font-bold mb-1 ml-1"
                      style={{ color: msg.senderColor || '#0068ff' }}
                    >
                      {msg.senderName}
                    </span>
                  )}

                  {msg.replyTo && (
                    <div
                      className={`text-[11px] px-3 py-1.5 mb-1 rounded-xl border-l-2 max-w-full truncate ${
                        isSelf
                          ? 'border-blue-500 bg-blue-100/60 text-slate-800'
                          : 'border-zinc-400 bg-white text-zinc-700'
                      }`}
                    >
                      <span className="font-bold mr-1">@{msg.replyTo.senderName}:</span>
                      <span>{msg.replyTo.text}</span>
                    </div>
                  )}

                  {/* Main Bubble */}
                  <div
                    className={`relative p-3.5 rounded-2xl transition-all shadow-[0_1px_2px_rgba(0,0,0,0.05)] ${
                      msg.isRecalled
                        ? 'bg-zinc-100 text-zinc-400 italic border border-dashed border-zinc-300'
                        : isCallNotice
                        ? 'bg-zinc-100 border border-zinc-200 text-zinc-800'
                        : msg.type === 'doc' || msg.type === 'task'
                        ? 'bg-white border border-zinc-200 text-zinc-900 shadow-sm'
                        : isSelf
                        ? 'bg-[#e5efff] text-slate-900 border border-blue-200/50 rounded-tr-xs'
                        : 'bg-white text-slate-900 border border-zinc-200/80 rounded-tl-xs'
                    }`}
                  >
                    {msg.isRecalled ? (
                      <p className="text-xs text-zinc-400 italic flex items-center gap-1.5">
                        <Undo2 className="w-3.5 h-3.5 text-zinc-400" />
                        Tin nhắn đã được thu hồi
                      </p>
                    ) : (
                      <>
                        {isCallNotice ? (
                          <div className="flex items-center gap-2.5 py-0.5">
                            <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-700 shrink-0">
                              {msg.content.includes('❌') ? (
                                <PhoneOff className="w-4 h-4 text-rose-500" />
                              ) : (
                                <PhoneIncoming className="w-4 h-4 text-emerald-600" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-zinc-800">{msg.content}</p>
                              <p className="text-[10px] text-zinc-400 font-mono">
                                {formatMsgTime(msg.timestamp)}
                              </p>
                            </div>
                          </div>
                        ) : msg.type === 'doc' ? (
                          /* Interactive Document Card */
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0068ff] flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-zinc-900 truncate">
                                  {msg.mediaMeta?.title || msg.content}
                                </p>
                                <p className="text-[10px] text-zinc-400 font-mono">
                                  Tài liệu Workspace • v{msg.mediaMeta?.version || 1}
                                </p>
                              </div>
                            </div>
                            <Link
                              href={`/doc/${msg.mediaMeta?.docId || 'default'}`}
                              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#0068ff] hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                            >
                              <span>Mở tài liệu</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        ) : msg.type === 'task' ? (
                          /* Interactive Kanban Task Card */
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs">
                              <CheckSquare className="w-4 h-4" />
                              <span>Thẻ công việc Kanban</span>
                            </div>
                            <p className="text-xs font-semibold text-zinc-900">{msg.content}</p>
                            <p className="text-[10px] text-zinc-500">
                              Người phụ trách:{' '}
                              <span className="font-semibold text-zinc-800">
                                {msg.mediaMeta?.assigneeName || 'Thành viên'}
                              </span>
                            </p>
                            <Link
                              href="/tasks"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline pt-1"
                            >
                              <span>Xem trên Bảng Kanban ↗</span>
                            </Link>
                          </div>
                        ) : msg.type === 'location' ? (
                          /* Interactive Location Card */
                          <div className="space-y-2">
                            <div className="flex items-start gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                                <MapPin className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-zinc-900">
                                  {msg.mediaMeta?.locationName || msg.content}
                                </p>
                                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                  Tọa độ: {msg.mediaMeta?.latitude?.toFixed(4)},{' '}
                                  {msg.mediaMeta?.longitude?.toFixed(4)}
                                </p>
                              </div>
                            </div>
                            <a
                              href={`https://www.google.com/maps?q=${
                                msg.mediaMeta?.latitude || 10.7716
                              },${msg.mediaMeta?.longitude || 106.7044}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline pt-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Mở trên Google Maps</span>
                            </a>
                          </div>
                        ) : msg.type === 'contact' ? (
                          /* Interactive Contact Card */
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0"
                                style={{
                                  backgroundColor: msg.mediaMeta?.contactColor || '#0068ff',
                                }}
                              >
                                {(msg.mediaMeta?.contactName || msg.content)
                                  .slice(0, 1)
                                  .toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-zinc-900 truncate">
                                  {msg.mediaMeta?.contactName || msg.content}
                                </p>
                                <p className="text-[10px] text-zinc-500 font-mono">
                                  {msg.mediaMeta?.contactPhone || 'Danh thiếp liên hệ'}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const targetUser = allUsers.find(
                                  (u) => u.name === msg.mediaMeta?.contactName
                                );
                                if (targetUser) {
                                  const directConv = conversations.find(
                                    (c) =>
                                      c.type === 'direct' &&
                                      c.members.some((m) => m.id === targetUser.id)
                                  );
                                  if (directConv) {
                                    handleSelectConversation(directConv.id);
                                  }
                                }
                              }}
                              className="w-full py-1.5 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[11px] font-semibold rounded-xl text-center transition-colors"
                            >
                              Nhắn tin cho người này
                            </button>
                          </div>
                        ) : (
                          <>
                            {msg.type === 'text' && (
                              <p className="text-xs whitespace-pre-wrap leading-relaxed select-text font-normal">
                                {msg.content}
                              </p>
                            )}

                            {msg.type === 'image' && msg.mediaUrl && (
                              <div className="space-y-1">
                                <img
                                  src={msg.mediaUrl}
                                  alt="Attached image"
                                  onClick={() =>
                                    setViewingImage({ url: msg.mediaUrl!, caption: msg.content })
                                  }
                                  className="max-h-64 rounded-xl cursor-pointer hover:opacity-95 object-cover"
                                />
                                {msg.content && msg.content !== msg.mediaMeta?.fileName && (
                                  <p className="text-xs pt-1">{msg.content}</p>
                                )}
                              </div>
                            )}

                            {msg.type === 'file' && (
                              <div
                                className={`flex items-center gap-3 p-2.5 rounded-xl border max-w-xs ${
                                  isSelf
                                    ? 'bg-blue-100/50 border-blue-200 text-slate-900'
                                    : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                                }`}
                              >
                                <div
                                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                    isSelf ? 'bg-[#0068ff] text-white' : 'bg-blue-50 text-[#0068ff]'
                                  }`}
                                >
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="text-xs font-semibold truncate">
                                    {msg.mediaMeta?.fileName || msg.content}
                                  </p>
                                  <p className="text-[10px] font-mono text-zinc-500">
                                    {formatFileSize(msg.mediaMeta?.fileSize)}
                                  </p>
                                </div>
                                <button
                                  onClick={() => alert(`Tải xuống: ${msg.mediaMeta?.fileName}`)}
                                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200 transition-colors"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
                            )}

                            {msg.type === 'voice' && (
                              <AudioWaveformPlayer
                                duration={msg.mediaMeta?.duration || 12}
                                isSelf={isSelf}
                              />
                            )}

                            {msg.type === 'sticker' && (
                              <div className="text-5xl py-1 filter drop-shadow-sm animate-bounce duration-300">
                                {msg.content}
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}

                    {!isCallNotice && (
                      <div
                        className={`flex items-center gap-1.5 justify-end mt-1 text-[10px] font-mono ${
                          isSelf ? 'text-slate-500' : 'text-zinc-400'
                        }`}
                      >
                        {msg.expiresAt && (
                          <span
                            className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-600 bg-amber-50 px-1 py-0.5 rounded border border-amber-200"
                            title="Tin nhắn tự hủy"
                          >
                            <Hourglass className="w-2.5 h-2.5 animate-spin" />
                            <span>{Math.max(0, Math.ceil((msg.expiresAt - Date.now()) / 1000))}s</span>
                          </span>
                        )}
                        <span>{formatMsgTime(msg.timestamp)}</span>
                        {isSelf && !msg.isRecalled && (
                          <CheckCheck className="w-3.5 h-3.5 text-[#0068ff] inline" />
                        )}
                      </div>
                    )}

                    {/* Reactions pill attached to bubble */}
                    {hasReactions && !isCallNotice && (
                      <div className="absolute -bottom-3 right-2 bg-white border border-zinc-200 px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1 text-xs z-10">
                        {Object.entries(msg.reactions).map(([emoji, users]) => (
                          <button
                            key={emoji}
                            onClick={() => handleToggleReaction(msg.id, emoji)}
                            className="flex items-center gap-0.5 hover:scale-110 transition-transform"
                            title={`Thả bởi: ${users.length} người`}
                          >
                            <span>{emoji}</span>
                            <span className="text-[10px] font-bold text-zinc-600">
                              {users.length}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Message Action Bar on Hover */}
                  {!msg.isRecalled && !isCallNotice && (
                    <div
                      className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1 px-2 py-0.5 bg-white backdrop-blur-md rounded-2xl shadow-md border border-zinc-200 text-zinc-500`}
                    >
                      {REACTION_EMOJIS.slice(0, 3).map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleToggleReaction(msg.id, emoji)}
                          className="hover:scale-125 transition-transform p-1 text-xs"
                        >
                          {emoji}
                        </button>
                      ))}

                      <div className="w-px h-3 bg-zinc-200 mx-0.5" />

                      <button
                        onClick={() => setReplyingTo(msg)}
                        className="p-1 hover:text-zinc-900 rounded hover:bg-zinc-100"
                        title="Trả lời trích dẫn"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setForwardModalMessage(msg)}
                        className="p-1 hover:text-blue-600 rounded hover:bg-zinc-100"
                        title="Chuyển tiếp tin nhắn này"
                      >
                        <Forward className="w-3.5 h-3.5" />
                      </button>

                      {/* Convert to Kanban Task */}
                      <button
                        onClick={() => setTaskModalMessage(msg)}
                        className="p-1 hover:text-blue-600 rounded hover:bg-zinc-100"
                        title="Tạo công việc Kanban từ tin nhắn này"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleTogglePinMessage(msg.id)}
                        className="p-1 hover:text-amber-500 rounded hover:bg-zinc-100"
                        title={msg.isPinned ? 'Gỡ ghim' : 'Ghim tin nhắn'}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>

                      {isSelf && (
                        <button
                          onClick={() => handleRecallMessage(msg.id)}
                          className="p-1 hover:text-rose-600 rounded hover:bg-zinc-100"
                          title="Thu hồi tin nhắn"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="p-1 hover:text-rose-600 rounded hover:bg-zinc-100"
                        title="Xóa tin nhắn"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-blue-600 italic animate-pulse">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
              </span>
              <span>{typingUsers.join(', ')} đang soạn tin nhắn...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {replyingTo && (
          <div className="h-10 px-6 bg-zinc-100 border-t border-zinc-200 flex items-center justify-between text-xs z-10">
            <div className="flex items-center gap-2 truncate text-zinc-700">
              <Reply className="w-3.5 h-3.5 text-blue-600" />
              <span>Đang trả lời </span>
              <span className="font-bold text-zinc-900">@{replyingTo.senderName}:</span>
              <span className="truncate italic text-zinc-500">{replyingTo.content}</span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 text-zinc-400 hover:text-zinc-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input Bar */}
        <footer className="bg-white border-t border-zinc-200/80 p-3 sm:p-4 shrink-0 relative">
          <input
            type="file"
            ref={imageInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />

          {stickerPickerOpen && (
            <StickerPicker
              onSelectSticker={(sticker) => handleSendMessage('sticker', sticker)}
              onSelectEmoji={(emoji) => setInputText((prev) => prev + emoji)}
              onClose={() => setStickerPickerOpen(false)}
            />
          )}

          {/* Quick Toolbar */}
          <div className="flex items-center gap-1 mb-2 px-1 text-zinc-500 overflow-x-auto max-w-full pb-1">
            <button
              onClick={() => setStickerPickerOpen(!stickerPickerOpen)}
              className="p-1.5 rounded-xl hover:bg-zinc-100 hover:text-[#0068ff] transition-colors shrink-0"
              title="Nhãn dán Sticker & Emojis"
            >
              <Smile className="w-5 h-5" />
            </button>

            <button
              onClick={() => imageInputRef.current?.click()}
              className="p-1.5 rounded-xl hover:bg-zinc-100 hover:text-[#0068ff] transition-colors shrink-0"
              title="Gửi hình ảnh"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-xl hover:bg-zinc-100 hover:text-[#0068ff] transition-colors shrink-0"
              title="Đính kèm tập tin tài liệu"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Share Document Card */}
            <button
              onClick={() => setShareDocModalOpen(true)}
              className="p-1.5 rounded-xl hover:bg-zinc-100 hover:text-[#0068ff] transition-colors shrink-0"
              title="Chia sẻ tài liệu Workspace"
            >
              <FileText className="w-5 h-5" />
            </button>

            {/* Share Location */}
            <button
              onClick={() => setShareLocationOpen(true)}
              className="p-1.5 rounded-xl hover:bg-zinc-100 hover:text-rose-600 transition-colors shrink-0"
              title="Gửi vị trí thời gian thực"
            >
              <MapPin className="w-5 h-5" />
            </button>

            {/* Share Contact */}
            <button
              onClick={() => setShareContactOpen(true)}
              className="p-1.5 rounded-xl hover:bg-zinc-100 hover:text-emerald-600 transition-colors shrink-0"
              title="Gửi danh thiếp liên hệ"
            >
              <UserCheck className="w-5 h-5" />
            </button>

            {/* Audio Recording */}
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="p-1.5 rounded-xl hover:bg-zinc-100 hover:text-[#0068ff] transition-colors shrink-0"
                title="Ghi âm tin nhắn thoại"
              >
                <Mic className="w-5 h-5" />
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-1 rounded-xl animate-pulse text-xs font-semibold shrink-0">
                <span className="w-2 h-2 rounded-full bg-red-600" />
                <span>Đang ghi âm: {recordSeconds}s</span>
                <button
                  onClick={stopAndSendRecording}
                  className="px-2 py-0.5 bg-red-600 text-white rounded text-[11px] font-bold ml-1 hover:bg-red-700"
                >
                  Gửi
                </button>
                <button
                  onClick={cancelRecording}
                  className="text-zinc-500 hover:text-zinc-800 ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* @mention autocomplete popover */}
          {mentionQuery !== null && (
            <div className="absolute bottom-full left-4 mb-2 bg-white rounded-2xl shadow-xl border border-zinc-200 p-1.5 z-30 w-64 max-h-48 overflow-y-auto animate-in fade-in duration-100">
              <div className="px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Nhắc tên thành viên (@mention)
              </div>
              {activeConversation.members
                .filter((m) => m.name.toLowerCase().includes(mentionQuery))
                .map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectMention(m)}
                    className="w-full flex items-center gap-2 p-1.5 rounded-xl hover:bg-zinc-100 text-left transition-colors"
                  >
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-white font-bold text-[10px]"
                      style={{ backgroundColor: m.color }}
                    >
                      {m.name.slice(0, 1).toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-zinc-800 truncate">{m.name}</span>
                  </button>
                ))}
            </div>
          )}

          {/* Text input */}
          <div className="flex items-end gap-2">
            <textarea
              rows={2}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Nhập tin nhắn tới ${activeConversation.name}... (Enter để gửi, Shift+Enter xuống dòng)`}
              className="flex-1 resize-none bg-[#f4f5f7] border border-zinc-200 rounded-2xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#0068ff] focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-zinc-900 placeholder:text-zinc-400 font-sans transition-all"
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim()}
              className="w-11 h-11 rounded-2xl bg-[#0068ff] hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20 transition-all transform active:scale-95"
              title="Gửi tin nhắn"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </footer>
      </main>

      {/* ============================================================== */}
      {/* 4. CONVERSATION DETAILS DRAWER (Slide-over / 320px)            */}
      {/* ============================================================== */}
      {isInfoDrawerOpen && (
        <>
          {/* Backdrop on screens < xl */}
          <div
            onClick={() => setIsInfoDrawerOpen(false)}
            className="xl:hidden fixed inset-0 bg-black/40 backdrop-blur-xs z-30 animate-in fade-in duration-150"
          />

          <aside className="fixed xl:relative inset-y-0 right-0 z-40 w-80 max-w-[85vw] bg-white border-l border-zinc-200 flex flex-col shrink-0 shadow-2xl xl:shadow-none animate-in slide-in-from-right-2 duration-150">
            <div className="h-16 px-5 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Thông tin hội thoại
              </h3>
              <button
                onClick={() => setIsInfoDrawerOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div className="flex flex-col items-center text-center">
                <div
                  className="w-16 h-16 rounded-3xl flex items-center justify-center text-white font-bold text-xl shadow-md mb-3 border border-zinc-200"
                  style={{
                    backgroundColor:
                      activeConversation.type === 'group'
                        ? '#0068ff'
                        : activeConversation.members[0]?.color || '#0068ff',
                  }}
                >
                  {activeConversation.type === 'group' ? (
                    <Users className="w-8 h-8" />
                  ) : (
                    activeConversation.name.slice(0, 1).toUpperCase()
                  )}
                </div>
                <h4 className="text-sm font-bold text-zinc-900">{activeConversation.name}</h4>
                <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                  {activeConversation.type === 'group'
                    ? `${activeConversation.members.length} thành viên`
                    : activeConversation.members[0]?.phone || 'Cuộc trò chuyện trực tiếp'}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-zinc-700">
                <button
                  onClick={() =>
                    setConversations((prev) =>
                      prev.map((c) =>
                        c.id === activeRoomId ? { ...c, isMuted: !c.isMuted } : c
                      )
                    )
                  }
                  className="flex flex-col items-center p-2 rounded-2xl hover:bg-zinc-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center mb-1 text-zinc-600">
                    {activeConversation.isMuted ? (
                      <BellOff className="w-4 h-4 text-rose-500" />
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-[10px]">
                    {activeConversation.isMuted ? 'Bật chuông' : 'Tắt chuông'}
                  </span>
                </button>

                <button
                  onClick={() =>
                    setConversations((prev) =>
                      prev.map((c) =>
                        c.id === activeRoomId ? { ...c, isPinned: !c.isPinned } : c
                      )
                    )
                  }
                  className="flex flex-col items-center p-2 rounded-2xl hover:bg-zinc-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center mb-1 text-zinc-600">
                    <Pin className="w-4 h-4 text-amber-500" />
                  </div>
                  <span className="text-[10px]">
                    {activeConversation.isPinned ? 'Bỏ ghim' : 'Ghim nhóm'}
                  </span>
                </button>

                <button
                  onClick={() => setIsGroupModalOpen(true)}
                  className="flex flex-col items-center p-2 rounded-2xl hover:bg-zinc-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center mb-1 text-zinc-600">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <span className="text-[10px]">Thêm bạn</span>
                </button>
              </div>

              {activeConversation.type === 'group' && (
                <div className="border-t border-zinc-100 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-zinc-900">
                      Thành viên ({activeConversation.members.length})
                    </span>
                    <button
                      onClick={() => setIsGroupModalOpen(true)}
                      className="text-[11px] text-[#0068ff] font-semibold hover:underline"
                    >
                      + Thêm
                    </button>
                  </div>

                  <div className="space-y-2">
                    {activeConversation.members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-xs py-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-xl flex items-center justify-center text-white font-bold text-[10px]"
                            style={{ backgroundColor: m.color }}
                          >
                            {m.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-zinc-900 truncate">
                              {m.name} {m.id === currentUser.id ? '(Bạn)' : ''}
                            </p>
                            <p className="text-[10px] text-zinc-400">
                              {m.role === 'leader'
                                ? 'Trưởng nhóm'
                                : m.role === 'deputy'
                                ? 'Phó nhóm'
                                : 'Thành viên'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Media & Files Vault */}
              <div className="border-t border-zinc-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-zinc-900">Kho lưu trữ truyền thông</span>
                </div>

                <div className="flex items-center gap-2 text-xs border-b border-zinc-100 pb-2 mb-3">
                  <button
                    onClick={() => setMediaTab('media')}
                    className={`font-semibold pb-1 ${
                      mediaTab === 'media'
                        ? 'text-[#0068ff] border-b-2 border-[#0068ff]'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    Ảnh ({sharedMedia.length})
                  </button>
                  <button
                    onClick={() => setMediaTab('files')}
                    className={`font-semibold pb-1 ${
                      mediaTab === 'files'
                        ? 'text-[#0068ff] border-b-2 border-[#0068ff]'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    Tệp tin ({sharedFiles.length})
                  </button>
                </div>

                {mediaTab === 'media' ? (
                  sharedMedia.length === 0 ? (
                    <p className="text-[11px] text-zinc-400 text-center py-4">Chưa có ảnh nào được gửi</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5">
                      {sharedMedia.map((m) => (
                        <img
                          key={m.id}
                          src={m.mediaUrl}
                          alt="Shared"
                          onClick={() =>
                            setViewingImage({ url: m.mediaUrl!, caption: m.content })
                          }
                          className="w-full h-16 object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
                        />
                      ))}
                    </div>
                  )
                ) : sharedFiles.length === 0 ? (
                  <p className="text-[11px] text-zinc-400 text-center py-4">Chưa có tệp nào được gửi</p>
                ) : (
                  <div className="space-y-1.5">
                    {sharedFiles.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="truncate text-zinc-800">{m.mediaMeta?.fileName}</span>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                          {formatFileSize(m.mediaMeta?.fileSize)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Security & Privacy Settings (Item 8) */}
              <div className="border-t border-zinc-100 pt-4 space-y-3">
                <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#0068ff]" />
                  <span>Bảo mật & Quyền riêng tư</span>
                </span>

                {/* Disappearing Messages Duration */}
                <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800">
                      <Hourglass className="w-3.5 h-3.5 text-amber-500" />
                      <span>Tin nhắn tự hủy</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-medium">
                      {activeConversation.disappearingDuration
                        ? activeConversation.disappearingDuration < 60
                          ? `${activeConversation.disappearingDuration}s`
                          : activeConversation.disappearingDuration < 3600
                          ? `${activeConversation.disappearingDuration / 60}m`
                          : '24h'
                        : 'Đang tắt'}
                    </span>
                  </div>
                  <select
                    value={activeConversation.disappearingDuration || 0}
                    onChange={(e) => {
                      const dur = Number(e.target.value);
                      setConversations((prev) =>
                        prev.map((c) =>
                          c.id === activeRoomId ? { ...c, disappearingDuration: dur } : c
                        )
                      );
                    }}
                    className="w-full mt-1 px-2.5 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value={0}>Tắt (Không tự hủy)</option>
                    <option value={10}>Tự hủy sau 10 giây</option>
                    <option value={60}>Tự hủy sau 1 phút</option>
                    <option value={86400}>Tự hủy sau 24 giờ</option>
                  </select>
                </div>

                {/* PIN Lock Toggle */}
                <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-zinc-600" />
                      <span>Khóa cuộc trò chuyện (PIN)</span>
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {activeConversation.isLocked
                        ? 'Đã kích hoạt mật mã bảo vệ'
                        : 'Chưa đặt mã bảo vệ'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (activeConversation.isLocked) {
                        if (confirm('Bạn có muốn hủy khóa PIN cho cuộc trò chuyện này?')) {
                          setConversations((prev) =>
                            prev.map((c) =>
                              c.id === activeRoomId
                                ? { ...c, isLocked: false, pinCode: undefined }
                                : c
                            )
                          );
                        }
                      } else {
                        setIsSettingPinModalOpen(true);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      activeConversation.isLocked
                        ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                        : 'bg-[#0068ff] text-white hover:bg-blue-700'
                    }`}
                  >
                    {activeConversation.isLocked ? 'Hủy khóa' : 'Đặt PIN'}
                  </button>
                </div>
              </div>

              {/* Leave Room Action */}
              <div className="border-t border-zinc-100 pt-4">
                <button
                  onClick={() => {
                    if (confirm(`Bạn có chắc muốn rời khỏi ${activeConversation.name}?`)) {
                      setConversations((prev) => prev.filter((c) => c.id !== activeRoomId));
                      if (conversations.length > 1) {
                        handleSelectConversation(conversations[0].id);
                      }
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-2xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Rời cuộc trò chuyện</span>
                </button>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* ============================================================== */}
      {/* 5. MODALS & POPUPS                                             */}
      {/* ============================================================== */}
      {/* Zalo Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#0068ff]" />
                <h3 className="text-sm font-bold text-zinc-900">Cài đặt Zalo Chat</h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs text-zinc-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-zinc-900">Âm thanh thông báo</p>
                  <p className="text-[11px] text-zinc-400">Phát âm thanh khi có tin nhắn mới</p>
                </div>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    soundEnabled ? 'bg-[#0068ff]' : 'bg-zinc-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      soundEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-zinc-900">Xem trước tin nhắn</p>
                  <p className="text-[11px] text-zinc-400">
                    Hiển thị trích đoạn tin nhắn trong danh sách hội thoại
                  </p>
                </div>
                <button
                  onClick={() => setPreviewEnabled(!previewEnabled)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    previewEnabled ? 'bg-[#0068ff]' : 'bg-zinc-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      previewEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="border-t border-zinc-100 pt-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-zinc-900">Phím tắt gửi tin nhắn</p>
                  <p className="text-[11px] text-zinc-400">
                    Enter để gửi tin nhắn, Shift+Enter xuống dòng
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-zinc-100 rounded-lg text-[10px] font-mono font-semibold text-zinc-600">
                  Enter
                </span>
              </div>

              <div className="border-t border-zinc-100 pt-4 space-y-2">
                <button
                  onClick={() => {
                    if (confirm('Bạn có chắc muốn xóa bộ nhớ đệm tin nhắn cục bộ?')) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 font-semibold text-center transition-colors"
                >
                  Đặt lại bộ nhớ đệm tin nhắn (Reset Cache)
                </button>

                <button
                  onClick={() => {
                    setIsSettingsOpen(false);
                    setIsTelemetryModalOpen(true);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 font-semibold text-center transition-colors flex items-center justify-center gap-2"
                >
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>Giám sát Cụm máy chủ quy mô lớn (Cluster Telemetry)</span>
                </button>

                <button
                  onClick={handleExitChat}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold text-center transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Thoát ra Không gian làm việc</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CreateGroupModal
        isOpen={isGroupModalOpen}
        currentUser={currentUser}
        availableUsers={allUsers}
        onClose={() => setIsGroupModalOpen(false)}
        onCreateGroup={handleCreateGroup}
      />

      <ImageViewerModal
        imageUrl={viewingImage?.url || null}
        caption={viewingImage?.caption}
        onClose={() => setViewingImage(null)}
      />

      {/* Convert Chat Message to Task Modal */}
      {taskModalMessage && (
        <CreateTaskFromMessageModal
          isOpen={Boolean(taskModalMessage)}
          messageText={taskModalMessage.content}
          senderName={taskModalMessage.senderName}
          onClose={() => setTaskModalMessage(null)}
          onCreateTask={handleCreateTaskFromMessage}
        />
      )}

      {/* Share Document in Chat Modal */}
      <ShareDocumentModal
        isOpen={shareDocModalOpen}
        onClose={() => setShareDocModalOpen(false)}
        onShareDocument={handleShareDocument}
      />

      {/* Forward Message Modal */}
      <ForwardMessageModal
        isOpen={Boolean(forwardModalMessage)}
        message={forwardModalMessage}
        conversations={conversations}
        currentRoomId={activeRoomId}
        onForward={handleForwardMessage}
        onClose={() => setForwardModalMessage(null)}
      />

      {/* Share Location Modal */}
      <ShareLocationModal
        isOpen={shareLocationOpen}
        onShare={handleShareLocation}
        onClose={() => setShareLocationOpen(false)}
      />

      {/* Share Contact Modal */}
      <ShareContactModal
        isOpen={shareContactOpen}
        users={allUsers}
        onShare={handleShareContact}
        onClose={() => setShareContactOpen(false)}
      />

      {/* Real-time Call Modal */}
      <RealtimeCallModal
        callSession={activeCallSession}
        currentUser={currentUser}
        targetName={activeConversation.name}
        onAcceptCall={handleAcceptCall}
        onDeclineCall={handleDeclineCall}
        onEndCall={handleEndCall}
      />

      {/* AI Copilot Drawer */}
      <AICopilotDrawer
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        onCreateTask={(title, assignee) => {
          handleSendMessage('task', `📋 Đã tạo công việc: "${title}"`, undefined, {
            taskTitle: title,
            assigneeName: assignee || 'Đội ngũ',
          });
        }}
      />

      {/* PIN Verification Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-zinc-200 p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0068ff] flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 mb-1">Nhập mã PIN bí mật</h3>
            <p className="text-xs text-zinc-500 mb-5 leading-relaxed">
              Cuộc trò chuyện này đã được khóa bảo vệ. Vui lòng nhập mã PIN để tiếp tục.
            </p>

            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div>
                <input
                  type="password"
                  maxLength={6}
                  autoFocus
                  placeholder="••••"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError('');
                  }}
                  className="w-40 text-center tracking-[0.5em] text-2xl font-bold font-mono py-2.5 bg-zinc-50 border border-zinc-300 rounded-2xl focus:bg-white focus:outline-none focus:border-[#0068ff] mx-auto block"
                />
                {pinError && (
                  <p className="text-xs text-rose-600 mt-2 font-medium">{pinError}</p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPinModalOpen(false);
                    setPendingLockRoom(null);
                    setPinInput('');
                    setPinError('');
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 font-semibold text-xs transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#0068ff] hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs"
                >
                  Mở khóa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set PIN Code Modal */}
      {isSettingPinModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-zinc-200 p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 mb-1">Cài đặt mã PIN bảo vệ</h3>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
              Thiết lập mã PIN 4 chữ số cho cuộc trò chuyện <strong>{activeConversation.name}</strong>.
            </p>

            <form onSubmit={handleSaveNewPin} className="space-y-4">
              <div>
                <input
                  type="password"
                  maxLength={6}
                  autoFocus
                  placeholder="Nhập 4 chữ số (VD: 1234)"
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  className="w-full text-center text-sm font-bold font-mono py-2.5 bg-zinc-50 border border-zinc-300 rounded-2xl focus:bg-white focus:outline-none focus:border-[#0068ff]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingPinModalOpen(false);
                    setNewPinInput('');
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 font-semibold text-xs transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#0068ff] hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs"
                >
                  Kích hoạt PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cluster Telemetry Dashboard Modal (Item 10) */}
      {isTelemetryModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">
                    Giám sát Hạ tầng Chat & Cụm Server Quy mô lớn
                  </h3>
                  <p className="text-[10px] text-zinc-500">
                    Mục 10: Quản trị, Giám sát Telemetry & Phân tán Tải
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTelemetryModalOpen(false)}
                className="p-1 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto text-xs text-zinc-700">
              {/* Overall health banner */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">Toàn bộ Cụm Dịch Vụ Đang Khỏe Mạnh</h4>
                    <p className="text-[11px] text-emerald-700">
                      Độ trễ trung bình: <strong className="font-mono">{pingLatency.toFixed(1)}ms</strong> • Uptime: 99.99% • Multi-device Single Session Sync
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const next = Number((1.5 + Math.random() * 1.5).toFixed(1));
                    setPingLatency(next);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0"
                >
                  Kiểm tra Ping
                </button>
              </div>

              {/* Node Components Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-zinc-900 flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-blue-600" />
                      NGINX Gateway LB
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                      Cổng :8080 Active
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500">Cân bằng tải Round-Robin WebSocket Gateway, SSL/TLS v1.3</p>
                  <p className="text-[10px] text-zinc-400 font-mono mt-2">Active Upstreams: 2 Nodes</p>
                </div>

                <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-zinc-900 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-purple-600" />
                      Redis Distributed Mesh
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                      Cổng :6380 Đã nối
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500">Pub/Sub Message Bus phân tán đa node, đồng bộ tức thời</p>
                  <p className="text-[10px] text-zinc-400 font-mono mt-2">Throughput: 14,200 msg/s</p>
                </div>

                <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-zinc-900 flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-indigo-600" />
                      ws-node-1 (Node.js)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                      Cổng :4001 Online
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500">Phục vụ 1,420 kết nối WebSocket, CRDT Yjs Protocol</p>
                  <p className="text-[10px] text-zinc-400 font-mono mt-2">RAM: 82MB • CPU: 11%</p>
                </div>

                <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-zinc-900 flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-indigo-600" />
                      ws-node-2 (Node.js)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                      Cổng :4002 Online
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500">Phục vụ 1,510 kết nối WebSocket, CRDT Yjs Protocol</p>
                  <p className="text-[10px] text-zinc-400 font-mono mt-2">RAM: 87MB • CPU: 13%</p>
                </div>

                <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-zinc-900 flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-sky-600" />
                      PostgreSQL Engine
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                      Cổng :5434 Đang chạy
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500">Lưu trữ tài liệu, audit log, nhóm chat và lịch sử tin nhắn</p>
                  <p className="text-[10px] text-zinc-400 font-mono mt-2">Connection Pool: 25/50</p>
                </div>

                <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-zinc-900 flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-amber-600" />
                      MinIO Object Store (S3)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                      Cổng :9000 Sẵn sàng
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500">Lưu trữ tệp tin đính kèm, ảnh chụp, voice notes và tài liệu</p>
                  <p className="text-[10px] text-zinc-400 font-mono mt-2">Bucket: workspace-assets</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
