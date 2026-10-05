'use client';

import React, { useState } from 'react';
import { X, Play, CheckSquare, Zap, Calendar, Target, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Sprint, Project } from './types';

interface SprintModalProps {
  apiBase: string;
  token: string | null;
  orgId: string;
  projects: Project[];
  activeProjectId?: string;
  sprints: Sprint[];
  onSprintCreated: (newSprint: Sprint) => void;
  onSprintUpdated: (updatedSprint: Sprint) => void;
  onViewBurndown: (sprint: Sprint) => void;
  onClose: () => void;
}

export function SprintModal({
  apiBase,
  token,
  orgId,
  projects,
  activeProjectId,
  sprints,
  onSprintCreated,
  onSprintUpdated,
  onViewBurndown,
  onClose,
}: SprintModalProps) {
  const [tab, setTab] = useState<'create' | 'list'>('create');
  const [name, setName] = useState(`Sprint ${sprints.length + 1}`);
  const [goal, setGoal] = useState('');
  const [projectId, setProjectId] = useState<string>(activeProjectId || (projects[0]?.id || ''));
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Tên Sprint là bắt buộc');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const res = await fetch(`${apiBase}/sprints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-workspace-id': orgId,
        },
        body: JSON.stringify({
          name: name.trim(),
          goal: goal.trim(),
          projectId: projectId || undefined,
          startDate,
          endDate,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Lỗi khi tạo sprint');
      }

      setSuccess(`Đã tạo ${json.data.name} thành công!`);
      onSprintCreated(json.data);
      setName(`Sprint ${sprints.length + 2}`);
      setGoal('');
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSprint = async (s: Sprint) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiBase}/sprints/${s.id}/start`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-workspace-id': orgId,
        },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Lỗi khi bắt đầu sprint');
      }
      onSprintUpdated(json.data);
      setSuccess(`Đã kích hoạt ${s.name} thành công!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSprint = async (s: Sprint) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiBase}/sprints/${s.id}/complete`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-workspace-id': orgId,
        },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Lỗi khi hoàn thành sprint');
      }
      onSprintUpdated(json.data);
      setSuccess(`Đã hoàn thành ${s.name}!`);
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
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 text-base">Quản lý Sprint Agile</h3>
              <p className="text-xs text-zinc-500">Kỳ làm việc, Story Points & Biểu đồ Burndown</p>
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
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Tạo Sprint mới
          </button>
          <button
            onClick={() => setTab('list')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-all ${
              tab === 'list'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Danh sách Sprints ({sprints.length})
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
                  Tên Sprint <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Sprint 24 (Backend Architecture)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                  required
                />
              </div>

              {projects.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Dự án trực thuộc</label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                  >
                    <option value="">(Không gắn dự án cụ thể)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.key}] {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Mục tiêu Sprint (Sprint Goal)</label>
                <textarea
                  rows={2}
                  placeholder="Mục tiêu cốt lõi mà đội ngũ cần đạt được trong kỳ này..."
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Đang tạo sprint...' : 'Tạo Sprint Mới'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {sprints.length === 0 ? (
                <div className="text-center py-8 text-zinc-400 text-xs">Chưa có sprint nào. Hãy tạo sprint đầu tiên!</div>
              ) : (
                sprints.map((s) => (
                  <div key={s.id} className="p-3.5 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-zinc-900">{s.name}</h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            s.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : s.status === 'completed'
                              ? 'bg-zinc-100 text-zinc-600'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {s.status === 'active' ? 'Đang diễn ra' : s.status === 'completed' ? 'Đã hoàn thành' : 'Kế hoạch'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onViewBurndown(s)}
                          className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-semibold rounded-lg transition-colors"
                        >
                          Burndown Chart
                        </button>
                        {s.status === 'planned' && (
                          <button
                            onClick={() => handleStartSprint(s)}
                            disabled={loading}
                            className="px-2 py-1 bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-semibold rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Play className="w-3 h-3" /> Bắt đầu
                          </button>
                        )}
                        {s.status === 'active' && (
                          <button
                            onClick={() => handleCompleteSprint(s)}
                            disabled={loading}
                            className="px-2 py-1 bg-zinc-800 text-white hover:bg-zinc-900 text-[11px] font-semibold rounded-lg transition-colors flex items-center gap-1"
                          >
                            <CheckSquare className="w-3 h-3" /> Kết thúc
                          </button>
                        )}
                      </div>
                    </div>

                    {s.goal && <p className="text-[11px] text-zinc-600 italic">"{s.goal}"</p>}

                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-100">
                      <span>{s.startDate?.slice(0, 10)} → {s.endDate?.slice(0, 10)}</span>
                      <span className="font-semibold text-zinc-700">
                        {s.completedStoryPoints || 0} / {s.totalStoryPoints || 0} SP
                      </span>
                    </div>
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
