'use client';

import React from 'react';
import Link from 'next/link';
import {
  Hash,
  Lock,
  Pin,
  Bookmark,
  Sparkles,
  Radio,
  Video,
  MoreVertical,
  Send,
  Paperclip,
  Smile,
  Mic,
  Download,
  FileText,
  CheckSquare,
  Reply,
  Forward,
  ChevronRight,
  UserCheck,
  Globe,
} from 'lucide-react';
import {
  WorkplaceChannel,
  WorkplaceMessage,
  ThreadReply,
  UserPresenceStatus,
} from '@/components/collaboration/types';
import { ChannelSidebar } from './ChannelSidebar';
import { ThreadDrawer } from './ThreadDrawer';

interface ChannelsTabProps {
  channels: WorkplaceChannel[];
  selectedChannelId: string;
  setSelectedChannelId: (id: string) => void;
  channelMessages: WorkplaceMessage[];
  selectedChannel: WorkplaceChannel;
  selectedUserPresence: UserPresenceStatus;
  setSelectedUserPresence: (s: UserPresenceStatus) => void;
  channelSearch: string;
  setChannelSearch: (s: string) => void;
  pinnedOnlyFilter: boolean;
  setPinnedOnlyFilter: (b: boolean) => void;
  bookmarkedOnlyFilter: boolean;
  setBookmarkedOnlyFilter: (b: boolean) => void;
  messageInput: string;
  handleTyping: (text: string) => void;
  handleSendMessage: (e?: any) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (b: boolean | ((prev: boolean) => boolean)) => void;
  isRecordingAudioMsg: boolean;
  setIsRecordingAudioMsg: (b: boolean) => void;
  isPartnerTyping: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  toggleReaction: (msgId: string, emoji: string) => void;
  handleTogglePin: (msgId: string) => void;
  handleToggleBookmark: (msgId: string) => void;
  activeThreadMessage: WorkplaceMessage | null;
  setActiveThreadMessage: (m: WorkplaceMessage | null) => void;
  threadReplies: Record<string, ThreadReply[]>;
  threadInput: string;
  setThreadInput: (s: string) => void;
  handleSendThreadReply: (e: React.FormEvent) => void;
  setTaskModalMessage: (m: WorkplaceMessage | null) => void;
  setForwardModalMessage: (m: WorkplaceMessage | null) => void;
  setCreateChannelModalOpen: (b: boolean) => void;
  handleStartMeeting: (title: string, code?: string, isAudioOnly?: boolean) => void;
  handleTriggerBotEvent: (type: 'github' | 'sentry') => void;
  isHuddleActive: boolean;
  setIsHuddleActive: (b: boolean) => void;
  isHuddleMuted: boolean;
  setIsHuddleMuted: (b: boolean) => void;
  showToast: (msg: string) => void;
  onSendVoiceMessage?: (msg: WorkplaceMessage) => void;
}

