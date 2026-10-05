'use client';

import React from 'react';
import Link from 'next/link';
import {
  Calendar,
  Edit2,
  Trash2,
} from 'lucide-react';
import {
  KanbanTask,
  TaskColumn,
} from './types';
import { getPriorityBadge } from './task-ui-helpers';

interface TaskListViewProps {
  filteredTasks: KanbanTask[];
  todayStr: string;
  openEditModal: (task: KanbanTask) => void;
  handleDeleteTask: (id: string) => void;
  handleMoveColumn: (taskId: string, col: TaskColumn) => void;
  getDependencyTask: (depId?: string) => KanbanTask | undefined;
}

export function TaskListView({
  filteredTasks,
  todayStr,
  openEditModal,
  handleDeleteTask,
  handleMoveColumn,
  getDependencyTask,
}: TaskListViewProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-700">
          <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold uppercase text-[10px]">
            <tr>
              <th className="px-5 py-3.5">Tiêu đề công việc</th>
              <th className="px-4 py-3.5">Giai đoạn</th>
              <th className="px-4 py-3.5">Độ ưu tiên</th>
              <th className="px-4 py-3.5">Người phụ trách</th>
              <th className="px-4 py-3.5">Tiến độ việc con</th>
              <th className="px-4 py-3.5">Phụ thuộc / Bị chặn</th>
              <th className="px-4 py-3.5">Hạn hoàn thành</th>
              <th className="px-4 py-3.5">Giờ làm việc</th>
              <th className="px-4 py-3.5 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredTasks.map((task) => {
              const checklistTotal = task.checklist?.length || 0;
              const checklistDone = task.checklist?.filter((c) => c.completed).length || 0;
              const progressPct =
                checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;
              const depTask = getDependencyTask(task.dependsOnTaskId);
              const isOverdue =
                task.dueDate && task.dueDate < todayStr && task.column !== 'done';

              return (
                <tr key={task.id} className="hover:bg-zinc-50/80 transition-colors">
                  <td className="px-5 py-3 min-w-[240px]">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      {task.key && (
                        <span className="px-1.5 py-0.2 rounded font-mono font-bold text-[9px] bg-blue-100 text-blue-800">
                          {task.key}
                        </span>
                      )}
                      <p className="font-semibold text-zinc-900">{task.title}</p>
                    </div>
                    {task.source_ref && (
                      <Link
                        href={task.source_ref.url || '#'}
                        className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1 font-medium mb-1"
                      >
                        <span>🔗 Nguồn: {task.source_ref.title || task.source_ref.type} ↗</span>
                      </Link>
                    )}
                    {task.description && (
                      <p className="text-[11px] text-zinc-400 line-clamp-1">{task.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <select
                      value={task.column}
                      onChange={(e) => handleMoveColumn(task.id, e.target.value as TaskColumn)}
                      className="px-2.5 py-1 bg-zinc-100 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-800 cursor-pointer focus:outline-none"
                    >
                      <option value="todo">📋 Cần làm (To do)</option>
                      <option value="in_progress">⏳ Đang xử lý (In Progress)</option>
                      <option value="blocked">⛔ Bị chặn (Blocked)</option>
                      <option value="review">🔍 Đang duyệt (Review)</option>
                      <option value="done">✅ Hoàn thành (Done)</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{getPriorityBadge(task.priority)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ backgroundColor: task.assigneeColor || '#3b82f6' }}
                      >
                        {(task.assigneeName || 'U').slice(0, 1)}
                      </div>
                      <span className="font-medium text-zinc-800">
                        {task.assigneeName || 'Chưa gán'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 min-w-[120px]">
                    {checklistTotal > 0 ? (
                      <div>
                        <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                          <span>
                            {checklistDone}/{checklistTotal}
                          </span>
                          <span>{progressPct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[160px]">
                    {task.column === 'blocked' ? (
                      <span
                        className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 block truncate"
                        title={task.blockedReason}
                      >
                        ⛔ {task.blockedReason || 'Bị chặn'}
                      </span>
                    ) : depTask ? (
                      <span
                        className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 block truncate"
                        title={`Chờ việc: ${depTask.title}`}
                      >
                        🔗 Chờ #{depTask.title}
                      </span>
                    ) : (
                      <span className="text-[11px] text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {task.dueDate ? (
                      <span
                        className={`flex items-center gap-1 text-[11px] ${
                          isOverdue ? 'text-rose-600 font-bold' : 'text-zinc-600'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        {task.dueDate}
                      </span>
                    ) : (
                      <span className="text-[11px] text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-600 text-[11px]">
                    {task.loggedHours || 0}h / {task.estimatedHours || 0}h
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(task)}
                        className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Xóa công việc"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
