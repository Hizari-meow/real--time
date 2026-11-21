'use client';

import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Globe,
  Lock,
  Calendar,
  DownloadCloud,
  ShieldCheck,
  ShieldAlert,
  Users,
  Eye,
  MessageSquare,
  Edit3,
  Crown,
} from 'lucide-react';
import { CloudFileItem, FilePermission } from './types';
import { useAuth } from '../../context/AuthContext';

export interface FileShareModalProps {
  file: CloudFileItem | null;
  isOpen?: boolean;
  onClose: () => void;
  onUpdateShareSettings?: (
    fileId: string,
    permission: FilePermission,
    settings: any
  ) => void;
}

export function FileShareModal({
  file,
  isOpen = true,
  onClose,
  onUpdateShareSettings,
}: FileShareModalProps) {
  const { user, workspace, token } = useAuth();
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api').replace(/\/+$/, '');

  const [users, setUsers] = useState<any[]>(() => {
    if (user) {
      return [{ id: user.userId, name: user.name, role: workspace?.role || 'member', color: '#3b82f6' }];
    }
    return [];
  });

  const [copied, setCopied] = useState(false);
  const [permission, setPermission] = useState<FilePermission>(file?.permission || 'editor');
  const [linkAccess, setLinkAccess] = useState<'anyone' | 'organization' | 'restricted'>(
    file?.shareSettings?.linkAccess || 'anyone'
  );
  const [allowDownload, setAllowDownload] = useState<boolean>(
    file?.shareSettings?.allowDownload ?? true
  );
  const [hasPassword, setHasPassword] = useState<boolean>(
    file?.shareSettings?.hasPassword ?? false
  );
  const [password, setPassword] = useState<string>(file?.shareSettings?.password || '');
  const [expiresAt, setExpiresAt] = useState<string>(file?.shareSettings?.expiresAt || '');
  const [memberRoles, setMemberRoles] = useState<Record<string, FilePermission>>({});

  React.useEffect(() => {
    if (!token || !workspace) return;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (workspace?.orgId) headers['x-workspace-id'] = workspace.orgId;

    fetch(`${apiUrl}/members`, { headers })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data) && d.data.length > 0) {
          const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
          setUsers(
            d.data.map((m: any, idx: number) => ({
              id: m.id || m.userId,
              name: m.name,
              role: m.role,
              color: colors[idx % colors.length],
            }))
          );
        }
      })
      .catch((err) => console.warn('Failed to load workspace members:', err));
  }, [token, workspace, apiUrl]);

  if (!isOpen || !file) return null;

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3005'}/files/share/${file.id}`;

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = async () => {
    const payload = {
      linkAccess,
      allowDownload,
      permission: permission === 'owner' ? 'editor' : permission,
      hasPassword,
      password: hasPassword ? password : '',
      expiresAt: expiresAt || undefined,
    };

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (workspace?.orgId) headers['x-workspace-id'] = workspace.orgId;

      await fetch(`${apiUrl}/files/${file.id}/share`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn('Failed to save share settings to API:', err);
    }

    if (onUpdateShareSettings) {
      onUpdateShareSettings(file.id, permission, payload);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] font-sans">
        {/* Header */}
        <div className="h-14 px-6 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Share2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-zinc-900 truncate">Chia sẻ tệp & Phân quyền</h3>
              <p className="text-[11px] text-zinc-500 truncate">{file.name}</p>
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
          {/* Link Copy Box */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Liên kết chia sẻ tệp
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-700 font-mono select-all focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all shadow-xs shrink-0 ${
                  copied ? 'bg-emerald-600 text-white' : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
              </button>
            </div>
          </div>

          {/* 4 Permission Levels */}
          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-blue-600" />
                <span>Quyền truy cập liên kết</span>
              </span>
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as FilePermission)}
                className="px-2.5 py-1 bg-white border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-800 focus:outline-none focus:border-blue-500 cursor-pointer shadow-xs"
              >
                <option value="viewer">👁️ Chỉ xem (Viewer)</option>
                <option value="commenter">💬 Bình luận (Commenter)</option>
                <option value="editor">✏️ Chỉnh sửa (Editor)</option>
                <option value="owner">👑 Chủ sở hữu (Owner)</option>
              </select>
            </div>

            <p className="text-[11px] text-zinc-500 leading-relaxed">
              {permission === 'viewer' && 'Người nhận chỉ có thể xem tệp, không được chỉnh sửa.'}
              {permission === 'commenter' && 'Người nhận có thể xem và để lại bình luận hoặc nhận xét.'}
              {permission === 'editor' && 'Người nhận có thể xem, đổi tên, phân loại và bình luận tệp.'}
              {permission === 'owner' && 'Toàn quyền quản lý tệp, phân quyền thành viên và xóa tệp.'}
            </p>
          </div>

          {/* Advanced Security Controls */}
          <div className="space-y-3 pt-2 border-t border-zinc-100">
            <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider text-[10px]">
              Tùy chọn kiểm soát nâng cao
            </span>

            {/* Block Download Toggle */}
            <div className="flex items-center justify-between p-2.5 bg-zinc-50/80 rounded-xl border border-zinc-200/80">
              <div>
                <p className="text-xs font-semibold text-zinc-800">Cho phép tải về và in</p>
                <p className="text-[10px] text-zinc-500">Tắt để chặn người xem sao chép tệp ra ngoài</p>
              </div>
              <input
                type="checkbox"
                checked={allowDownload}
                onChange={(e) => setAllowDownload(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {/* Password Protection */}
            <div className="p-2.5 bg-zinc-50/80 rounded-xl border border-zinc-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-amber-600" />
                    <span>Đặt mật khẩu bảo vệ</span>
                  </p>
                  <p className="text-[10px] text-zinc-500">Chỉ người có mật khẩu mới mở được liên kết</p>
                </div>
                <input
                  type="checkbox"
                  checked={hasPassword}
                  onChange={(e) => setHasPassword(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {hasPassword && (
                <input
                  type="password"
                  placeholder="Nhập mật khẩu truy cập..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-blue-500"
                />
              )}
            </div>

            {/* Expiration Date */}
            <div className="flex items-center justify-between p-2.5 bg-zinc-50/80 rounded-xl border border-zinc-200/80">
              <div>
                <p className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-purple-600" />
                  <span>Thời hạn truy cập</span>
                </p>
                <p className="text-[10px] text-zinc-500">Liên kết tự động hết hạn và thu hồi</p>
              </div>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs text-zinc-800 focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Member Roles Table */}
          <div className="space-y-2 pt-2 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-zinc-500" />
                <span>Quyền thành viên cụ thể</span>
              </span>
              <span className="text-[10px] text-zinc-400">Tự động kế thừa thư mục</span>
            </div>

            <div className="border border-zinc-200 rounded-xl divide-y divide-zinc-100 overflow-hidden">
              {users.map((user) => {
                const role = memberRoles[user.id] || 'viewer';
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
                        <p className="text-xs font-semibold text-zinc-900">{user.name}</p>
                        <p className="text-[10px] text-zinc-400">{user.role}</p>
                      </div>
                    </div>

                    <select
                      value={role}
                      onChange={(e) =>
                        setMemberRoles((prev) => ({
                          ...prev,
                          [user.id]: e.target.value as FilePermission,
                        }))
                      }
                      className="px-2 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-700 focus:outline-none cursor-pointer"
                    >
                      <option value="owner">Chủ sở hữu</option>
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
        <div className="h-14 px-6 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              setLinkAccess('restricted');
              handleSave();
            }}
            className="text-xs text-rose-600 hover:underline font-semibold"
          >
            Thu hồi toàn bộ quyền chia sẻ
          </button>

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
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
            >
              Lưu thay đổi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
