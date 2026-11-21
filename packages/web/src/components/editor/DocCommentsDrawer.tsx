'use client';

import React, { useState, useMemo } from 'react';
import * as Y from 'yjs';
import {
  MessageSquare,
  X,
  Plus,
  Send,
  Sparkles,
  User,
  Filter,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useDocComments, CommentAnchor } from './useDocComments';
import { DocCommentCard } from './DocCommentCard';

export interface DocCommentsDrawerProps {
  documentId: string;
  documentTitle: string;
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    id: string;
    name: string;
    color: string;
  };
  ydoc?: Y.Doc;
  selectedText?: string;
  onClearSelectedText?: () => void;
  onAcceptSuggestion?: (originalText: string, replacementText: string, commentId: string) => void;
  initialMode?: 'comment' | 'suggest';
}

export function DocCommentsDrawer({
  documentId,
  documentTitle,
  isOpen,
  onClose,
  currentUser,
  ydoc,
  selectedText = '',
  onClearSelectedText,
  onAcceptSuggestion,
  initialMode = 'comment',
}: DocCommentsDrawerProps) {
  const {
    comments,
    loading,
    toastMessage,
    addComment,
    resolveComment,
    deleteComment,
  } = useDocComments(documentId, documentTitle);

  const [mode, setMode] = useState<'comment' | 'suggest'>(initialMode);
  const [commentText, setCommentText] = useState('');
  const [suggestedText, setSuggestedText] = useState('');
  const [isTask, setIsTask] = useState(false);
  const [assignedToName, setAssignedToName] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'resolved'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredComments = useMemo(() => {
    return comments.filter((c) => {
      if (filterStatus === 'active') return c.status !== 'resolved';
      if (filterStatus === 'resolved') return c.status === 'resolved';
      return true;
    });
  }, [comments, filterStatus]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && !suggestedText.trim()) return;

    setIsSubmitting(true);
    const anchorData: CommentAnchor = {
      selectedText: selectedText || undefined,
      isSuggestion: mode === 'suggest',
      suggestedReplacement: mode === 'suggest' ? suggestedText.trim() : undefined,
      isTask,
      assignedToName: isTask ? assignedToName.trim() : undefined,
      taskDeadline: isTask && taskDeadline ? taskDeadline : undefined,
    };

    const textToSubmit = commentText.trim() || (mode === 'suggest' ? 'Đề xuất thay đổi nội dung:' : '');
    const success = await addComment(textToSubmit, anchorData);
    setIsSubmitting(false);

    if (success) {
      setCommentText('');
      setSuggestedText('');
      setIsTask(false);
      setAssignedToName('');
      setTaskDeadline('');
      if (onClearSelectedText) onClearSelectedText();
    }
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-slate-950 border-l border-slate-800 shadow-2xl z-40 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Toast */}
      {toastMessage && (
        <div className="absolute top-3 left-4 right-4 z-50 bg-slate-800 text-white px-3 py-2 rounded-lg text-xs border border-slate-700 shadow-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/60">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-400" />
          <h2 className="font-semibold text-white text-sm">Bình luận & Ngữ cảnh</h2>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            {comments.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2 border-b border-slate-800/80 flex items-center gap-1.5 bg-slate-900/30 shrink-0 text-xs">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-2.5 py-1 rounded-md transition-colors ${
            filterStatus === 'all'
              ? 'bg-slate-800 text-white font-medium'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Tất cả ({comments.length})
        </button>
        <button
          onClick={() => setFilterStatus('active')}
          className={`px-2.5 py-1 rounded-md transition-colors ${
            filterStatus === 'active'
              ? 'bg-slate-800 text-white font-medium'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Chưa xử lý ({comments.filter((c) => c.status !== 'resolved').length})
        </button>
        <button
          onClick={() => setFilterStatus('resolved')}
          className={`px-2.5 py-1 rounded-md transition-colors ${
            filterStatus === 'resolved'
              ? 'bg-slate-800 text-white font-medium'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Đã giải quyết ({comments.filter((c) => c.status === 'resolved').length})
        </button>
      </div>

      {/* New Comment / Suggestion Input Card */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/40 shrink-0 space-y-3">
        {selectedText && (
          <div className="p-2 rounded-lg bg-blue-950/40 border border-blue-900/60 text-xs text-blue-300 flex items-start justify-between gap-2">
            <div className="italic truncate">&ldquo;{selectedText}&rdquo;</div>
            {onClearSelectedText && (
              <button
                onClick={onClearSelectedText}
                className="text-blue-400 hover:text-blue-200 shrink-0"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setMode('comment')}
            className={`flex-1 py-1 rounded-md text-center font-medium transition-colors ${
              mode === 'comment' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Bình luận
          </button>
          <button
            type="button"
            onClick={() => setMode('suggest')}
            className={`flex-1 py-1 rounded-md text-center font-medium transition-colors flex items-center justify-center gap-1 ${
              mode === 'suggest' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Đề xuất sửa</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2.5">
          {mode === 'suggest' && (
            <textarea
              value={suggestedText}
              onChange={(e) => setSuggestedText(e.target.value)}
              placeholder="Nội dung thay thế đề xuất..."
              rows={2}
              className="w-full bg-slate-800/90 border border-emerald-500/40 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-sans"
              required
            />
          )}

          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={
              mode === 'suggest'
                ? 'Lý do đề xuất (tùy chọn)...'
                : 'Thêm bình luận, @tên thành viên...'
            }
            rows={2}
            className="w-full bg-slate-800/90 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-sans"
            required={mode === 'comment'}
          />

          {/* Quick Task Assign checkbox */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isTask}
                onChange={(e) => setIsTask(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0"
              />
              <span>Giao việc (Task)</span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium text-white flex items-center gap-1 transition-colors ${
                mode === 'suggest'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-blue-600 hover:bg-blue-500'
              } disabled:opacity-50`}
            >
              <Send className="w-3 h-3" />
              <span>Gửi</span>
            </button>
          </div>

          {isTask && (
            <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in duration-150">
              <input
                type="text"
                value={assignedToName}
                onChange={(e) => setAssignedToName(e.target.value)}
                placeholder="Tên người nhận..."
                className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
              />
              <input
                type="date"
                value={taskDeadline}
                onChange={(e) => setTaskDeadline(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          )}
        </form>
      </div>

      {/* Comment List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
        {loading ? (
          <div className="text-center py-8 text-xs text-slate-500">Đang tải danh sách bình luận...</div>
        ) : filteredComments.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs space-y-1">
            <MessageSquare className="w-8 h-8 mx-auto text-slate-700 stroke-1 mb-2" />
            <p>Chưa có bình luận nào ở phần này</p>
            <p className="text-slate-600">Bôi đen văn bản để bình luận hoặc đề xuất sửa đổi</p>
          </div>
        ) : (
          filteredComments.map((comment) => (
            <DocCommentCard
              key={comment.id}
              comment={comment}
              currentUserId={currentUser.id}
              onResolve={resolveComment}
              onDelete={deleteComment}
              onReply={(parentId, content) => addComment(content, undefined, parentId)}
              onAcceptSuggestion={onAcceptSuggestion}
            />
          ))
        )}
      </div>
    </aside>
  );
}
