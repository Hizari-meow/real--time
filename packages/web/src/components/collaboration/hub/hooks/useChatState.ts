import { useState, useEffect, useRef } from 'react';
import {
  WorkplaceChannel,
  WorkplaceMessage,
  ThreadReply,
  UserPresenceStatus,
} from '@/components/collaboration/types';
import {
  SEED_CHANNELS,
  SEED_MESSAGES,
  SEED_THREAD_REPLIES,
} from '@/components/collaboration/seed-data';
import { useAuth } from '@/context/AuthContext';
import { API_BASE, WS_BASE } from '@/lib/api-client';

export function useChatState(showToast: (msg: string) => void) {
  const { user, token, workspace } = useAuth();

  const [channels, setChannels] = useState<WorkplaceChannel[]>(SEED_CHANNELS);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('chan_proj_website');
  const [messages, setMessages] = useState<Record<string, WorkplaceMessage[]>>(SEED_MESSAGES);
  const [threadReplies, setThreadReplies] = useState<Record<string, ThreadReply[]>>(SEED_THREAD_REPLIES);
  const [activeThreadMessage, setActiveThreadMessage] = useState<WorkplaceMessage | null>(null);
  const [channelSearch, setChannelSearch] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [threadInput, setThreadInput] = useState('');
  const [pinnedOnlyFilter, setPinnedOnlyFilter] = useState(false);
  const [bookmarkedOnlyFilter, setBookmarkedOnlyFilter] = useState(false);
  const [selectedUserPresence, setSelectedUserPresence] = useState<UserPresenceStatus>('online');

  const isSendingRef = useRef(false);
  const socketRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<any>(null);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecordingAudioMsg, setIsRecordingAudioMsg] = useState(false);

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

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages[selectedChannelId]?.length, isPartnerTyping]);

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

  const handleSendMessage = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e && 'preventDefault' in e) {
      e.preventDefault();
    }
    const text = messageInput.trim();
    if (!text || isSendingRef.current) return;

    isSendingRef.current = true;
    setMessageInput('');

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
        });
        const json = await res.json();
        if (json.success && json.data) {
          const msg = json.data;
          setMessages((prev) => ({
            ...prev,
            [selectedChannelId]: [
              ...(prev[selectedChannelId] || []),
              {
                id: msg.id,
                channelId: msg.channelId,
                senderId: msg.senderId,
                senderName: msg.senderName,
                senderColor: msg.senderColor || '#2563eb',
                senderRole: msg.senderRole || 'Thành viên',
                content: msg.content,
                timestamp: new Date(msg.createdAt).getTime(),
                type: msg.type || 'text',
                reactions: [],
                threadCount: 0,
              },
            ],
          }));
        }
      } catch (err) {
        console.error('Failed to send message via REST fallback:', err);
      }
    }

    setTimeout(() => {
      isSendingRef.current = false;
    }, 200);
  };

  const handleSendThreadReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeThreadMessage || !threadInput.trim()) return;

    const text = threadInput.trim();
    setThreadInput('');

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'chat:thread_reply',
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
          body: JSON.stringify({ content: text }),
        });
        const json = await res.json();
        if (json.success && json.data) {
          const reply = json.data;
          setThreadReplies((prev) => ({
            ...prev,
            [activeThreadMessage.id]: [
              ...(prev[activeThreadMessage.id] || []),
              {
                id: reply.id,
                messageId: activeThreadMessage.id,
                senderId: reply.senderId,
                senderName: reply.senderName,
                senderColor: reply.senderColor || '#2563eb',
                content: reply.content,
                timestamp: new Date(reply.createdAt).getTime(),
                reactions: [],
              },
            ],
          }));
        }
      } catch (err) {
        console.error('Failed to post thread reply:', err);
      }
    }
  };

  const toggleReaction = (msgId: string, emoji: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'chat:reaction_toggle',
          channelId: selectedChannelId,
          messageId: msgId,
          emoji,
        })
      );
    } else if (token && workspace?.orgId) {
      fetch(`${API_BASE}/chat/messages/${msgId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-workspace-id': workspace.orgId,
        },
        body: JSON.stringify({ emoji }),
      }).catch(console.error);
    }

    // Optimistic local update
    setMessages((prev) => {
      const channelMsgs = prev[selectedChannelId] || [];
      return {
        ...prev,
        [selectedChannelId]: channelMsgs.map((m) => {
          if (m.id !== msgId) return m;
          const existing = m.reactions.find((r) => r.emoji === emoji);
          let newReactions;
          if (existing) {
            newReactions = m.reactions
              .map((r) => (r.emoji === emoji ? { ...r, count: r.count - 1 } : r))
              .filter((r) => r.count > 0);
          } else {
            newReactions = [...m.reactions, { emoji, count: 1, users: [user?.userId || 'usr_me'] }];
          }
          return { ...m, reactions: newReactions };
        }),
      };
    });
  };

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newMsg: WorkplaceMessage = {
      id: `msg_file_${Date.now()}`,
      channelId: selectedChannelId,
      senderId: user?.userId || 'usr_nam',
      senderName: user?.name || 'Nguyễn Văn Nam',
      senderColor: '#2563eb',
      senderRole: 'Lead Engineer',
      content: `Đã đính kèm tệp tin: ${file.name}`,
      timestamp: Date.now(),
      type: 'file',
      reactions: [],
      threadCount: 0,
      attachment: {
        fileName: file.name,
        fileSize: `${(file.size / 1024).toFixed(1)} KB`,
        fileType: file.type || 'application/octet-stream',
      },
    };

    setMessages((prev) => ({
      ...prev,
      [selectedChannelId]: [...(prev[selectedChannelId] || []), newMsg],
    }));

    showToast(`Đã gửi tệp "${file.name}" vào kênh!`);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTogglePin = (msgId: string) => {
    setMessages((prev) => {
      const list = prev[selectedChannelId] || [];
      return {
        ...prev,
        [selectedChannelId]: list.map((m) => {
          if (m.id === msgId) {
            const nextPinned = !m.isPinned;
            showToast(nextPinned ? 'Đã ghim tin nhắn lên đầu kênh!' : 'Đã bỏ ghim tin nhắn.');
            return { ...m, isPinned: nextPinned };
          }
          return m;
        }),
      };
    });
  };

  const handleToggleBookmark = (msgId: string) => {
    setMessages((prev) => {
      const list = prev[selectedChannelId] || [];
      return {
        ...prev,
        [selectedChannelId]: list.map((m) => {
          if (m.id === msgId) {
            const nextBookmarked = !m.isBookmarked;
            showToast(nextBookmarked ? 'Đã lưu tin nhắn vào mục Đánh dấu!' : 'Đã bỏ đánh dấu.');
            return { ...m, isBookmarked: nextBookmarked };
          }
          return m;
        }),
      };
    });
  };

  const handleTyping = (text: string) => {
    setMessageInput(text);
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'chat:typing',
          channelId: selectedChannelId,
          isTyping: text.length > 0,
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

  return {
    channels,
    setChannels,
    selectedChannelId,
    setSelectedChannelId,
    messages,
    setMessages,
    channelMessages,
    threadReplies,
    setThreadReplies,
    activeThreadMessage,
    setActiveThreadMessage,
    channelSearch,
    setChannelSearch,
    messageInput,
    setMessageInput,
    threadInput,
    setThreadInput,
    pinnedOnlyFilter,
    setPinnedOnlyFilter,
    bookmarkedOnlyFilter,
    setBookmarkedOnlyFilter,
    selectedUserPresence,
    setSelectedUserPresence,
    isPartnerTyping,
    messagesEndRef,
    fileInputRef,
    showEmojiPicker,
    setShowEmojiPicker,
    isRecordingAudioMsg,
    setIsRecordingAudioMsg,
    handleSendMessage,
    handleSendThreadReply,
    toggleReaction,
    handleAttachmentUpload,
    handleTogglePin,
    handleToggleBookmark,
    handleTyping,
  };
}
