'use client';

import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import {
  KanbanTask,
  TaskColumn,
  TaskPriority,
  Project,
  Sprint,
} from './types';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTask: KanbanTask | null;
  createTaskError: string | null;
  handleSaveTask: (e: React.FormEvent) => void;
  projects: Project[];
  sprints: Sprint[];
  formProjectId: string;
  setFormProjectId: (s: string) => void;
  formSprintId: string;
  setFormSprintId: (s: string) => void;
  formTitle: string;
  setFormTitle: (s: string) => void;
  formDescription: string;
  setFormDescription: (s: string) => void;
  formColumn: TaskColumn;
  setFormColumn: (c: TaskColumn) => void;
  formPriority: TaskPriority;
  setFormPriority: (p: TaskPriority) => void;
  formStoryPoints: number;
  setFormStoryPoints: (n: number) => void;
  formBlockedReason: string;
  setFormBlockedReason: (s: string) => void;
  formAssigneeId: string;
  setFormAssigneeId: (s: string) => void;
  availableUsers: { id: string; name: string; color: string; department?: string }[];
  formDependsOnTaskId: string;
  setFormDependsOnTaskId: (s: string) => void;
  tasks: KanbanTask[];
  formStartDate: string;
  setFormStartDate: (s: string) => void;
  formDueDate: string;
  setFormDueDate: (s: string) => void;
  formEstimatedHours: number;
  setFormEstimatedHours: (n: number) => void;
  formLoggedHours: number;
  setFormLoggedHours: (n: number) => void;
  formLabels: string;
  setFormLabels: (s: string) => void;
  formChecklist: string;
  setFormChecklist: (s: string) => void;
}

export function CreateTaskModal({
  isOpen,
  onClose,
  editingTask,
  createTaskError,
  handleSaveTask,
  projects,
  sprints,
  formProjectId,
  setFormProjectId,
  formSprintId,
  setFormSprintId,
  formTitle,
  setFormTitle,
  formDescription,
  setFormDescription,
  formColumn,
  setFormColumn,
  formPriority,
  setFormPriority,
  formStoryPoints,
  setFormStoryPoints,
  formBlockedReason,
  setFormBlockedReason,
  formAssigneeId,
  setFormAssigneeId,
  availableUsers,
  formDependsOnTaskId,
  setFormDependsOnTaskId,
  tasks,
  formStartDate,
  setFormStartDate,
  formDueDate,
  setFormDueDate,
  formEstimatedHours,
  setFormEstimatedHours,
  formLoggedHours,
  setFormLoggedHours,
  formLabels,
  setFormLabels,
  formChecklist,
  setFormChecklist,
}: CreateTaskModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        <div className="h-14 px-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50 shrink-0">
          <h3 className="text-sm font-bold text-zinc-900">
            {editingTask ? 'Chỉnh sửa công việc' : 'Tạo công việc mới'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSaveTask} className="p-6 space-y-4 overflow-y-auto">
          {createTaskError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{createTaskError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Dự án (Project)</label>
              <select
                value={formProjectId}
                onChange={(e) => setFormProjectId(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-800 focus:bg-white focus:outline-none"
              >
                <option value="">-- Mặc định (Workspace) --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.key}] {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Sprint</label>
              <select
                value={formSprintId}
                onChange={(e) => setFormSprintId(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-800 focus:bg-white focus:outline-none"
              >
                <option value="">-- Không có Sprint --</option>
                {sprints
                  .filter((s) => !formProjectId || s.projectId === formProjectId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.status})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Tiêu đề công việc *
            </label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Triển khai kiểm thử tải Redis cluster..."
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Mô tả chi tiết</label>
            <textarea
              rows={2}
              placeholder="Nêu rõ mục tiêu, yêu cầu và tiêu chí nghiệm thu..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Giai đoạn</label>
              <select
                value={formColumn}
                onChange={(e) => setFormColumn(e.target.value as TaskColumn)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-800 focus:bg-white focus:outline-none"
              >
                <option value="todo">📋 Cần làm</option>
                <option value="in_progress">⏳ Đang xử lý</option>
                <option value="blocked">⛔ Bị chặn</option>
                <option value="review">🔍 Đang duyệt</option>
                <option value="done">✅ Hoàn thành</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Mức ưu tiên</label>
              <select
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value as TaskPriority)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-800 focus:bg-white focus:outline-none"
              >
                <option value="urgent">Khẩn cấp</option>
                <option value="high">Ưu tiên cao</option>
                <option value="normal">Bình thường</option>
                <option value="low">Thấp</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Story Points</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formStoryPoints}
                onChange={(e) => setFormStoryPoints(Number(e.target.value) || 0)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-800 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Blocked reason input if column is blocked */}
          {formColumn === 'blocked' && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
              <label className="block text-xs font-bold text-rose-800 mb-1">
                Lý do bị chặn (vướng mắc cần giải quyết) *
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Chờ phê duyệt từ đối tác ngân hàng..."
                value={formBlockedReason}
                onChange={(e) => setFormBlockedReason(e.target.value)}
                className="w-full bg-white border border-rose-300 rounded-lg px-3 py-1.5 text-xs text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Người phụ trách</label>
              <select
                value={formAssigneeId}
                onChange={(e) => setFormAssigneeId(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-800 focus:bg-white focus:outline-none"
              >
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} {(u as any).department ? `(${(u as any).department})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Phụ thuộc nhiệm vụ</label>
              <select
                value={formDependsOnTaskId}
                onChange={(e) => setFormDependsOnTaskId(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-800 focus:bg-white focus:outline-none"
              >
                <option value="">Không phụ thuộc việc nào</option>
                {tasks
                  .filter((t) => !editingTask || t.id !== editingTask.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      #{t.title.slice(0, 30)}...
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Ngày bắt đầu</label>
              <input
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-800 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Hạn hoàn thành</label>
              <input
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-800 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Giờ dự kiến (h)</label>
              <input
                type="number"
                min="0"
                value={formEstimatedHours}
                onChange={(e) => setFormEstimatedHours(Number(e.target.value))}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-800 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Giờ đã làm (h)</label>
              <input
                type="number"
                min="0"
                value={formLoggedHours}
                onChange={(e) => setFormLoggedHours(Number(e.target.value))}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-800 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Nhãn / Tags (cách nhau bằng dấu phẩy)
            </label>
            <input
              type="text"
              placeholder="Backend, Security, Docker"
              value={formLabels}
              onChange={(e) => setFormLabels(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Danh mục việc con (Mỗi dòng một mục)
            </label>
            <textarea
              rows={2}
              placeholder={`Cài đặt môi trường\nChạy unit test\nĐánh giá code`}
              value={formChecklist}
              onChange={(e) => setFormChecklist(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none resize-none font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
            >
              Lưu công việc
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
