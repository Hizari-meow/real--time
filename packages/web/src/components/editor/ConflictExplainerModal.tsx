'use client';

import React from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Zap,
  RotateCcw,
  WifiOff,
  GitMerge,
  ArrowRight,
} from 'lucide-react';

export interface ConflictExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConflictExplainerModal({ isOpen, onClose }: ConflictExplainerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="h-14 px-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900">
                Xử Lý Xung Đột & Công Nghệ Đồng Bộ CRDT (Yjs)
              </h3>
              <p className="text-[11px] text-zinc-500">
                Toán học giải quyết xung đột không cần khóa tệp • Chuẩn thời gian thực
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs text-zinc-700 leading-relaxed">
          {/* Real-world Conflict Scenario */}
          <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200">
            <h4 className="text-xs font-bold text-blue-900 mb-2 flex items-center gap-1.5">
              <GitMerge className="w-4 h-4 text-blue-600" />
              <span>Ví dụ thực tế: Hai người cùng sửa một câu</span>
            </h4>
            <div className="space-y-2">
              <div className="p-2 bg-white rounded-xl border border-blue-100 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-zinc-500">Văn bản ban đầu:</span>
                <span className="font-mono bg-zinc-100 px-2 py-0.5 rounded text-zinc-800 font-bold">
                  "Xin chào"
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-white rounded-xl border border-blue-100">
                  <p className="font-bold text-blue-700">Lan (Đồng thời):</p>
                  <p className="text-zinc-600 mt-0.5">Thêm chữ <span className="font-mono text-emerald-600 font-bold">" các bạn"</span> vào cuối</p>
                </div>
                <div className="p-2 bg-white rounded-xl border border-blue-100">
                  <p className="font-bold text-blue-700">Minh (Đồng thời):</p>
                  <p className="text-zinc-600 mt-0.5">Xóa chữ <span className="font-mono text-rose-600 font-bold">"Xin "</span> ở đầu</p>
                </div>
              </div>

              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <span className="font-bold text-emerald-800">Kết quả CRDT gộp tự động:</span>
                <span className="font-mono bg-white px-2.5 py-1 rounded-lg border border-emerald-300 text-emerald-900 font-bold text-xs shadow-xs">
                  "chào các bạn"
                </span>
              </div>
            </div>
            <p className="text-[11px] text-blue-800 mt-2">
              Khác với cách lưu file cũ (người lưu sau ghi đè người lưu trước), hệ thống gộp từng ký tự độc lập, không mất bất kỳ ký tự nào của cả hai bạn.
            </p>
          </div>

          {/* Comparison Table OT vs CRDT */}
          <div>
            <h4 className="text-xs font-bold text-zinc-900 mb-2.5 uppercase tracking-wider text-[11px]">
              So sánh công nghệ cộng tác thời gian thực
            </h4>
            <div className="border border-zinc-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold">
                  <tr>
                    <th className="p-2.5">Tiêu chí</th>
                    <th className="p-2.5">OT (Google Docs)</th>
                    <th className="p-2.5 text-blue-700">CRDT / Yjs (Nền tảng này, Figma)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  <tr>
                    <td className="p-2.5 font-semibold text-zinc-800">Ý tưởng cốt lõi</td>
                    <td className="p-2.5 text-zinc-600">Biến đổi vị trí index khi nhận thao tác</td>
                    <td className="p-2.5 text-blue-800 font-medium bg-blue-50/30">
                      Cấu trúc dữ liệu toán học tự hội tụ cùng kết quả
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-zinc-800">Chế độ Offline</td>
                    <td className="p-2.5 text-zinc-600">Hạn chế, phụ thuộc máy chủ trung tâm</td>
                    <td className="p-2.5 text-blue-800 font-medium bg-blue-50/30">
                      Hoàn hảo: Sửa offline rồi tự gộp khi có mạng
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-zinc-800">Hoàn tác (Undo)</td>
                    <td className="p-2.5 text-zinc-600">Phức tạp khi đảo chuỗi thao tác</td>
                    <td className="p-2.5 text-blue-800 font-medium bg-blue-50/30">
                      Per-user Undo: Chỉ hoàn tác việc của mình
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 3 Core Protections */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-2">
                <RotateCcw className="w-3.5 h-3.5" />
              </div>
              <p className="font-bold text-zinc-900 text-xs">Hoàn tác riêng (Per-User)</p>
              <p className="text-[11px] text-zinc-500 mt-1">
                Ctrl+Z chỉ rút lại thao tác của bạn, không xóa nhầm công sức đồng nghiệp đang gõ.
              </p>
            </div>

            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <p className="font-bold text-zinc-900 text-xs">Không có nút "Lưu"</p>
              <p className="text-[11px] text-zinc-500 mt-1">
                Từng ký tự được đồng bộ trong vài chục mili-giây. Mất điện hay tắt tab cũng không mất bài.
              </p>
            </div>

            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-2">
                <WifiOff className="w-3.5 h-3.5" />
              </div>
              <p className="font-bold text-zinc-900 text-xs">Local-First Cache</p>
              <p className="text-[11px] text-zinc-500 mt-1">
                IndexedDB lưu bản sao an toàn trong trình duyệt, tự động kết nối lại khi có mạng.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-14 px-6 border-t border-zinc-100 flex items-center justify-end bg-zinc-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl shadow-xs transition-colors"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}
