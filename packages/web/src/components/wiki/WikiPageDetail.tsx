'use client';

import React, { useState } from 'react';
import {
  FileText,
  Clock,
  User,
  Tag,
  Share2,
  Copy,
  Check,
  Edit3,
  ExternalLink,
  Archive,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Link as LinkIcon,
} from 'lucide-react';
import Link from 'next/link';
import { WikiPage } from './types';

interface WikiPageDetailProps {
  page: WikiPage | null;
  backlinks: any[];
  onSelectPage: (id: string) => void;
  onEdit: (page: WikiPage) => void;
  onUpdateStatus: (id: string, status: 'draft' | 'pending_approval' | 'approved') => void;
  onArchive: (id: string, isArchived: boolean) => void;
  onDelete: (id: string) => void;
  onCopyLink: (page: WikiPage) => void;
}

export function WikiPageDetail({
  page,
  backlinks,
  onSelectPage,
  onEdit,
  onUpdateStatus,
  onArchive,
  onDelete,
  onCopyLink,
}: WikiPageDetailProps) {
  const [copied, setCopied] = useState(false);

  if (!page) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
        <FileText className="w-16 h-16 stroke-1 text-slate-700 mb-4" />
        <p className="text-lg font-medium text-slate-400">Chọn hoặc tạo một trang để xem nội dung</p>
        <p className="text-sm text-slate-500 mt-1">
          Kho tri thức hỗ trợ phân cấp cây, quy trình chuẩn SOP, và liên kết chéo tự động.
        </p>
      </div>
    );
  }

  const handleCopy = () => {
    onCopyLink(page);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isApproved = page.status === 'approved' || page.status === 'Đã duyệt';
  const isPending = page.status === 'pending_approval' || page.status === 'Cần cập nhật';
  const isDraft = page.status === 'draft' || page.status === 'Nháp';

  return (
    <article className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
      {/* Top Header & Actions */}
      <div className="border-b border-slate-800 pb-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl">{page.icon || '📄'}</span>
              <h1 className="text-2xl font-bold text-white tracking-tight break-words">
                {page.title}
              </h1>
              {/* Status Badge */}
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1 ${
                  isApproved
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : isPending
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {isApproved && <CheckCircle2 className="w-3.5 h-3.5" />}
                {isPending && <AlertTriangle className="w-3.5 h-3.5" />}
                {isDraft && <Clock className="w-3.5 h-3.5" />}
                <span>
                  {isApproved ? 'Đã duyệt (SOP)' : isPending ? 'Chờ cập nhật / duyệt' : 'Bản nháp'}
                </span>
              </span>
              {page.isArchived && (
                <span className="text-xs px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  Đã lưu trữ
                </span>
              )}
            </div>

            {/* Area & Topic */}
            <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
              <span>{page.areaName || page.areaId}</span>
              {page.topic && <span>• {page.topic}</span>}
              {page.type && <span className="text-slate-500">• Loại: {page.type}</span>}
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 shrink-0">
            {page.linkedDocId && (
              <Link
                href={`/docs/${page.linkedDocId}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-xs font-medium border border-blue-500/30 transition-colors"
                title="Mở tài liệu cộng tác thời gian thực"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cộng tác trực tiếp</span>
              </Link>
            )}

            <button
              onClick={handleCopy}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700 transition-colors flex items-center gap-1"
              title="Sao chép liên kết"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              onClick={() => onEdit(page)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Chỉnh sửa</span>
            </button>

            <button
              onClick={() => onArchive(page.id, !page.isArchived)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-xs border border-slate-700 transition-colors"
              title={page.isArchived ? 'Khôi phục từ lưu trữ' : 'Lưu trữ tài liệu'}
            >
              <Archive className="w-4 h-4" />
            </button>

            <button
              onClick={() => onDelete(page.id)}
              className="p-1.5 bg-slate-800 hover:bg-rose-900/30 text-slate-400 hover:text-rose-400 rounded-lg text-xs border border-slate-700 hover:border-rose-800 transition-colors"
              title="Xóa tài liệu"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SOP Workflow State Controls */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-medium text-slate-300">Quy trình kiểm duyệt (SOP Workflow):</span>
            <span>Trạng thái hiện tại là</span>
            <span className="font-semibold text-white">
              {isApproved ? 'Đã duyệt' : isPending ? 'Chờ duyệt' : 'Bản nháp'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isApproved && (
              <button
                onClick={() => onUpdateStatus(page.id, 'approved')}
                className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Phê duyệt SOP</span>
              </button>
            )}

            {!isPending && (
              <button
                onClick={() => onUpdateStatus(page.id, 'pending_approval')}
                className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Yêu cầu xem xét</span>
              </button>
            )}

            {!isDraft && (
              <button
                onClick={() => onUpdateStatus(page.id, 'draft')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Về bản nháp</span>
              </button>
            )}
          </div>
        </div>

        {/* Tags */}
        {page.tags && page.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {page.tags.map((t) => (
              <span
                key={t}
                className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-750"
              >
                {t.startsWith('#') ? t : `#${t}`}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Summary Box */}
      {page.summary && (
        <div className="bg-blue-950/20 border border-blue-900/40 rounded-xl p-4 text-sm text-blue-200/90 leading-relaxed">
          <div className="font-semibold text-blue-400 mb-1 flex items-center gap-1.5">
            <span>📌 Tóm tắt cốt lõi</span>
          </div>
          <p>{page.summary}</p>
        </div>
      )}

      {/* Main Content Body */}
      <div className="prose prose-invert max-w-none space-y-4 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
        {page.content}
      </div>

      {/* Backlinks Section (CE-13 & Wiki Spec) */}
      <div className="border-t border-slate-800 pt-6 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
          <LinkIcon className="w-4 h-4 text-blue-400" />
          <span>Các trang liên kết đến tài liệu này (Backlinks)</span>
        </div>
        {backlinks && backlinks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {backlinks.map((b) => (
              <button
                key={b.id}
                onClick={() => onSelectPage(b.id)}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 text-left transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-base">{b.icon || '📄'}</span>
                  <span className="text-sm text-slate-300 truncate font-medium">{b.title}</span>
                </div>
                <span className="text-xs text-slate-500 shrink-0 ml-2">{b.areaId}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">
            Chưa có trang nào dẫn liên kết trực tiếp tới tài liệu này. Sử dụng cú pháp [[{page.title}]] để liên kết chéo.
          </p>
        )}
      </div>

      {/* Metadata Footer */}
      <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span>Người phụ trách: <span className="text-slate-300 font-medium">{page.owner}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>
            {page.lastReviewed
              ? `Cập nhật lần cuối: ${page.lastReviewed}`
              : page.updatedAt
              ? `Cập nhật: ${new Date(page.updatedAt).toLocaleDateString('vi-VN')}`
              : 'Mới tạo'}
          </span>
        </div>
      </div>
    </article>
  );
}
