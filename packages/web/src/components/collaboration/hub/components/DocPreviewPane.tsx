'use client';

import React from 'react';
import Link from 'next/link';
import {
  FileText,
  Table,
  Palette,
  Eye,
  ExternalLink,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface DocPreviewPaneProps {
  commentMediaView: 'document' | 'spreadsheet' | 'design';
  setCommentMediaView: (v: 'document' | 'spreadsheet' | 'design') => void;
  isDocumentWatched: boolean;
  handleToggleWatchDoc: () => void;
  selectedCellData: { title: string; value: string; formula: string };
  selectedCellCoord: string;
  selectedDesignZone: string;
  docSnippetText: string;
  docSelectedRange: string;
  setDocSelectedRange: (s: string) => void;
  docInputMode: 'comment' | 'suggest';
  setDocInputMode: (m: 'comment' | 'suggest') => void;
  showToast: (msg: string) => void;
}

export function DocPreviewPane({
  commentMediaView,
  setCommentMediaView,
  isDocumentWatched,
  handleToggleWatchDoc,
  selectedCellData,
  selectedCellCoord,
  selectedDesignZone,
  docSnippetText,
  docSelectedRange,
  setDocSelectedRange,
  docInputMode,
  setDocInputMode,
  showToast,
}: DocPreviewPaneProps) {
  return (
    <div className="flex-1 flex flex-col h-full border-r border-zinc-200/80 bg-zinc-50/40 min-w-0">
      {/* Document Header Bar */}
      <div className="h-16 px-6 border-b border-zinc-200/80 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-3 truncate">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            {commentMediaView === 'document' ? (
              <FileText className="w-4 h-4" />
            ) : commentMediaView === 'spreadsheet' ? (
              <Table className="w-4 h-4 text-emerald-600" />
            ) : (
              <Palette className="w-4 h-4 text-purple-600" />
            )}
          </div>
          <div className="truncate">
            <h3 className="text-xs font-bold text-zinc-900 truncate">
              {commentMediaView === 'document'
                ? 'Báo Cáo Kiến Trúc Đồng Thuận Phân Tán CRDT v4'
                : commentMediaView === 'spreadsheet'
                ? 'Bảng Tính Dự Báo Tài Chính & Doanh Thu Q4-2026'
                : 'Bản Thiết Kế Trực Quan UI Workspace & Slide'}
            </h3>
            <span className="text-[10px] text-zinc-400 font-mono">
              {commentMediaView === 'document'
                ? 'doc_rfc_consensus • Chế độ xem & góp ý Yjs CRDT'
                : commentMediaView === 'spreadsheet'
                ? 'sheet_fin_q4 • Đang chọn ô C12'
                : 'design_ui_workspace • Bản vẽ thiết kế Figma Canvas'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleToggleWatchDoc}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isDocumentWatched
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                : 'bg-zinc-100 text-zinc-600 border border-zinc-200 hover:bg-zinc-200'
            }`}
            title={isDocumentWatched ? 'Đang nhận thông báo khi có sửa đổi' : 'Bật theo dõi tài liệu này'}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isDocumentWatched ? 'Đang theo dõi' : 'Bật theo dõi'}</span>
          </button>

          <Link
            href={
              commentMediaView === 'spreadsheet'
                ? '/sheet/sheet_fin_q4'
                : commentMediaView === 'design'
                ? '/design/design_ui_workspace'
                : '/doc/doc_rfc_consensus'
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-2xs transition-colors ${
              commentMediaView === 'spreadsheet'
                ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                : commentMediaView === 'design'
                ? 'bg-purple-700 hover:bg-purple-800 text-white'
                : 'bg-zinc-900 hover:bg-black text-white'
            }`}
          >
            <span>
              {commentMediaView === 'spreadsheet'
                ? 'Mở Bảng Tính Excel Đầy Đủ'
                : commentMediaView === 'design'
                ? 'Mở Bản Vẽ Figma Đầy Đủ'
                : 'Mở Tài Liệu Đầy Đủ'}
            </span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Media View Mode Selector (Sub-bar) */}
      <div className="px-6 py-2 bg-zinc-100/70 border-b border-zinc-200/80 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
            Nội dung bình luận:
          </span>
          <div className="flex items-center bg-white p-0.5 rounded-xl border border-zinc-200 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setCommentMediaView('document');
                setDocSelectedRange('2,450 người dùng hoạt động');
                showToast('Chuyển sang xem Văn bản tài liệu (RFC)');
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
                commentMediaView === 'document'
                  ? 'bg-zinc-900 text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>1. Văn bản RFC</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCommentMediaView('spreadsheet');
                setDocSelectedRange(`Ô C12: ${selectedCellData.title} (${selectedCellData.value})`);
                showToast('Chuyển sang xem Bảng tính tài chính (ô C12)');
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
                commentMediaView === 'spreadsheet'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Table className="w-3 h-3" />
              <span>2. Ô Bảng tính (C12)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCommentMediaView('design');
                setDocSelectedRange('Vùng Nút CTA: [Bắt đầu Phiên Làm Việc]');
                showToast('Chuyển sang xem Vùng Thiết kế UI & Slide');
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
                commentMediaView === 'design'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Palette className="w-3 h-3" />
              <span>3. Bản vẽ UI / Slide</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-zinc-500 font-mono text-[11px]">
          <span>Phạm vi:</span>
          <span className="bg-white border border-zinc-200 px-2 py-0.5 rounded-lg text-zinc-800 font-bold truncate max-w-xs">
            {docSelectedRange}
          </span>
        </div>
      </div>

      {/* Interactive Main Canvas Area */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
        {commentMediaView === 'document' && (
          <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-sm p-8 max-w-2xl w-full space-y-4">
            <div className="border-b border-zinc-100 pb-3">
              <span className="text-[10px] font-mono font-bold text-blue-600 uppercase tracking-widest">
                RFC-2026-CONSENSUS
              </span>
              <h2 className="text-base font-bold text-zinc-900 mt-1">
                4. Hiệu Năng Đồng Thuận CRDT &amp; Hạ Tầng WebSocket Gateway
              </h2>
            </div>

            <div className="text-xs text-zinc-700 leading-relaxed font-serif space-y-3">
              <p>
                Hệ thống cộng tác thời gian thực sử dụng thuật toán Yjs CRDT để đảm bảo tính nhất quán cuối cùng (Eventual Consistency). Trong các thử nghiệm tải cao, cụm 2 máy chủ WebSocket (ws-node-1 và ws-node-2) đã duy trì thành công 5,000 kết nối đồng thời với độ trễ hội tụ dưới 5ms.
              </p>

              <div className="p-3 bg-amber-50/70 border-l-4 border-amber-500 rounded-r-xl my-2">
                <span className="text-[10px] font-bold text-amber-900 uppercase block mb-1">
                  Đoạn văn bản được gắn cờ thảo luận:
                </span>
                <span className="bg-amber-200/80 px-1 py-0.5 rounded font-sans font-semibold text-zinc-900">
                  {docSelectedRange}
                </span>
                <span className="text-zinc-600 ml-1">
                  mà không xảy ra bất kỳ xung đột dữ liệu hay mất mát ký tự nào.
                </span>
              </div>

              <p>
                Dữ liệu được duy trì liên tục qua Redis Pub/Sub và lưu vết tự động vào PostgreSQL. Snapshot định kỳ được nén gzip và đồng bộ sang MinIO S3 Object Storage để phục vụ tính năng phục hồi thảm họa (Disaster Recovery).
              </p>
            </div>
          </div>
        )}

        {commentMediaView === 'spreadsheet' && (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 max-w-2xl w-full space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-zinc-900">Bảng Tính Doanh Thu SaaS Q4</h3>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">Ô được chọn: {selectedCellCoord}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-zinc-200">
                <thead>
                  <tr className="bg-zinc-100 text-zinc-600">
                    <th className="p-2 border border-zinc-200 w-12 text-center">#</th>
                    <th className="p-2 border border-zinc-200 text-left">Chỉ Số</th>
                    <th className="p-2 border border-zinc-200 text-right">Kế Hoạch</th>
                    <th className="p-2 border border-zinc-200 text-right">Thực Tế (Q3)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border border-zinc-200 text-center font-mono">11</td>
                    <td className="p-2 border border-zinc-200">Doanh thu ARR Doanh Nghiệp</td>
                    <td className="p-2 border border-zinc-200 text-right font-mono">$120,000</td>
                    <td className="p-2 border-2 border-emerald-500 bg-emerald-50 text-right font-mono font-bold text-emerald-900 relative">
                      {selectedCellData.value}
                      <span className="absolute -top-2 -right-1 px-1 bg-emerald-600 text-white text-[8px] rounded font-mono">
                        C12
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-zinc-200 text-center font-mono">12</td>
                    <td className="p-2 border border-zinc-200">Tăng trưởng người dùng trả phí</td>
                    <td className="p-2 border border-zinc-200 text-right font-mono">+25%</td>
                    <td className="p-2 border border-zinc-200 text-right font-mono">+34.2%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900">
              <span className="font-bold block">Công thức ô C12:</span>
              <span className="font-mono text-[11px] text-emerald-700">{selectedCellData.formula}</span>
            </div>
          </div>
        )}

        {commentMediaView === 'design' && (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 max-w-2xl w-full space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-bold text-zinc-900">Canvas Giao Diện Workspace (Figma)</h3>
              </div>
              <span className="text-[10px] font-mono text-purple-600 font-bold">1 Ghim bình luận</span>
            </div>

            <div className="h-64 bg-zinc-100 rounded-xl border-2 border-dashed border-zinc-300 flex items-center justify-center relative overflow-hidden">
              <div className="p-4 bg-white rounded-2xl shadow-md border border-zinc-200 flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-zinc-800">Giao diện điều hướng trung tâm</span>
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow relative ring-4 ring-purple-400"
                >
                  Bắt đầu Phiên Làm Việc Mới
                  <span className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center shadow-md">
                    1
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Strip for Selecting text */}
      {docSelectedRange && (
        <div className="p-3 bg-white border-t border-zinc-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-zinc-600 truncate max-w-sm">
            Đang chọn: <strong>"{docSelectedRange}"</strong>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setDocInputMode('comment');
                showToast('Chuyển sang chế độ bình luận.');
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold ${
                docInputMode === 'comment' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-700 border'
              }`}
            >
              Bình luận
            </button>
            <button
              onClick={() => {
                setDocInputMode('suggest');
                showToast('Chuyển sang chế độ đề xuất sửa đổi.');
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold ${
                docInputMode === 'suggest' ? 'bg-amber-600 text-white' : 'bg-white text-zinc-700 border'
              }`}
            >
              Gợi ý sửa
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
