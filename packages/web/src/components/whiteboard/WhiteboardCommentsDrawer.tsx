'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  X,
  CheckCircle2,
  Clock,
  Send,
  Trash2,
  Check,
  RotateCcw,
  Sparkles,
  User,
  ThumbsUp,
  Tag,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { WhiteboardCommentPin, WhiteboardCommentReply } from './types';

interface WhiteboardCommentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  comments: WhiteboardCommentPin[];
  activePinId: string | null;
  onSelectPin: (pinId: string) => void;
  onToggleResolve: (pinId: string) => void;
  onAddReply: (pinId: string, content: string) => void;
  onDeleteComment?: (pinId: string) => void;
  currentUser: { id: string; name: string; color: string };
  boardTitle: string;
}

export function WhiteboardCommentsDrawer({
  isOpen,
  onClose,
  comments,
  activePinId,
  onSelectPin,
  onToggleResolve,
  onAddReply,
  onDeleteComment,
  currentUser,
  boardTitle,
}: WhiteboardCommentsDrawerProps) {
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open');
  const [replyInputPinId, setReplyInputPinId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  if (!isOpen) return null;

  const filteredComments = comments.filter((c) => {
    if (filter === 'open') return !c.resolved;
    if (filter === 'resolved') return c.resolved;
    return true;
  });

  const openCount = comments.filter((c) => !c.resolved).length;
  const resolvedCount = comments.filter((c) => c.resolved).length;

  const handleSendReply = (pinId: string) => {
    if (!replyText.trim()) return;
    onAddReply(pinId, replyText.trim());
    setReplyText('');
    setReplyInputPinId(null);
  };

  const timeAgo = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
  };

  return (
    <aside className="fixed top-14 right-0 bottom-0 w-80 sm:w-96 bg-white border-l border-zinc-200/90 shadow-2xl z-40 flex flex-col font-sans animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-900">Bình Luận Bản Vẽ Canvas</h3>
            <p className="text-[10px] text-zinc-400 font-mono truncate max-w-[200px]">
              {boardTitle}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          title="Đóng"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-200/70 flex items-center gap-1 shrink-0 text-xs">
        <button
          type="button"
          onClick={() => setFilter('open')}
          className={`flex-1 py-1 px-2 rounded-lg font-medium text-center transition-all ${
            filter === 'open'
              ? 'bg-white text-purple-900 font-bold shadow-2xs'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          Chưa xử lý ({openCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('resolved')}
          className={`flex-1 py-1 px-2 rounded-lg font-medium text-center transition-all ${
            filter === 'resolved'
              ? 'bg-white text-emerald-900 font-bold shadow-2xs'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          Đã xong ({resolvedCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`py-1 px-2 rounded-lg font-medium text-center transition-all ${
            filter === 'all'
              ? 'bg-white text-zinc-900 font-bold shadow-2xs'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          Tất cả ({comments.length})
        </button>
      </div>

      {/* Tip Banner */}
      <div className="px-4 py-2 bg-purple-50/70 border-b border-purple-100/60 text-[11px] text-purple-900 flex items-center justify-between">
        <span>💡 Bấm vào bình luận để tự động trượt đến vị trí trên canvas</span>
      </div>

      {/* Comment List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredComments.length === 0 ? (
          <div className="text-center py-16 px-4 text-zinc-400">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
            <p className="text-xs font-semibold text-zinc-600">
              {filter === 'open'
                ? 'Không có bình luận nào đang chờ giải quyết!'
                : filter === 'resolved'
                ? 'Chưa có bình luận nào được đánh dấu hoàn tất.'
                : 'Chưa có bình luận nào trên bảng vẽ này.'}
            </p>
            <p className="text-[11px] text-zinc-400 mt-1">
              Chọn công cụ Bình luận (phím C) và click lên bất kỳ vị trí nào để để lại góp ý.
            </p>
          </div>
        ) : (
          filteredComments.map((c, index) => {
            const isActive = activePinId === c.id;
            return (
              <div
                key={c.id}
                onClick={() => onSelectPin(c.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  c.resolved
                    ? 'bg-zinc-50 border-zinc-200/80 opacity-75'
                    : isActive
                    ? 'bg-purple-50/80 border-purple-300 shadow-xs ring-2 ring-purple-400/20'
                    : 'bg-white border-zinc-200/80 hover:border-purple-200 hover:shadow-2xs'
                }`}
              >
                {/* Author & Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-2xs"
                      style={{ backgroundColor: c.authorColor }}
                    >
                      {c.authorName[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-900 truncate">
                          {c.authorName}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-500 font-mono">
                          Pin #{index + 1}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400 block truncate">
                        {c.authorRole} • {timeAgo(c.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Resolve Toggle Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleResolve(c.id);
                    }}
                    className={`p-1 rounded-lg transition-colors ${
                      c.resolved
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50'
                    }`}
                    title={c.resolved ? 'Mở lại bình luận' : 'Đánh dấu đã giải quyết'}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Target context if applicable */}
                {c.targetElementName && (
                  <div className="mb-2 px-2 py-1 rounded-lg bg-zinc-100 text-[10px] text-zinc-600 font-mono truncate">
                    🎯 Vị trí: {c.targetElementName}
                  </div>
                )}

                {/* Main Content */}
                <p className="text-xs text-zinc-800 leading-relaxed font-sans whitespace-pre-wrap">
                  {c.content}
                </p>

                {/* Thread Replies */}
                {c.replies && c.replies.length > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-zinc-100 space-y-2">
                    {c.replies.map((r) => (
                      <div key={r.id} className="flex items-start gap-2 bg-zinc-50 p-2 rounded-xl text-xs">
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0 mt-0.5"
                          style={{ backgroundColor: r.authorColor }}
                        >
                          {r.authorName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-zinc-900">{r.authorName}</span>
                            <span className="text-[9px] text-zinc-400">{timeAgo(r.timestamp)}</span>
                          </div>
                          <p className="text-zinc-700 text-[11px] mt-0.5 leading-snug">{r.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Input Bar */}
                {replyInputPinId === c.id ? (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center gap-1.5"
                  >
                    <input
                      type="text"
                      placeholder="Phản hồi bình luận này..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendReply(c.id);
                        if (e.key === 'Escape') setReplyInputPinId(null);
                      }}
                      autoFocus
                      className="flex-1 px-2.5 py-1 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:border-purple-500 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleSendReply(c.id)}
                      className="p-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                      title="Gửi"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyInputPinId(null)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg"
                      title="Hủy"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReplyInputPinId(c.id);
                      }}
                      className="font-medium text-purple-700 hover:underline flex items-center gap-1"
                    >
                      <span>Trả lời ({c.replies ? c.replies.length : 0})</span>
                    </button>

                    {onDeleteComment && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Bạn có chắc muốn xóa bình luận này khỏi bảng vẽ?')) {
                            onDeleteComment(c.id);
                          }
                        }}
                        className="p-1 text-zinc-400 hover:text-rose-600 rounded transition-colors"
                        title="Xóa bình luận"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