export function ChannelsTab({
  channels,
  selectedChannelId,
  setSelectedChannelId,
  channelMessages,
  selectedChannel,
  selectedUserPresence,
  setSelectedUserPresence,
  channelSearch,
  setChannelSearch,
  pinnedOnlyFilter,
  setPinnedOnlyFilter,
  bookmarkedOnlyFilter,
  setBookmarkedOnlyFilter,
  messageInput,
  handleTyping,
  handleSendMessage,
  fileInputRef,
  handleFileUpload,
  showEmojiPicker,
  setShowEmojiPicker,
  isRecordingAudioMsg,
  setIsRecordingAudioMsg,
  isPartnerTyping,
  messagesEndRef,
  toggleReaction,
  handleTogglePin,
  handleToggleBookmark,
  activeThreadMessage,
  setActiveThreadMessage,
  threadReplies,
  threadInput,
  setThreadInput,
  handleSendThreadReply,
  setTaskModalMessage,
  setForwardModalMessage,
  setCreateChannelModalOpen,
  handleStartMeeting,
  handleTriggerBotEvent,
  isHuddleActive,
  setIsHuddleActive,
  isHuddleMuted,
  setIsHuddleMuted,
  showToast,
  onSendVoiceMessage,
}: ChannelsTabProps) {
  return (
    <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs overflow-hidden flex flex-col md:flex-row h-[720px]">
      {/* Left Column: Channels Explorer List */}
      <ChannelSidebar
        channels={channels}
        selectedChannelId={selectedChannelId}
        setSelectedChannelId={setSelectedChannelId}
        setActiveThreadMessage={setActiveThreadMessage}
        selectedUserPresence={selectedUserPresence}
        setSelectedUserPresence={setSelectedUserPresence}
        channelSearch={channelSearch}
        setChannelSearch={setChannelSearch}
        pinnedOnlyFilter={pinnedOnlyFilter}
        setPinnedOnlyFilter={setPinnedOnlyFilter}
        bookmarkedOnlyFilter={bookmarkedOnlyFilter}
        setBookmarkedOnlyFilter={setBookmarkedOnlyFilter}
        setCreateChannelModalOpen={setCreateChannelModalOpen}
        showToast={showToast}
      />

      {/* Center Column: Channel Chat Window */}
      <div className="flex-1 flex flex-col h-full bg-white min-w-0">
        {/* Channel Header Bar */}
        <div className="h-16 px-6 border-b border-zinc-200/80 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3 truncate">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              {selectedChannel.isPrivate ? (
                <Lock className="w-4 h-4" />
              ) : selectedChannel.category === 'dm' ? (
                <UserCheck className="w-4 h-4 text-emerald-600" />
              ) : (
                <Hash className="w-4 h-4" />
              )}
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-zinc-900 truncate">#{selectedChannel.name}</h2>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-zinc-100 text-zinc-600">
                  {selectedChannel.categoryLabel}
                </span>
                {selectedChannel.isGuest && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] bg-purple-50 text-purple-700 font-semibold border border-purple-200">
                    <Globe className="w-2.5 h-2.5" />
                    <span>{selectedChannel.guestOrganization || 'Đối tác ngoài'}</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 truncate">
                {selectedChannel.description || 'Kênh trao đổi công việc và thảo luận thời gian thực.'}
              </p>
            </div>
          </div>

          {/* Channel Actions Right */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Real Huddle Voice Trigger */}
            <button
              onClick={() => {
                const nextState = !isHuddleActive;
                setIsHuddleActive(nextState);
                showToast(
                  nextState
                    ? `Đã bắt đầu phòng Huddle Thoại tại #${selectedChannel.name}! Đồng nghiệp có thể nhấp để tham gia ngay.`
                    : 'Đã kết thúc phòng Huddle Thoại.'
                );
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isHuddleActive
                  ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{isHuddleActive ? 'Đang Huddle' : 'Huddle Thoại'}</span>
            </button>

            {/* Google Meet Call Trigger */}
            <button
              onClick={() => handleStartMeeting(`Họp Nhanh #${selectedChannel.name}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-xl text-xs font-semibold transition-colors"
            >
              <Video className="w-3.5 h-3.5 text-blue-600" />
              <span>Họp Meet</span>
            </button>

            {/* Test Bot Simulation Triggers */}
            <div className="hidden lg:flex items-center gap-1 border-l border-zinc-200 pl-2">
              <button
                onClick={() => handleTriggerBotEvent('github')}
                className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-[10px] font-mono font-bold"
                title="Giả lập sự kiện GitHub PR Merged"
              >
                + GitHub Bot
              </button>
              <button
                onClick={() => handleTriggerBotEvent('sentry')}
                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-mono font-bold"
                title="Giả lập sự kiện Sentry Bug Alert"
              >
                + Sentry Bot
              </button>
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
                        onClick={() => toggleReaction(msg.id, r.emoji)}
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
                      onClick={() => toggleReaction(msg.id, em)}
                      className="p-1 hover:bg-zinc-100 rounded-lg text-xs"
                    >
                      {em}
                    </button>
                  ))}

                  <button
                    onClick={() => setActiveThreadMessage(msg)}
                    className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-zinc-900"
                    title="Trả lời trong Chuỗi Thread"
                  >
                    <Reply className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleTogglePin(msg.id)}
                    className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-amber-600"
                    title="Ghim tin nhắn"
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleToggleBookmark(msg.id)}
                    className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-blue-600"
                    title="Đánh dấu xem sau"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setForwardModalMessage(msg)}
                    className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-blue-600"
                    title="Chuyển tiếp sang kênh khác"
                  >
                    <Forward className="w-3.5 h-3.5" />
                  </button>

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
          <div ref={messagesEndRef as any} />
        </div>

        {/* Message Input Box */}
        <div className="p-3.5 border-t border-zinc-100 bg-white">
          <div className="border border-zinc-200/90 rounded-2xl p-2.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all bg-zinc-50/50">
            <textarea
              value={messageInput}
              onChange={(e) => handleTyping(e.target.value)}
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
                <input
                  type="file"
                  ref={fileInputRef as any}
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1 hover:text-zinc-700 rounded"
                  title="Đính kèm tệp / hình ảnh từ máy tính"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                </button>

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
                      if (onSendVoiceMessage) {
                        onSendVoiceMessage(audioMsg);
                      }
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

                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  className="p-1 hover:text-zinc-700 rounded relative"
                  title="Bộ chọn biểu tượng cảm xúc (Emoji)"
                >
                  <Smile className="w-3.5 h-3.5" />
                </button>

                {showEmojiPicker && (
                  <div className="absolute left-10 bottom-full mb-2 bg-white rounded-2xl shadow-xl border border-zinc-200 p-2 z-50 grid grid-cols-8 gap-1">
                    {['👍', '❤️', '🚀', '👀', '🎉', '🔥', '💡', '👏', '😂', '🙏', '📋', '💯', '🤝', '🎯', '⚡', '🔔'].map(
                      (em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => {
                            handleTyping(messageInput + em);
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
        <ThreadDrawer
          activeThreadMessage={activeThreadMessage}
          onClose={() => setActiveThreadMessage(null)}
          channelName={selectedChannel.name}
          replies={threadReplies[activeThreadMessage.id] || []}
          threadInput={threadInput}
          setThreadInput={setThreadInput}
          handleSendThreadReply={handleSendThreadReply}
        />
      )}
    </div>
  );
}
