'use client';

import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Globe,
  Lock,
  Edit3,
  MessageSquare,
  Eye,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { PRESET_USERS } from '../zalo/mockData';
import { getUnifiedUsers } from '../../lib/domain-event-bus';

export type DocumentPermission = 'editor' | 'commenter' | 'viewer';

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  currentPermission: DocumentPermission;
  onPermissionChange: (permission: DocumentPermission) => void;
  currentUser: {
    id: string;
    name: string;
    color: string;
  };
}

export function ShareModal({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  currentPermission,
  onPermissionChange,
  currentUser,
}: ShareModalProps) {
  const [users, setUsers] = useState(() => {
    if (typeof window !== 'undefined') {
      const u = getUnifiedUsers();
      if (u.length > 0) return u;
    }
    return PRESET_USERS;
  });
  const [copied, setCopied] = useState(false);
  const [permission, setPermission] = useState<DocumentPermission>(currentPermission);
  const [memberPermissions, setMemberPermissions] = useState<Record<string, DocumentPermission>>({
    usr_nam: 'editor',
    usr_mai: 'editor',
    usr_long: 'commenter',
    usr_alice: 'editor',
    usr_bob: 'editor',
  });

  if (!isOpen) return null;

  const shareUrl = typeof window !== 'undefined' ? window.location.href : `http://localhost:3005/doc/${documentId}`;

  const handleCopyLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleApply = () => {
    onPermissionChange(permission);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="h-14 px-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Chia sẻ tài liệu & Phân quyền</h3>
              <p className="text-[11px] text-zinc-500 truncate max-w-[280px]">
                {documentTitle}
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
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Share Link Row */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Liên kết cộng tác thời gian thực
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-700 font-mono select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all shadow-xs shrink-0 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã chép!' : 'Sao chép'}</span>
              </button>
            </div>
          </div>

          {/* General Access Permission */}
          <div className="p-4 bg-zinc-50/80 rounded-xl border border-zinc-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-zinc-900">Quyền truy cập chung</span>
              </div>
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as DocumentPermission)}
                className="px-2.5 py-1 bg-white border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-800 focus:outline-none focus:border-blue-500 cursor-pointer shadow-xs"
              >
                <option value="editor">✏️ Người chỉnh sửa (Editor)</option>
                <option value="commenter">💡 Người gợi ý & bình luận (Commenter)</option>
                <option value="viewer">👁️ Người chỉ xem (Viewer)</option>
              </select>
            </div>

            <p className="text-[11px] text-zinc-500 leading-relaxed">
              {permission === 'editor' &&
                'Bất kỳ ai có liên kết đều có thể cùng viết, sửa, xóa và chèn nội dung đồng thời.'}
              {permission === 'commenter' &&
                'Người mở liên kết có thể đọc tài liệu, để lại bình luận và đề xuất chỉnh sửa để chủ tài liệu phê duyệt.'}
              {permission === 'viewer' &&
                'Tài liệu được bảo vệ ở chế độ chỉ đọc. Người mở liên kết không thể thay đổi nội dung.'}
            </p>
          </div>

          {/* Collaborator Role List */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-zinc-500" />
                <span>Thành viên có quyền truy cập</span>
              </span>
              <span className="text-[11px] text-zinc-400">Tự động đồng bộ CRDT</span>
            </div>

            <div className="space-y-2 border border-zinc-200 rounded-xl divide-y divide-zinc-100 overflow-hidden">
              {/* Current user (Owner) */}
              <div className="p-2.5 bg-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-xs"
                    style={{ backgroundColor: currentUser.color }}
                  >
                    {currentUser.name.slice(0, 1)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-900">
                      {currentUser.name} <span className="text-[10px] text-blue-600 font-normal">(Bạn)</span>
                    </p>
                    <p className="text-[10px] text-zinc-400">Chủ sở hữu tài liệu</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-[10px] font-bold">
                  Chủ sở hữu
                </span>
              </div>

              {/* Other members */}
              {users.filter((u) => u.id !== currentUser.id).map((user) => {
                const userPerm = memberPermissions[user.id] || 'editor';
                return (
                  <div key={user.id} className="p-2.5 bg-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-xs"
                        style={{ backgroundColor: user.color }}
                      >
                        {user.name.slice(0, 1)}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-zinc-800">{user.name}</p>
                        <p className="text-[10px] text-zinc-400">{user.phone}</p>
                      </div>
                    </div>

                    <select
                      value={userPerm}
                      onChange={(e) =>
                        setMemberPermissions((prev) => ({
                          ...prev,
                          [user.id]: e.target.value as DocumentPermission,
                        }))
                      }
                      className="px-2 py-1 bg-zinc-50 border border-zinc-200 rounded-md text-[11px] font-medium text-zinc-700 focus:outline-none cursor-pointer"
                    >
                      <option value="editor">Chỉnh sửa</option>
                      <option value="commenter">Bình luận</option>
                      <option value="viewer">Chỉ xem</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-14 px-6 border-t border-zinc-100 flex items-center justify-between bg-zinc-50 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Bảo vệ quyền truy cập theo phiên</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-200/60 rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
            >
              Áp dụng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
