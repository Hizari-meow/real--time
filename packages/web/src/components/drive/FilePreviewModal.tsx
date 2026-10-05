'use client';

import React, { useState } from 'react';
import {
  X,
  Download,
  Share2,
  FileText,
  Image as ImageIcon,
  Table as TableIcon,
  Layers,
  Code,
  Printer,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Calendar,
  User,
  HardDrive,
} from 'lucide-react';
import { CloudFileItem } from './types';

export interface FilePreviewModalProps {
  file: CloudFileItem | null;
  isOpen: boolean;
  onClose: () => void;
  onShare: (file: CloudFileItem) => void;
  onDownload: (file: CloudFileItem) => void;
}

export function FilePreviewModal({
  file,
  isOpen,
  onClose,
  onShare,
  onDownload,
}: FilePreviewModalProps) {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);

  if (!isOpen || !file) return null;

  const formatSize = (bytes: number) => {
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return bytes + ' B';
  };

  const totalPages = file.previewContent?.pdfPages || 4;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-4xl h-[88vh] flex flex-col overflow-hidden font-sans">
        {/* Header */}
        <div className="h-16 px-6 border-b border-zinc-200 bg-zinc-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 shadow-xs flex items-center justify-center shrink-0">
              {file.category === 'image' ? (
                <ImageIcon className="w-5 h-5 text-pink-600" />
              ) : file.category === 'spreadsheet' ? (
                <TableIcon className="w-5 h-5 text-emerald-600" />
              ) : file.category === 'snapshot' ? (
                <Layers className="w-5 h-5 text-blue-600" />
              ) : file.category === 'code' ? (
                <Code className="w-5 h-5 text-purple-600" />
              ) : (
                <FileText className="w-5 h-5 text-indigo-600" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-zinc-900 truncate" title={file.name}>
                {file.name}
              </h3>
              <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-0.5">
                <span className="flex items-center gap-1 font-mono">
                  <HardDrive className="w-3 h-3 text-zinc-400" />
                  {formatSize(file.size)}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-zinc-400" />
                  {file.ownerName}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-zinc-400" />
                  {new Date(file.updatedAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Zoom Controls for PDF / Image */}
            {(file.category === 'document' || file.category === 'image') && (
              <div className="hidden sm:flex items-center bg-zinc-100 p-0.5 rounded-xl border border-zinc-200 text-xs">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
                  className="p-1.5 hover:bg-white rounded-lg text-zinc-600 hover:text-zinc-900 transition-colors"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 font-mono text-[10px] text-zinc-600 font-semibold">
                  {zoomLevel}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(200, z + 25))}
                  className="p-1.5 hover:bg-white rounded-lg text-zinc-600 hover:text-zinc-900 transition-colors"
                  title="Phóng to"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              onClick={() => onShare(file)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold transition-colors"
              title="Chia sẻ tệp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chia sẻ</span>
            </button>

            <button
              onClick={() => onDownload(file)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs transition-colors"
              title="Tải về máy tính"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tải về</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors ml-1"
              title="Đóng xem trước (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Area */}
        <div className="flex-1 bg-zinc-100/70 p-4 sm:p-6 overflow-auto flex items-center justify-center">
          {/* 1. PDF / Document Preview */}
          {file.category === 'document' && (
            <div
              className="bg-white rounded-xl shadow-lg border border-zinc-200 p-8 sm:p-12 w-full max-w-2xl min-h-[500px] flex flex-col justify-between transition-transform duration-200"
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      Tài liệu dự án • Phiên bản chính thức
                    </span>
                    <h2 className="text-xl font-bold text-zinc-900 mt-2">{file.name}</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Tác giả: {file.ownerName} • Đã đồng bộ mã hóa lưu trữ S3
                    </p>
                  </div>
                  <a
                    href={`/doc/${file.id === 'f-1' ? 'doc_rfc_consensus' : file.id === 'f-4' ? 'doc_sop_01' : file.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors shrink-0 ml-4"
                  >
                    <span>Mở Soạn Thảo Đầy Đủ</span>
                  </a>
                </div>

                <div className="text-xs text-zinc-700 space-y-3 leading-relaxed font-serif">
                  <p>
                    {file.previewContent?.textSample ||
                      'Tài liệu này quy định cấu trúc thiết kế, kiến trúc cụm Gateway phân tán và các quy tắc bảo mật vận hành thời gian thực. Tất cả các thay đổi được ghi nhận tự động vào cơ chế chụp Snapshot CRDT.'}
                  </p>
                  <p>
                    1. <strong>Mục tiêu kỹ thuật</strong>: Đảm bảo khả năng chịu lỗi phân tán cao, độ trễ
                    đồng bộ dưới 50ms khi xử lý đồng thời 10.000 kết nối WebSocket qua NGINX reverse
                    proxy.
                  </p>
                  <p>
                    2. <strong>Quy trình phê duyệt</strong>: Mọi thành viên có quyền Chỉnh sửa (Editor)
                    có thể cập nhật phiên bản mới, hệ thống tự động lưu trữ các mốc lịch sử để khôi phục
                    khi cần thiết.
                  </p>
                </div>
              </div>

              {/* PDF Footer page indicator */}
              <div className="pt-6 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
                <span>Bản quyền nội bộ © 2026 Collaborative Workspace</span>
                <span className="font-mono">
                  Trang {currentPage} / {totalPages}
                </span>
              </div>
            </div>
          )}

          {/* 2. Image Preview */}
          {file.category === 'image' && (
            <div
              className="flex flex-col items-center justify-center transition-transform duration-200"
              style={{ transform: `scale(${zoomLevel / 100})` }}
            >
              <div className="bg-white p-3 rounded-2xl shadow-xl border border-zinc-200 max-w-xl">
                <div className="w-full h-80 rounded-xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex flex-col items-center justify-center p-6 border border-zinc-100 relative overflow-hidden">
                  <ImageIcon className="w-16 h-16 text-indigo-400/70 mb-3" />
                  <p className="text-sm font-bold text-zinc-800">{file.name}</p>
                  <p className="text-xs text-zinc-500 mt-1 font-mono">
                    Độ phân giải: 1920 x 1080 • Định dạng: PNG 24-bit
                  </p>
                  <span className="mt-3 px-3 py-1 bg-white/80 backdrop-blur-xs rounded-full text-[10px] font-semibold text-zinc-700 shadow-xs border border-zinc-200">
                    Ảnh mẫu xem trước
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3. Spreadsheet (Excel / CSV) Preview */}
          {file.category === 'spreadsheet' && (
            <div className="bg-white rounded-xl shadow-lg border border-zinc-200 p-6 w-full max-w-3xl overflow-x-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <TableIcon className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-zinc-900">Xem trước bảng tính: {file.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-400">Sheet 1 • Công thức SUM/VAT</span>
                  <a
                    href={`/sheet/${file.id === 'f-2' ? 'sheet_fin_q4' : file.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                  >
                    <span>Mở Bảng Tính Excel Đầy Đủ</span>
                  </a>
                </div>
              </div>

              <table className="w-full text-left text-xs border border-zinc-200 rounded-lg overflow-hidden font-mono">
                <thead className="bg-zinc-100 text-zinc-700 font-bold border-b border-zinc-200">
                  <tr>
                    <th className="p-2 border-r border-zinc-200 w-10 text-center text-zinc-400">#</th>
                    <th className="p-2 border-r border-zinc-200">A (Chỉ tiêu)</th>
                    <th className="p-2 border-r border-zinc-200">B (Kế hoạch Q4)</th>
                    <th className="p-2 border-r border-zinc-200">C (Thực tế Q4)</th>
                    <th className="p-2 border-r border-zinc-200">D (Tăng trưởng %)</th>
                    <th className="p-2">E (Trạng thái)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-[11px]">
                  {[
                    { row: 10, a: 'Người dùng mới (Active)', b: '100,000', c: '125,400', d: '+25.4%', e: 'Vượt chỉ tiêu' },
                    { row: 11, a: 'Doanh thu bản quyền Enterprise', b: '$80,000', c: '$92,500', d: '+15.6%', e: 'Đạt SLA' },
                    { row: 12, a: 'Doanh thu SaaS thực tế (C12)', b: '$110,000', c: '$128,400', d: '+16.7%', e: 'Đang thảo luận' },
                    { row: 13, a: 'Chi phí hạ tầng máy chủ Cluster', b: '$25,000', c: '$22,100', d: '-11.6%', e: 'Tiết kiệm tốt' },
                    { row: 14, a: 'Lợi nhuận ròng tạm tính', b: '$165,000', c: '$198,800', d: '+20.5%', e: 'Đạt kỳ vọng' },
                  ].map((r) => (
                    <tr key={r.row} className={`hover:bg-zinc-50 ${r.row === 12 ? 'bg-amber-50/70 font-semibold' : ''}`}>
                      <td className="p-2 border-r border-zinc-200 text-center text-zinc-400">{r.row}</td>
                      <td className="p-2 border-r border-zinc-200 font-sans text-zinc-900">{r.a}</td>
                      <td className="p-2 border-r border-zinc-200 text-zinc-700">{r.b}</td>
                      <td className="p-2 border-r border-zinc-200 text-emerald-700 font-bold">{r.c}</td>
                      <td className="p-2 border-r border-zinc-200 text-blue-600 font-bold">{r.d}</td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.row === 12 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {r.e}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-2.5 bg-zinc-50 rounded-lg text-[11px] text-zinc-600 flex items-center justify-between">
                <span>💡 Ô C12 đang có bình luận trao đổi về công thức tính thuế từ đội ngũ kế toán.</span>
                <a
                  href={`/sheet/${file.id === 'f-2' ? 'sheet_fin_q4' : file.id}`}
                  className="text-emerald-700 font-bold hover:underline"
                >
                  Mở để chỉnh sửa & tính toán &rarr;
                </a>
              </div>
            </div>
          )}

          {/* 4. Code / SQL / Archive Preview */}
          {(file.category === 'code' || file.category === 'archive') && (
            <div className="bg-zinc-900 text-zinc-100 rounded-xl shadow-xl border border-zinc-800 p-5 w-full max-w-2xl font-mono text-xs overflow-x-auto">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800 text-[11px] text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-purple-400" />
                  <span>{file.name} (Source Syntax)</span>
                </span>
                <span>UTF-8</span>
              </div>
              <pre className="text-emerald-400 leading-relaxed overflow-x-auto">
                {file.previewContent?.textSample ||
                  `-- Database Schema Migration v2
CREATE TABLE IF NOT EXISTS document_snapshots (
  id VARCHAR(64) PRIMARY KEY,
  document_id VARCHAR(64) NOT NULL,
  version INT NOT NULL,
  byte_size INT NOT NULL,
  s3_key VARCHAR(255) NOT NULL,
  mutation_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_snapshots_doc ON document_snapshots(document_id, version DESC);`}
              </pre>
            </div>
          )}

          {/* 5. Snapshot CRDT Preview */}
          {file.category === 'snapshot' && (
            <div className="bg-white rounded-xl shadow-lg border border-zinc-200 p-6 w-full max-w-lg">
              <div className="flex items-center gap-3 pb-4 mb-4 border-b border-zinc-100">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">{file.name}</h4>
                  <p className="text-xs text-zinc-500 font-mono">Bản chụp nhị phân Yjs State Vector</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between p-2.5 bg-zinc-50 rounded-lg">
                  <span className="text-zinc-500 font-medium">Dung lượng nhị phân:</span>
                  <span className="font-mono font-bold text-zinc-900">{formatSize(file.size)}</span>
                </div>
                <div className="flex justify-between p-2.5 bg-zinc-50 rounded-lg">
                  <span className="text-zinc-500 font-medium">Định dạng nén:</span>
                  <span className="font-mono text-blue-600 font-bold">lib0/encoding v2</span>
                </div>
                <div className="flex justify-between p-2.5 bg-zinc-50 rounded-lg">
                  <span className="text-zinc-500 font-medium">Khả năng khôi phục:</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Toàn vẹn 100%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation for multipage documents */}
        {file.category === 'document' && (
          <div className="h-12 px-6 border-t border-zinc-200 bg-white flex items-center justify-between text-xs text-zinc-600 shrink-0">
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded-lg border border-zinc-200 hover:bg-zinc-100 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded-lg border border-zinc-200 hover:bg-zinc-100 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1 px-3 py-1 rounded-lg text-zinc-600 hover:bg-zinc-100 text-xs font-semibold"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In tài liệu</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
