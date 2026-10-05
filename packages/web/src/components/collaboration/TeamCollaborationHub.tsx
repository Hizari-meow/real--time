'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Users,
  Video,
  Headphones,
  FileText,
  Bell,
  Search,
  Plus,
  Hash,
  Lock,
  Pin,
  Bookmark,
  Send,
  Paperclip,
  Smile,
  Mic,
  MicOff,
  VideoOff,
  Monitor,
  Hand,
  PhoneOff,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  MoreVertical,
  Reply,
  Share2,
  CheckSquare,
  ThumbsUp,
  Heart,
  Eye,
  Flame,
  Check,
  X,
  Volume2,
  VolumeX,
  Sliders,
  ShieldCheck,
  ChevronRight,
  ShieldAlert,
  UserCheck,
  Globe,
  Radio,
  BookOpen,
  Calendar,
  Layers,
  HelpCircle,
  Play,
  Pause,
  Repeat,
  RotateCcw,
  Download,
  Image as ImageIcon,
  ExternalLink,
  ChevronDown,
  LayoutGrid,
  Maximize2,
  Eraser,
  PenTool,
  Forward,
  UserPlus,
  PhoneCall,
  CalendarDays,
  Trash2,
  Smartphone,
  Table,
  Palette,
  EyeOff,
  CheckCheck,
} from 'lucide-react';
import {
  WorkplaceChannel,
  WorkplaceMessage,
  ThreadReply,
  PresenceUser,
  ContextualComment,
  NotificationItem,
  LiveCaptionItem,
  BreakoutRoom,
} from './types';
import {
  SEED_USERS,
  SEED_CHANNELS,
  SEED_MESSAGES,
  SEED_THREAD_REPLIES,
  SEED_CONTEXTUAL_COMMENTS,
  SEED_NOTIFICATIONS,
  TEAM_COMMUNICATION_NORMS,
} from './seed-data';
import { GoogleMeetView } from './GoogleMeetView';
import { useAuth } from '../../context/AuthContext';
import { API_BASE, WS_BASE } from '../../lib/api-client';

