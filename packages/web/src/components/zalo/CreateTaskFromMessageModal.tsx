'use client';

import React, { useState } from 'react';
import { X, CheckSquare, Calendar, User as UserIcon, AlertCircle } from 'lucide-react';
import { TaskColumn, TaskPriority } from '../tasks/types';
import { PRESET_USERS } from './mockData';
import { getUnifiedUsers } from '../../lib/domain-event-bus';

interface CreateTaskFromMessageModalProps {
  isOpen: boolean;
  messageText: string;
  senderName: string;
  onClose: () => void;
  onCreateTask: (taskData: {
    title: string;
    description: string;
    column: TaskColumn;
    priority: TaskPriority;
    assigneeId: string;
    dueDate?: string;
  }) => void;
}

export function CreateTaskFromMessageModal({
  isOpen,
  messageText,
  senderName,
  onClose,
  onCreateTask,
}: CreateTaskFromMessageModalProps) {
  const [users, setUsers] = useState(() => {
    if (typeof window !== 'undefined') {
      const u = getUnifiedUsers();
      if (u.length > 0) return u;
    }
    return PRESET_USERS;
  });
  const [title, setTitle] = useState(messageText.slice(0, 80));
  const [description, setDescription] = useState(`Trích xuất từ tin nhắn của ${senderName}: "${messageText}"`);
  const [column, setColumn] = useState<TaskColumn>('todo');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [assigneeId, setAssigneeId] = useState(users[0]?.id || 'usr_nam');
  const [dueDate, setDueDate] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onCreateTask({
      title: title.trim(),
      description: description.trim(),
      column,
      priority,
      assigneeId,
      dueDate: dueDate || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-md overflow-hidden flex flex-col font-sans">
        <div className="h-14 px-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-zinc-900">Tạo công việc từ tin nhắn</h3>
              <p className="text-[10px] text-zinc-500">Chuyển ý tưởng chat thành thẻ Kanban</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Tiêu đề công việc *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Mô tả chi tiết</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 focus:bg-white focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Giai đoạn</label>
              <select
                value={column}
                onChange={(e) => setColumn(e.target.value as TaskColumn)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-zinc-800"
              >
                <option value="todo">Cần làm (To Do)</option>
                <option value="in_progress">Đang xử lý (In Progress)</option>
                <option value="review">Đang đánh giá (Review)</option>
                <option value="done">Hoàn thành (Done)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Mức ưu tiên</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-zinc-800"
              >
                <option value="urgent">Khẩn cấp</option>
                <option value="high">Ưu tiên cao</option>
                <option value="normal">Bình thường</option>
                <option value="low">Thấp</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Người phụ trách</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-zinc-800"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} {(u as any).department ? `(${(u as any).department})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Hạn hoàn thành</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1 text-zinc-800"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-zinc-600 hover:bg-zinc-100 rounded-xl font-semibold"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs"
            >
              Tạo và Lưu vào Kanban
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
