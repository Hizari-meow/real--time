'use client';

import React from 'react';
import {
  MessageSquare,
  CheckCircle2,
  CheckSquare,
  Mic,
  Video,
  Play,
  Pause,
  Reply,
  X,
} from 'lucide-react';
import { ContextualComment } from '@/components/collaboration/types';
import { SEED_USERS } from '@/components/collaboration/seed-data';

interface CommentsFeedPaneProps {
  comments: ContextualComment[];
  setComments: React.Dispatch<React.SetStateAction<ContextualComment[]>>;
  selectedCommentId: string | null;
  setSelectedCommentId: (id: string | null) => void;
  commentViewFilter: 'all' | 'open' | 'resolved';
  setCommentViewFilter: (f: 'all' | 'open' | 'resolved') => void;
  docInputMode: 'comment' | 'suggest';
  docSuggestInput: string;
  setDocSuggestInput: (s: string) => void;
  docCommentInput: string;
  setDocCommentInput: (s: string) => void;
  mentionPopupOpen: boolean;
  setMentionPopupOpen: (b: boolean) => void;
  docPermissionPromptUser: string | null;
  setDocPermissionPromptUser: (s: string | null) => void;
  hasAudioAttached: boolean;
  setHasAudioAttached: (b: boolean) => void;
  hasVideoAttached: boolean;
  setHasVideoAttached: (b: boolean) => void;
  isTaskAssignmentOpen: boolean;
  setIsTaskAssignmentOpen: (b: boolean) => void;
  taskAssigneeTarget: string;
  setTaskAssigneeTarget: (s: string) => void;
  taskDeadlineTarget: string;
  setTaskDeadlineTarget: (s: string) => void;
  isRecordingAudio: boolean;
  playingDocVoiceId: string | null;
  setPlayingDocVoiceId: (id: string | null) => void;
  replyInputCommentId: string | null;
  setReplyInputCommentId: (id: string | null) => void;
  replyInputText: string;
  setReplyInputText: (s: string) => void;
  handleAddDocComment: (e: React.FormEvent) => void;
  handleAcceptSuggestionInDoc: (c: ContextualComment) => void;
  handleRejectSuggestionInDoc: (id: string) => void;
  handleStartVoiceRecording: () => void;
  handleAttachLoomVideo: () => void;
  handleToggleDocCommentReaction: (id: string, emoji: string) => void;
  handleConvertCommentToTask: (c: ContextualComment) => void;
  handleAddDocCommentReply: (id: string) => void;
  showToast: (msg: string) => void;
}

export function CommentsFeedPane({
  comments,
  setComments,
  selectedCommentId,
  setSelectedCommentId,
  commentViewFilter,
  setCommentViewFilter,
  docInputMode,
  docSuggestInput,
  setDocSuggestInput,
  docCommentInput,
  setDocCommentInput,
  mentionPopupOpen,
  setMentionPopupOpen,
  docPermissionPromptUser,
  setDocPermissionPromptUser,
  hasAudioAttached,
  setHasAudioAttached,
  hasVideoAttached,
  setHasVideoAttached,
  isTaskAssignmentOpen,
  setIsTaskAssignmentOpen,
  taskAssigneeTarget,
  setTaskAssigneeTarget,
  taskDeadlineTarget,
  setTaskDeadlineTarget,
  isRecordingAudio,
  playingDocVoiceId,
  setPlayingDocVoiceId,
  replyInputCommentId,
  setReplyInputCommentId,
  replyInputText,
  setReplyInputText,
  handleAddDocComment,
  handleAcceptSuggestionInDoc,
  handleRejectSuggestionInDoc,
  handleStartVoiceRecording,
  handleAttachLoomVideo,
  handleToggleDocCommentReaction,
  handleConvertCommentToTask,
  handleAddDocCommentReply,
  showToast,
}: CommentsFeedPaneProps) {
  return (
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
          {(['all', 'open', 'resolved'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setCommentViewFilter(filter)}
              className={`px-2 py-0.5 rounded-lg capitalize font-medium transition-colors ${
                commentViewFilter === filter ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-200'
              }`}
            >
              {filter === 'all' ? 'Tất cả' : filter === 'open' ? 'Đang mở' : 'Đã xong'}
            </button>
          ))}
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
                    setDocCommentInput(docCommentInput + opt.tag + ' ');
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

        {/* Permission warning banner if tagged person doesn't have doc access */}
        {docPermissionPromptUser && (
          <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between animate-in fade-in">
            <span className="text-[11px]">
              {docPermissionPromptUser} chưa có quyền xem tài liệu này!
            </span>
            <div className="flex gap-1">
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
            <button
              type="button"
              onClick={handleStartVoiceRecording}
              className={`p-1.5 rounded-lg border text-xs transition-colors flex items-center gap-1 ${
                isRecordingAudio
                  ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
              }`}
              title="Ghi âm giọng nói đính kèm (Voice note)"
            >
              <Mic className="w-3.5 h-3.5 text-purple-600" />
              <span className="text-[10px] hidden sm:inline">Ghi âm</span>
            </button>

            <button
              type="button"
              onClick={handleAttachLoomVideo}
              className="p-1.5 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 text-xs flex items-center gap-1"
              title="Quay clip màn hình ngắn (Loom video)"
            >
              <Video className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-[10px] hidden sm:inline">Clip ngắn</span>
            </button>

            <button
              type="button"
              onClick={() => setIsTaskAssignmentOpen(!isTaskAssignmentOpen)}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 ${
                isTaskAssignmentOpen
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-600'
              }`}
              title="Biến bình luận thành Thẻ việc trên Kanban"
            >
              <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[10px] hidden sm:inline">Giao việc</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={!docCommentInput.trim() && !docSuggestInput.trim() && !hasAudioAttached && !hasVideoAttached}
            className="px-3.5 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-semibold disabled:opacity-40 shadow-2xs transition-colors cursor-pointer"
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
  );
}
