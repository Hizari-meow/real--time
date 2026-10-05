'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  Video,
  Bell,
  Plus,
  Hash,
  CheckCircle2,
  X,
  UserPlus,
  CalendarDays,
} from 'lucide-react';
import { WorkplaceMessage } from './types';
import { GoogleMeetView } from './GoogleMeetView';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api-client';

import { useChatState } from './hub/hooks/useChatState';
import { useMeetingsState } from './hub/hooks/useMeetingsState';
import { useCommentsState } from './hub/hooks/useCommentsState';
import { useNotificationsState } from './hub/hooks/useNotificationsState';

import { ChannelsTab } from './hub/components/ChannelsTab';
import { MeetingsTab } from './hub/components/MeetingsTab';
import { CommentsTab } from './hub/components/CommentsTab';
import { NotificationsTab } from './hub/components/NotificationsTab';
import { CollaborationModals } from './hub/modals/CollaborationModals';

export function TeamCollaborationHub() {
  const [activeTab, setActiveTab] = useState<'channels' | 'meetings' | 'comments' | 'notifications'>('channels');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const { token, workspace, user } = useAuth();

  // Pillar 1: Chat State Hook
  const chatState = useChatState(showToast);

  // Pillar 2: Meetings State Hook
  const meetingsState = useMeetingsState(showToast, (roomTitle, code) => {
    const inviteMsg: WorkplaceMessage = {
      id: `msg_meet_${Date.now()}`,
      channelId: chatState.selectedChannelId,
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
    chatState.setMessages((prev) => ({
      ...prev,
      [chatState.selectedChannelId]: [...(prev[chatState.selectedChannelId] || []), inviteMsg],
    }));
  });

  // Pillar 3: Comments State Hook
  const commentsState = useCommentsState(showToast);

  // Pillar 4: Notifications State Hook
  const notificationsState = useNotificationsState(showToast);

  // Modal States
  const [createChannelModalOpen, setCreateChannelModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelCategory, setNewChannelCategory] = useState<'project' | 'team' | 'topic' | 'external'>('project');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [newChannelPrivate, setNewChannelPrivate] = useState(false);

  const [forwardModalMessage, setForwardModalMessage] = useState<WorkplaceMessage | null>(null);
  const [forwardTargetChannelId, setForwardTargetChannelId] = useState<string>('chan_team_tech');

  const [taskModalMessage, setTaskModalMessage] = useState<WorkplaceMessage | null>(null);
  const [taskAssignee, setTaskAssignee] = useState('Nguyễn Văn Nam');
  const [taskDeadline, setTaskDeadline] = useState('2026-10-05');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('high');

  const [inviteGuestModalOpen, setInviteGuestModalOpen] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');

  const selectedChannel = chatState.channels.find((c) => c.id === chatState.selectedChannelId) || chatState.channels[0];

  // Real Create Channel
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
          const createdChan = {
            id: json.data.id,
            name: json.data.name,
            category: (json.data.type === 'dm' ? 'dm' : json.data.type === 'private' ? 'team' : 'project') as any,
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
          chatState.setChannels((prev) => [...prev, createdChan]);
          chatState.setSelectedChannelId(createdChan.id);
          setCreateChannelModalOpen(false);
          setNewChannelName('');
          setNewChannelDesc('');
          showToast(`Đã tạo kênh #${cleanName} thành công!`);
        }
      } catch (err) {
        console.error('Failed to create channel:', err);
      }
    }
  };

  // Forward Message
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

    chatState.setMessages((prev) => ({
      ...prev,
      [forwardTargetChannelId]: [...(prev[forwardTargetChannelId] || []), forwardedMsg],
    }));
    setForwardModalMessage(null);
    showToast(`Đã chuyển tiếp tin nhắn sang kênh đích!`);
  };

  // Convert Message to Task
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
      channelId: chatState.selectedChannelId,
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

    chatState.setMessages((prev) => ({
      ...prev,
      [chatState.selectedChannelId]: [...(prev[chatState.selectedChannelId] || []), taskMsg],
    }));
    setTaskModalMessage(null);
    showToast(`Đã tạo task trên Kanban cho ${taskAssignee} và thông báo vào kênh!`);
  };

  // iCalendar generator
  const handleGenerateCalendarFile = () => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Collaborative Workspace//Meeting Scheduler//VI
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
SUMMARY:${meetingsState.scheduleTitle}
DESCRIPTION:Cuộc họp trao đổi nhóm kết hợp chia sẻ màn hình và phụ đề AI. Liên kết: https://meet.collab.vn/room-sprint
STATUS:CONFIRMED
DTSTART:${meetingsState.scheduleDate.replace(/-/g, '')}T${meetingsState.scheduleTime.replace(/:/g, '')}00Z
DTEND:${meetingsState.scheduleDate.replace(/-/g, '')}T${meetingsState.scheduleTime.replace(/:/g, '')}45Z
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
    link.setAttribute('download', `cuoc-hop-${meetingsState.scheduleDate}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    meetingsState.setScheduleModalOpen(false);
    showToast('Đã tải xuống file lịch (.ics) tương thích Google Calendar & Outlook!');
  };

  // Trigger simulated bot event
  const handleTriggerBotEvent = (type: 'github' | 'sentry') => {
    const botMsg: WorkplaceMessage =
      type === 'github'
        ? {
            id: `msg_bot_${Date.now()}`,
            channelId: chatState.selectedChannelId,
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
            channelId: chatState.selectedChannelId,
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

    chatState.setMessages((prev) => ({
      ...prev,
      [chatState.selectedChannelId]: [...(prev[chatState.selectedChannelId] || []), botMsg],
    }));
    showToast(`Đã nhận thông báo bot tự động từ ${type.toUpperCase()}!`);
  };

  // File upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const fileUrl = URL.createObjectURL(file);

    const newMsg: WorkplaceMessage = {
      id: `msg_file_${Date.now()}`,
      channelId: chatState.selectedChannelId,
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

    chatState.setMessages((prev) => ({
      ...prev,
      [chatState.selectedChannelId]: [...(prev[chatState.selectedChannelId] || []), newMsg],
    }));
    showToast(`Đã tải lên tệp "${file.name}" thành công!`);
    e.target.value = '';
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
              <span className="text-lg font-bold text-zinc-900">{chatState.channels.length} Kênh</span>
              <span className="text-[10px] text-blue-600 font-medium block">4 Danh mục</span>
            </div>
            <div className="bg-zinc-50/80 rounded-2xl border border-zinc-200/60 p-3.5 text-center min-w-[110px]">
              <span className="text-[10px] font-semibold text-zinc-400 block uppercase tracking-wider">Huddle Thoại</span>
              <span className="text-lg font-bold text-emerald-600">Sẵn sàng</span>
              <span className="text-[10px] text-emerald-600 font-medium block">1-click vào phòng</span>
            </div>
            <div className="bg-zinc-50/80 rounded-2xl border border-zinc-200/60 p-3.5 text-center min-w-[110px]">
              <span className="text-[10px] font-semibold text-zinc-400 block uppercase tracking-wider">Bình Luận Doc</span>
              <span className="text-lg font-bold text-amber-600">
                {commentsState.comments.filter((c) => !c.resolved).length} Mở
              </span>
              <span className="text-[10px] text-zinc-500 font-medium block">Track changes</span>
            </div>
            <div className="bg-zinc-50/80 rounded-2xl border border-zinc-200/60 p-3.5 text-center min-w-[110px]">
              <span className="text-[10px] font-semibold text-zinc-400 block uppercase tracking-wider">Chống Quá Tải</span>
              <span className={`text-lg font-bold ${notificationsState.isDndActive ? 'text-rose-600' : 'text-emerald-600'}`}>
                {notificationsState.isDndActive ? 'Bật DND' : 'Bình thường'}
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
            <span>1. Kênh Dự Án &amp; Tin Nhắn ({chatState.channels.length})</span>
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
              {notificationsState.notifications.filter((n) => !n.isRead).length}
            </span>
          </button>
        </div>

        {/* Global Action Right */}
        <div className="flex items-center gap-2">
          {activeTab === 'channels' && (
            <>
              <button
                onClick={() => setCreateChannelModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo kênh mới</span>
              </button>
              <button
                onClick={() => setInviteGuestModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                <span>Mời đối tác ngoài</span>
              </button>
            </>
          )}

          {activeTab === 'meetings' && (
            <button
              onClick={() => meetingsState.setScheduleModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Đặt lịch họp (Calendar)</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: Channels & Threads */}
      {activeTab === 'channels' && (
        <ChannelsTab
          channels={chatState.channels}
          selectedChannelId={chatState.selectedChannelId}
          setSelectedChannelId={chatState.setSelectedChannelId}
          channelMessages={chatState.channelMessages}
          selectedChannel={selectedChannel}
          selectedUserPresence={chatState.selectedUserPresence}
          setSelectedUserPresence={chatState.setSelectedUserPresence}
          channelSearch={chatState.channelSearch}
          setChannelSearch={chatState.setChannelSearch}
          pinnedOnlyFilter={chatState.pinnedOnlyFilter}
          setPinnedOnlyFilter={chatState.setPinnedOnlyFilter}
          bookmarkedOnlyFilter={chatState.bookmarkedOnlyFilter}
          setBookmarkedOnlyFilter={chatState.setBookmarkedOnlyFilter}
          messageInput={chatState.messageInput}
          handleTyping={chatState.handleTyping}
          handleSendMessage={chatState.handleSendMessage}
          fileInputRef={chatState.fileInputRef}
          handleFileUpload={handleFileUpload}
          showEmojiPicker={chatState.showEmojiPicker}
          setShowEmojiPicker={chatState.setShowEmojiPicker}
          isRecordingAudioMsg={chatState.isRecordingAudioMsg}
          setIsRecordingAudioMsg={chatState.setIsRecordingAudioMsg}
          isPartnerTyping={chatState.isPartnerTyping}
          messagesEndRef={chatState.messagesEndRef}
          toggleReaction={chatState.toggleReaction}
          handleTogglePin={chatState.handleTogglePin}
          handleToggleBookmark={chatState.handleToggleBookmark}
          activeThreadMessage={chatState.activeThreadMessage}
          setActiveThreadMessage={chatState.setActiveThreadMessage}
          threadReplies={chatState.threadReplies}
          threadInput={chatState.threadInput}
          setThreadInput={chatState.setThreadInput}
          handleSendThreadReply={chatState.handleSendThreadReply}
          setTaskModalMessage={setTaskModalMessage}
          setForwardModalMessage={setForwardModalMessage}
          setCreateChannelModalOpen={setCreateChannelModalOpen}
          handleStartMeeting={meetingsState.handleStartMeeting}
          handleTriggerBotEvent={handleTriggerBotEvent}
          isHuddleActive={meetingsState.isHuddleActive}
          setIsHuddleActive={meetingsState.setIsHuddleActive}
          isHuddleMuted={meetingsState.isHuddleMuted}
          setIsHuddleMuted={meetingsState.setIsHuddleMuted}
          showToast={showToast}
          onSendVoiceMessage={(audioMsg) => {
            chatState.setMessages((prev) => ({
              ...prev,
              [chatState.selectedChannelId]: [...(prev[chatState.selectedChannelId] || []), audioMsg],
            }));
          }}
        />
      )}

      {/* TAB 2: Meetings & Huddles */}
      {activeTab === 'meetings' && (
        <MeetingsTab
          newMeetingDropdownOpen={meetingsState.newMeetingDropdownOpen}
          setNewMeetingDropdownOpen={meetingsState.setNewMeetingDropdownOpen}
          handleStartMeeting={meetingsState.handleStartMeeting}
          setScheduleModalOpen={meetingsState.setScheduleModalOpen}
          meetInputCode={meetingsState.meetInputCode}
          setMeetInputCode={meetingsState.setMeetInputCode}
          isHuddleActive={meetingsState.isHuddleActive}
          setIsHuddleActive={meetingsState.setIsHuddleActive}
          showToast={showToast}
        />
      )}

      {/* TAB 3: Comments & Suggestions */}
      {activeTab === 'comments' && (
        <CommentsTab
          commentMediaView={commentsState.commentMediaView}
          setCommentMediaView={commentsState.setCommentMediaView}
          isDocumentWatched={commentsState.isDocumentWatched}
          handleToggleWatchDoc={commentsState.handleToggleWatchDoc}
          selectedCellData={commentsState.selectedCellData}
          selectedCellCoord={commentsState.selectedCellCoord}
          selectedDesignZone={commentsState.selectedDesignZone}
          docSnippetText={commentsState.docSnippetText}
          docSelectedRange={commentsState.docSelectedRange}
          setDocSelectedRange={commentsState.setDocSelectedRange}
          docInputMode={commentsState.docInputMode}
          setDocInputMode={commentsState.setDocInputMode}
          comments={commentsState.comments}
          setComments={commentsState.setComments}
          selectedCommentId={commentsState.selectedCommentId}
          setSelectedCommentId={commentsState.setSelectedCommentId}
          commentViewFilter={commentsState.commentViewFilter}
          setCommentViewFilter={commentsState.setCommentViewFilter}
          docSuggestInput={commentsState.docSuggestInput}
          setDocSuggestInput={commentsState.setDocSuggestInput}
          docCommentInput={commentsState.docCommentInput}
          setDocCommentInput={commentsState.setDocCommentInput}
          mentionPopupOpen={commentsState.mentionPopupOpen}
          setMentionPopupOpen={commentsState.setMentionPopupOpen}
          docPermissionPromptUser={commentsState.docPermissionPromptUser}
          setDocPermissionPromptUser={commentsState.setDocPermissionPromptUser}
          hasAudioAttached={commentsState.hasAudioAttached}
          setHasAudioAttached={commentsState.setHasAudioAttached}
          hasVideoAttached={commentsState.hasVideoAttached}
          setHasVideoAttached={commentsState.setHasVideoAttached}
          isTaskAssignmentOpen={commentsState.isTaskAssignmentOpen}
          setIsTaskAssignmentOpen={commentsState.setIsTaskAssignmentOpen}
          taskAssigneeTarget={commentsState.taskAssigneeTarget}
          setTaskAssigneeTarget={commentsState.setTaskAssigneeTarget}
          taskDeadlineTarget={commentsState.taskDeadlineTarget}
          setTaskDeadlineTarget={commentsState.setTaskDeadlineTarget}
          isRecordingAudio={commentsState.isRecordingAudio}
          playingDocVoiceId={commentsState.playingDocVoiceId}
          setPlayingDocVoiceId={commentsState.setPlayingDocVoiceId}
          replyInputCommentId={commentsState.replyInputCommentId}
          setReplyInputCommentId={commentsState.setReplyInputCommentId}
          replyInputText={commentsState.replyInputText}
          setReplyInputText={commentsState.setReplyInputText}
          handleAddDocComment={commentsState.handleAddDocComment}
          handleAcceptSuggestionInDoc={commentsState.handleAcceptSuggestionInDoc}
          handleRejectSuggestionInDoc={commentsState.handleRejectSuggestionInDoc}
          handleStartVoiceRecording={commentsState.handleStartVoiceRecording}
          handleAttachLoomVideo={commentsState.handleAttachLoomVideo}
          handleToggleDocCommentReaction={commentsState.handleToggleDocCommentReaction}
          handleConvertCommentToTask={commentsState.handleConvertCommentToTask}
          handleAddDocCommentReply={commentsState.handleAddDocCommentReply}
          showToast={showToast}
        />
      )}

      {/* TAB 4: Notifications & Focus */}
      {activeTab === 'notifications' && (
        <NotificationsTab
          notifications={notificationsState.notifications}
          setNotifications={notificationsState.setNotifications}
          notificationFilter={notificationsState.notificationFilter}
          setNotificationFilter={notificationsState.setNotificationFilter}
          isDndActive={notificationsState.isDndActive}
          setIsDndActive={notificationsState.setIsDndActive}
          focusCountdown={notificationsState.focusCountdown}
          focusModeUntil={notificationsState.focusModeUntil}
          setFocusModeUntil={notificationsState.setFocusModeUntil}
          digestExpanded={notificationsState.digestExpanded}
          setDigestExpanded={notificationsState.setDigestExpanded}
          setMobilePushPreviewOpen={notificationsState.setMobilePushPreviewOpen}
          isDeduplicationActive={notificationsState.isDeduplicationActive}
          setIsDeduplicationActive={notificationsState.setIsDeduplicationActive}
          setChannelPrefModalOpen={notificationsState.setChannelPrefModalOpen}
          handleTriggerDesktopPush={notificationsState.handleTriggerDesktopPush}
          setActiveTab={setActiveTab}
          showToast={showToast}
        />
      )}

      {/* Modals */}
      <CollaborationModals
        createChannelModalOpen={createChannelModalOpen}
        setCreateChannelModalOpen={setCreateChannelModalOpen}
        newChannelName={newChannelName}
        setNewChannelName={setNewChannelName}
        newChannelCategory={newChannelCategory}
        setNewChannelCategory={setNewChannelCategory}
        newChannelDesc={newChannelDesc}
        setNewChannelDesc={setNewChannelDesc}
        newChannelPrivate={newChannelPrivate}
        setNewChannelPrivate={setNewChannelPrivate}
        handleCreateChannelSubmit={handleCreateChannelSubmit}
        scheduleModalOpen={meetingsState.scheduleModalOpen}
        setScheduleModalOpen={meetingsState.setScheduleModalOpen}
        scheduleTitle={meetingsState.scheduleTitle}
        setScheduleTitle={meetingsState.setScheduleTitle}
        scheduleDate={meetingsState.scheduleDate}
        setScheduleDate={meetingsState.setScheduleDate}
        scheduleTime={meetingsState.scheduleTime}
        setScheduleTime={meetingsState.setScheduleTime}
        handleGenerateCalendarFile={handleGenerateCalendarFile}
        breakoutModalOpen={meetingsState.breakoutModalOpen}
        setBreakoutModalOpen={meetingsState.setBreakoutModalOpen}
        activeBreakoutRoomId={meetingsState.activeBreakoutRoomId}
        setActiveBreakoutRoomId={meetingsState.setActiveBreakoutRoomId}
        forwardModalMessage={forwardModalMessage}
        setForwardModalMessage={setForwardModalMessage}
        forwardTargetChannelId={forwardTargetChannelId}
        setForwardTargetChannelId={setForwardTargetChannelId}
        handleForwardMessageSubmit={handleForwardMessageSubmit}
        channels={chatState.channels}
        taskModalMessage={taskModalMessage}
        setTaskModalMessage={setTaskModalMessage}
        taskAssignee={taskAssignee}
        setTaskAssignee={setTaskAssignee}
        taskDeadline={taskDeadline}
        setTaskDeadline={setTaskDeadline}
        taskPriority={taskPriority}
        setTaskPriority={setTaskPriority}
        handleCreateTaskFromMessage={handleCreateTaskFromMessage}
        inviteGuestModalOpen={inviteGuestModalOpen}
        setInviteGuestModalOpen={setInviteGuestModalOpen}
        guestEmail={guestEmail}
        setGuestEmail={setGuestEmail}
        mobilePushPreviewOpen={notificationsState.mobilePushPreviewOpen}
        setMobilePushPreviewOpen={notificationsState.setMobilePushPreviewOpen}
        setActiveTab={setActiveTab}
        setCommentMediaView={commentsState.setCommentMediaView}
        channelPrefModalOpen={notificationsState.channelPrefModalOpen}
        setChannelPrefModalOpen={notificationsState.setChannelPrefModalOpen}
        channelNotificationPrefs={notificationsState.channelNotificationPrefs}
        setChannelNotificationPrefs={notificationsState.setChannelNotificationPrefs}
        showToast={showToast}
      />

      {/* Active Google Meet Immersive Full-Screen Session */}
      {meetingsState.activeMeetSession && (
        <GoogleMeetView
          roomTitle={meetingsState.activeMeetSession.roomTitle}
          roomCode={meetingsState.activeMeetSession.roomCode}
          isAudioOnly={meetingsState.activeMeetSession.isAudioOnly}
          onLeaveMeeting={() => {
            meetingsState.setActiveMeetSession(null);
            showToast('Bạn đã rời khỏi cuộc họp Google Meet.');
          }}
          onShowToast={showToast}
        />
      )}
    </div>
  );
}
