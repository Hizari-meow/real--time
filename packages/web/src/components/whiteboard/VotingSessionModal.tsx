'use client';

import React, { useState } from 'react';
import {
  X,
  Vote,
  Trophy,
  Eye,
  EyeOff,
  Clock,
  ArrowRight,
  CheckCircle2,
  ListOrdered,
  Plus,
  Flame,
  CheckSquare,
} from 'lucide-react';
import { VotingSession, WhiteboardElement, STICKY_COLOR_MAP } from './types';

interface VotingSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: VotingSession | null;
  onStartSession: (topic: string, votesPerPerson: number, durationMinutes: number, isSecret: boolean) => void;
  onEndSession: () => void;
  elements: WhiteboardElement[];
  currentUserId: string;
  onConvertToTask: (sticky: WhiteboardElement) => void;
}

export function VotingSessionModal({
  isOpen,
  onClose,
  session,
  onStartSession,
  onEndSession,
  elements,
  currentUserId,
  onConvertToTask,
}: VotingSessionModalProps) {
  const [topic, setTopic] = useState('Bình chọn ý tưởng đột phá cho Q4');
  const [votesPerPerson, setVotesPerPerson] = useState(3);
  const [durationMinutes, setDurationMinutes] = useState(5);
  const [isSecret, setIsSecret] = useState(true);
  const [convertedIds, setConvertedIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  // Filter sticky notes and sort by vote counts for leaderboard
  const stickyNotes = elements.filter((el) => el.type === 'sticky');

  const rankedStickies = [...stickyNotes].map((st) => {
    const totalVotes = Object.values(st.votes || {}).reduce((a, b) => a + b, 0);
    return {
      element: st,
      votes: totalVotes,
    };
  }).sort((a, b) => b.votes - a.votes);

  const totalVotesCast = rankedStickies.reduce((acc, curr) => acc + curr.votes, 0);

  const handleTaskConvert = (st: WhiteboardElement) => {
    onConvertToTask(st);
    setConvertedIds((prev) => new Set([...Array.from(prev), st.id]));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-gradient-to-r from-amber-50/70 to-orange-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
              <Vote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">
                {session?.isActive
                  ? 'Phiên Bình Chọn Đang Diễn Ra (Voting Session)'
                  : session?.isFinished
                  ? 'Bảng Xếp Hạng Kết Quả Bình Chọn 🏆'
                  : 'Khởi Tạo Phiên Bình Chọn Ý Tưởng (Dot Voting)'}
              </h3>
              <p className="text-xs text-zinc-500">
                {session?.isActive
                  ? `Đang mở bình chọn trực tiếp trên thẻ ghi chú. Mọi người có ${session.votesPerPerson} phiếu.`
                  : session?.isFinished
                  ? 'Xếp hạng các ý tưởng được yêu thích nhất từ cao xuống thấp'
                  : 'Cho phép cả nhóm biểu quyết công bằng, ẩn danh hoặc công khai'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* STATE 1: CREATE NEW SESSION */}
          {!session || (!session.isActive && !session.isFinished) ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Chủ Đề Bình Chọn
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ví dụ: Chọn 3 ý tưởng triển khai ngay trong Sprint tới..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                    Số Phiếu / Người
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[3, 5, 10].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setVotesPerPerson(v)}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                          votesPerPerson === v
                            ? 'border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-500'
                            : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                        }`}
                      >
                        {v} phiếu
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                    Thời Gian Bình Chọn
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[3, 5, 10].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDurationMinutes(m)}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                          durationMinutes === m
                            ? 'border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-500'
                            : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                        }`}
                      >
                        {m} phút
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Secret voting toggle */}
              <div
                onClick={() => setIsSecret(!isSecret)}
                className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  isSecret
                    ? 'border-amber-400 bg-amber-50/50'
                    : 'border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isSecret ? (
                    <EyeOff className="w-5 h-5 text-amber-600" />
                  ) : (
                    <Eye className="w-5 h-5 text-zinc-400" />
                  )}
                  <div>
                    <h5 className="text-xs font-bold text-zinc-900">
                      Bình chọn bí mật (Secret Voting)
                    </h5>
                    <p className="text-[11px] text-zinc-500">
                      Ẩn tổng số phiếu cho đến khi kết thúc phiên để tránh hiệu ứng số đông
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isSecret}
                  onChange={() => {}}
                  className="rounded text-amber-500 focus:ring-amber-400 w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-600">
                💡 <strong>Mẹo:</strong> Sau khi bắt đầu phiên, mỗi thành viên có thể bấm biểu tượng 👍 trên các thẻ Sticky Note để bỏ phiếu trực tiếp trên bảng trắng.
              </div>
            </div>
          ) : session?.isActive ? (
            /* STATE 2: ACTIVE SESSION IN PROGRESS */
            <div className="space-y-5 text-center py-2">
              <div className="inline-flex p-3 rounded-full bg-amber-100 text-amber-600 animate-pulse">
                <Flame className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-lg font-bold text-zinc-900 mb-1">{session.topic}</h4>
                <p className="text-xs text-zinc-500">
                  Mỗi người có tối đa {session.votesPerPerson} lượt bỏ phiếu
                </p>
              </div>

              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl max-w-sm mx-auto">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
                  Đã ghi nhận tổng cộng
                </span>
                <span className="text-3xl font-extrabold text-amber-900 font-mono">
                  {totalVotesCast} phiếu
                </span>
              </div>

              <p className="text-xs text-zinc-600 max-w-md mx-auto leading-relaxed">
                👉 Thành viên hãy bấm vào nút <strong>👍 Vote</strong> trên bất kỳ thẻ ghi chú nào trên bảng trắng để bình chọn.
              </p>
            </div>
          ) : (
            /* STATE 3: RESULTS LEADERBOARD */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span>Kết Quả Đã Chốt ({totalVotesCast} phiếu bầu)</span>
                  </h4>
                  <p className="text-xs text-zinc-500">{session?.topic}</p>
                </div>

                <button
                  type="button"
                  onClick={() => onStartSession(topic, votesPerPerson, durationMinutes, isSecret)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors"
                >
                  Tổ chức vòng mới
                </button>
              </div>

              {rankedStickies.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400">
                  Chưa có thẻ ghi chú nào trên bảng để hiển thị kết quả.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {rankedStickies.slice(0, 10).map((item, idx) => {
                    const st = item.element;
                    const colorConfig = STICKY_COLOR_MAP[st.stickyColor || 'yellow'];
                    const isWinner = idx === 0 && item.votes > 0;
                    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                    const isConverted = convertedIds.has(st.id) || !!st.convertedToTaskId;

                    return (
                      <div
                        key={st.id}
                        className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                          isWinner
                            ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-400 shadow-xs'
                            : 'bg-white border-zinc-200 hover:border-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="text-base font-bold w-6 text-center shrink-0">
                            {medal}
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-zinc-900 line-clamp-2">
                              {st.text || 'Ghi chú không có nội dung'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-zinc-400">
                                Bởi {st.isAnonymous ? 'Thành viên ẩn danh' : st.authorName}
                              </span>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${colorConfig.badgeBg}`}>
                                {st.stickyColor}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 font-mono text-xs font-bold shadow-2xs">
                            <Flame className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                            <span>{item.votes}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleTaskConvert(st)}
                            disabled={isConverted}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-2xs ${
                              isConverted
                                ? 'bg-emerald-100 text-emerald-800 cursor-default'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                            title="Tạo task vào bảng Kanban"
                          >
                            {isConverted ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                <span>Đã tạo Task</span>
                              </>
                            ) : (
                              <>
                                <CheckSquare className="w-3 h-3" />
                                <span>Tạo Task</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-200 transition-colors"
          >
            Đóng
          </button>

          {!session || (!session.isActive && !session.isFinished) ? (
            <button
              type="button"
              onClick={() => onStartSession(topic, votesPerPerson, durationMinutes, isSecret)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-colors"
            >
              <Vote className="w-4 h-4" />
              <span>Bắt đầu phiên biểu quyết</span>
            </button>
          ) : session?.isActive ? (
            <button
              type="button"
              onClick={onEndSession}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
            >
              <Trophy className="w-4 h-4" />
              <span>Kết thúc & Xem kết quả 🏆</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            >
              Hoàn tất xem kết quả
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
