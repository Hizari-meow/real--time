'use client';

import React, { useState } from 'react';
import { X, FolderPlus, ShieldCheck, Users, Archive, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Project } from './types';

interface ProjectModalProps {
  apiBase: string;
  token: string | null;
  orgId: string;
  currentUserRole?: string;
  projects: Project[];
  onProjectCreated: (newProj: Project) => void;
  onProjectUpdated: (updatedProj: Project) => void;
  onClose: () => void;
}

export function ProjectModal({
  apiBase,
  token,
  orgId,
  currentUserRole,
  projects,
  onProjectCreated,
  onProjectUpdated,
  onClose,
}: ProjectModalProps) {
  const [tab, setTab] = useState<'create' | 'manage'>('create');
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !key.trim()) {
      setError('Tên dự án và Mã dự án (Key) là bắt buộc');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const res = await fetch(`${apiBase}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-workspace-id': orgId,
        },
        body: JSON.stringify({
          name: name.trim(),
          key: key.trim().toUpperCase(),
          description: description.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Lỗi khi tạo dự án');
      }

      setSuccess(`Đã tạo dự án [${json.data.key}] ${json.data.name} thành công!`);
      setName('');
      setKey('');
      setDescription('');
      onProjectCreated(json.data);
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveToggle = async (p: Project) => {
    try {
      setLoading(true);
      setError(null);
      const action = p.isArchived ? 'restore' : 'archive';
      const res = await fetch(`${apiBase}/projects/${p.id}/${action}`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-workspace-id': orgId,
        },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `Lỗi khi ${action === 'archive' ? 'lưu trữ' : 'khôi phục'} dự án`);
      }
      onProjectUpdated({ ...p, isArchived: !p.isArchived });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 text-base">Quản lý Không gian Dự án</h3>
              <p className="text-xs text-zinc-500">Phân quyền 3 cấp (Admin, Member, Viewer) & Lưu CSDL</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-zinc-100 px-6 pt-2 bg-zinc-50/30 gap-4">
          <button
            onClick={() => setTab('create')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-all ${
              tab === 'create'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Tạo dự án mới
          </button>
          <button
            onClick={() => setTab('manage')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-all ${
              tab === 'manage'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Danh sách dự án ({projects.length})
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {tab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Tên dự án <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nền tảng Cộng tác Doanh nghiệp"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!key) {
                      const words = e.target.value.trim().split(/\s+/);
                      const suggested = words.map((w) => w[0]).join('').slice(0, 4).toUpperCase();
                      setKey(suggested);
                    }
                  }}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Mã dự án (Project Key) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: COLLAB, PRJ, ENG"
                  value={key}
                  onChange={(e) => setKey(e.target.value.toUpperCase())}
                  maxLength={10}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono uppercase text-zinc-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  required
                />
                <p className="text-[11px] text-zinc-400 mt-1">Dùng làm tiền tố định danh cho các công việc (ví dụ: {key || 'KEY'}-101)</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Mô tả dự án</label>
                <textarea
                  rows={3}
                  placeholder="Mục tiêu, phạm vi và phân bổ của dự án..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Đang tạo dự án...' : 'Tạo Dự Án Mới'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {projects.length === 0 ? (
                <div className="text-center py-8 text-zinc-400 text-xs">Chưa có dự án nào trong workspace này.</div>
              ) : (
                projects.map((p) => (
                  <div
                    key={p.id}
                    className={`p-3.5 border rounded-xl flex items-center justify-between transition-all ${
                      p.isArchived ? 'bg-zinc-50/60 border-zinc-200 opacity-60' : 'bg-white border-zinc-200 shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] px-1.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded border border-indigo-200/60">
                          {p.key}
                        </span>
                        <h4 className="text-xs font-bold text-zinc-900">{p.name}</h4>
                        {p.isArchived && (
                          <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-200 px-1.5 py-0.5 rounded">
                            Đã lưu trữ
                          </span>
                        )}
                      </div>
                      {p.description && <p className="text-[11px] text-zinc-500 mt-1 line-clamp-1">{p.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-400">
                        <span>{p.tasksCount || 0} công việc</span>
                        <span>•</span>
                        <span>{p.sprintsCount || 0} sprints</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {p.members?.length || 1} thành viên
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleArchiveToggle(p)}
                      disabled={loading}
                      title={p.isArchived ? 'Khôi phục dự án' : 'Lưu trữ dự án'}
                      className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
                    >
                      {p.isArchived ? <RefreshCw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