export function TeamCollaborationHub() {
  // Navigation Tabs: 'channels' | 'meetings' | 'comments' | 'notifications'
  const [activeTab, setActiveTab] = useState<'channels' | 'meetings' | 'comments' | 'notifications'>('channels');

  // Active Google Meet Session
  const [activeMeetSession, setActiveMeetSession] = useState<{
    roomTitle: string;
    roomCode: string;
    isAudioOnly?: boolean;
  } | null>(null);

  const [meetInputCode, setMeetInputCode] = useState('');
  const [newMeetingDropdownOpen, setNewMeetingDropdownOpen] = useState(false);

  // ==========================================
  // PILLAR 1: CHANNELS & CHAT STATE
  // ==========================================
  const [channels, setChannels] = useState<WorkplaceChannel[]>(SEED_CHANNELS);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('chan_proj_website');
  const [messages, setMessages] = useState<Record<string, WorkplaceMessage[]>>(SEED_MESSAGES);
  const [threadReplies, setThreadReplies] = useState<Record<string, ThreadReply[]>>(SEED_THREAD_REPLIES);
  const [activeThreadMessage, setActiveThreadMessage] = useState<WorkplaceMessage | null>(null);
  const [channelSearch, setChannelSearch] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [threadInput, setThreadInput] = useState('');
  const [taskModalMessage, setTaskModalMessage] = useState<WorkplaceMessage | null>(null);
  const [taskAssignee, setTaskAssignee] = useState('Nguyễn Văn Nam');
  const [taskDeadline, setTaskDeadline] = useState('2026-10-05');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('high');
  const [pinnedOnlyFilter, setPinnedOnlyFilter] = useState(false);
  const [bookmarkedOnlyFilter, setBookmarkedOnlyFilter] = useState(false);
  const [selectedUserPresence, setSelectedUserPresence] = useState<'online' | 'meeting' | 'away' | 'dnd' | 'focus'>('online');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { user, token, workspace } = useAuth();
  const isSendingRef = useRef(false);
  const socketRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<any>(null);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // New Channel Modal
  const [createChannelModalOpen, setCreateChannelModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelCategory, setNewChannelCategory] = useState<'project' | 'team' | 'topic' | 'external'>('project');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [newChannelPrivate, setNewChannelPrivate] = useState(false);

  // Forward Message Modal
  const [forwardModalMessage, setForwardModalMessage] = useState<WorkplaceMessage | null>(null);
  const [forwardTargetChannelId, setForwardTargetChannelId] = useState<string>('chan_team_tech');

  // External Guest Invite Modal
  const [inviteGuestModalOpen, setInviteGuestModalOpen] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [guestOrg, setGuestOrg] = useState('TechCorp Vietnam Ltd');

  // Attachment upload ref & Emoji popover
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecordingAudioMsg, setIsRecordingAudioMsg] = useState(false);

  // ==========================================
  // PILLAR 2: MEETINGS & HUDDLES STATE
  // ==========================================
  const [meetingViewMode, setMeetingViewMode] = useState<'grid' | 'speaker' | 'screenshare' | 'whiteboard'>('grid');
  const [isHuddleActive, setIsHuddleActive] = useState(false);
  const [isHuddleMuted, setIsHuddleMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isVideoMeetingActive, setIsVideoMeetingActive] = useState(true);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isVideoCamOn, setIsVideoCamOn] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [isLiveCaptionsOn, setIsLiveCaptionsOn] = useState(true);
  const [meetingSidePanel, setMeetingSidePanel] = useState<'none' | 'chat' | 'participants' | 'notes' | 'whiteboard'>('chat');
  const [inMeetingChatInput, setInMeetingChatInput] = useState('');
  const [inMeetingChatMessages, setInMeetingChatMessages] = useState<
    { sender: string; time: string; text: string; isSelf: boolean }[]
  >([
    { sender: 'Alice Tech', time: '10:04', text: 'Chào mọi người! Hôm nay chúng ta rà soát lại thông lượng CRDT.', isSelf: false },
    { sender: 'Trần Thị Linh', time: '10:05', text: 'Slide kiến trúc mình đã ghim trên bảng trắng nhé.', isSelf: false },
  ]);

  // Video streams refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenShareVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Breakout Rooms State
  const [breakoutModalOpen, setBreakoutModalOpen] = useState(false);
  const [activeBreakoutRoomId, setActiveBreakoutRoomId] = useState<string | null>(null);

  // Schedule Meeting Modal
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleTitle, setScheduleTitle] = useState('Họp Rà Soát Sprint & Kiến Trúc CRDT');
  const [scheduleDate, setScheduleDate] = useState('2026-10-04');
  const [scheduleTime, setScheduleTime] = useState('14:30');
  const [scheduleDuration, setScheduleDuration] = useState('45');

  // Floating Reaction & AI Summary
  const [floatingReaction, setFloatingReaction] = useState<string | null>(null);
  const [aiMeetingSummary, setAiMeetingSummary] = useState<{
    decisions: string[];
    actionItems: { task: string; owner: string; deadline: string }[];
  } | null>({
    decisions: [
      'Thống nhất giải pháp nén trạng thái Yjs State Vector Compaction để tối ưu tải WebSocket khi có 500 kết nối đồng thời.',
      'Đồng bộ toàn bộ tokens màu sắc từ Figma sang Tailwind CSS trước thứ Sáu tuần này.',
      'Kích hoạt cơ chế gom thông báo (Smart Digest) để bảo vệ sự tập trung cho đội ngũ kỹ thuật.',
    ],
    actionItems: [
      { task: 'Hoàn thiện bản kiểm thử hội tụ CRDT trên môi trường staging', owner: 'Lê Hoàng', deadline: '03/10/2026' },
      { task: 'Bổ sung bảng đo lường jitter mạng 4G di động trong RFC v4', owner: 'Alice Tech', deadline: '04/10/2026' },
      { task: 'Rà soát tài liệu hướng dẫn giao tiếp nhóm và chia sẻ cho đối tác TechCorp', owner: 'Trần Thị Linh', deadline: '05/10/2026' },
    ],
  });

  // Whiteboard Canvas in Meeting
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#2563eb');
  const [drawLineWidth, setDrawLineWidth] = useState(3);
  const [isEraser, setIsEraser] = useState(false);

  // ==========================================
  // PILLAR 3: CONTEXTUAL COMMENTS & SUGGESTIONS
  // ==========================================
  const [comments, setComments] = useState<ContextualComment[]>(SEED_CONTEXTUAL_COMMENTS);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>('cmt_ctx_1');
  const [commentViewFilter, setCommentViewFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [commentMediaView, setCommentMediaView] = useState<'document' | 'spreadsheet' | 'design'>('document');
  const [selectedCellCoord, setSelectedCellCoord] = useState<string>('C12');
  const [selectedCellData, setSelectedCellData] = useState({
    title: 'Doanh thu SaaS thực tế Q3',
    value: '$128,400',
    formula: '=SUM(C2:C11)',
  });
  const [selectedDesignZone, setSelectedDesignZone] = useState<string>('CTA_BUTTON');
  const [isDocumentWatched, setIsDocumentWatched] = useState<boolean>(true);
  const [replyInputCommentId, setReplyInputCommentId] = useState<string | null>(null);
  const [replyInputText, setReplyInputText] = useState<string>('');
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);
  const [hasAudioAttached, setHasAudioAttached] = useState<boolean>(false);
  const [hasVideoAttached, setHasVideoAttached] = useState<boolean>(false);
  const [playingVideoCommentId, setPlayingVideoCommentId] = useState<string | null>(null);
  const [isTaskAssignmentOpen, setIsTaskAssignmentOpen] = useState<boolean>(false);
  const [taskAssigneeTarget, setTaskAssigneeTarget] = useState<string>('usr_linh');
  const [taskDeadlineTarget, setTaskDeadlineTarget] = useState<string>('2026-10-05');
  const [docSnippetText, setDocSnippetText] = useState(
    `Hệ thống cộng tác thời gian thực sử dụng thuật toán Yjs CRDT để đảm bảo tính nhất quán cuối cùng (Eventual Consistency). Trong các thử nghiệm tải cao, cụm 2 máy chủ WebSocket (ws-node-1 và ws-node-2) đã duy trì thành công 5,000 kết nối đồng thời với độ trễ hội tụ dưới 5ms. Số liệu ghi nhận tổng cộng 2,450 người dùng hoạt động cùng lúc mà không xảy ra bất kỳ xung đột dữ liệu hay mất mát ký tự nào.`
  );
  const [docSelectedRange, setDocSelectedRange] = useState<string>('2,450 người dùng hoạt động');
  const [docCommentInput, setDocCommentInput] = useState('');
  const [docSuggestInput, setDocSuggestInput] = useState('');
  const [docInputMode, setDocInputMode] = useState<'comment' | 'suggest'>('comment');
  const [mentionPopupOpen, setMentionPopupOpen] = useState(false);
  const [mentionFilterText, setMentionFilterText] = useState('');
  const [docPermissionPromptUser, setDocPermissionPromptUser] = useState<string | null>(null);
  const [playingDocVoiceId, setPlayingDocVoiceId] = useState<string | null>(null);

  // ==========================================
  // PILLAR 4: NOTIFICATION CENTER & HYGIENE
  // ==========================================
  const [notifications, setNotifications] = useState<NotificationItem[]>(SEED_NOTIFICATIONS);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'mention' | 'comment' | 'task' | 'watch' | 'meeting' | 'system' | 'dm'>('all');
  const [isDndActive, setIsDndActive] = useState(false);
  const [focusModeUntil, setFocusModeUntil] = useState<number | null>(null);
  const [focusCountdown, setFocusCountdown] = useState<string | null>(null);
  const [digestExpanded, setDigestExpanded] = useState(false);
  const [mobilePushPreviewOpen, setMobilePushPreviewOpen] = useState(false);
  const [isDeduplicationActive, setIsDeduplicationActive] = useState(false);
  const [channelNotificationPrefs, setChannelNotificationPrefs] = useState<Record<string, 'all' | 'mention' | 'mute'>>({
    chan_proj_website: 'all',
    chan_infra_devops: 'mention',
    chan_priv_bod: 'all',
    chan_topic_general: 'all',
  });
  const [channelPrefModalOpen, setChannelPrefModalOpen] = useState(false);

  const selectedChannel = channels.find((c) => c.id === selectedChannelId) || channels[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ------------------------------------------
  // Camera & Mic Media Stream Handler
  // ------------------------------------------
  useEffect(() => {
    if (isVideoMeetingActive && isVideoCamOn) {
      if (navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: true, audio: !isVideoMuted })
          .then((stream) => {
            localStreamRef.current = stream;
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }
          })
          .catch((err) => {
            console.warn('Webcam permission not granted or available in this context:', err);
          });
      }
    } else {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    }

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isVideoMeetingActive, isVideoCamOn, isVideoMuted]);

  // Screen share handler
  const handleToggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        if (navigator.mediaDevices?.getDisplayMedia) {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          screenStreamRef.current = stream;
          if (screenShareVideoRef.current) {
            screenShareVideoRef.current.srcObject = stream;
          }
          setIsScreenSharing(true);
          setMeetingViewMode('screenshare');
          showToast('Đang chia sẻ màn hình trực tiếp!');

          stream.getVideoTracks()[0].onended = () => {
            setIsScreenSharing(false);
            setMeetingViewMode('grid');
            screenStreamRef.current = null;
            showToast('Đã dừng chia sẻ màn hình.');
          };
        } else {
          setIsScreenSharing(true);
          setMeetingViewMode('screenshare');
          showToast('Bắt đầu chia sẻ màn hình sơ đồ kiến trúc!');
        }
      } catch (err) {
        // Fallback for sandboxed preview
        setIsScreenSharing(true);
        setMeetingViewMode('screenshare');
        showToast('Đang trình diễn màn hình slide kiến trúc hệ thống!');
      }
    } else {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      setMeetingViewMode('grid');
      showToast('Đã kết thúc chia sẻ màn hình.');
    }
  };

  // Recording Timer
  useEffect(() => {
    let timer: any;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const handleStopRecording = () => {
    setIsRecording(false);
    setRecordedVideoUrl('#download_recording');
    showToast(`Đã lưu bản ghi cuộc họp (${Math.floor(recordingSeconds / 60)}:${recordingSeconds % 60}) vào Kho Đám Mây!`);
  };

  // Focus mode countdown
  useEffect(() => {
    if (!focusModeUntil) {
      setFocusCountdown(null);
      return;
    }

    const interval = setInterval(() => {
      const remaining = focusModeUntil - Date.now();
      if (remaining <= 0) {
        setFocusModeUntil(null);
        setFocusCountdown(null);
        showToast('Chế độ tập trung đã kết thúc. Bạn có thể nhận lại thông báo bình thường.');
      } else {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setFocusCountdown(`${mins}m ${secs < 10 ? '0' : ''}${secs}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [focusModeUntil]);

  // ------------------------------------------
  // Whiteboard Canvas Handlers
  // ------------------------------------------
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.strokeStyle = isEraser ? '#ffffff' : drawColor;
    ctx.lineWidth = isEraser ? drawLineWidth * 4 : drawLineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    showToast('Đã xóa trắng bảng vẽ.');
  };

  // ------------------------------------------
  // Fetch Channels from PostgreSQL via REST API
  useEffect(() => {
    if (!token || !workspace?.orgId) return;

    const fetchChannels = async () => {
      try {
        const res = await fetch(`${API_BASE}/chat/channels`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-workspace-id': workspace.orgId,
          },
          credentials: 'include',
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const mappedChannels: WorkplaceChannel[] = json.data.map((c: any) => ({
            id: c.id,
            name: c.name,
            category: c.type === 'dm' ? 'dm' : c.type === 'private' ? 'team' : 'project',
            categoryLabel: c.type === 'dm' ? 'Tin nhắn trực tiếp' : c.type === 'private' ? 'Kênh riêng tư' : 'Kênh chung',
            isPrivate: c.type === 'private',
            description: c.topic || '',
            memberCount: c.memberCount || 1,
          }));
          setChannels(mappedChannels);
          setSelectedChannelId((prev) => {
            if (mappedChannels.some((ch) => ch.id === prev)) return prev;
            return mappedChannels[0].id;
          });
        }
      } catch (err) {
        console.error('Failed to fetch channels from server:', err);
      }
    };

    fetchChannels();
  }, [token, workspace?.orgId]);

  // ------------------------------------------
  // Fetch Messages for current channel from PostgreSQL
  useEffect(() => {
    if (!token || !workspace?.orgId || !selectedChannelId) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_BASE}/chat/channels/${selectedChannelId}/messages`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-workspace-id': workspace.orgId,
          },
          credentials: 'include',
        });
        const json = await res.json();
        if (json.success && json.data?.messages) {
          const mappedMsgs: WorkplaceMessage[] = json.data.messages.map((m: any) => ({
            id: m.id,
            channelId: m.channelId,
            senderId: m.senderId,
            senderName: m.senderName,
            senderColor: m.senderColor || '#2563eb',
            senderRole: m.senderRole || 'Thành viên',
            content: m.content,
            timestamp: new Date(m.createdAt).getTime(),
            type: m.type || 'text',
            reactions: m.reactions || [],
            threadCount: m.threadCount || 0,
            threadLastReplyAt: m.threadLastReplyAt ? new Date(m.threadLastReplyAt).getTime() : undefined,
          }));
          setMessages((prev) => ({
            ...prev,
            [selectedChannelId]: mappedMsgs,
          }));
        }
      } catch (err) {
        console.error('Failed to fetch messages for channel:', err);
      }
    };

    fetchMessages();

    // Join channel via WebSocket
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'chat:join_channel',
          channelId: selectedChannelId,
        })
      );
    }
  }, [selectedChannelId, token, workspace?.orgId]);

  // ------------------------------------------
  // Fetch Thread Replies for Active Thread Message
  useEffect(() => {
    if (!activeThreadMessage || !token || !workspace?.orgId) return;

    const fetchThreadReplies = async () => {
      try {
        const res = await fetch(`${API_BASE}/chat/messages/${activeThreadMessage.id}/thread`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-workspace-id': workspace.orgId,
          },
          credentials: 'include',
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const mappedReplies: ThreadReply[] = json.data.map((r: any) => ({
            id: r.id,
            messageId: activeThreadMessage.id,
            senderId: r.senderId,
            senderName: r.senderName,
            senderColor: r.senderColor || '#2563eb',
            content: r.content,
            timestamp: new Date(r.createdAt).getTime(),
            reactions: r.reactions || [],
          }));
          setThreadReplies((prev) => ({
            ...prev,
            [activeThreadMessage.id]: mappedReplies,
          }));
        }
      } catch (err) {
        console.error('Failed to fetch thread replies:', err);
      }
    };

    fetchThreadReplies();
  }, [activeThreadMessage?.id, token, workspace?.orgId]);

  // ------------------------------------------
  // Setup Server WebSocket Chat & Realtime Synchronization
  useEffect(() => {
    if (typeof window === 'undefined' || !token) return;

    let ws: WebSocket | null = null;
    let reconnectTimer: any = null;
    let isMounted = true;

    const connectWs = () => {
      try {
        const wsUrl = `${WS_BASE}?token=${encodeURIComponent(token)}&orgId=${encodeURIComponent(workspace?.orgId || '')}`;
        ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          if (selectedChannelId) {
            ws?.send(
              JSON.stringify({
                type: 'chat:join_channel',
                channelId: selectedChannelId,
              })
            );
          }
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);

            if (payload.type === 'chat:message_received') {
              const { channelId, data } = payload;
              const newMsg: WorkplaceMessage = {
                id: data.id,
                channelId: data.channelId,
                senderId: data.senderId,
                senderName: data.senderName,
                senderColor: data.senderColor || '#2563eb',
                senderRole: data.senderRole || 'Thành viên',
                content: data.content,
                timestamp: new Date(data.createdAt).getTime(),
                type: data.type || 'text',
                reactions: data.reactions || [],
                threadCount: data.threadCount || 0,
              };

              setMessages((prev) => {
                const list = prev[channelId] || [];
                if (list.some((m) => m.id === newMsg.id)) return prev;
                return {
                  ...prev,
                  [channelId]: [...list, newMsg],
                };
              });
            } else if (payload.type === 'chat:thread_reply_received') {
              const { channelId, parentMessageId, data } = payload;
              const reply: ThreadReply = {
                id: data.id,
                messageId: parentMessageId,
                senderId: data.senderId,
                senderName: data.senderName,
                senderColor: data.senderColor || '#2563eb',
                content: data.content,
                timestamp: new Date(data.createdAt).getTime(),
                reactions: data.reactions || [],
              };

              setThreadReplies((prev) => {
                const list = prev[parentMessageId] || [];
                if (list.some((r) => r.id === reply.id)) return prev;
                return {
                  ...prev,
                  [parentMessageId]: [...list, reply],
                };
              });

              setMessages((prev) => {
                const list = prev[channelId] || [];
                return {
                  ...prev,
                  [channelId]: list.map((m) =>
                    m.id === parentMessageId ? { ...m, threadCount: (m.threadCount || 0) + 1 } : m
                  ),
                };
              });
            } else if (payload.type === 'chat:reaction_updated') {
              const { channelId, messageId, data } = payload;
              setMessages((prev) => {
                const list = prev[channelId] || [];
                return {
                  ...prev,
                  [channelId]: list.map((m) =>
                    m.id === messageId ? { ...m, reactions: data.reactions } : m
                  ),
                };
              });
            } else if (payload.type === 'chat:user_typing') {
              const { channelId, data } = payload;
              if (channelId === selectedChannelId) {
                setIsPartnerTyping(!!data.isTyping);
              }
            }
          } catch {
            // ignore non-json
          }
        };

        ws.onclose = () => {
          if (isMounted) {
            reconnectTimer = setTimeout(connectWs, 3000);
          }
        };
      } catch (err) {
        console.error('[WebSocket] Chat connection error:', err);
      }
    };

    connectWs();

    return () => {
      isMounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [token, workspace?.orgId, selectedChannelId]);

  // Synchronize comments with Figma Design Canvas Pins and Spreadsheet Comments
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      // 1. Sync from Figma Design comments
      const figmaStored = localStorage.getItem('collab_figma_comments_design_ui_workspace');
      if (figmaStored) {
        const figmaPins: any[] = JSON.parse(figmaStored);
        if (figmaPins.length > 0) {
          setComments((prev) => {
            const updated = [...prev];
            figmaPins.forEach((pin) => {
              const existingIdx = updated.findIndex((c) => c.id === pin.id || (c.mediaType === 'design' && c.id === 'cmt_ctx_6'));
              if (existingIdx >= 0) {
                updated[existingIdx] = {
                  ...updated[existingIdx],
                  resolved: pin.resolved,
                  replies: pin.replies || updated[existingIdx].replies,
                  content: pin.content || updated[existingIdx].content,
                };
              }
            });
            return updated;
          });
        }
      }

      // 2. Sync from Spreadsheet comments
      const sheetStored = localStorage.getItem('collab_sheet_comments_sheet_fin_q4');
      if (sheetStored) {
        const sheetCmts: any[] = JSON.parse(sheetStored);
        if (sheetCmts.length > 0) {
          setComments((prev) => {
            const updated = [...prev];
            sheetCmts.forEach((sc) => {
              const existingIdx = updated.findIndex((c) => c.id === sc.id || (c.mediaType === 'spreadsheet' && c.cellLocation === sc.cellCoord));
              if (existingIdx >= 0) {
                updated[existingIdx] = {
                  ...updated[existingIdx],
                  resolved: sc.resolved,
                  replies: sc.replies || updated[existingIdx].replies,
                  content: sc.content || updated[existingIdx].content,
                };
              }
            });
            return updated;
          });
        }
      }
    } catch {}
  }, []);

  // Sync comments changes back to Figma Design & Spreadsheet storage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      // Figma Design sync
      const designCmts = comments.filter((c) => c.mediaType === 'design');
      if (designCmts.length > 0) {
        const pins = designCmts.map((c, idx) => ({
          id: c.id,
          designId: 'design_ui_workspace',
          pinNumber: idx + 1,
          x: 580 + idx * 30,
          y: 356 + idx * 20,
          authorName: c.authorName,
          authorColor: c.authorColor,
          authorRole: c.authorRole,
          content: c.content,
          targetElementName: c.selectedText || c.targetText || 'Nút CTA: [Bắt đầu Phiên Làm Việc Mới]',
          timestamp: c.timestamp,
          resolved: c.resolved,
          replies: c.replies || [],
        }));
        localStorage.setItem('collab_figma_comments_design_ui_workspace', JSON.stringify(pins));
      }

      // Spreadsheet sync
      const sheetCmts = comments.filter((c) => c.mediaType === 'spreadsheet');
      if (sheetCmts.length > 0) {
        const list = sheetCmts.map((c) => ({
          id: c.id,
          cellCoord: c.cellLocation || 'C12',
          authorName: c.authorName,
          authorColor: c.authorColor,
          authorRole: c.authorRole,
          content: c.content,
          timestamp: c.timestamp,
          resolved: c.resolved,
          isSuggestion: c.isSuggestion,
          suggestedValue: c.suggestedReplacement,
          replies: c.replies || [],
        }));
        localStorage.setItem('collab_sheet_comments_sheet_fin_q4', JSON.stringify(list));
      }
    } catch {}
  }, [comments]);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages[selectedChannelId]?.length, isPartnerTyping]);

  // Real Google Meet Session Launcher
  const handleStartMeeting = (roomTitle: string, roomCode?: string, isAudioOnly: boolean = false) => {
    const code = roomCode || `meet.collab.io/sync-${Date.now().toString().slice(-4)}`;
    setActiveMeetSession({
      roomTitle,
      roomCode: code,
      isAudioOnly,
    });
    const inviteMsg: WorkplaceMessage = {
      id: `msg_meet_${Date.now()}`,
      channelId: selectedChannelId,
      senderId: 'usr_nam',
      senderName: 'Nguyễn Văn Nam',
      senderColor: '#2563eb',
      senderRole: 'Lead Engineer',
      content: `📞 Đã bắt đầu cuộc họp: "${roomTitle}". Nhấp để tham gia ngay: https://${code}`,
      timestamp: Date.now(),
      type: 'huddle_event',
      reactions: [{ emoji: '🎥', count: 1, users: ['usr_nam'] }],
      threadCount: 0,
    };
    setMessages((prev) => ({
      ...prev,
      [selectedChannelId]: [...(prev[selectedChannelId] || []), inviteMsg],
    }));
    showToast(`Đã mở phòng họp Google Meet: ${roomTitle}`);
  };

  const channelMessages = (messages[selectedChannelId] || []).filter((m) => {
    if (pinnedOnlyFilter && !m.isPinned) return false;
    if (bookmarkedOnlyFilter && !m.isBookmarked) return false;
    if (channelSearch.trim()) {
      return (
        m.content.toLowerCase().includes(channelSearch.toLowerCase()) ||
        m.senderName.toLowerCase().includes(channelSearch.toLowerCase())
      );
    }
    return true;
  });

  // Real-time Single-Send Handler connected to PostgreSQL & WebSocket
  const handleSendMessage = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e && 'preventDefault' in e) {
      e.preventDefault();
    }
    const text = messageInput.trim();
    if (!text || isSendingRef.current) return;

    isSendingRef.current = true;
    setMessageInput('');

    // Stop typing immediately
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'chat:typing',
          channelId: selectedChannelId,
          isTyping: false,
        })
      );

      socketRef.current.send(
        JSON.stringify({
          type: 'chat:send_message',
          channelId: selectedChannelId,
          content: text,
          messageType: 'text',
        })
      );
    } else if (token && workspace?.orgId) {
      try {
        const res = await fetch(`${API_BASE}/chat/channels/${selectedChannelId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'x-workspace-id': workspace.orgId,
          },
          body: JSON.stringify({ content: text }),
          credentials: 'include',
        });
        const json = await res.json();
        if (json.success && json.data) {
          const sentMsg: WorkplaceMessage = {
            id: json.data.id,
            channelId: json.data.channelId,
            senderId: json.data.senderId,
            senderName: json.data.senderName,
            senderColor: json.data.senderColor || '#2563eb',
            senderRole: json.data.senderRole || 'Thành viên',
            content: json.data.content,
            timestamp: new Date(json.data.createdAt).getTime(),
            type: json.data.type || 'text',
            reactions: json.data.reactions || [],
            threadCount: json.data.threadCount || 0,
          };
          setMessages((prev) => {
            const list = prev[selectedChannelId] || [];
            if (list.some((m) => m.id === sentMsg.id)) return prev;
            return {
              ...prev,
              [selectedChannelId]: [...list, sentMsg],
            };
          });
        }
      } catch (err) {
        console.error('Failed to send message via REST fallback:', err);
      }
    }

    setTimeout(() => {
      isSendingRef.current = false;
    }, 150);
  };

  const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessageInput(val);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'chat:typing',
          channelId: selectedChannelId,
          isTyping: val.length > 0,
        })
      );

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(
            JSON.stringify({
              type: 'chat:typing',
              channelId: selectedChannelId,
              isTyping: false,
            })
          );
        }
      }, 2000);
    }
  };

  // Real File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const fileUrl = URL.createObjectURL(file);

    const newMsg: WorkplaceMessage = {
      id: `msg_file_${Date.now()}`,
      channelId: selectedChannelId,
      senderId: 'usr_nam',
      senderName: 'Nguyễn Văn Nam',
      senderColor: '#2563eb',
      senderRole: 'Lead Engineer',
      content: isImage ? `Đã tải lên hình ảnh: ${file.name}` : `Đã đính kèm tệp: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
      timestamp: Date.now(),
      type: isImage ? 'image' : 'file',
      reactions: [{ emoji: '👀', count: 1, users: ['usr_nam'] }],
      threadCount: 0,
      attachment: {
        fileName: file.name,
        fileSize: `${(file.size / 1024).toFixed(1)} KB`,
        fileType: file.type || 'document',
        url: fileUrl,
      },
    };

    setMessages((prev) => ({
      ...prev,
      [selectedChannelId]: [...(prev[selectedChannelId] || []), newMsg],
    }));
    showToast(`Đã tải lên tệp "${file.name}" thành công!`);
    e.target.value = '';
  };

  // Real Create Channel
  // Real Create Channel connected to PostgreSQL
  const handleCreateChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    const cleanName = newChannelName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');

    if (token && workspace?.orgId) {
      try {
        const res = await fetch(`${API_BASE}/chat/channels`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'x-workspace-id': workspace.orgId,
          },
          body: JSON.stringify({
            name: cleanName,
            type: newChannelPrivate ? 'private' : 'public',
            topic: newChannelDesc.trim() || undefined,
          }),
          credentials: 'include',
        });
        const json = await res.json();
        if (json.success && json.data) {
          const createdChan: WorkplaceChannel = {
            id: json.data.id,
            name: json.data.name,
            category: json.data.type === 'dm' ? 'dm' : json.data.type === 'private' ? 'team' : 'project',
            categoryLabel:
              json.data.type === 'dm'
                ? 'Tin nhắn trực tiếp'
                : json.data.type === 'private'
                ? 'Kênh riêng tư'
                : 'Kênh chung',
            isPrivate: json.data.type === 'private',
            description: json.data.topic || '',
            memberCount: json.data.memberCount || 1,
            unreadCount: 0,
          };
          setChannels((prev) => [...prev, createdChan]);
          setSelectedChannelId(createdChan.id);
          setCreateChannelModalOpen(false);
          setNewChannelName('');
          setNewChannelDesc('');
          showToast(`Đã tạo kênh #${cleanName} thành công!`);
          return;
        }
      } catch (err) {
        console.error('Failed to create channel:', err);
      }
    }
  };

  // Real Forward Message
  const handleForwardMessageSubmit = () => {
    if (!forwardModalMessage) return;

    const forwardedMsg: WorkplaceMessage = {
      id: `msg_fwd_${Date.now()}`,
      channelId: forwardTargetChannelId,
      senderId: user?.userId || 'usr_nam',
      senderName: user?.name || 'Thành viên',
      senderColor: '#2563eb',
      senderRole: 'Lead Engineer',
      content: `[Chuyển tiếp từ #${selectedChannel.name}]: ${forwardModalMessage.content}`,
      timestamp: Date.now(),
      type: 'text',
      reactions: [],
      threadCount: 0,
      attachment: forwardModalMessage.attachment,
    };

    setMessages((prev) => ({
      ...prev,
      [forwardTargetChannelId]: [...(prev[forwardTargetChannelId] || []), forwardedMsg],
    }));
    setForwardModalMessage(null);
    showToast(`Đã chuyển tiếp tin nhắn sang kênh đích!`);
  };

  // Real Message to Task
  const handleCreateTaskFromMessage = () => {
    if (!taskModalMessage) return;

    const taskTitle = taskModalMessage.content.slice(0, 60) + '...';
    try {
      const stored = localStorage.getItem('collab_kanban_external_tasks');
      const currentList = stored ? JSON.parse(stored) : [];
      currentList.push({
        id: `task_chat_${Date.now()}`,
        title: `[#${selectedChannel.name}] ${taskTitle}`,
        description: `Nhiệm vụ chuyển từ tin nhắn của ${taskModalMessage.senderName}:\n"${taskModalMessage.content}"`,
        column: 'todo',
        priority: taskPriority,
        assigneeName: taskAssignee,
        dueDate: taskDeadline,
        createdAt: Date.now(),
      });
      localStorage.setItem('collab_kanban_external_tasks', JSON.stringify(currentList));
      window.dispatchEvent(new CustomEvent('collab_task_created'));
    } catch {}

    const taskMsg: WorkplaceMessage = {
      id: `msg_task_${Date.now()}`,
      channelId: selectedChannelId,
      senderId: user?.userId || 'usr_system',
      senderName: 'Hệ thống Quản lý Công việc',
      senderColor: '#10b981',
      content: `Thẻ việc mới đã được tạo từ tin nhắn của ${taskModalMessage.senderName}:`,
      timestamp: Date.now(),
      type: 'task_created',
      reactions: [{ emoji: '📋', count: 1, users: [user?.userId || 'usr_nam'] }],
      taskInfo: {
        taskId: `task_${Date.now()}`,
        taskTitle: taskTitle,
        assigneeName: taskAssignee,
        deadline: taskDeadline,
        priority: taskPriority,
      },
    };

    setMessages((prev) => ({
      ...prev,
      [selectedChannelId]: [...(prev[selectedChannelId] || []), taskMsg],
    }));
    setTaskModalMessage(null);
    showToast(`Đã tạo task trên Kanban cho ${taskAssignee} và thông báo vào kênh!`);
  };

  // Toggle Reactions via WebSocket & REST
  const handleToggleReaction = async (msgId: string, emoji: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'chat:reaction',
          messageId: msgId,
          emoji,
        })
      );
    } else if (token && workspace?.orgId) {
      try {
        const res = await fetch(`${API_BASE}/chat/messages/${msgId}/reactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'x-workspace-id': workspace.orgId,
          },
          body: JSON.stringify({ emoji }),
          credentials: 'include',
        });
        const json = await res.json();
        if (json.success && json.data) {
          setMessages((prev) => {
            const list = prev[selectedChannelId] || [];
            return {
              ...prev,
              [selectedChannelId]: list.map((m) =>
                m.id === msgId ? { ...m, reactions: json.data.reactions } : m
              ),
            };
          });
        }
      } catch (err) {
        console.error('Failed to toggle reaction via REST:', err);
      }
    }
  };

  // Thread Reply via WebSocket & REST
  const handleSendThreadReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = threadInput.trim();
    if (!text || !activeThreadMessage) return;

    setThreadInput('');

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'chat:reply_thread',
          channelId: selectedChannelId,
          parentMessageId: activeThreadMessage.id,
          content: text,
        })
      );
    } else if (token && workspace?.orgId) {
      try {
        const res = await fetch(`${API_BASE}/chat/messages/${activeThreadMessage.id}/thread`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'x-workspace-id': workspace.orgId,
          },
          body: JSON.stringify({
            channelId: selectedChannelId,
            content: text,
          }),
          credentials: 'include',
        });
        const json = await res.json();
        if (json.success && json.data) {
          const reply: ThreadReply = {
            id: json.data.id,
            messageId: activeThreadMessage.id,
            senderId: json.data.senderId,
            senderName: json.data.senderName,
            senderColor: json.data.senderColor || '#2563eb',
            content: json.data.content,
            timestamp: new Date(json.data.createdAt).getTime(),
            reactions: json.data.reactions || [],
          };
          setThreadReplies((prev) => ({
            ...prev,
            [activeThreadMessage.id]: [...(prev[activeThreadMessage.id] || []), reply],
          }));
          setMessages((prev) => {
            const list = prev[selectedChannelId] || [];
            return {
              ...prev,
              [selectedChannelId]: list.map((m) =>
                m.id === activeThreadMessage.id ? { ...m, threadCount: (m.threadCount || 0) + 1 } : m
              ),
            };
          });
        }
      } catch (err) {
        console.error('Failed to send thread reply via REST:', err);
      }
    }
  };

  // Bot Event Trigger Simulation (Real GitHub PR or Sentry Bug Alert)
  const handleTriggerBotEvent = (type: 'github' | 'sentry') => {
    const botMsg: WorkplaceMessage =
      type === 'github'
        ? {
            id: `msg_bot_${Date.now()}`,
            channelId: selectedChannelId,
            senderId: 'bot_github',
            senderName: 'GitHub Enterprise Bot',
            senderColor: '#24292e',
            senderRole: 'Tích hợp CI/CD',
            content: 'Pull Request #114 đã được merge thành công vào nhánh main bởi Lê Hoàng!',
            timestamp: Date.now(),
            type: 'bot_alert',
            reactions: [{ emoji: '🚀', count: 3, users: ['usr_nam', 'usr_hoang', 'usr_alice'] }],
            botInfo: {
              source: 'github',
              eventTitle: 'PR #114: Tối ưu bộ đệm State Vector CRDT',
              eventMeta: 'Branch: main • 4 files changed • CI checks: Passed',
              statusBadge: 'Merged',
            },
          }
        : {
            id: `msg_bot_${Date.now()}`,
            channelId: selectedChannelId,
            senderId: 'bot_sentry',
            senderName: 'Sentry Error Monitoring',
            senderColor: '#e03e2d',
            senderRole: 'Hệ thống Cảnh báo',
            content: 'Cảnh báo: Phát hiện lỗi ngoại lệ kết nối WebSocket trên cụm ws-node-2!',
            timestamp: Date.now(),
            type: 'bot_alert',
            reactions: [{ emoji: '👀', count: 2, users: ['usr_nam', 'usr_hoang'] }],
            botInfo: {
              source: 'sentry',
              eventTitle: 'Exception: WebSocket Connection Timeout (Node 2)',
              eventMeta: 'Tags: env=staging, cluster=asia-southeast1 • Level: High',
              statusBadge: 'Khẩn cấp',
            },
          };

    setMessages((prev) => ({
      ...prev,
      [selectedChannelId]: [...(prev[selectedChannelId] || []), botMsg],
    }));
    showToast(`Đã nhận thông báo bot tự động từ ${type.toUpperCase()}!`);
  };

  // ------------------------------------------
  // Pillar 2 Meeting Functions
  // ------------------------------------------
  // Real iCalendar (.ics) download for Google Calendar / Outlook
  const handleGenerateCalendarFile = () => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Collaborative Workspace//Meeting Scheduler//VI
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
SUMMARY:${scheduleTitle}
DESCRIPTION:Cuộc họp trao đổi nhóm kết hợp chia sẻ màn hình và phụ đề AI. Liên kết: https://meet.collab.vn/room-sprint
STATUS:CONFIRMED
DTSTART:${scheduleDate.replace(/-/g, '')}T${scheduleTime.replace(/:/g, '')}00Z
DTEND:${scheduleDate.replace(/-/g, '')}T${scheduleTime.replace(/:/g, '')}45Z
LOCATION:Phòng Họp Không Gian Cộng Tác (WebRTC)
ORGANIZER;CN=Nguyễn Văn Nam:mailto:nam.nguyen@collab.vn
ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;CN=Alice Tech:mailto:alice@collab.vn
ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;CN=Trần Thị Linh:mailto:linh.tran@collab.vn
ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;CN=Lê Hoàng:mailto:hoang.le@collab.vn
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cuoc-hop-${scheduleDate}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setScheduleModalOpen(false);
    showToast('Đã tải xuống file lịch (.ics) tương thích Google Calendar & Outlook!');
  };

  // In-Meeting Chat Send
  const handleSendInMeetingChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inMeetingChatInput.trim()) return;

    setInMeetingChatMessages((prev) => [
      ...prev,
      {
        sender: 'Nguyễn Văn Nam (Bạn)',
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        text: inMeetingChatInput.trim(),
        isSelf: true,
      },
    ]);
    setInMeetingChatInput('');
  };

  // Sync Meeting Action Items to Kanban
  const handleSyncAllActionItemsToKanban = () => {
    if (!aiMeetingSummary) return;

    try {
      const stored = localStorage.getItem('collab_kanban_external_tasks');
      const currentList = stored ? JSON.parse(stored) : [];
      aiMeetingSummary.actionItems.forEach((act, idx) => {
        currentList.push({
          id: `task_ai_${Date.now()}_${idx}`,
          title: act.task,
          description: `Việc được AI trích xuất tự động từ phiên họp Sprint Review. Phụ trách: ${act.owner}`,
          column: 'todo',
          priority: 'high',
          assigneeName: act.owner,
          dueDate: act.deadline,
          createdAt: Date.now(),
        });
      });
      localStorage.setItem('collab_kanban_external_tasks', JSON.stringify(currentList));
      window.dispatchEvent(new CustomEvent('collab_task_created'));
      showToast('Đã tự động tạo 3 thẻ việc từ biên bản AI lên bảng Kanban!');
    } catch {
      showToast('Đã đồng bộ việc cần làm lên Kanban.');
    }
  };

  // ------------------------------------------
  // Pillar 3 & 4 Functions
  // ------------------------------------------
  // Real Accept Suggestion in Contextual Document or Spreadsheet
  const handleAcceptSuggestionInDoc = (comment: ContextualComment) => {
    if (!comment.suggestedReplacement || !comment.selectedText) return;

    if (comment.mediaType === 'spreadsheet') {
      setSelectedCellData((prev) => ({ ...prev, value: comment.suggestedReplacement! }));
    } else {
      setDocSnippetText((prev) => prev.replace(comment.selectedText!, comment.suggestedReplacement!));
    }

    setComments((prev) =>
      prev.map((c) =>
        c.id === comment.id ? { ...c, suggestionStatus: 'accepted' as const, resolved: true } : c
      )
    );
    showToast(`Đã chấp nhận đề xuất! Nội dung đã được tự động cập nhật vào tài liệu.`);
  };

  const handleRejectSuggestionInDoc = (commentId: string) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, suggestionStatus: 'rejected' as const } : c
      )
    );
    showToast('Đã từ chối đề xuất chỉnh sửa.');
  };

  // Add Comment from Document / Spreadsheet / Design Selection
  const handleAddDocComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docCommentInput.trim() && !docSuggestInput.trim() && !hasAudioAttached && !hasVideoAttached) return;

    const assignedUser = taskAssigneeTarget ? SEED_USERS.find((u) => u.id === taskAssigneeTarget) : null;

    const newCmt: ContextualComment = {
      id: `cmt_ctx_${Date.now()}`,
      documentId: 'doc_rfc_consensus',
      documentTitle:
        commentMediaView === 'spreadsheet'
          ? 'Bảng Tính Dự Báo Tài Chính Q4-2026'
          : commentMediaView === 'design'
          ? 'Bản Thiết Kế Trực Quan UI Workspace'
          : 'Báo Cáo Kiến Trúc Đồng Thuận CRDT v4',
      mediaType: commentMediaView,
      cellLocation: commentMediaView === 'spreadsheet' ? selectedCellCoord : undefined,
      authorName: 'Nguyễn Văn Nam',
      authorColor: '#2563eb',
      authorRole: 'Trưởng nhóm Kỹ thuật (Lead)',
      selectedText: docSelectedRange || (commentMediaView === 'spreadsheet' ? `Ô ${selectedCellCoord}: ${selectedCellData.value}` : 'Vùng đã chọn'),
      content: docCommentInput.trim() || (docInputMode === 'suggest' ? 'Đề xuất chỉnh sửa nội dung:' : 'Ghi chú thảo luận'),
      isSuggestion: docInputMode === 'suggest',
      suggestedReplacement: docInputMode === 'suggest' ? docSuggestInput.trim() : undefined,
      suggestionStatus: docInputMode === 'suggest' ? 'pending' : undefined,
      isVoiceComment: hasAudioAttached,
      voiceDurationSec: hasAudioAttached ? 18 : undefined,
      isVideoComment: hasVideoAttached,
      videoDurationSec: hasVideoAttached ? 42 : undefined,
      resolved: false,
      timestamp: Date.now(),
      reactions: [{ emoji: '👍', count: 1, users: ['usr_nam'] }],
      replies: [],
      mentions: docCommentInput.includes('@') ? [docCommentInput.slice(docCommentInput.indexOf('@')).split(' ')[0]] : [],
      assignedTask: isTaskAssignmentOpen && assignedUser ? {
        taskId: `task_from_cmt_${Date.now()}`,
        assignee: assignedUser.name,
        deadline: taskDeadlineTarget,
      } : undefined,
    };

    // Forward to Kanban if task assignment active
    if (isTaskAssignmentOpen && assignedUser) {
      try {
        const stored = localStorage.getItem('collab_kanban_external_tasks');
        const tasks = stored ? JSON.parse(stored) : [];
        tasks.push({
          id: `task_from_cmt_${Date.now()}`,
          title: `[Tài liệu] ${docCommentInput.trim().slice(0, 50) || 'Nhiệm vụ từ bình luận'}...`,
          description: `Giao việc từ bình luận: "${docCommentInput.trim()}"\nVị trí: "${docSelectedRange}"`,
          column: 'todo',
          priority: 'high',
          assigneeName: assignedUser.name,
          assigneeColor: assignedUser.avatarColor,
          dueDate: taskDeadlineTarget,
          createdAt: Date.now(),
          labels: ['Tài liệu', 'Review'],
        });
        localStorage.setItem('collab_kanban_external_tasks', JSON.stringify(tasks));
        window.dispatchEvent(new CustomEvent('collab_task_created'));
      } catch {}
    }

    setComments((prev) => [newCmt, ...prev]);
    setSelectedCommentId(newCmt.id);
    setDocCommentInput('');
    setDocSuggestInput('');
    setHasAudioAttached(false);
    setHasVideoAttached(false);
    setIsTaskAssignmentOpen(false);
    showToast('Đã thêm bình luận trực tiếp đúng vị trí ngữ cảnh!');
  };

  // Add Inline Reply to a Document Comment
  const handleAddDocCommentReply = (commentId: string) => {
    if (!replyInputText.trim()) return;

    const newReply = {
      id: `rep_ctx_${Date.now()}`,
      authorName: 'Nguyễn Văn Nam',
      authorColor: '#2563eb',
      content: replyInputText.trim(),
      timestamp: Date.now(),
    };

    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, replies: [...(c.replies || []), newReply] } : c
      )
    );
    setReplyInputText('');
    setReplyInputCommentId(null);
    showToast('Đã gửi câu trả lời vào chuỗi bình luận!');
  };

  // Toggle Reactions on Document Comment
  const handleToggleDocCommentReaction = (commentId: string, emoji: string) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        const reactions = c.reactions || [];
        const found = reactions.find((r) => r.emoji === emoji);
        let updated;
        if (found) {
          if (found.users.includes('usr_nam')) {
            updated = reactions
              .map((r) =>
                r.emoji === emoji
                  ? { ...r, count: r.count - 1, users: r.users.filter((u) => u !== 'usr_nam') }
                  : r
              )
              .filter((r) => r.count > 0);
          } else {
            updated = reactions.map((r) =>
              r.emoji === emoji ? { ...r, count: r.count + 1, users: [...r.users, 'usr_nam'] } : r
            );
          }
        } else {
          updated = [...reactions, { emoji, count: 1, users: ['usr_nam'] }];
        }
        return { ...c, reactions: updated };
      })
    );
  };

  // 1-Click Convert Comment to Kanban Task
  const handleConvertCommentToTask = (comment: ContextualComment) => {
    try {
      const stored = localStorage.getItem('collab_kanban_external_tasks');
      const tasks = stored ? JSON.parse(stored) : [];
      const assignee = comment.mentions?.[0]?.replace('@', '') || 'Trần Thị Linh';
      const deadline = '2026-10-05';
      const newTask = {
        id: `task_from_cmt_${Date.now()}`,
        title: `[Xử lý bình luận] ${comment.content.slice(0, 50)}...`,
        description: `Giao việc từ bình luận: "${comment.content}"\nNgữ cảnh: "${comment.targetText || comment.selectedText || ''}"`,
        column: 'todo',
        priority: 'high',
        assigneeName: assignee,
        assigneeColor: '#ec4899',
        dueDate: deadline,
        createdAt: Date.now(),
        labels: ['Bình luận', 'Tài liệu'],
      };
      tasks.push(newTask);
      localStorage.setItem('collab_kanban_external_tasks', JSON.stringify(tasks));
      window.dispatchEvent(new CustomEvent('collab_task_created'));

      setComments((prev) =>
        prev.map((c) =>
          c.id === comment.id
            ? {
                ...c,
                assignedTask: {
                  taskId: newTask.id,
                  assignee: assignee,
                  deadline: deadline,
                },
              }
            : c
        )
      );
      showToast(`Đã tạo task trên Kanban giao cho @${assignee} (Hạn: ${deadline})!`);
    } catch {
      showToast('Đã chuyển phản hồi thành nhiệm vụ!');
    }
  };

  // Voice Note Recorder Simulator
  const handleStartVoiceRecording = () => {
    if (!isRecordingAudio) {
      setIsRecordingAudio(true);
      setTimeout(() => {
        setIsRecordingAudio(false);
        setHasAudioAttached(true);
        showToast('Đã ghi âm ghi chú thoại (0:18) đính kèm vào bình luận!');
      }, 2000);
    }
  };

  // Loom Short Video Simulator
  const handleAttachLoomVideo = () => {
    setHasVideoAttached(true);
    showToast('Đã đính kèm video clip Loom (0:42) vào đề xuất!');
  };

  // Watch / Unwatch Document Toggle
  const handleToggleWatchDoc = () => {
    const next = !isDocumentWatched;
    setIsDocumentWatched(next);
    showToast(
      next
        ? '🔔 Đã bật theo dõi tài liệu! Bạn sẽ nhận thông báo khi có bất kỳ ai chỉnh sửa.'
        : '🔕 Đã hủy theo dõi tài liệu.'
    );
  };

  // Desktop Push Notification Requester & Trigger
  const handleTriggerDesktopPush = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification('Collab Workspace • Trần Thị Linh', {
            body: 'Linh vừa nhắc bạn: "@Nam kiểm tra lại độ trễ kết nối CRDT trước 17h"',
            icon: '/favicon.ico',
          });
          showToast('Đã phát thông báo nổi Desktop qua Web Notification API!');
        } catch {
          showToast('Thông báo Desktop: Trần Thị Linh vừa nhắc tên bạn.');
        }
      } else {
        Notification.requestPermission().then((res) => {
          showToast(`Quyền thông báo Desktop: ${res}`);
          if (res === 'granted') {
            try {
              new Notification('Collab Workspace', {
                body: 'Thông báo Desktop đã được kích hoạt thành công!',
              });
            } catch {}
          }
        });
      }
    } else {
      showToast('Trình duyệt không hỗ trợ Web Notification API.');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-60 bg-zinc-900 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-zinc-700 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-zinc-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 md:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
              <span>Giao Tiếp Nhóm Gắn Liền Ngữ Cảnh Công Việc</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900">
              Kênh Dự Án, Họp Trực Tuyến &amp; Bình Luận Nội Dung
            </h1>
            <p className="text-zinc-500 text-xs md:text-sm leading-relaxed">
              Tất cả cuộc trao đổi, phòng thoại Huddle, họp video chia sẻ màn hình và bình luận gắn chặt vào đúng tài liệu và công việc cần xử lý.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            <div className="bg-zinc-50/80 rounded-2xl border border-zinc-200/60 p-3.5 text-center min-w-[110px]">
              <span className="text-[10px] font-semibold text-zinc-400 block uppercase tracking-wider">Kênh Hoạt Động</span>
              <span className="text-lg font-bold text-zinc-900">{channels.length} Kênh</span>
              <span className="text-[10px] text-blue-600 font-medium block">4 Danh mục</span>
            </div>
            <div className="bg-zinc-50/80 rounded-2xl border border-zinc-200/60 p-3.5 text-center min-w-[110px]">
              <span className="text-[10px] font-semibold text-zinc-400 block uppercase tracking-wider">Huddle Thoại</span>
              <span className="text-lg font-bold text-emerald-600">Sẵn sàng</span>
              <span className="text-[10px] text-emerald-600 font-medium block">1-click vào phòng</span>
            </div>
            <div className="bg-zinc-50/80 rounded-2xl border border-zinc-200/60 p-3.5 text-center min-w-[110px]">
              <span className="text-[10px] font-semibold text-zinc-400 block uppercase tracking-wider">Bình Luận Doc</span>
              <span className="text-lg font-bold text-amber-600">{comments.filter((c) => !c.resolved).length} Mở</span>
              <span className="text-[10px] text-zinc-500 font-medium block">Track changes</span>
            </div>
            <div className="bg-zinc-50/80 rounded-2xl border border-zinc-200/60 p-3.5 text-center min-w-[110px]">
              <span className="text-[10px] font-semibold text-zinc-400 block uppercase tracking-wider">Chống Quá Tải</span>
              <span className={`text-lg font-bold ${isDndActive ? 'text-rose-600' : 'text-emerald-600'}`}>
                {isDndActive ? 'Bật DND' : 'Bình thường'}
              </span>
              <span className="text-[10px] text-zinc-500 font-medium block">Smart Digest</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Segmented Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100/90 rounded-2xl border border-zinc-200/80">
          <button
            onClick={() => setActiveTab('channels')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'channels'
                ? 'bg-white text-zinc-900 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Hash className="w-3.5 h-3.5 text-blue-600" />
            <span>1. Kênh Dự Án &amp; Tin Nhắn ({channels.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('meetings')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'meetings'
                ? 'bg-white text-zinc-900 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-purple-600" />
            <span>2. Họp Video &amp; Huddle Thoại</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>

          <button
            onClick={() => setActiveTab('comments')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'comments'
                ? 'bg-white text-zinc-900 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
            <span>3. Bình Luận &amp; Gợi Ý Sửa</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'notifications'
                ? 'bg-white text-zinc-900 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-rose-500" />
            <span>4. Trung Tâm Thông Báo</span>
            <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded-full text-[10px] font-bold">
              {notifications.filter((n) => !n.isRead).length}
            </span>
          </button>
        </div>

        {/* Global Action Right */}
        <div className="flex items-center gap-2">
          {activeTab === 'channels' && (
            <>
              <button
                onClick={() => setCreateChannelModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo kênh mới</span>
              </button>
              <button
                onClick={() => setInviteGuestModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 rounded-xl text-xs font-semibold transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                <span>Mời đối tác ngoài</span>
              </button>
            </>
          )}

          {activeTab === 'meetings' && (
            <button
              onClick={() => setScheduleModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Đặt lịch họp (Calendar)</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: NHẮN TIN THEO KÊNH, CHỦ ĐỀ, DỰ ÁN (CHANNELS & THREADS) */}
      {/* ========================================================================= */}
      {activeTab === 'channels' && (
        <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs overflow-hidden flex flex-col md:flex-row h-[720px]">
          {/* Left Column: Channels Explorer List */}
          <div className="w-full md:w-72 border-r border-zinc-200/80 flex flex-col h-full bg-zinc-50/60 shrink-0">
            {/* User Presence Card */}
            <div className="p-3 border-b border-zinc-200/60 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative">
                  <div className="w-7 h-7 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow-xs">
                    N
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full absolute -bottom-0.5 -right-0.5 ring-1 ring-white ${
                      selectedUserPresence === 'online'
                        ? 'bg-emerald-500'
                        : selectedUserPresence === 'meeting'
                        ? 'bg-amber-500'
                        : selectedUserPresence === 'dnd'
                        ? 'bg-rose-500'
                        : 'bg-zinc-400'
                    }`}
                  />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-zinc-900 truncate">Nguyễn Văn Nam</p>
                  <select
                    value={selectedUserPresence}
                    onChange={(e) => {
                      setSelectedUserPresence(e.target.value as any);
                      showToast(`Đã đổi trạng thái sang "${e.target.value}".`);
                    }}
                    className="text-[10px] text-zinc-500 bg-transparent focus:outline-none cursor-pointer"
                  >
                    <option value="online">🟢 Trực tuyến</option>
                    <option value="meeting">🟡 Đang họp</option>
                    <option value="dnd">🔴 Không làm phiền</option>
                    <option value="away">⚪ Ra ngoài</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => setCreateChannelModalOpen(true)}
                className="p-1 text-zinc-400 hover:text-zinc-900 rounded-lg hover:bg-zinc-100"
                title="Tạo kênh mới"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Channel Search & Quick Filters */}
            <div className="p-3 space-y-2 border-b border-zinc-200/60 bg-white shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm tin nhắn, tệp, người gửi..."
                  value={channelSearch}
                  onChange={(e) => setChannelSearch(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-zinc-100/80 border border-zinc-200/50 rounded-xl text-xs text-zinc-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-1.5 text-[10px]">
                <button
                  onClick={() => setPinnedOnlyFilter(!pinnedOnlyFilter)}
                  className={`px-2 py-0.5 rounded-lg border transition-colors flex items-center gap-1 ${
                    pinnedOnlyFilter
                      ? 'bg-amber-100 border-amber-300 text-amber-900 font-semibold'
                      : 'border-zinc-200 text-zinc-500 hover:bg-zinc-100'
                  }`}
                >
                  <Pin className="w-2.5 h-2.5" />
                  <span>Ghim</span>
                </button>
                <button
                  onClick={() => setBookmarkedOnlyFilter(!bookmarkedOnlyFilter)}
                  className={`px-2 py-0.5 rounded-lg border transition-colors flex items-center gap-1 ${
                    bookmarkedOnlyFilter
                      ? 'bg-blue-100 border-blue-300 text-blue-900 font-semibold'
                      : 'border-zinc-200 text-zinc-500 hover:bg-zinc-100'
                  }`}
                >
                  <Bookmark className="w-2.5 h-2.5" />
                  <span>Đã lưu</span>
                </button>
              </div>
            </div>

            {/* Channels Categorized List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {(['project', 'team', 'topic', 'external', 'dm'] as const).map((cat) => {
                const groupChannels = channels.filter((c) => c.category === cat);
                if (groupChannels.length === 0) return null;

                const label =
                  cat === 'project'
                    ? 'Kênh Dự Án'
                    : cat === 'team'
                    ? 'Kênh Phòng Ban / Nhóm'
                    : cat === 'topic'
                    ? 'Kênh Theo Chủ Đề'
                    : cat === 'external'
                    ? 'Kênh Đối Tác / Khách Ngoài'
                    : '💬 Nhắn Tin Trực Tiếp 1-1';

                return (
                  <div key={cat} className="space-y-1">
                    <span className="px-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      {label}
                    </span>
                    <div className="space-y-0.5">
                      {groupChannels.map((c) => {
                        const isSelected = c.id === selectedChannelId;
                        return (
                          <button
                            key={c.id}
                            onClick={() => {
                              setSelectedChannelId(c.id);
                              setActiveThreadMessage(null);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                              isSelected
                                ? 'bg-zinc-900 text-white font-semibold shadow-2xs'
                                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {c.category === 'dm' ? (
                                <div className="relative shrink-0">
                                  <div
                                    className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-2xs"
                                    style={{ backgroundColor: c.name.includes('Linh') ? '#ec4899' : c.name.includes('Hoàng') ? '#f59e0b' : '#8b5cf6' }}
                                  >
                                    {c.name.charAt(0)}
                                  </div>
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute -bottom-0.5 -right-0.5 ring-1 ring-white" />
                                </div>
                              ) : c.isPrivate ? (
                                <Lock className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-zinc-400'}`} />
                              ) : c.category === 'external' ? (
                                <Globe className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-emerald-500'}`} />
                              ) : (
                                <Hash className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-zinc-400'}`} />
                              )}
                              <span className="truncate">{c.category === 'dm' ? c.name : c.name}</span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {c.hasActiveHuddle && (
                                <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-bold bg-emerald-950/40 px-1 rounded">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Huddle
                                </span>
                              )}
                              {c.unreadCount ? (
                                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                                  {c.unreadCount}
                                </span>
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center Column: Channel Message Feed */}
          <div className="flex-1 flex flex-col h-full min-w-0 bg-white">
            {/* Channel Top Header */}
            <div className="h-16 px-5 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-white">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {selectedChannel.category === 'dm' ? (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-2xs shrink-0"
                      style={{ backgroundColor: selectedChannel.name.includes('Linh') ? '#ec4899' : selectedChannel.name.includes('Hoàng') ? '#f59e0b' : '#8b5cf6' }}
                    >
                      {selectedChannel.name.charAt(0)}
                    </div>
                  ) : selectedChannel.isPrivate ? (
                    <Lock className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <Hash className="w-4 h-4 text-zinc-400" />
                  )}
                  <h2 className="text-sm font-bold text-zinc-900 truncate">
                    {selectedChannel.name}
                  </h2>
                  {selectedChannel.category === 'dm' ? (
                    <span className="flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Trực tuyến • Tin nhắn 1-1 mã hóa E2E
                    </span>
                  ) : selectedChannel.category === 'external' ? (
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Kênh chia sẻ ngoài
                    </span>
                  ) : null}
                </div>
                <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                  {selectedChannel.category === 'dm'
                    ? `${selectedChannel.description} • Đồng bộ thời gian thực qua Server WebSocket & PostgreSQL`
                    : `${selectedChannel.description} • ${selectedChannel.memberCount} thành viên`}
                </p>
              </div>

              {/* Channel Quick Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Instant Huddle Button */}
                <button
                  onClick={() => {
                    setIsHuddleActive(!isHuddleActive);
                    showToast(isHuddleActive ? 'Đã rời Huddle.' : `Đã tham gia phòng thoại Huddle trong #${selectedChannel.name}!`);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isHuddleActive
                      ? 'bg-emerald-600 text-white shadow-2xs animate-pulse'
                      : 'border border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                  }`}
                  title="Họp ngay (Huddle thoại tức thì)"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>{isHuddleActive ? 'Huddle Đang mở' : 'Họp nhanh (Huddle)'}</span>
                </button>

                {/* Audio Call Quick Button */}
                <button
                  onClick={() => {
                    handleStartMeeting(`Cuộc gọi thoại: #${selectedChannel.name}`, `meet.collab.io/${selectedChannel.name}`, true);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-semibold transition-colors"
                  title="Gọi thoại 1-1 hoặc theo nhóm"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-zinc-600" />
                  <span className="hidden md:inline">Gọi thoại</span>
                </button>

                {/* Video Meeting Quick Button */}
                <button
                  onClick={() => {
                    handleStartMeeting(`Họp video: #${selectedChannel.name}`, `meet.collab.io/${selectedChannel.name}`, false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                  title="Bắt đầu cuộc họp Google Meet ngay"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Họp video</span>
                </button>

                {/* Simulated Bot Trigger Dropdown */}
                <div className="relative group">
                  <button className="p-1.5 text-zinc-400 hover:text-zinc-800 rounded-lg hover:bg-zinc-100">
                    <Sliders className="w-4 h-4" />
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-2xl shadow-xl border border-zinc-200/90 py-1.5 z-40 hidden group-hover:block">
                    <div className="px-3 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      Thử nghiệm Bot
                    </div>
                    <button
                      onClick={() => handleTriggerBotEvent('github')}
                      className="w-full text-left px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>GitHub: PR Merged</span>
                    </button>
                    <button
                      onClick={() => handleTriggerBotEvent('sentry')}
                      className="w-full text-left px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span>Sentry: Báo lỗi khẩn</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Huddle Banner inside Channel */}
            {isHuddleActive && (
              <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-200/80 flex items-center justify-between text-xs text-emerald-900 shrink-0 animate-in slide-in-from-top-1">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>Huddle Thoại Đang Chạy</span>
                  </span>
                  <div className="flex items-center gap-1 font-mono text-[11px] text-emerald-700">
                    <span className="w-1 h-3 bg-emerald-500 animate-pulse" />
                    <span className="w-1 h-2 bg-emerald-500 animate-pulse" />
                    <span className="w-1 h-4 bg-emerald-500 animate-pulse" />
                    <span className="ml-1">3 người trong phòng • Nói chuyện tức thì</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsHuddleMuted(!isHuddleMuted)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      isHuddleMuted ? 'bg-rose-500 text-white' : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {isHuddleMuted ? 'Bật Mic' : 'Tắt Mic'}
                  </button>
                  <button
                    onClick={() => setIsHuddleActive(false)}
                    className="px-2.5 py-1 bg-white border border-emerald-200 rounded-lg text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                  >
                    Rời phòng
                  </button>
                </div>
              </div>
            )}

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {channelMessages.length === 0 ? (
                <div className="text-center py-20 text-zinc-400 text-xs">
                  Chưa có tin nhắn nào phù hợp bộ lọc trong kênh này. Hãy gửi tin nhắn đầu tiên!
                </div>
              ) : (
                channelMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`group rounded-2xl p-3 hover:bg-zinc-50/80 transition-colors flex items-start gap-3.5 ${
                      msg.isPinned ? 'border border-amber-200/80 bg-amber-50/20' : ''
                    }`}
                  >
                    {/* Sender Avatar */}
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-2xs"
                      style={{ backgroundColor: msg.senderColor }}
                    >
                      {msg.senderName.slice(0, 1).toUpperCase()}
                    </div>

                    {/* Message Body */}
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Name & Timestamp */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-900">{msg.senderName}</span>
                        {msg.senderRole && (
                          <span className="text-[10px] text-zinc-400 font-mono font-normal">
                            • {msg.senderRole}
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>

                        {msg.isPinned && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-700 font-semibold bg-amber-100 px-1.5 py-0.2 rounded-md">
                            <Pin className="w-2.5 h-2.5" /> Ghim
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <p className="text-xs text-zinc-700 leading-relaxed font-sans">{msg.content}</p>

                      {/* Real Image or File Attachment Card */}
                      {msg.attachment && (
                        <div className="mt-2">
                          {msg.type === 'image' ? (
                            <div className="rounded-2xl overflow-hidden border border-zinc-200 max-w-sm">
                              <img
                                src={msg.attachment.url}
                                alt={msg.attachment.fileName}
                                className="w-full h-auto max-h-56 object-cover"
                              />
                              <div className="p-2 bg-zinc-50 flex items-center justify-between text-[11px] text-zinc-600">
                                <span>{msg.attachment.fileName}</span>
                                <span className="font-mono text-[10px]">{msg.attachment.fileSize}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-center justify-between max-w-md">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="truncate">
                                  <p className="text-xs font-semibold text-zinc-900 truncate">{msg.attachment.fileName}</p>
                                  <p className="text-[10px] text-zinc-400 font-mono">{msg.attachment.fileSize}</p>
                                </div>
                              </div>
                              <a
                                href={msg.attachment.url}
                                download={msg.attachment.fileName}
                                className="p-1.5 hover:bg-zinc-200 rounded-lg text-zinc-600"
                                title="Tải xuống tệp"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Bot Card Component */}
                      {msg.botInfo && (
                        <div className="mt-2 p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 space-y-1 text-xs max-w-md">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-zinc-900">{msg.botInfo.eventTitle}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {msg.botInfo.statusBadge}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-600">{msg.botInfo.eventMeta}</p>
                        </div>
                      )}

                      {/* Task Created Card */}
                      {msg.taskInfo && (
                        <div className="mt-2 p-3 bg-blue-50/60 rounded-xl border border-blue-200/70 space-y-1.5 text-xs max-w-md">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-blue-900 flex items-center gap-1.5">
                              <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                              <span>{msg.taskInfo.taskTitle}</span>
                            </span>
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800">
                              {msg.taskInfo.priority}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-zinc-600">
                            <span>Phụ trách: <strong>{msg.taskInfo.assigneeName}</strong></span>
                            <span>Hạn: <strong>{msg.taskInfo.deadline}</strong></span>
                            <Link href="/tasks" className="text-blue-600 hover:underline font-semibold ml-auto">
                              Xem trên Kanban ➔
                            </Link>
                          </div>
                        </div>
                      )}

                      {/* Reactions Pills */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {msg.reactions.map((r, i) => (
                          <button
                            key={i}
                            onClick={() => handleToggleReaction(msg.id, r.emoji)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors ${
                              r.users.includes('usr_nam')
                                ? 'bg-blue-100 border border-blue-300 text-blue-800 font-bold'
                                : 'bg-zinc-100 border border-zinc-200/80 text-zinc-600 hover:bg-zinc-200'
                            }`}
                          >
                            <span>{r.emoji}</span>
                            <span className="font-mono text-[10px]">{r.count}</span>
                          </button>
                        ))}

                        {/* Thread Counter Link */}
                        {msg.threadCount ? (
                          <button
                            onClick={() => setActiveThreadMessage(msg)}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold text-blue-600 hover:bg-blue-50 transition-colors ml-1"
                          >
                            <Reply className="w-3 h-3" />
                            <span>{msg.threadCount} câu trả lời</span>
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {/* Floating Hover Action Menu */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white border border-zinc-200/90 rounded-xl p-1 shadow-xs shrink-0">
                      {['👍', '❤️', '🚀', '👀'].map((em) => (
                        <button
                          key={em}
                          onClick={() => handleToggleReaction(msg.id, em)}
                          className="p-1 hover:bg-zinc-100 rounded-lg text-xs"
                        >
                          {em}
                        </button>
                      ))}

                      {/* Reply in Thread */}
                      <button
                        onClick={() => setActiveThreadMessage(msg)}
                        className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-zinc-900"
                        title="Trả lời trong Chuỗi Thread"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>

                      {/* Pin Button */}
                      <button
                        onClick={() => {
                          setMessages((prev) => {
                            const list = prev[selectedChannelId] || [];
                            return {
                              ...prev,
                              [selectedChannelId]: list.map((m) =>
                                m.id === msg.id ? { ...m, isPinned: !m.isPinned } : m
                              ),
                            };
                          });
                          showToast('Đã cập nhật trạng thái ghim tin nhắn.');
                        }}
                        className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-amber-600"
                        title="Ghim tin nhắn"
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>

                      {/* Bookmark Button */}
                      <button
                        onClick={() => {
                          setMessages((prev) => {
                            const list = prev[selectedChannelId] || [];
                            return {
                              ...prev,
                              [selectedChannelId]: list.map((m) =>
                                m.id === msg.id ? { ...m, isBookmarked: !m.isBookmarked } : m
                              ),
                            };
                          });
                          showToast('Đã lưu tin nhắn vào danh sách xem sau.');
                        }}
                        className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-blue-600"
                        title="Đánh dấu xem sau"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                      </button>

                      {/* Forward Message Button */}
                      <button
                        onClick={() => setForwardModalMessage(msg)}
                        className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-blue-600"
                        title="Chuyển tiếp sang kênh khác"
                      >
                        <Forward className="w-3.5 h-3.5" />
                      </button>

                      {/* Turn into Task Button */}
                      <button
                        onClick={() => setTaskModalMessage(msg)}
                        className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-emerald-600"
                        title="Biến tin nhắn này thành Task trên Kanban"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}

              {/* Real-time Typing Indicator for 1-1 DMs */}
              {isPartnerTyping && selectedChannel.category === 'dm' && (
                <div className="flex items-center gap-2 text-xs text-zinc-500 py-1 px-2 animate-in fade-in duration-200">
                  <div className="flex items-center gap-1 bg-zinc-100 px-3 py-1.5 rounded-2xl border border-zinc-200/60 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[11px] text-zinc-400 font-medium">{selectedChannel.name} đang soạn tin nhắn...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Box */}
            <div className="p-3.5 border-t border-zinc-100 bg-white">
              <div className="border border-zinc-200/90 rounded-2xl p-2.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all bg-zinc-50/50">
                <textarea
                  value={messageInput}
                  onChange={handleMessageInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={2}
                  placeholder={
                    selectedChannel.category === 'dm'
                      ? `Nhắn tin trực tiếp với ${selectedChannel.name}... (Gõ Enter để gửi, Shift+Enter xuống dòng)`
                      : `Nhắn tin trong #${selectedChannel.name}... (Gõ Enter để gửi, Shift+Enter xuống dòng)`
                  }
                  className="w-full bg-transparent text-xs text-zinc-900 focus:outline-none resize-none placeholder-zinc-400"
                />

                <div className="flex items-center justify-between pt-1 border-t border-zinc-200/40 relative">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    {/* Hidden Real File Input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    {/* Paperclip Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1 hover:text-zinc-700 rounded"
                      title="Đính kèm tệp / hình ảnh từ máy tính"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                    </button>

                    {/* Mic Button: Real Audio Recorder */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!isRecordingAudioMsg) {
                          setIsRecordingAudioMsg(true);
                          showToast('Đang ghi âm ghi chú thoại... Nhấn lại để hoàn tất.');
                        } else {
                          setIsRecordingAudioMsg(false);
                          const audioMsg: WorkplaceMessage = {
                            id: `msg_audio_${Date.now()}`,
                            channelId: selectedChannelId,
                            senderId: 'usr_nam',
                            senderName: 'Nguyễn Văn Nam',
                            senderColor: '#2563eb',
                            senderRole: 'Lead Engineer',
                            content: 'Đã gửi một ghi chú thoại (0:12) 🎙️',
                            timestamp: Date.now(),
                            type: 'audio',
                            reactions: [{ emoji: '👍', count: 1, users: ['usr_nam'] }],
                            threadCount: 0,
                          };
                          setMessages((prev) => ({
                            ...prev,
                            [selectedChannelId]: [...(prev[selectedChannelId] || []), audioMsg],
                          }));
                          showToast('Đã gửi ghi chú thoại vào kênh!');
                        }
                      }}
                      className={`p-1 rounded ${
                        isRecordingAudioMsg ? 'text-rose-600 bg-rose-50 animate-pulse' : 'hover:text-zinc-700'
                      }`}
                      title="Ghi âm ghi chú thoại"
                    >
                      <Mic className="w-3.5 h-3.5" />
                    </button>

                    {/* Emoji Popover Button */}
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-1 hover:text-zinc-700 rounded relative"
                      title="Bộ chọn biểu tượng cảm xúc (Emoji)"
                    >
                      <Smile className="w-3.5 h-3.5" />
                    </button>

                    {/* Emoji Popover Menu */}
                    {showEmojiPicker && (
                      <div className="absolute left-10 bottom-full mb-2 bg-white rounded-2xl shadow-xl border border-zinc-200 p-2 z-50 grid grid-cols-8 gap-1">
                        {['👍', '❤️', '🚀', '👀', '🎉', '🔥', '💡', '👏', '😂', '🙏', '📋', '💯', '🤝', '🎯', '⚡', '🔔'].map(
                          (em) => (
                            <button
                              key={em}
                              type="button"
                              onClick={() => {
                                setMessageInput((prev) => prev + em);
                                setShowEmojiPicker(false);
                              }}
                              className="p-1.5 hover:bg-zinc-100 rounded-lg text-sm"
                            >
                              {em}
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={!messageInput.trim()}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    <span>Gửi</span>
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Thread Side Panel */}
          {activeThreadMessage && (
            <div className="w-full md:w-80 border-l border-zinc-200/80 bg-zinc-50/40 flex flex-col h-full shrink-0 animate-in slide-in-from-right duration-200">
              <div className="h-16 px-4 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-white">
                <div>
                  <h3 className="text-xs font-bold text-zinc-900">Chuỗi Trả Lời (Thread)</h3>
                  <span className="text-[10px] text-zinc-400 font-mono">#{selectedChannel.name}</span>
                </div>
                <button
                  onClick={() => setActiveThreadMessage(null)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Thread Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Parent Message Card */}
                <div className="p-3 bg-white rounded-2xl border border-zinc-200/80 shadow-2xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-900">{activeThreadMessage.senderName}</span>
                    <span className="text-[10px] text-zinc-400 font-mono">Gốc</span>
                  </div>
                  <p className="text-xs text-zinc-700">{activeThreadMessage.content}</p>
                </div>

                <div className="relative flex items-center justify-center py-1">
                  <div className="border-t border-zinc-200 w-full" />
                  <span className="bg-zinc-100 px-2 text-[10px] font-bold text-zinc-400 absolute">
                    {(threadReplies[activeThreadMessage.id] || []).length} phản hồi
                  </span>
                </div>

                {/* Replies List */}
                <div className="space-y-2">
                  {(threadReplies[activeThreadMessage.id] || []).map((rep) => (
                    <div key={rep.id} className="p-2.5 bg-white rounded-xl border border-zinc-200/60 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-800">{rep.senderName}</span>
                        <span className="text-[9px] text-zinc-400 font-mono">
                          {new Date(rep.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-700">{rep.content}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Thread Reply Input Form */}
              <form onSubmit={handleSendThreadReply} className="p-3 border-t border-zinc-200 bg-white">
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={threadInput}
                    onChange={(e) => setThreadInput(e.target.value)}
                    placeholder="Trả lời trong thread..."
                    className="flex-1 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="submit"
                    disabled={!threadInput.trim()}
                    className="p-1.5 bg-blue-600 text-white rounded-xl disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HỌP VIDEO, GỌI THOẠI & CHIA SẺ MÀN HÌNH (MEETING STUDIO PRO) */}
      {/* ========================================================================= */}
      {activeTab === 'meetings' && (
        <div className="space-y-6">
          {/* Hero Google Meet Action Center */}
          <div className="bg-gradient-to-br from-white via-blue-50/20 to-white rounded-3xl border border-zinc-200/80 p-6 md:p-8 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/80 border border-blue-200 text-blue-700 text-xs font-semibold">
                  <Video className="w-3.5 h-3.5 text-blue-600" />
                  <span>Google Meet &amp; WebRTC HD Engine</span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-zinc-900 tracking-tight">
                  Họp Video / Gọi Thoại &amp; Chia Sẻ Màn Hình
                </h2>
                <p className="text-xs md:text-sm text-zinc-600 leading-relaxed">
                  Khi chat chữ không đủ rõ hoặc cần thảo luận nhanh, bắt đầu ngay cuộc họp video 1-1 hoặc cả nhóm. Hệ thống tích hợp chia sẻ màn hình 1080p, phụ đề dịch trực tiếp, bảng trắng chung, tóm tắt AI tự động và cơ chế thích ứng WebRTC.
                </p>

                {/* Primary Actions: New Meeting & Join by Code */}
                <div className="pt-3 flex flex-wrap items-center gap-3">
                  {/* New Meeting Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setNewMeetingDropdownOpen(!newMeetingDropdownOpen)}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-semibold shadow-md flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Video className="w-4 h-4" />
                      <span>Cuộc họp mới</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {newMeetingDropdownOpen && (
                      <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-zinc-200 p-1.5 z-50 animate-in fade-in zoom-in-95">
                        <button
                          onClick={() => {
                            setNewMeetingDropdownOpen(false);
                            handleStartMeeting('Cuộc họp tức thì (Instant Meeting)', undefined, false);
                          }}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-blue-50 text-xs text-zinc-800 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Video className="w-4 h-4 text-blue-600 shrink-0" />
                          <div>
                            <span className="font-semibold block">Bắt đầu cuộc họp tức thì</span>
                            <span className="text-[10px] text-zinc-400">Vào phòng Google Meet ngay</span>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            setNewMeetingDropdownOpen(false);
                            const meetLink = `https://meet.collab.io/sync-${Date.now().toString().slice(-4)}`;
                            navigator.clipboard?.writeText(meetLink);
                            showToast(`Đã tạo liên kết cuộc họp và sao chép vào bộ nhớ tạm: ${meetLink}`);
                          }}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-blue-50 text-xs text-zinc-800 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Share2 className="w-4 h-4 text-blue-600 shrink-0" />
                          <div>
                            <span className="font-semibold block">Tạo liên kết cuộc họp</span>
                            <span className="text-[10px] text-zinc-400">Sao chép link gửi cho đồng nghiệp</span>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            setNewMeetingDropdownOpen(false);
                            setScheduleModalOpen(true);
                          }}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-blue-50 text-xs text-zinc-800 hover:text-blue-700 flex items-center gap-2.5 transition-colors border-t border-zinc-100 cursor-pointer"
                        >
                          <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                          <div>
                            <span className="font-semibold block">Lên lịch cuộc họp</span>
                            <span className="text-[10px] text-zinc-400">Tích hợp Google Calendar / Outlook</span>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Join by Code / Link */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={meetInputCode}
                        onChange={(e) => setMeetInputCode(e.target.value)}
                        placeholder="Nhập mã hoặc đường link..."
                        className="w-48 sm:w-56 pl-8 pr-3 py-2 bg-white border border-zinc-200/90 rounded-2xl text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                      <Monitor className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
                    </div>
                    <button
                      onClick={() => {
                        const code = meetInputCode.trim() || 'meet.collab.io/sprint-102';
                        handleStartMeeting('Cuộc họp theo mã phòng', code, false);
                      }}
                      className="px-3.5 py-2 bg-zinc-900 hover:bg-black text-white rounded-2xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      Tham gia
                    </button>
                  </div>
                </div>
              </div>

              {/* Instant Audio Huddle Card */}
              <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-xs lg:w-80 shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                    <Headphones className="w-4 h-4 text-emerald-600" />
                    <span>Họp ngay (Audio Huddle)</span>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-mono font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    2 đang nói
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Phòng thoại nhẹ không cần lên lịch, bấm vào là nói chuyện như đứng cạnh nhau ở văn phòng.
                </p>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex -space-x-1.5">
                    <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white">A</div>
                    <div className="w-7 h-7 rounded-full bg-amber-600 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white">L</div>
                  </div>
                  <button
                    onClick={() => {
                      setIsHuddleActive(!isHuddleActive);
                      showToast(!isHuddleActive ? 'Đã tham gia phòng thoại Huddle!' : 'Đã rời phòng thoại Huddle.');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isHuddleActive ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {isHuddleActive ? 'Rời Huddle' : 'Vào đàm thoại'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Today's Scheduled Meetings List */}
          <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-zinc-900">Cuộc Họp Sắp Diễn Ra Hôm Nay</h3>
              </div>
              <button
                onClick={() => setScheduleModalOpen(true)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Lên lịch mới (.ics)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Meeting 1: Ready to join */}
              <div className="p-4 rounded-2xl border-2 border-emerald-400 bg-emerald-50/20 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                    10:00 - 11:00 (Đang diễn ra)
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900">Sprint Review &amp; Rà Soát Kiến Trúc CRDT</h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Phòng 102 • 4 thành viên đang họp</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-emerald-100">
                  <span className="text-[10px] font-mono text-zinc-400">meet.collab.io/crdt-sync</span>
                  <button
                    onClick={() => handleStartMeeting('Sprint Review & Rà Soát Kiến Trúc CRDT', 'meet.collab.io/crdt-sync', false)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    Tham gia ngay
                  </button>
                </div>
              </div>

              {/* Meeting 2 */}
              <div className="p-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md bg-zinc-200 text-zinc-700 text-[10px] font-mono font-semibold">
                    14:30 - 15:15
                  </span>
                  <span className="text-[10px] text-zinc-400">Chiều nay</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900">Tối ưu hóa WebRTC Adaptive Bitrate</h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Kênh #team-backend • Alice Tech, Lê Hoàng</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60">
                  <span className="text-[10px] font-mono text-zinc-400">meet.collab.io/webrtc-opt</span>
                  <button
                    onClick={() => handleStartMeeting('Tối ưu hóa WebRTC Adaptive Bitrate', 'meet.collab.io/webrtc-opt', false)}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-black text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Tham gia
                  </button>
                </div>
              </div>

              {/* Meeting 3 */}
              <div className="p-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md bg-zinc-200 text-zinc-700 text-[10px] font-mono font-semibold">
                    16:00 - 16:30
                  </span>
                  <span className="text-[10px] text-zinc-400">Cuối ngày</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900">1-1 Trao đổi Tiến độ Sprint (Lead &amp; PM)</h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Trần Thị Linh &amp; Nguyễn Văn Nam</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60">
                  <span className="text-[10px] font-mono text-zinc-400">meet.collab.io/1on1-lead</span>
                  <button
                    onClick={() => handleStartMeeting('1-1 Trao đổi Tiến độ Sprint (Lead & PM)', 'meet.collab.io/1on1-lead', false)}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-black text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Tham gia
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Recordings Archive & Past AI Summaries */}
          <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Kho Lưu Trữ Bản Ghi &amp; Biên Bản AI</h3>
                <p className="text-xs text-zinc-500">Xem lại video ghi hình và các hành động đã được trích xuất tự động vào bảng Kanban.</p>
              </div>
              <span className="px-2.5 py-1 bg-zinc-100 rounded-full text-xs font-mono text-zinc-600">
                2 bản ghi video
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-zinc-200/80 hover:border-zinc-300 transition-colors flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <span className="text-xs font-bold text-zinc-900">Bản ghi Sprint Planning #24.webm</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">Hôm qua • Thời lượng 54:12 • 480 MB • WebRTC HD</p>
                </div>
                <button
                  onClick={() => {
                    const sampleBlob = new Blob(['Collab Workspace Meeting Recording WebM Stream'], { type: 'video/webm' });
                    const url = URL.createObjectURL(sampleBlob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'recording_sprint_24.webm';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    showToast('Đang tải tệp recording_sprint_24.webm về máy!');
                  }}
                  className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải video</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl border border-zinc-200/80 hover:border-zinc-300 transition-colors flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-600" />
                    <span className="text-xs font-bold text-zinc-900">Bản ghi Kiến Trúc RFC Consensus.webm</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">3 ngày trước • Thời lượng 32:40 • 290 MB • WebRTC HD</p>
                </div>
                <button
                  onClick={() => {
                    const sampleBlob = new Blob(['Collab Workspace Meeting Recording WebM Stream'], { type: 'video/webm' });
                    const url = URL.createObjectURL(sampleBlob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'recording_rfc_consensus.webm';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    showToast('Đang tải tệp recording_rfc_consensus.webm về máy!');
                  }}
                  className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải video</span>
                </button>
              </div>
            </div>
          </div>

          {/* Guideline Table: "Khi nào nên chọn hình thức nào" (Theo tài liệu yêu cầu) */}
          <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">
                  Hướng Dẫn Lựa Chọn Hình Thức Giao Tiếp Phù Hợp
                </h3>
                <p className="text-xs text-zinc-500">
                  Chuẩn quy ước giúp nhóm cộng tác hiệu quả, không bị quá tải họp hay chậm trễ công việc.
                </p>
              </div>
              <span className="px-2.5 py-1 bg-zinc-100 rounded-full text-xs font-mono text-zinc-600">
                Quy ước nhóm
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/80 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Tình huống công việc</th>
                    <th className="py-2.5 px-4">Hình thức nên dùng</th>
                    <th className="py-2.5 px-4">Lợi ích cốt lõi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  <tr className="hover:bg-zinc-50/50">
                    <td className="py-3 px-4 font-semibold text-zinc-900">Hỏi một câu ngắn, không gấp</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <MessageSquare className="w-3 h-3" /> Nhắn tin trong kênh hoặc thread
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-600">Không ngắt quãng sự tập trung của đồng nghiệp (bất đồng bộ)</td>
                  </tr>
                  <tr className="hover:bg-zinc-50/50">
                    <td className="py-3 px-4 font-semibold text-zinc-900">Cần bàn nhanh 5 đến 10 phút</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Headphones className="w-3 h-3" /> Huddle hoặc gọi thoại nhẹ
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-600">Giải quyết tức thì như đứng cạnh nhau, không cần link họp</td>
                  </tr>
                  <tr className="hover:bg-zinc-50/50">
                    <td className="py-3 px-4 font-semibold text-zinc-900">Họp có nhiều người, có trình bày slide</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        <Video className="w-3 h-3" /> Họp video có chia sẻ màn hình
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-600">Trực quan, thấy biểu cảm và nội dung slide rõ ràng</td>
                  </tr>
                  <tr className="hover:bg-zinc-50/50">
                    <td className="py-3 px-4 font-semibold text-zinc-900">Cần lưu lại để người vắng mặt xem</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <Sparkles className="w-3 h-3" /> Họp có ghi hình và biên bản AI
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-600">Không ai bị bỏ rơi thông tin, tự động xuất việc vào Kanban</td>
                  </tr>
                  <tr className="hover:bg-zinc-50/50">
                    <td className="py-3 px-4 font-semibold text-zinc-900">Góp ý cho tài liệu, văn bản</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <FileText className="w-3 h-3" /> Bình luận &amp; Gợi ý sửa trực tiếp
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-600">Giữ nguyên ngữ cảnh đoạn văn, có nút Chấp nhận/Từ chối</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BÌNH LUẬN & GỢI Ý SỬA NỘI DUNG (CONTEXTUAL COMMENTS & SUGGESTIONS) */}
      {/* ========================================================================= */}
      {activeTab === 'comments' && (
        <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs overflow-hidden flex flex-col lg:flex-row h-[780px]">
          {/* Left Column: Interactive Document Canvas Viewer */}
          <div className="flex-1 flex flex-col h-full border-r border-zinc-200/80 bg-zinc-50/40 min-w-0">
            {/* Document Header Bar */}
            <div className="h-16 px-6 border-b border-zinc-200/80 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3 truncate">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  {commentMediaView === 'document' ? (
                    <FileText className="w-4 h-4" />
                  ) : commentMediaView === 'spreadsheet' ? (
                    <Table className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Palette className="w-4 h-4 text-purple-600" />
                  )}
                </div>
                <div className="truncate">
                  <h3 className="text-xs font-bold text-zinc-900 truncate">
                    {commentMediaView === 'document'
                      ? 'Báo Cáo Kiến Trúc Đồng Thuận Phân Tán CRDT v4'
                      : commentMediaView === 'spreadsheet'
                      ? 'Bảng Tính Dự Báo Tài Chính & Doanh Thu Q4-2026'
                      : 'Bản Thiết Kế Trực Quan UI Workspace & Slide'}
                  </h3>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {commentMediaView === 'document'
                      ? 'doc_rfc_consensus • Chế độ xem & góp ý Yjs CRDT'
                      : commentMediaView === 'spreadsheet'
                      ? 'sheet_fin_q4 • Đang chọn ô C12'
                      : 'design_ui_workspace • Bản vẽ thiết kế Figma Canvas'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Watch / Unwatch document toggle button */}
                <button
                  type="button"
                  onClick={handleToggleWatchDoc}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isDocumentWatched
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      : 'bg-zinc-100 text-zinc-600 border border-zinc-200 hover:bg-zinc-200'
                  }`}
                  title={isDocumentWatched ? 'Đang nhận thông báo khi có sửa đổi' : 'Bật theo dõi tài liệu này'}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{isDocumentWatched ? 'Đang theo dõi' : 'Bật theo dõi'}</span>
                </button>

                <Link
                  href={
                    commentMediaView === 'spreadsheet'
                      ? '/sheet/sheet_fin_q4'
                      : commentMediaView === 'design'
                      ? '/design/design_ui_workspace'
                      : '/doc/doc_rfc_consensus'
                  }
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-2xs transition-colors ${
                    commentMediaView === 'spreadsheet'
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                      : commentMediaView === 'design'
                      ? 'bg-purple-700 hover:bg-purple-800 text-white'
                      : 'bg-zinc-900 hover:bg-black text-white'
                  }`}
                >
                  <span>
                    {commentMediaView === 'spreadsheet'
                      ? 'Mở Bảng Tính Excel Đầy Đủ'
                      : commentMediaView === 'design'
                      ? 'Mở Bản Vẽ Figma Đầy Đủ'
                      : 'Mở Tài Liệu Đầy Đủ'}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Media View Mode Selector (Sub-bar) */}
            <div className="px-6 py-2 bg-zinc-100/70 border-b border-zinc-200/80 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  Nội dung bình luận:
                </span>
                <div className="flex items-center bg-white p-0.5 rounded-xl border border-zinc-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => {
                      setCommentMediaView('document');
                      setDocSelectedRange('2,450 người dùng hoạt động');
                      showToast('Chuyển sang xem Văn bản tài liệu (RFC)');
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
                      commentMediaView === 'document'
                        ? 'bg-zinc-900 text-white shadow-2xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    <FileText className="w-3 h-3" />
                    <span>1. Văn bản RFC</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCommentMediaView('spreadsheet');
                      setDocSelectedRange(`Ô C12: ${selectedCellData.title} (${selectedCellData.value})`);
                      showToast('Chuyển sang xem Bảng tính tài chính (ô C12)');
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
                      commentMediaView === 'spreadsheet'
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    <Table className="w-3 h-3" />
                    <span>2. Ô Bảng tính (C12)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCommentMediaView('design');
                      setDocSelectedRange('Vùng Nút CTA: [Bắt đầu Phiên Làm Việc]');
                      showToast('Chuyển sang xem Vùng Thiết kế UI & Slide');
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
                      commentMediaView === 'design'
                        ? 'bg-purple-700 text-white shadow-2xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    <Palette className="w-3 h-3" />
                    <span>3. Bản vẽ UI / Slide</span>
                  </button>
                </div>
              </div>

              <span className="text-[11px] text-zinc-500 hidden sm:inline font-medium">
                {commentMediaView === 'document'
                  ? '💡 Bôi đen văn bản để bình luận đúng vị trí'
                  : commentMediaView === 'spreadsheet'
                  ? '💡 Click ô C12 để đặt câu hỏi doanh thu'
                  : '💡 Click vùng nút để duyệt giao diện'}
              </span>
            </div>

            {/* Document Body with Interactive Selection */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4">
              {/* VIEW 1: VĂN BẢN TÀI LIỆU */}
              {commentMediaView === 'document' && (
                <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl border border-zinc-200 shadow-xs space-y-4 font-serif">
                  <h1 className="text-xl font-bold font-sans text-zinc-900 border-b border-zinc-100 pb-3">
                    Kiến Trúc Hội Tụ Dữ Liệu Thời Gian Thực Bằng Yjs CRDT
                  </h1>

                  <div
                    onMouseUp={() => {
                      const selection = window.getSelection();
                      const text = selection?.toString().trim();
                      if (text && text.length > 0) {
                        setDocSelectedRange(text);
                        showToast(`Đã chọn đoạn: "${text.slice(0, 30)}..."`);
                      }
                    }}
                    className="text-sm text-zinc-800 leading-relaxed space-y-3 cursor-text selection:bg-amber-200 selection:text-zinc-900"
                  >
                    <p>{docSnippetText}</p>
                    <p className="text-xs text-zinc-500 font-sans italic bg-zinc-50 p-3 rounded-xl border border-zinc-200/60">
                      💡 Mẹo: Dùng chuột bôi đen bất kỳ đoạn văn bản nào ở trên để để lại bình luận hoặc đề xuất sửa đổi đúng ngay vị trí đó.
                    </p>
                  </div>
                </div>
              )}

              {/* VIEW 2: BẢNG TÍNH TÀI CHÍNH (SPREADSHEET CELL C12) */}
              {commentMediaView === 'spreadsheet' && (
                <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden font-sans">
                  <div className="p-4 bg-emerald-50/60 border-b border-zinc-200 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-emerald-950">Bảng Tính Doanh Thu &amp; Chi Phí Q3-Q4</h4>
                      <p className="text-[11px] text-zinc-500">Bấm trực tiếp vào ô để trao đổi số liệu hoặc giao việc cho kế toán</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                      Ô đang chọn: {selectedCellCoord}
                    </span>
                  </div>

                  <div className="overflow-x-auto p-4">
                    <table className="w-full text-left border-collapse text-xs border border-zinc-200">
                      <thead>
                        <tr className="bg-zinc-100 text-zinc-600 font-mono text-[11px]">
                          <th className="p-2 border border-zinc-200 w-12 text-center bg-zinc-200/60">#</th>
                          <th className="p-2 border border-zinc-200">Cột A: Chỉ tiêu</th>
                          <th className="p-2 border border-zinc-200">Cột B: Kế hoạch</th>
                          <th className="p-2 border border-zinc-200 bg-emerald-50/40">Cột C: Thực tế Q3</th>
                          <th className="p-2 border border-zinc-200">Cột D: % Đạt</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="hover:bg-zinc-50">
                          <td className="p-2 border border-zinc-200 text-center font-mono text-zinc-400 bg-zinc-50">10</td>
                          <td className="p-2 border border-zinc-200 font-medium">Người dùng mới (Active)</td>
                          <td className="p-2 border border-zinc-200 font-mono">100,000</td>
                          <td className="p-2 border border-zinc-200 font-mono font-semibold">125,400</td>
                          <td className="p-2 border border-zinc-200 text-emerald-600 font-semibold">+25.4%</td>
                        </tr>
                        <tr className="hover:bg-zinc-50">
                          <td className="p-2 border border-zinc-200 text-center font-mono text-zinc-400 bg-zinc-50">11</td>
                          <td className="p-2 border border-zinc-200 font-medium">Doanh thu bản quyền Enterprise</td>
                          <td className="p-2 border border-zinc-200 font-mono">$80,000</td>
                          <td className="p-2 border border-zinc-200 font-mono font-semibold">$92,500</td>
                          <td className="p-2 border border-zinc-200 text-emerald-600 font-semibold">+15.6%</td>
                        </tr>
                        {/* CELL C12: THE KEY EXAMPLE FROM USER PROMPT */}
                        <tr className="bg-amber-50/40">
                          <td className="p-2 border border-zinc-200 text-center font-mono text-zinc-400 bg-zinc-50">12</td>
                          <td className="p-2 border border-zinc-200 font-bold text-zinc-900">
                            Doanh thu SaaS thực tế
                          </td>
                          <td className="p-2 border border-zinc-200 font-mono">$110,000</td>
                          <td
                            onClick={() => {
                              setSelectedCellCoord('C12');
                              setDocSelectedRange(`Ô C12: Doanh thu SaaS thực tế (${selectedCellData.value})`);
                              showToast('Đã chọn ô C12 để bình luận!');
                            }}
                            className={`p-2 border border-amber-400 font-mono font-bold cursor-pointer transition-all relative ${
                              selectedCellCoord === 'C12'
                                ? 'bg-amber-200/70 text-amber-950 ring-2 ring-amber-500'
                                : 'bg-amber-100/50 hover:bg-amber-200/50 text-amber-900'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{selectedCellData.value}</span>
                              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-bold shadow-2xs" title="Có bình luận tại ô này">
                                💬
                              </span>
                            </div>
                          </td>
                          <td className="p-2 border border-zinc-200 text-emerald-600 font-semibold">+16.7%</td>
                        </tr>
                        <tr className="hover:bg-zinc-50">
                          <td className="p-2 border border-zinc-200 text-center font-mono text-zinc-400 bg-zinc-50">13</td>
                          <td className="p-2 border border-zinc-200 font-medium">Chi phí hạ tầng máy chủ</td>
                          <td className="p-2 border border-zinc-200 font-mono">$25,000</td>
                          <td className="p-2 border border-zinc-200 font-mono font-semibold">$22,100</td>
                          <td className="p-2 border border-zinc-200 text-blue-600 font-semibold">-11.6%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3 bg-zinc-50 border-t border-zinc-200 text-xs text-zinc-600 flex items-center justify-between">
                    <span className="italic">💡 Ví dụ thực tế: "@Hùng kiểm tra lại công thức ở ô C12 trước 17h nhé"</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCellCoord('C12');
                        setDocSelectedRange(`Ô C12: Doanh thu SaaS thực tế (${selectedCellData.value})`);
                        setDocCommentInput('@Hùng kiểm tra lại công thức ở ô C12 trước 17h nhé, số này đã tính thuế chưa?');
                        setIsTaskAssignmentOpen(true);
                        showToast('Đã điền sẵn bình luận mẫu cho ô C12!');
                      }}
                      className="px-2.5 py-1 bg-white border border-zinc-300 rounded-lg text-[11px] font-semibold text-blue-600 hover:bg-blue-50"
                    >
                      Bình luận thử ô C12
                    </button>
                  </div>
                </div>
              )}

              {/* VIEW 3: BẢN VẼ UI / SLIDE MOCKUP */}
              {commentMediaView === 'design' && (
                <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4 font-sans">
                  <div className="border-b border-zinc-100 pb-3 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-purple-950">Bản Vẽ Thiết Kế Trang Chủ Cộng Tác v3</h4>
                      <p className="text-[11px] text-zinc-500">Bấm vào bất kỳ thành phần nào để để lại bình luận hoặc yêu cầu phê duyệt</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-100 text-purple-800">
                      Vùng: {selectedDesignZone}
                    </span>
                  </div>

                  {/* Wireframe Mockup Canvas */}
                  <div className="border-2 border-dashed border-zinc-300 rounded-2xl p-6 bg-zinc-50/50 space-y-4">
                    {/* Header bar component */}
                    <div
                      onClick={() => {
                        setSelectedDesignZone('HEADER_NAV');
                        setDocSelectedRange('Vùng Header: Thanh Điều Hướng & Logo');
                        showToast('Đã chọn Vùng Header');
                      }}
                      className="p-3 bg-white border border-zinc-200 rounded-xl flex items-center justify-between cursor-pointer hover:border-purple-400 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-lg bg-blue-600" />
                        <span className="font-bold text-xs text-zinc-800">CollabPlatform 2026</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <span>Sản phẩm</span>
                        <span>Giải pháp</span>
                        <span>Bảng giá</span>
                      </div>
                    </div>

                    {/* Hero CTA component */}
                    <div className="p-8 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl border border-blue-200 text-center space-y-3">
                      <h2 className="text-lg font-bold text-zinc-900">
                        Nền Tảng Cộng Tác Thời Gian Thực Đột Phá
                      </h2>
                      <p className="text-xs text-zinc-600 max-w-md mx-auto">
                        Mọi cuộc họp, tài liệu và nhiệm vụ nằm chung trong một không gian làm việc gắn chặt với ngữ cảnh.
                      </p>

                      {/* CTA Button with Comment Pin */}
                      <div className="pt-2 flex justify-center">
                        <div
                          onClick={() => {
                            setSelectedDesignZone('CTA_BUTTON');
                            setDocSelectedRange('Vùng Nút CTA: [Bắt đầu Phiên Làm Việc Mới]');
                            showToast('Đã chọn Vùng Nút CTA để góp ý!');
                          }}
                          className={`relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs cursor-pointer shadow-md transition-all ${
                            selectedDesignZone === 'CTA_BUTTON'
                              ? 'bg-purple-600 text-white ring-4 ring-purple-300 scale-105'
                              : 'bg-zinc-900 text-white hover:bg-black'
                          }`}
                        >
                          <span>Bắt đầu Phiên Làm Việc Mới</span>
                          <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                            1
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-purple-50 rounded-xl text-xs text-purple-900 flex items-center justify-between">
                    <span className="italic">💡 Ví dụ xin duyệt: "@Giang duyệt giúp em bản thiết kế nút bấm này nhé!"</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDesignZone('CTA_BUTTON');
                        setDocSelectedRange('Vùng Nút CTA: [Bắt đầu Phiên Làm Việc Mới]');
                        setDocCommentInput('@Giang duyệt giúp em bản thiết kế nút bấm này để chuyển cho đội lập trình.');
                        showToast('Đã điền sẵn câu hỏi xin duyệt bản thiết kế!');
                      }}
                      className="px-2.5 py-1 bg-white border border-purple-200 rounded-lg text-[11px] font-semibold text-purple-700 hover:bg-purple-100"
                    >
                      Bình luận xin duyệt
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Floating Selection Action Pill */}
            {docSelectedRange && (
              <div className="p-3 bg-amber-50 border-t border-amber-200 flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-2 truncate text-amber-900">
                  <span className="font-bold shrink-0">Đã chọn:</span>
                  <span className="italic truncate font-serif">"{docSelectedRange}"</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setDocInputMode('comment');
                      showToast('Chuyển sang chế độ bình luận.');
                    }}
                    className={`px-2.5 py-1 rounded-lg font-semibold ${
                      docInputMode === 'comment' ? 'bg-blue-600 text-white' : 'bg-white text-zinc-700 border'
                    }`}
                  >
                    Bình luận
                  </button>
                  <button
                    onClick={() => {
                      setDocInputMode('suggest');
                      showToast('Chuyển sang chế độ đề xuất sửa đổi.');
                    }}
                    className={`px-2.5 py-1 rounded-lg font-semibold ${
                      docInputMode === 'suggest' ? 'bg-amber-600 text-white' : 'bg-white text-zinc-700 border'
                    }`}
                  >
                    Gợi ý sửa
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Comments & Suggesting Mode Side Panel */}
          <div className="w-full lg:w-96 flex flex-col h-full bg-white shrink-0">
            {/* Comments Header */}
            <div className="h-16 px-4 border-b border-zinc-200/80 flex items-center justify-between bg-zinc-50 shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                  Bình Luận &amp; Gợi Ý Sửa
                </h3>
              </div>

              <div className="flex items-center gap-1 text-[11px]">
                <button
                  onClick={() => setCommentViewFilter('all')}
                  className={`px-2 py-0.5 rounded-lg ${commentViewFilter === 'all' ? 'bg-zinc-900 text-white font-bold' : 'text-zinc-500'}`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setCommentViewFilter('open')}
                  className={`px-2 py-0.5 rounded-lg ${commentViewFilter === 'open' ? 'bg-zinc-900 text-white font-bold' : 'text-zinc-500'}`}
                >
                  Mở
                </button>
                <button
                  onClick={() => setCommentViewFilter('resolved')}
                  className={`px-2 py-0.5 rounded-lg ${commentViewFilter === 'resolved' ? 'bg-zinc-900 text-white font-bold' : 'text-zinc-500'}`}
                >
                  Đã giải quyết
                </button>
              </div>
            </div>

            {/* Input Form for Comment / Suggestion */}
            <form onSubmit={handleAddDocComment} className="p-3 border-b border-zinc-200 bg-white space-y-2 shrink-0">
              {docInputMode === 'suggest' && (
                <div>
                  <label className="block text-[10px] font-bold text-amber-800 uppercase mb-1">
                    Nội dung đề xuất thay thế:
                  </label>
                  <input
                    type="text"
                    value={docSuggestInput}
                    onChange={(e) => setDocSuggestInput(e.target.value)}
                    placeholder="Nhập nội dung mới thay thế cho đoạn đã chọn..."
                    className="w-full px-2.5 py-1.5 bg-emerald-50/50 border border-emerald-300 rounded-xl text-xs focus:outline-none"
                  />
                </div>
              )}

              <div className="relative">
                <textarea
                  rows={2}
                  value={docCommentInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDocCommentInput(val);
                    if (val.includes('@')) {
                      setMentionPopupOpen(true);
                    } else {
                      setMentionPopupOpen(false);
                    }
                  }}
                  placeholder={
                    docInputMode === 'suggest'
                      ? 'Lý do đề xuất sửa (Gõ @ để gắn thẻ đồng nghiệp)...'
                      : 'Viết bình luận... Gõ @tên, @nhóm, @tài liệu để nhắc...'
                  }
                  className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />

                {/* Autocomplete Mention Menu */}
                {mentionPopupOpen && (
                  <div className="absolute left-0 bottom-full mb-1 w-full bg-white rounded-2xl shadow-xl border border-zinc-200 p-1.5 z-40 space-y-0.5 max-h-56 overflow-y-auto">
                    <div className="px-2 py-0.5 text-[9px] font-bold text-zinc-400 uppercase">
                      Gắn thẻ thông minh (@mention)
                    </div>
                    {[
                      { tag: '@Trần Thị Linh', desc: 'Product Manager', cat: 'Người' },
                      { tag: '@Lê Hoàng', desc: 'DevOps Lead', cat: 'Người' },
                      { tag: '@Hùng Nguyễn', desc: 'Kế toán & Tài chính', cat: 'Người' },
                      { tag: '@Alice Tech', desc: 'Kiến trúc sư (Chưa cấp quyền)', cat: 'Người' },
                      { tag: '@thiet-ke', desc: 'Nhóm Thiết kế UI/UX', cat: 'Nhóm' },
                      { tag: '@ky-thuat', desc: 'Nhóm Kỹ thuật Backend', cat: 'Nhóm' },
                      { tag: '@channel', desc: 'Toàn bộ thành viên kênh', cat: 'Kênh' },
                      { tag: '@doc:RFC_CRDT', desc: 'Liên kết tới tài liệu kỹ thuật', cat: 'Tài liệu' },
                      { tag: '@hạn-chót-thứ-sáu', desc: 'Hạn chót hoàn thành (17:00)', cat: 'Ngày' },
                    ].map((opt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setDocCommentInput((prev) => prev + opt.tag + ' ');
                          setMentionPopupOpen(false);
                          if (opt.tag.includes('Alice')) {
                            setDocPermissionPromptUser('Alice Tech');
                          }
                        }}
                        className="w-full text-left px-2 py-1 rounded-lg hover:bg-blue-50 text-xs flex items-center justify-between"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-blue-700">{opt.tag}</span>
                          <span className="text-[10px] text-zinc-400">{opt.desc}</span>
                        </div>
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-zinc-100 text-zinc-500">
                          {opt.cat}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Permission Prompt Modal */}
              {docPermissionPromptUser && (
                <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-1.5 animate-in fade-in">
                  <div className="flex items-start gap-1.5 text-amber-900 font-semibold text-[11px]">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      {docPermissionPromptUser} chưa có quyền xem tài liệu này. Bạn có muốn tự động cấp quyền không?
                    </span>
                  </div>
                  <div className="flex justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setDocPermissionPromptUser(null)}
                      className="px-2 py-0.5 rounded text-[10px] border border-zinc-200 hover:bg-zinc-100"
                    >
                      Bỏ qua
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        showToast(`Đã tự động cấp quyền Xem cho ${docPermissionPromptUser}!`);
                        setDocPermissionPromptUser(null);
                      }}
                      className="px-2 py-0.5 rounded text-[10px] border border-zinc-300 hover:bg-zinc-100 font-medium"
                    >
                      Cấp quyền Xem
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        showToast(`Đã tự động cấp quyền Chỉnh sửa cho ${docPermissionPromptUser}!`);
                        setDocPermissionPromptUser(null);
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white"
                    >
                      Cấp quyền Sửa
                    </button>
                  </div>
                </div>
              )}

              {/* Voice Note & Video Note indicator attachments */}
              {hasAudioAttached && (
                <div className="p-2 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Mic className="w-3.5 h-3.5 text-purple-600" />
                    <span>Đã đính kèm ghi chú thoại (0:18)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setHasAudioAttached(false)}
                    className="text-purple-400 hover:text-purple-700 text-xs font-bold"
                  >
                    Gỡ
                  </button>
                </div>
              )}

              {hasVideoAttached && (
                <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Video className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Đã đính kèm clip Loom ngắn (0:42)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setHasVideoAttached(false)}
                    className="text-indigo-400 hover:text-indigo-700 text-xs font-bold"
                  >
                    Gỡ
                  </button>
                </div>
              )}

              {/* Task Conversion Drawer */}
              {isTaskAssignmentOpen && (
                <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-blue-900 text-[11px]">
                    <span className="flex items-center gap-1">
                      <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                      <span>Giao Việc Trực Tiếp Lên Bảng Kanban</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsTaskAssignmentOpen(false)}
                      className="text-zinc-400 hover:text-zinc-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-0.5">Người nhận việc:</label>
                      <select
                        value={taskAssigneeTarget}
                        onChange={(e) => setTaskAssigneeTarget(e.target.value)}
                        className="w-full bg-white border border-blue-200 rounded-lg px-2 py-1 text-xs"
                      >
                        {SEED_USERS.map((u) => (
                          <option key={u.id} value={u.id}>
                            @{u.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-0.5">Hạn chót:</label>
                      <input
                        type="date"
                        value={taskDeadlineTarget}
                        onChange={(e) => setTaskDeadlineTarget(e.target.value)}
                        className="w-full bg-white border border-blue-200 rounded-lg px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Form Action Buttons Bar */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  {/* Voice Note Button */}
                  <button
                    type="button"
                    onClick={handleStartVoiceRecording}
                    className={`p-1.5 rounded-lg border text-xs transition-colors flex items-center gap-1 ${
                      isRecordingAudio
                        ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                    }`}
                    title="Bình luận bằng giọng nói (Voice Note 0:18)"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span className="text-[10px] hidden sm:inline">
                      {isRecordingAudio ? 'Đang thu...' : 'Thoại'}
                    </span>
                  </button>

                  {/* Loom Video Button */}
                  <button
                    type="button"
                    onClick={handleAttachLoomVideo}
                    className="p-1.5 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 text-xs flex items-center gap-1"
                    title="Đính kèm video Loom ngắn (0:42)"
                  >
                    <Video className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="text-[10px] hidden sm:inline">Loom</span>
                  </button>

                  {/* Task Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsTaskAssignmentOpen(!isTaskAssignmentOpen)}
                    className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 ${
                      isTaskAssignmentOpen
                        ? 'bg-blue-100 border-blue-300 text-blue-700 font-semibold'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                    }`}
                    title="Giao việc trực tiếp lên Kanban"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-[10px] hidden sm:inline">Giao việc</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!docCommentInput.trim() && !docSuggestInput.trim() && !hasAudioAttached && !hasVideoAttached}
                  className="px-3.5 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-semibold disabled:opacity-40 shadow-2xs transition-colors"
                >
                  {docInputMode === 'suggest' ? 'Gửi đề xuất sửa' : 'Đăng bình luận'}
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {comments
                .filter((c) => {
                  if (commentViewFilter === 'open') return !c.resolved;
                  if (commentViewFilter === 'resolved') return c.resolved;
                  return true;
                })
                .map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCommentId(c.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      selectedCommentId === c.id
                        ? 'border-blue-500 bg-blue-50/20 shadow-xs'
                        : 'border-zinc-200/90 bg-white hover:border-zinc-300'
                    } ${c.resolved ? 'opacity-70 bg-zinc-50' : ''}`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                          style={{ backgroundColor: c.authorColor }}
                        >
                          {c.authorName.slice(0, 1)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-zinc-900">{c.authorName}</span>
                            {c.mediaType === 'spreadsheet' && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-mono font-bold">
                                {c.cellLocation ? `Ô ${c.cellLocation}` : 'Bảng tính'}
                              </span>
                            )}
                            {c.mediaType === 'design' && (
                              <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 text-[9px] font-bold">
                                Thiết kế UI
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-400 block">{c.authorRole}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setComments((prev) =>
                              prev.map((item) =>
                                item.id === c.id ? { ...item, resolved: !item.resolved } : item
                              )
                            );
                            showToast(c.resolved ? 'Đã mở lại bình luận.' : 'Đã đánh dấu giải quyết xong.');
                          }}
                          className={`p-1 rounded-lg text-xs ${
                            c.resolved ? 'text-emerald-600 bg-emerald-50' : 'text-zinc-400 hover:text-emerald-600'
                          }`}
                          title={c.resolved ? 'Mở lại' : 'Đánh dấu đã giải quyết'}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Quoted Snippet or Cell reference */}
                    {(c.selectedText || c.targetText) && (
                      <div className="mb-2 p-1.5 bg-zinc-100 rounded-lg text-[11px] text-zinc-600 font-serif italic border-l-2 border-amber-500">
                        "{c.selectedText || c.targetText}"
                      </div>
                    )}

                    {/* Suggesting Mode Track Changes Box */}
                    {c.isSuggestion && (c.suggestedReplacement || c.suggestionNew) && (
                      <div className="mb-2 p-2 bg-amber-50/50 rounded-xl border border-amber-200 text-xs space-y-1">
                        <span className="text-[10px] font-bold text-amber-800 uppercase block">
                          Đề xuất thay đổi (Track Changes):
                        </span>
                        <div className="space-y-0.5 font-mono text-[11px]">
                          <div className="text-rose-600 line-through bg-rose-50 p-1 rounded">
                            - {c.selectedText || c.suggestionOriginal}
                          </div>
                          <div className="text-emerald-700 font-bold bg-emerald-50 p-1 rounded">
                            + {c.suggestedReplacement || c.suggestionNew}
                          </div>
                        </div>

                        {/* Real Accept / Reject Buttons */}
                        {c.suggestionStatus === 'pending' && (
                          <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-amber-200">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRejectSuggestionInDoc(c.id);
                              }}
                              className="px-2 py-0.5 text-[10px] text-zinc-600 hover:bg-zinc-100 rounded font-medium"
                            >
                              Từ chối
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAcceptSuggestionInDoc(c);
                              }}
                              className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-2xs"
                            >
                              Chấp nhận sửa
                            </button>
                          </div>
                        )}

                        {c.suggestionStatus === 'accepted' && (
                          <div className="text-[10px] text-emerald-700 font-bold pt-1 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Đã chấp nhận và cập nhật vào tài liệu</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Voice Note Audio Waveform Player */}
                    {c.isVoiceComment && (
                      <div className="mb-2 p-2 bg-purple-50 rounded-xl border border-purple-200 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlayingDocVoiceId(playingDocVoiceId === c.id ? null : c.id);
                          }}
                          className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 hover:bg-purple-700 shadow-2xs"
                        >
                          {playingDocVoiceId === c.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                        </button>
                        <div className="flex-1">
                          <div className="h-1.5 bg-purple-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-purple-600 rounded-full ${
                                playingDocVoiceId === c.id ? 'w-3/4 animate-pulse' : 'w-1/4'
                              }`}
                            />
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-purple-700 font-bold">
                          0:{c.voiceDurationSec || 18}
                        </span>
                      </div>
                    )}

                    {/* Short Video Loom Note Preview */}
                    {c.isVideoComment && (
                      <div className="mb-2 p-2 bg-indigo-50 rounded-xl border border-indigo-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                            ▶
                          </div>
                          <div>
                            <span className="font-bold text-indigo-950 block text-[11px]">Clip Loom Screen Recording</span>
                            <span className="text-[10px] text-zinc-500">Thời lượng: 0:{c.videoDurationSec || 42}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            showToast('Đang phát video Loom minh họa sơ đồ!');
                          }}
                          className="px-2 py-1 bg-white border border-indigo-200 rounded-lg text-[10px] font-bold text-indigo-700 hover:bg-indigo-100"
                        >
                          Xem clip
                        </button>
                      </div>
                    )}

                    {/* Assigned Task Badge */}
                    {c.assignedTask && (
                      <div className="mb-2 p-1.5 bg-blue-50 border border-blue-200 rounded-xl text-[10px] text-blue-800 flex items-center justify-between">
                        <span className="flex items-center gap-1 font-bold">
                          <CheckSquare className="w-3 h-3 text-blue-600" />
                          <span>Nhiệm vụ: @{c.assignedTask.assignee}</span>
                        </span>
                        <span className="font-mono text-zinc-500">Hạn: {c.assignedTask.deadline}</span>
                      </div>
                    )}

                    {/* Comment text */}
                    <p className="text-xs text-zinc-800 leading-relaxed mb-2 whitespace-pre-wrap">{c.content}</p>

                    {/* Emoji Reactions & Thread Reply Buttons */}
                    <div className="flex items-center justify-between pt-1 border-t border-zinc-100 text-[11px]">
                      <div className="flex items-center gap-1">
                        {['👍', '❤️', '💡', '🚀', '👀'].map((emoji) => {
                          const reaction = (c.reactions || []).find((r) => r.emoji === emoji);
                          const isMy = reaction?.users.includes('usr_nam');
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleDocCommentReaction(c.id, emoji);
                              }}
                              className={`px-1.5 py-0.5 rounded-lg border text-[11px] transition-colors flex items-center gap-0.5 ${
                                isMy
                                  ? 'bg-blue-50 border-blue-300 text-blue-800 font-bold'
                                  : 'bg-zinc-50 border-zinc-200/70 hover:bg-zinc-100 text-zinc-600'
                              }`}
                            >
                              <span>{emoji}</span>
                              {reaction && reaction.count > 0 && (
                                <span className="text-[10px] font-mono">{reaction.count}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplyInputCommentId(replyInputCommentId === c.id ? null : c.id);
                          }}
                          className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800"
                        >
                          <Reply className="w-3 h-3" />
                          <span>Trả lời {c.replies && c.replies.length > 0 ? `(${c.replies.length})` : ''}</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConvertCommentToTask(c);
                          }}
                          className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 hover:underline"
                          title="Chuyển thành task trên Kanban"
                        >
                          <CheckSquare className="w-3 h-3" />
                          <span>Giao Task</span>
                        </button>
                      </div>
                    </div>

                    {/* Replies List */}
                    {c.replies && c.replies.length > 0 && (
                      <div className="space-y-1.5 pl-2.5 border-l-2 border-blue-200 my-2 pt-1">
                        {c.replies.map((rep) => (
                          <div key={rep.id} className="text-xs">
                            <span className="font-bold text-zinc-900 text-[11px]">{rep.authorName}: </span>
                            <span className="text-zinc-700">{rep.content}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inline Reply Input Box */}
                    {replyInputCommentId === c.id && (
                      <div className="mt-2 pt-2 border-t border-zinc-100 flex gap-1.5 animate-in fade-in" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={replyInputText}
                          onChange={(e) => setReplyInputText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddDocCommentReply(c.id);
                            }
                          }}
                          placeholder="Nhập câu trả lời..."
                          className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddDocCommentReply(c.id)}
                          className="px-2.5 py-1 bg-zinc-900 text-white rounded-lg text-xs font-semibold hover:bg-black"
                        >
                          Gửi
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TRUNG TÂM THÔNG BÁO & HYGIENE (NOTIFICATION CENTER & FOCUS) */}
      {/* ========================================================================= */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-xs space-y-6">
            {/* Notification Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-600" />
                  <span>Trung Tâm Thông Báo Tức Thời &amp; Kiểm Soát Sự Tập Trung</span>
                </h3>
                <p className="text-xs text-zinc-500">
                  Thông báo thông minh gắn với công việc, hỗ trợ chế độ Deep Work tránh ngập thông báo (Notification Fatigue).
                </p>
              </div>

              {/* DND Toggle & Actions */}
              <div className="flex items-center gap-3">
                {/* Do Not Disturb Toggle */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-semibold">
                  <span>Giờ yên tĩnh (DND):</span>
                  <button
                    onClick={() => {
                      setIsDndActive(!isDndActive);
                      showToast(isDndActive ? 'Đã tắt DND, nhận lại thông báo bình thường.' : 'Đã bật DND, tạm hoãn mọi chuông thông báo.');
                    }}
                    className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                      isDndActive ? 'bg-rose-600' : 'bg-zinc-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        isDndActive ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Channel Notification Prefs Modal Trigger */}
                <button
                  onClick={() => setChannelPrefModalOpen(true)}
                  className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 rounded-xl text-xs font-semibold text-zinc-700 transition-colors"
                >
                  Tùy chỉnh theo kênh
                </button>

                <button
                  onClick={() => {
                    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
                    showToast('Đã đánh dấu tất cả thông báo là đã đọc!');
                  }}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors"
                >
                  Đọc tất cả
                </button>
              </div>
            </div>

            {/* Filter Tabs Bar with Badges */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-zinc-100 text-xs">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'mention', label: '@Nhắc tên' },
                { id: 'comment', label: 'Bình luận' },
                { id: 'task', label: 'Nhiệm vụ & Hạn chót' },
                { id: 'watch', label: 'Tài liệu theo dõi' },
                { id: 'meeting', label: 'Cuộc họp & Lời mời' },
                { id: 'dm', label: 'Tin nhắn riêng 1-1' },
                { id: 'system', label: 'Bot cảnh báo' },
              ].map((tab) => {
                const count = tab.id === 'all'
                  ? notifications.filter((n) => !n.isRead).length
                  : notifications.filter((n) => !n.isRead && n.type === tab.id).length;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setNotificationFilter(tab.id as any)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold shrink-0 transition-all ${
                      notificationFilter === tab.id
                        ? 'bg-zinc-900 text-white shadow-2xs'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        notificationFilter === tab.id ? 'bg-white text-zinc-900' : 'bg-blue-600 text-white'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Focus Mode & Deduplication Controls Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Card 1: Focus Mode (Pomodoro Deep Work) */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex flex-col justify-between text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                    🎯
                  </div>
                  <div>
                    <span className="font-bold text-blue-950 block">Chế Độ Tập Trung (Focus Mode):</span>
                    <span className="text-[11px] text-zinc-600">
                      {focusCountdown
                        ? `Đang khóa thông báo. Còn lại: ${focusCountdown}`
                        : 'Khóa thông báo tạm thời để làm việc sâu.'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => {
                      setFocusModeUntil(Date.now() + 25 * 60 * 1000);
                      showToast('Đã kích hoạt Pomodoro 25 phút!');
                    }}
                    className="px-2 py-1 bg-white border border-blue-200 hover:bg-blue-100 text-blue-800 rounded-lg text-[11px] font-semibold"
                  >
                    25p (Pomodoro)
                  </button>
                  <button
                    onClick={() => {
                      setFocusModeUntil(Date.now() + 45 * 60 * 1000);
                      showToast('Đã kích hoạt Focus 45 phút!');
                    }}
                    className="px-2 py-1 bg-white border border-blue-200 hover:bg-blue-100 text-blue-800 rounded-lg text-[11px] font-semibold"
                  >
                    45p
                  </button>
                  {focusModeUntil && (
                    <button
                      onClick={() => {
                        setFocusModeUntil(null);
                        showToast('Đã dừng chế độ tập trung.');
                      }}
                      className="px-2 py-1 text-rose-600 hover:underline font-bold text-[11px]"
                    >
                      Dừng
                    </button>
                  )}
                </div>
              </div>

              {/* Card 2: Desktop Push & Mobile Push Simulator */}
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl flex flex-col justify-between text-xs space-y-2">
                <div>
                  <span className="font-bold text-zinc-900 block">Kênh Phân Phối Thông Báo:</span>
                  <p className="text-[11px] text-zinc-500">Nhận trên màn hình máy tính (Desktop) hoặc trên điện thoại (Mobile Push).</p>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={handleTriggerDesktopPush}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold shadow-2xs"
                  >
                    Test Desktop Push
                  </button>
                  <button
                    onClick={() => setMobilePushPreviewOpen(true)}
                    className="px-2.5 py-1 bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 rounded-lg text-[11px] font-semibold"
                  >
                    Xem Mobile Push
                  </button>
                </div>
              </div>

              {/* Card 3: Deduplication & Smart Digest */}
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl flex flex-col justify-between text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-900">Gộp Thông Báo &amp; Digest:</span>
                  <button
                    onClick={() => {
                      setIsDeduplicationActive(!isDeduplicationActive);
                      showToast(isDeduplicationActive ? 'Đã tắt gộp thông báo trùng lặp.' : 'Đã bật gộp tự động thông báo trùng lặp.');
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isDeduplicationActive ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-600'
                    }`}
                  >
                    {isDeduplicationActive ? 'Đã gộp trùng' : 'Gộp thông báo'}
                  </button>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-zinc-500">Bản tin tóm tắt 08:30 &amp; 17:30</span>
                  <button
                    onClick={() => setDigestExpanded(!digestExpanded)}
                    className="text-blue-600 hover:underline font-semibold text-[11px]"
                  >
                    {digestExpanded ? 'Thu gọn' : 'Xem trước bản tin'}
                  </button>
                </div>
              </div>
            </div>

            {/* Smart Digest Expanded Preview Box */}
            {digestExpanded && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50/40 border border-blue-200 rounded-2xl text-xs animate-in fade-in">
                <div className="p-3 bg-white rounded-xl border border-zinc-200 space-y-1">
                  <span className="font-bold text-zinc-900 block flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Bản Tin Tóm Tắt Sáng (08:30)</span>
                  </span>
                  <p className="text-zinc-600 text-[11px] leading-relaxed">
                    • 2 tài liệu cập nhật trong đêm: RFC Consensus v4, Kế hoạch Q4.<br />
                    • 1 nhiệm vụ đến hạn hôm nay: Kiểm thử hội tụ CRDT 500 CCU.<br />
                    • Cuộc họp lúc 10:00: Sprint Review cùng Alice và Linh.
                  </p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-zinc-200 space-y-1">
                  <span className="font-bold text-zinc-900 block flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Bản Tin Tóm Tắt Chiều (17:30)</span>
                  </span>
                  <p className="text-zinc-600 text-[11px] leading-relaxed">
                    • Tổng kết 4 PR đã được merge trên nhánh main bởi Lê Hoàng.<br />
                    • 2 bình luận đề xuất sửa đổi đang chờ bạn duyệt.<br />
                    • Hệ thống cluster WebSocket hoạt động ổn định 100% uptime.
                  </p>
                </div>
              </div>
            )}

            {/* Notifications Feed */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-500 pb-1">
                <span>
                  Hiển thị{' '}
                  {
                    notifications.filter((n) => {
                      if (notificationFilter === 'all') return true;
                      return n.type === notificationFilter;
                    }).length
                  }{' '}
                  thông báo ({notifications.filter((n) => !n.isRead).length} chưa đọc)
                </span>
                <span className="text-[11px] text-zinc-400">Bấm vào từng thông báo để mở đúng ngữ cảnh tài liệu</span>
              </div>

              <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-2xl overflow-hidden bg-white">
                {notifications
                  .filter((n) => {
                    if (notificationFilter === 'all') return true;
                    return n.type === notificationFilter;
                  })
                  .map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        setNotifications((prev) =>
                          prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
                        );
                        if (n.targetDocId || n.targetUrl?.includes('/doc')) {
                          setActiveTab('comments');
                        }
                        showToast(`Đã mở ngữ cảnh: ${n.title}`);
                      }}
                      className={`p-4 flex items-start gap-3.5 hover:bg-zinc-50 cursor-pointer transition-colors ${
                        !n.isRead ? 'bg-blue-50/20' : ''
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-2xs"
                        style={{ backgroundColor: n.senderColor || '#2563eb' }}
                      >
                        {n.senderName ? n.senderName.slice(0, 1) : '!'}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${!n.isRead ? 'font-bold text-zinc-900' : 'text-zinc-700'}`}>
                              {n.title}
                            </span>
                            {n.isPriority && (
                              <span className="px-1.5 py-0.2 rounded-md bg-rose-50 text-rose-700 text-[9px] font-bold border border-rose-200">
                                Khẩn cấp
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-zinc-400">
                            {new Date(n.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-600 leading-relaxed">{n.content || n.body}</p>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-blue-600 font-semibold hover:underline">
                            ➡️ Mở: {n.targetLabel}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">
                            {n.type === 'mention'
                              ? '@Nhắc tên'
                              : n.type === 'task'
                              ? 'Nhiệm vụ'
                              : n.type === 'watch'
                              ? 'Tài liệu theo dõi'
                              : n.type === 'meeting'
                              ? 'Cuộc họp'
                              : n.type === 'dm'
                              ? 'Nhắn tin 1-1'
                              : 'Bình luận'}
                          </span>
                        </div>
                      </div>

                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Team Communication Norms Table (Section 4 Guideline Cheat Sheet) */}
            <div className="border border-zinc-200 rounded-2xl p-5 bg-zinc-50/70 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <div>
                  <h4 className="font-bold text-zinc-900">Bảng Quy Ước Lựa Chọn Hình Thức Giao Tiếp Chuẩn</h4>
                  <p className="text-zinc-500 text-[11px]">Tránh họp lan man, bảo toàn ngữ cảnh và duy trì nhịp làm việc hiệu quả.</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-200 text-zinc-700">
                  Chuẩn quy ước
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 text-[10px] font-bold text-zinc-400 uppercase">
                      <th className="py-2 px-3">Tình huống</th>
                      <th className="py-2 px-3">Hình thức nên dùng</th>
                      <th className="py-2 px-3">Lợi ích cốt lõi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/60 text-[11px]">
                    {TEAM_COMMUNICATION_NORMS.map((norm, idx) => (
                      <tr key={idx} className="hover:bg-white/80 transition-colors">
                        <td className="py-2 px-3 font-semibold text-zinc-900">{norm.situation}</td>
                        <td className="py-2 px-3 text-blue-700 font-medium">{norm.recommendedTool}</td>
                        <td className="py-2 px-3 text-zinc-600">{norm.rationale}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. Modal Tạo Kênh Mới */}
      {createChannelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200/90 w-full max-w-md overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <h3 className="text-sm font-bold text-zinc-900">Tạo Kênh Trao Đổi Mới</h3>
              <button onClick={() => setCreateChannelModalOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateChannelSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Tên kênh</label>
                <div className="relative">
                  <Hash className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="ví dụ: ra-mat-san-pham"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Loại kênh</label>
                <select
                  value={newChannelCategory}
                  onChange={(e) => setNewChannelCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800"
                >
                  <option value="project">Kênh Dự án (Project)</option>
                  <option value="team">Kênh Phòng ban / Nhóm (Team)</option>
                  <option value="topic">Kênh Theo chủ đề (Topic)</option>
                  <option value="external">Kênh Đối tác ngoài (External)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Mục đích / Mô tả kênh</label>
                <textarea
                  rows={2}
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  placeholder="Mô tả ngắn gọn mục tiêu của kênh..."
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 resize-none"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newChannelPrivate}
                  onChange={(e) => setNewChannelPrivate(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Kênh riêng tư (Chỉ thành viên được mời mới nhìn thấy)</span>
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setCreateChannelModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-black"
                >
                  Tạo kênh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Đặt Lịch Họp (Calendar) */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200/90 w-full max-w-md overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <h3 className="text-sm font-bold text-zinc-900">Đặt Lịch Họp Tích Hợp Lịch</h3>
              <button onClick={() => setScheduleModalOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Chủ đề cuộc họp</label>
                <input
                  type="text"
                  value={scheduleTitle}
                  onChange={(e) => setScheduleTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Ngày họp</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Giờ bắt đầu</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs space-y-1">
                <span className="font-bold text-blue-900 block">Link phòng họp tự động:</span>
                <span className="font-mono text-blue-700 text-[11px]">https://meet.collab.vn/room-sprint</span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  onClick={() => setScheduleModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Đóng
                </button>
                <button
                  onClick={handleGenerateCalendarFile}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải file lịch (.ics)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal Quản Lý Breakout Rooms */}
      {breakoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200/90 w-full max-w-md overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <h3 className="text-sm font-bold text-zinc-900">Phòng Họp Nhóm Nhỏ (Breakout Rooms)</h3>
              <button onClick={() => setBreakoutModalOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-zinc-600">
                Chia nhỏ cuộc họp lớn thành các phòng thảo luận riêng biệt, sau đó tự động gộp lại phòng chính.
              </p>

              <div className="space-y-2">
                <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-zinc-900 block">Phòng 1: Kỹ Thuật &amp; Backend</span>
                    <span className="text-[10px] text-zinc-500">2 thành viên: Nam, Hoàng</span>
                  </div>
                  <button
                    onClick={() => {
                      setActiveBreakoutRoomId('room_1');
                      setBreakoutModalOpen(false);
                      showToast('Đã tham gia Phòng Nhỏ 1 (Backend)!');
                    }}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold"
                  >
                    Vào phòng
                  </button>
                </div>

                <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-zinc-900 block">Phòng 2: UI/UX &amp; Sản Phẩm</span>
                    <span className="text-[10px] text-zinc-500">2 thành viên: Linh, Alice</span>
                  </div>
                  <button
                    onClick={() => {
                      setActiveBreakoutRoomId('room_2');
                      setBreakoutModalOpen(false);
                      showToast('Đã tham gia Phòng Nhỏ 2 (UI/UX)!');
                    }}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold"
                  >
                    Vào phòng
                  </button>
                </div>
              </div>

              {activeBreakoutRoomId && (
                <button
                  onClick={() => {
                    setActiveBreakoutRoomId(null);
                    setBreakoutModalOpen(false);
                    showToast('Đã gộp tất cả thành viên về phòng chính!');
                  }}
                  className="w-full py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-black"
                >
                  Gộp tất cả về Phòng Chính
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal Chuyển Tiếp Tin Nhắn */}
      {forwardModalMessage && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200/90 w-full max-w-md overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <h3 className="text-sm font-bold text-zinc-900">Chuyển Tiếp Tin Nhắn</h3>
              <button onClick={() => setForwardModalMessage(null)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 text-xs italic text-zinc-700">
                "{forwardModalMessage.content}"
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Chọn kênh nhận:</label>
                <select
                  value={forwardTargetChannelId}
                  onChange={(e) => setForwardTargetChannelId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold"
                >
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.name} ({c.categoryLabel})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  onClick={() => setForwardModalMessage(null)}
                  className="px-4 py-2 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleForwardMessageSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700"
                >
                  Chuyển tiếp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal Biến Tin Nhắn Thành Task */}
      {taskModalMessage && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200/90 w-full max-w-md overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <h3 className="text-sm font-bold text-zinc-900">Biến Tin Nhắn Thành Thẻ Việc (Task)</h3>
              <button onClick={() => setTaskModalMessage(null)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-200 text-xs italic text-blue-900">
                "{taskModalMessage.content}"
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Người nhận việc</label>
                <select
                  value={taskAssignee}
                  onChange={(e) => setTaskAssignee(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold"
                >
                  {SEED_USERS.map((u) => (
                    <option key={u.id} value={u.name}>
                      @{u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Hạn chót</label>
                  <input
                    type="date"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Mức độ ưu tiên</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs"
                  >
                    <option value="low">Thấp</option>
                    <option value="medium">Trung bình</option>
                    <option value="high">Cao</option>
                    <option value="urgent">Khẩn cấp</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  onClick={() => setTaskModalMessage(null)}
                  className="px-4 py-2 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreateTaskFromMessage}
                  className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-black"
                >
                  Tạo thẻ trên Kanban
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal Mời Đối Tác Ngoài */}
      {inviteGuestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200/90 w-full max-w-md overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <h3 className="text-sm font-bold text-zinc-900">Mời Khách / Đối Tác Ngoài</h3>
              <button onClick={() => setInviteGuestModalOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-zinc-600">
                Mời đối tác vào kênh dùng chung riêng biệt mà không để lộ các tài liệu nội bộ khác.
              </p>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Email đối tác</label>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="contact@techcorp.vn"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Kênh chia sẻ</label>
                <div className="px-3 py-2 bg-zinc-100 rounded-xl text-xs font-semibold text-zinc-800">
                  #external-techcorp-vietnam
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  onClick={() => setInviteGuestModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    setInviteGuestModalOpen(false);
                    showToast(`Đã gửi liên kết mời tham gia kênh cho ${guestEmail || 'đối tác'}!`);
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700"
                >
                  Gửi lời mời
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal Mô Phỏng Thông Báo Trên Điện Thoại (Mobile Push Simulator) */}
      {mobilePushPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-xs rounded-[3rem] p-4 shadow-2xl space-y-4 animate-in zoom-in-95 text-white">
            {/* Phone Speaker Notch */}
            <div className="w-24 h-4 bg-black rounded-full mx-auto" />

            {/* Lockscreen Time */}
            <div className="text-center pt-2">
              <span className="text-3xl font-light font-mono block">09:41</span>
              <span className="text-[11px] text-zinc-400">Thứ Sáu, 3 tháng 10</span>
            </div>

            {/* Mobile Push Notification Bubble */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 space-y-1.5 shadow-lg">
              <div className="flex items-center justify-between text-[11px] text-zinc-300">
                <div className="flex items-center gap-1.5 font-bold">
                  <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center text-[9px] text-white">
                    C
                  </div>
                  <span>Collab Workspace</span>
                </div>
                <span className="text-[10px] text-zinc-400">Vừa xong</span>
              </div>

              <div className="space-y-0.5">
                <span className="font-bold text-xs text-white block">Trần Thị Linh (@Linh)</span>
                <p className="text-[11px] text-zinc-200 leading-snug">
                  "@Nam ơi xem giúp mình bảng dự báo tài chính ô C12 trước buổi họp sprint 10:00 nhé!"
                </p>
              </div>

              <div className="flex gap-2 pt-1 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setMobilePushPreviewOpen(false);
                    setActiveTab('comments');
                    setCommentMediaView('spreadsheet');
                    showToast('Đã mở trực tiếp ô C12 từ thông báo Push di động!');
                  }}
                  className="flex-1 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-bold hover:bg-blue-700"
                >
                  Xem ngay
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobilePushPreviewOpen(false);
                    showToast('Đã đóng thông báo điện thoại.');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/10 text-zinc-300 text-[10px] hover:bg-white/20"
                >
                  Đóng
                </button>
              </div>
            </div>

            <div className="pt-4 pb-2 text-center">
              <button
                type="button"
                onClick={() => setMobilePushPreviewOpen(false)}
                className="text-xs text-zinc-400 hover:text-white underline"
              >
                Đóng màn hình điện thoại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Modal Tùy Chỉnh Thông Báo Theo Từng Kênh */}
      {channelPrefModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200/90 w-full max-w-md overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-zinc-900">Tùy Chỉnh Thông Báo Từng Kênh</h3>
              </div>
              <button onClick={() => setChannelPrefModalOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-zinc-600 text-[11px]">
                Chọn mức độ nhận thông báo phù hợp cho từng kênh trao đổi để tránh ngắt quãng công việc.
              </p>

              <div className="space-y-2.5 divide-y divide-zinc-100">
                {channels.slice(0, 5).map((chan) => (
                  <div key={chan.id} className="pt-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-zinc-900 block">#{chan.name}</span>
                      <span className="text-[10px] text-zinc-400">{chan.categoryLabel}</span>
                    </div>

                    <select
                      value={channelNotificationPrefs[chan.id] || 'all'}
                      onChange={(e) => {
                        const val = e.target.value as 'all' | 'mention' | 'mute';
                        setChannelNotificationPrefs((prev) => ({ ...prev, [chan.id]: val }));
                        showToast(`Kênh #${chan.name}: Đã đặt thành "${val === 'all' ? 'Tất cả tin' : val === 'mention' ? 'Chỉ khi @nhắc' : 'Tắt tiếng'}"`);
                      }}
                      className="bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1 text-xs text-zinc-800 font-semibold focus:outline-none"
                    >
                      <option value="all">Tất cả tin nhắn</option>
                      <option value="mention">Chỉ khi @nhắc tên</option>
                      <option value="mute">Tắt thông báo (Mute)</option>
                    </select>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-zinc-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setChannelPrefModalOpen(false);
                    showToast('Đã lưu tùy chọn thông báo các kênh!');
                  }}
                  className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-black"
                >
                  Xong
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Google Meet Immersive Full-Screen Session */}
      {activeMeetSession && (
        <GoogleMeetView
          roomTitle={activeMeetSession.roomTitle}
          roomCode={activeMeetSession.roomCode}
          isAudioOnly={activeMeetSession.isAudioOnly}
          onLeaveMeeting={() => {
            setActiveMeetSession(null);
            showToast('Bạn đã rời khỏi cuộc họp Google Meet.');
          }}
          onShowToast={showToast}
        />
      )}
    </div>
  );
}
