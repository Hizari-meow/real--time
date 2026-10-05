'use client';

import React from 'react';
import Link from 'next/link';
import {
  Plus,
  AlertTriangle,
  AlertCircle,
  Link2,
  MessageSquare,
  Palette,
  Sparkles,
  BookOpen,
  FileSpreadsheet,
  CheckSquare,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
} from 'lucide-react';
import {
  KanbanTask,
  TaskColumn,
  COLUMNS,
} from './types';
import { getPriorityBadge } from './task-ui-helpers';

interface KanbanBoardViewProps {
  filteredTasks: KanbanTask[];
  todayStr: string;
  openCreateModal: (column: TaskColumn) => void;
  openEditModal: (task: KanbanTask) => void;
  setSelectedDetailTask: (task: KanbanTask) => void;
  handleDeleteTask: (id: string) => void;
  handleMoveColumn: (taskId: string, col: TaskColumn) => void;
  handleToggleChecklist: (taskId: string, itemId: string) => void;
  getDependencyTask: (depId?: string) => KanbanTask | undefined;
}

const ALL_COLUMNS: TaskColumn[] = ['todo', 'in_progress', 'blocked', 'review', 'done'];

export function KanbanBoardView({
  filteredTasks,
  todayStr,
  openCreateModal,
  openEditModal,
  setSelectedDetailTask,
  handleDeleteTask,
  handleMoveColumn,
  handleToggleChecklist,
  getDependencyTask,
}: KanbanBoardViewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 min-w-[1250px] items-start">
      {COLUMNS.map((column) => {
        const columnTasks = filteredTasks.filter((t) => t.column === column.id);
        const isOverWIP = column.id === 'in_progress' && columnTasks.length > 4;

        return (
          <div
            key={column.id}
            className={`bg-zinc-100/70 border rounded-2xl p-3 flex flex-col min-h-[550px] ${
              column.id === 'blocked' ? 'border-rose-200/80 bg-rose-50/20' : 'border-zinc-200/80'
            }`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-2 py-2 mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${column.color}`}>{column.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${column.badgeBg}`}>
                  {columnTasks.length}
                </span>
              </div>
              <button
                onClick={() => openCreateModal(column.id)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors"
                title={`Thêm công việc vào ${column.label}`}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* WIP Limit warning */}
            {isOverWIP && (
              <div className="mb-2 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Cảnh báo WIP: Nên giới hạn ≤ 4 thẻ đang làm để tập trung hoàn thiện!</span>
              </div>
            )}

            {/* Task Cards List */}
            <div className="flex-1 space-y-3">
              {columnTasks.map((task) => {
                const checklistTotal = task.checklist?.length || 0;
                const checklistDone = task.checklist?.filter((c) => c.completed).length || 0;
                const checklistPercent =
                  checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;
                const depTask = getDependencyTask(task.dependsOnTaskId);
                const isOverdue =
                  task.dueDate && task.dueDate < todayStr && task.column !== 'done';

                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedDetailTask(task)}
                    className={`bg-white border rounded-xl p-3.5 shadow-xs hover:shadow-md transition-all group cursor-pointer ${
                      task.column === 'blocked'
                        ? 'border-rose-300 ring-1 ring-rose-200'
                        : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    {/* Header: Priority + Task Key + Story Points + Labels */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {task.key && (
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[9px] bg-blue-100 text-blue-800">
                            {task.key}
                          </span>
                        )}
                        {task.storyPoints !== undefined && task.storyPoints > 0 && (
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[9px] bg-amber-100 text-amber-800">
                            {task.storyPoints} pts
                          </span>
                        )}
                        {getPriorityBadge(task.priority)}
                        {task.labels?.map((label, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 rounded text-[9px] font-mono text-zinc-600 bg-zinc-100"
                          >
                            #{label}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(task);
                          }}
                          className="p-1 text-zinc-400 hover:text-blue-600 rounded transition-colors"
                          title="Chỉnh sửa task"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTask(task.id);
                          }}
                          className="p-1 text-zinc-400 hover:text-rose-600 rounded transition-colors"
                          title="Xóa task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Blocked Reason Alert */}
                    {task.column === 'blocked' && (
                      <div className="mb-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-[10px] text-rose-800 flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Đang bị chặn:</span>{' '}
                          {task.blockedReason || 'Chưa cập nhật lý do vướng mắc'}
                        </div>
                      </div>
                    )}

                    {/* Dependency link */}
                    {depTask && (
                      <div className="mb-2 px-2 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-[10px] text-zinc-600 flex items-center gap-1.5 truncate">
                        <Link2 className="w-3 h-3 text-blue-500 shrink-0" />
                        <span className="font-semibold text-zinc-700">Phụ thuộc:</span>
                        <span className="truncate text-blue-600 font-medium" title={depTask.title}>
                          {depTask.title}
                        </span>
                      </div>
                    )}

                    {/* 2-Way Source Reference Badge (Flow 14.1 / Cross-Module Linkage) */}
                    {task.source_ref && (
                      <Link
                        href={task.source_ref.url || '#'}
                        onClick={(e) => e.stopPropagation()}
                        className="mb-2 px-2 py-1 bg-indigo-50/80 hover:bg-indigo-100/90 border border-indigo-200/80 rounded-lg text-[10px] text-indigo-900 flex items-center justify-between gap-1.5 transition-colors group/link"
                        title={`Nhấp để mở nguồn gốc từ: ${task.source_ref.title || task.source_ref.type}`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {task.source_ref.type === 'comment' ? (
                            <MessageSquare className="w-3 h-3 text-purple-600 shrink-0" />
                          ) : task.source_ref.type === 'whiteboard' ? (
                            <Palette className="w-3 h-3 text-amber-600 shrink-0" />
                          ) : task.source_ref.type === 'figma' ? (
                            <Sparkles className="w-3 h-3 text-indigo-600 shrink-0" />
                          ) : task.source_ref.type === 'sop' ? (
                            <BookOpen className="w-3 h-3 text-emerald-600 shrink-0" />
                          ) : task.source_ref.type === 'sheet' ? (
                            <FileSpreadsheet className="w-3 h-3 text-emerald-600 shrink-0" />
                          ) : (
                            <Link2 className="w-3 h-3 text-blue-600 shrink-0" />
                          )}
                          <span className="font-semibold text-indigo-950">
                            {task.source_ref.type === 'sop'
                              ? 'Quy trình SOP:'
                              : task.source_ref.type === 'whiteboard'
                              ? 'Bảng trắng:'
                              : task.source_ref.type === 'comment'
                              ? 'Bình luận:'
                              : task.source_ref.type === 'figma'
                              ? 'Bản vẽ:'
                              : 'Nguồn:'}
                          </span>
                          <span className="truncate text-indigo-700 font-medium">
                            {task.source_ref.title || 'Mở chi tiết'}
                          </span>
                        </div>
                        <span className="text-indigo-500 group-hover/link:translate-x-0.5 transition-transform shrink-0">↗</span>
                      </Link>
                    )}

                    {/* Title & Description */}
                    <h4 className="text-xs font-bold text-zinc-900 leading-snug mb-1">
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="text-[11px] text-zinc-500 line-clamp-2 mb-2.5">
                        {task.description}
                      </p>
                    )}

                    {/* Checklist Interactive Snippet */}
                    {checklistTotal > 0 && (
                      <div className="mb-2.5 p-2 bg-zinc-50 rounded-lg border border-zinc-100">
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1.5 font-medium">
                          <span className="flex items-center gap-1">
                            <CheckSquare className="w-3 h-3 text-zinc-400" />
                            Việc con ({checklistPercent}%)
                          </span>
                          <span>
                            {checklistDone}/{checklistTotal}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all"
                            style={{ width: `${checklistPercent}%` }}
                          />
                        </div>
                        <div className="space-y-1">
                          {task.checklist.slice(0, 3).map((item) => (
                            <label
                              key={item.id}
                              className="flex items-center gap-2 text-[11px] cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={item.completed}
                                onChange={() => handleToggleChecklist(task.id, item.id)}
                                className="rounded text-blue-600 focus:ring-blue-500 w-3 h-3 cursor-pointer"
                              />
                              <span
                                className={
                                  item.completed
                                    ? 'line-through text-zinc-400'
                                    : 'text-zinc-700'
                                }
                              >
                                {item.text}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dates & Time Tracking Badge */}
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-2 pt-1 border-t border-zinc-100">
                      {task.dueDate ? (
                        <span
                          className={`flex items-center gap-1 font-medium ${
                            isOverdue ? 'text-rose-600 font-bold' : 'text-zinc-600'
                          }`}
                        >
                          <Calendar className="w-3 h-3" />
                          {task.dueDate} {isOverdue && '(Quá hạn!)'}
                        </span>
                      ) : (
                        <span className="text-zinc-400">Không có hạn</span>
                      )}

                      {(task.estimatedHours || task.loggedHours) && (
                        <span className="flex items-center gap-1 text-zinc-600 font-medium">
                          <Clock className="w-3 h-3 text-zinc-400" />
                          {task.loggedHours || 0}h / {task.estimatedHours || 0}h
                        </span>
                      )}
                    </div>

                    {/* Subtask & Comment Indicators */}
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-2">
                      <div className="flex items-center gap-3">
                        {(task.subtaskCount || 0) > 0 && (
                          <span className="flex items-center gap-1 font-medium text-zinc-600" title="Tiến độ công việc con">
                            <CheckSquare className="w-3 h-3 text-blue-500" />
                            <span>{task.completedSubtasks || 0}/{task.subtaskCount} ({task.subtaskProgress || 0}%)</span>
                          </span>
                        )}
                        {(task.commentsCount || 0) > 0 && (
                          <span className="flex items-center gap-1 font-medium text-zinc-600" title="Bình luận trao đổi">
                            <MessageSquare className="w-3 h-3 text-indigo-500" />
                            <span>{task.commentsCount}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer: Assignee & Stage Switchers */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-xs text-zinc-500">
                      {/* Assignee (Single or Multiple) */}
                      {task.assignees && task.assignees.length > 1 ? (
                        <div className="flex items-center -space-x-1.5" title={`Phụ trách: ${task.assignees.map((a) => a.name).join(', ')}`}>
                          {task.assignees.slice(0, 3).map((a, idx) => (
                            <div
                              key={idx}
                              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold border border-white"
                              style={{ backgroundColor: a.avatarColor || '#3b82f6' }}
                            >
                              {a.name.slice(0, 1).toUpperCase()}
                            </div>
                          ))}
                          {task.assignees.length > 3 && (
                            <span className="text-[9px] text-zinc-500 ml-1">+{task.assignees.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                            style={{ backgroundColor: task.assigneeColor || '#3b82f6' }}
                            title={`Người thực hiện: ${task.assigneeName}`}
                          >
                            {task.assigneeName ? task.assigneeName.slice(0, 1).toUpperCase() : 'U'}
                          </div>
                          <span className="text-[10px] text-zinc-600 font-medium truncate max-w-[80px]">
                            {task.assigneeName}
                          </span>
                        </div>
                      )}

                      {/* Quick stage transition buttons */}
                      <div className="flex items-center gap-1">
                        {column.id !== 'todo' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const prevIdx = ALL_COLUMNS.indexOf(column.id) - 1;
                              if (prevIdx >= 0) handleMoveColumn(task.id, ALL_COLUMNS[prevIdx]);
                            }}
                            className="p-1 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded"
                            title="Chuyển về giai đoạn trước"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {column.id !== 'done' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextIdx = ALL_COLUMNS.indexOf(column.id) + 1;
                              if (nextIdx < ALL_COLUMNS.length)
                                handleMoveColumn(task.id, ALL_COLUMNS[nextIdx]);
                            }}
                            className="p-1 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Chuyển sang giai đoạn tiếp theo"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {columnTasks.length === 0 && (
                <div className="h-32 border border-dashed border-zinc-300 rounded-xl flex flex-col items-center justify-center text-zinc-400 text-xs">
                  <p>Chưa có việc nào</p>
                  <button
                    onClick={() => openCreateModal(column.id)}
                    className="text-[11px] text-blue-600 hover:underline mt-1 font-semibold"
                  >
                    + Thêm ngay
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
