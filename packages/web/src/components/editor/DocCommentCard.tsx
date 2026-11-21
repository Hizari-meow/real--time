'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Trash2,
  Reply,
  Check,
  RotateCcw,
  Clock,
  Sparkles,
  ArrowRight,
  Send,
  User,
  Lightbulb,
} from 'lucide-react';
import { CommentItem } from './useDocComments';

interface DocCommentCardProps {
  comment: CommentItem;
  currentUserId: string;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
  onReply: (parentId: string, content: string) => Promise<boolean>;
  onAcceptSuggestion?: (originalText: string, replacementText: string, commentId: string) => void;
}

export function DocCommentCard({
  comment,
  currentUserId,
  onResolve,
  onDelete,
  onReply,
  onAcceptSuggestion,
}: DocCommentCardProps) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const anchor = comment.anchor || {};
  const isResolved = comment.status === 'resolved';

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSubmittingReply) return;
    setIsSubmittingReply(true);
    const success = await onReply(comment.id, replyText.trim());
    setIsSubmittingReply(false);
    if (success) {
      setReplyText('');
      setShowReplyInput(false);
    }
  };

  return (
    <div
      className={`p-4 rounded-xl border transition-all ${
        isResolved
          ? 'bg-slate-900/40 border-slate-800/80 opacity-70'
          : 'bg-slate-900/90 border-slate-800 shadow-md'
      }`}
    >
      {/* Anchor Snippet Quote */}
      {anchor.selectedText && (
        <div className="mb-3 px-3 py-1.5 rounded-lg bg-blue-950/30 border-l-2 border-blue-500 text-xs text-blue-200/90 italic line-clamp-2">
          &ldquo;{anchor.selectedText}&rdquo;
        </div>
      )}

      {/* Author and Action Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-xs font-semibold">
            {comment.authorName.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-semibold text-slate-200">{comment.authorName}</span>
          <span className="text-[11px] text-slate-500">
            {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onResolve(comment.id)}
            className={`p-1 rounded hover:bg-slate-800 transition-colors ${
              isResolved ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
            }`}
            title={isResolved ? 'Đã giải quyết' : 'Đánh dấu hoàn thành'}
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(comment.id)}
            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Xóa bình luận"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Comment Content */}
      <div className="text-sm text-slate-300 leading-relaxed mb-3 whitespace-pre-wrap">
        {comment.content}
      </div>

      {/* Suggestion Mode Replacement Box */}
      {anchor.isSuggestion && anchor.suggestedReplacement && (
        <div className="mb-3 p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-xs space-y-2">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Đề xuất thay đổi nội dung:</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="line-through text-rose-400/80">{anchor.selectedText}</span>
            <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
            <span className="text-emerald-300 font-medium">{anchor.suggestedReplacement}</span>
          </div>
          {onAcceptSuggestion && !isResolved && (
            <button
              onClick={() => {
                onAcceptSuggestion(anchor.selectedText || '', anchor.suggestedReplacement || '', comment.id);
                onResolve(comment.id);
              }}
              className="mt-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
            >
              <Check className="w-3 h-3" />
              <span>Chấp nhận đề xuất này</span>
            </button>
          )}
        </div>
      )}

      {/* Task Badge */}
      {anchor.isTask && anchor.assignedToName && (
        <div className="mb-3 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3" />
            <span>Giao việc: <strong>{anchor.assignedToName}</strong></span>
          </div>
          {anchor.taskDeadline && (
            <span className="text-[10px] text-amber-400/80 font-mono">Hạn: {anchor.taskDeadline}</span>
          )}
        </div>
      )}

      {/* Thread Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-800 space-y-2.5 pl-2">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="text-xs bg-slate-800/40 p-2.5 rounded-lg border border-slate-750">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="font-semibold text-slate-200">{reply.authorName}</span>
                <span className="text-[10px]">
                  {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-slate-300 leading-normal">{reply.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Reply Trigger & Form */}
      <div className="mt-3 pt-2 flex items-center justify-between border-t border-slate-800/50">
        {!showReplyInput ? (
          <button
            onClick={() => setShowReplyInput(true)}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition-colors"
          >
            <Reply className="w-3.5 h-3.5" />
            <span>Phản hồi luồng</span>
          </button>
        ) : (
          <form onSubmit={handleSendReply} className="w-full flex items-center gap-2 mt-1">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Nhập câu trả lời..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={isSubmittingReply || !replyText.trim()}
              className="p-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setShowReplyInput(false)}
              className="text-xs text-slate-500 hover:text-slate-300 px-1"
            >
              Hủy
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
