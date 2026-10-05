'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  X,
  Send,
  CheckCircle2,
  ThumbsUp,
  Tag,
  User,
  Clock,
  Trash2,
} from 'lucide-react';
import { WhiteboardCommentPin, WhiteboardCommentReply } from './types';

interface WhiteboardCommentCardProps {
  pin: WhiteboardCommentPin | null;
  newPinCoord: { x: number; y: number } | null;
  screenPos: { x: number; y: number };
  onClose: () => void;
  onSubmitNewComment: (content: string, targetName?: string) => void;
  onToggleResolve?: (pinId: string) => void;
  onAddReply?: (pinId: string, content: string) => void;
  currentUser: { id: string; name: string; color: string };
}

export function WhiteboardCommentCard({
  pin,
  newPinCoord,
  screenPos,
  onClose,
  onSubmitNewComment,
  onToggleResolve,
  onAddReply,
  currentUser,
}: WhiteboardCommentCardProps) {
  const [newContent, setNewContent] = useState('');
  const [replyText, setReplyText] = useState('');

  // Position nicely relative to screenPos, keeping on screen
  const style: React.CSSProperties = {
    position: 'absolute',
    left: Math.min(Math.max(screenPos.x + 16, 20), window.innerWidth - 340),
    top: Math.min(Math.max(screenPos.y - 20, 70), window.innerHeight - 380),
    zIndex: 45,
  };

  // If creating new pin
  if (!pin && newPinCoord) {
    return (
      <div
        style={style}
        onClick={(e) => e.stopPropagation()}
        className="w-80 bg-white rounded-2xl shadow-2xl border border-purple-200 p-4 font-sans animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100 mb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
            <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping" />
            <span>Thêm bình luận tại vị trí này</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <textarea
          rows={3}
          placeholder="Nhập nội dung góp ý, gắn thẻ @Giang, @Nam, @Linh..."
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          autoFocus
          className="w-full text-xs p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white resize-none"
        />

        <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[10px]">
          <span className="text-zinc-400">Gợi ý gắn thẻ:</span>
          {['@Giang', '@Nam', '@Linh', '@Hoàng'].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setNewContent((prev) => (prev ? `${prev} ${tag} ` : `${tag} `))}
              className="px-1.5 py-0.5 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold"
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 mt-3 pt-2.5 border-t border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={!newContent.trim()}
            onClick={() => {
              if (newContent.trim()) {
                onSubmitNewComment(newContent.trim());
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Gửi bình luận</span>
          </button>
        </div>
      </div>
    );
  }

  // If viewing existing pin
  if (pin) {
    return (
      <div
        style={style}
        onClick={(e) => e.stopPropagation()}
        className={`w-80 sm:w-90 bg-white rounded-2xl shadow-2xl border p-4 font-sans animate-in zoom-in-95 duration-150 ${
          pin.resolved ? 'border-emerald-300 bg-emerald-50/20' : 'border-purple-300'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-2xs"
              style={{ backgroundColor: pin.authorColor }}
            >
              {pin.authorName[0]}
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-zinc-900 truncate">{pin.authorName}</h4>
              <span className="text-[10px] text-zinc-400 block truncate">{pin.authorRole}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onToggleResolve && (
              <button
                type="button"
                onClick={() => onToggleResolve(pin.id)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-colors ${
                  pin.resolved
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-zinc-100 hover:bg-emerald-50 text-zinc-600 hover:text-emerald-700'
                }`}
                title={pin.resolved ? 'Mở lại bình luận' : 'Đánh dấu đã giải quyết'}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{pin.resolved ? 'Đã xong' : 'Giải quyết'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Target context if available */}
        {pin.targetElementName && (
          <div className="mb-2 px-2 py-1 rounded-lg bg-zinc-100 text-[10px] text-zinc-600 font-mono">
            🎯 Vị trí: {pin.targetElementName}
          </div>
        )}

        {/* Content */}
        <p className="text-xs text-zinc-800 leading-relaxed font-sans whitespace-pre-wrap">
          {pin.content}
        </p>

        {/* Replies */}
        {pin.replies && pin.replies.length > 0 && (
          <div className="mt-3 pt-3 border-t border-zinc-100 space-y-2 max-h-48 overflow-y-auto">
            {pin.replies.map((r) => (
              <div key={r.id} className="flex items-start gap-2 bg-zinc-50 p-2.5 rounded-xl text-xs">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0 mt-0.5"
                  style={{ backgroundColor: r.authorColor }}
                >
                  {r.authorName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-900">{r.authorName}</span>
                    <span className="text-[9px] text-zinc-400 font-mono">Vừa xong</span>
                  </div>
                  <p className="text-zinc-700 text-[11px] mt-0.5 leading-snug">{r.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reply Input */}
        {onAddReply && (
          <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Trả lời bình luận..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && replyText.trim()) {
                  onAddReply(pin.id, replyText.trim());
                  setReplyText('');
                }
              }}
              className="flex-1 px-2.5 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white"
            />
            <button
              type="button"
              disabled={!replyText.trim()}
              onClick={() => {
                if (replyText.trim()) {
                  onAddReply(pin.id, replyText.trim());
                  setReplyText('');
                }
              }}
              className="p-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl transition-colors shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
