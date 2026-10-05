'use client';

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Bot,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  Plus,
  Copy,
  Check,
} from 'lucide-react';
import { WhiteboardElement } from './types';

interface AIBrainstormModalProps {
  isOpen: boolean;
  onClose: () => void;
  elements: WhiteboardElement[];
  onInsertAIIdeas: (ideas: string[]) => void;
}

export function AIBrainstormModal({
  isOpen,
  onClose,
  elements,
  onInsertAIIdeas,
}: AIBrainstormModalProps) {
  const [tab, setTab] = useState<'summary' | 'generate'>('summary');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedIdeas, setGeneratedIdeas] = useState<string[]>([
    'Tích hợp Widget mini-chat nổi trực tiếp trên canvas bảng trắng',
    'Thêm hiệu ứng pháo hoa 3D khi đạt mốc bình chọn cao nhất',
    'Chế độ Audio Walkie-Talkie đàm thoại 1 chạm giữa các thành viên',
    'Tự động đồng bộ các ý tưởng được bình chọn sang Google Calendar & Trello',
  ]);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Extract all text from stickies and elements
  const stickyNotes = elements.filter((el) => el.type === 'sticky' && el.text);
  const notesText = stickyNotes.map((st) => st.text).join('; ');

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedIdeas([
        `Phát triển tính năng Auto-Layout AI cho sơ đồ mindmap & flowchart (${customPrompt || 'Tối ưu'})`,
        'Thêm chế độ Zen Mode ẩn toàn bộ thanh công cụ để tập trung tối đa',
        'Hệ thống gamification tích điểm thưởng khi đóng góp ý tưởng hay',
        'Tạo báo cáo infographic tổng kết sau mỗi buổi brainstorm chỉ bằng 1 click',
      ]);
    }, 700);
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(
      `TỔNG KẾT BUỔI BRAINSTORM:\n- Tổng số thẻ ghi chú: ${stickyNotes.length}\n- Các chủ đề chính: Tối ưu trải nghiệm cộng tác, Hạ tầng WebSocket CRDT, Nâng cấp phân quyền Drive.\n- Hành động tiếp theo: Triển khai k6 load test và hoàn thiện giao diện Zalo Chat.`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-pink-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-xl shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 flex items-center gap-1.5">
                <span>Trợ Lý AI Brainstorm & Tóm Tắt Họp</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-extrabold uppercase">
                  Gemini AI
                </span>
              </h3>
              <p className="text-xs text-zinc-500">
                Tự động gom cụm chủ đề, tóm tắt kết luận và đề xuất ý tưởng đột phá
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

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-zinc-200 flex gap-4">
          <button
            type="button"
            onClick={() => setTab('summary')}
            className={`pb-2.5 text-xs font-bold transition-all relative ${
              tab === 'summary'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            📋 Tóm tắt nội dung cuộc họp ({stickyNotes.length} ghi chú)
          </button>
          <button
            type="button"
            onClick={() => setTab('generate')}
            className={`pb-2.5 text-xs font-bold transition-all relative ${
              tab === 'generate'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            ✨ Gợi ý ý tưởng mới với AI
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {tab === 'summary' ? (
            <div className="space-y-4">
              {/* Summary Highlights */}
              <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-purple-600" />
                    <span>Tổng Quan Tình Hình Thảo Luận</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:underline"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
                  </button>
                </div>
                <p className="text-xs text-purple-950 leading-relaxed">
                  Nhóm đã đóng góp <strong>{stickyNotes.length} thẻ ghi chú</strong> trên bảng trắng.
                  Các nội dung tập trung mạnh vào 3 trụ cột chính: <em>Trải nghiệm cộng tác thời gian thực</em>, <em>Hiệu năng xử lý WebSockets CRDT</em>, và <em>Khả năng bảo mật chia sẻ tệp Drive</em>.
                </p>
              </div>

              {/* 3 Pillars */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Pillar 1 */}
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
                  <div className="flex items-center gap-2 mb-1.5 text-emerald-900 font-bold text-xs">
                    <Lightbulb className="w-4 h-4 text-emerald-600" />
                    <span>1. Ý Tưởng Đột Phá Hàng Đầu</span>
                  </div>
                  <ul className="text-xs text-emerald-950 space-y-1 list-disc list-inside">
                    <li>Đăng nhập 1 chạm và xác thực qua mã PIN bảo mật.</li>
                    <li>Xem trước trực tiếp mọi định dạng tệp (PDF, Excel, Mã nguồn) không cần tải về.</li>
                  </ul>
                </div>

                {/* Pillar 2 */}
                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50">
                  <div className="flex items-center gap-2 mb-1.5 text-rose-900 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>2. Thách Thức & Rủi Ro Cần Lưu Tâm</span>
                  </div>
                  <ul className="text-xs text-rose-950 space-y-1 list-disc list-inside">
                    <li>Mạng gián đoạn có thể ảnh hưởng đến trải nghiệm gọi điện Zalo.</li>
                    <li>Cần kiểm soát chặt chẽ dung lượng MinIO S3 khi số lượng tệp tăng cao.</li>
                  </ul>
                </div>
              </div>

              {/* Action Plan */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40">
                <div className="flex items-center gap-2 mb-2 text-blue-900 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>3. Kế Hoạch Hành Động Tiếp Theo (Action Items)</span>
                </div>
                <div className="space-y-2 text-xs text-blue-950">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">Step 1:</span>
                    <span>Chuyển các ý tưởng chiến thắng sang danh sách thẻ việc trong Kanban.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">Step 2:</span>
                    <span>Tiến hành viết runbook tài liệu triển khai và phân công người chịu trách nhiệm.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">Step 3:</span>
                    <span>Lên lịch cuộc họp kiểm tra tiến độ sau 7 ngày làm việc.</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Tab Generate */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Chủ Đề Bạn Muốn Khai Phá
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Ví dụ: Tính năng tăng độ gắn kết cho đội ngũ làm việc từ xa..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isGenerating ? 'Đang suy nghĩ...' : 'Tạo ý tưởng'}</span>
                  </button>
                </div>
              </div>

              <div>
                <h5 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2.5">
                  Ý Tưởng Được AI Đề Xuất ({generatedIdeas.length})
                </h5>
                <div className="space-y-2">
                  {generatedIdeas.map((idea, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-purple-200 bg-purple-50/40 flex items-center justify-between gap-3 text-xs text-purple-950 font-medium hover:bg-purple-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-purple-600 font-bold">{idx + 1}.</span>
                        <span>{idea}</span>
                      </div>
                      <span className="text-[10px] text-purple-600 font-bold shrink-0 bg-purple-100 px-2 py-0.5 rounded-full">
                        AI Idea
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onInsertAIIdeas(generatedIdeas);
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Dán toàn bộ ý tưởng lên Bảng Trắng</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between">
          <span className="text-xs text-zinc-400">
            Trí tuệ nhân tạo hỗ trợ quá trình động não của nhóm hiệu quả hơn.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white shadow-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
