'use client';

import React from 'react';
import { AlertCircle, Edit2 } from 'lucide-react';
import { KanbanTask } from './types';

interface TaskGanttViewProps {
  ganttDays: {
    dateStr: string;
    label: string;
    dayName: string;
    isToday: boolean;
  }[];
  filteredTasks: KanbanTask[];
  getDependencyTask: (depId?: string) => KanbanTask | undefined;
  openEditModal: (task: KanbanTask) => void;
}

export function TaskGanttView({
  ganttDays,
  filteredTasks,
  getDependencyTask,
  openEditModal,
}: TaskGanttViewProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
      <div className="p-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <span>Biểu đồ Gantt & Tiến độ Timeline</span>
            <span className="text-xs text-zinc-500 font-normal">
              (Mỗi thanh ngang thể hiện thời lượng từ ngày bắt đầu đến hạn chót)
            </span>
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Đã hoàn thành
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-500 inline-block" /> Đang làm
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-500 inline-block" /> Bị chặn
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1200px]">
          {/* Gantt Header */}
          <div className="flex border-b border-zinc-200 bg-zinc-100/70 font-semibold text-[11px] text-zinc-700">
            <div className="w-72 shrink-0 p-3 border-r border-zinc-200">Nhiệm vụ & Người phụ trách</div>
            <div className="flex-1 flex">
              {ganttDays.map((day) => (
                <div
                  key={day.dateStr}
                  className={`w-12 shrink-0 p-2 text-center border-r border-zinc-200/60 ${
                    day.isToday ? 'bg-blue-50 text-blue-700 font-bold' : ''
                  }`}
                >
                  <div className="text-[10px] text-zinc-400 uppercase">{day.dayName}</div>
                  <div>{day.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Gantt Rows */}
          <div className="divide-y divide-zinc-100">
            {filteredTasks.map((task) => {
              const checklistTotal = task.checklist?.length || 0;
              const checklistDone = task.checklist?.filter((c) => c.completed).length || 0;
              const progressPct =
                checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;
              const depTask = getDependencyTask(task.dependsOnTaskId);

              const startIdx = ganttDays.findIndex((d) => d.dateStr === task.startDate);
              const dueIdx = ganttDays.findIndex((d) => d.dateStr === task.dueDate);

              const effectiveStart = startIdx >= 0 ? startIdx : 0;
              const effectiveEnd = dueIdx >= 0 ? dueIdx : Math.min(effectiveStart + 3, ganttDays.length - 1);
              const span = Math.max(1, effectiveEnd - effectiveStart + 1);

              const leftOffset = effectiveStart * 48; // 48px per day column
              const barWidth = span * 48;

              return (
                <div key={task.id} className="flex hover:bg-zinc-50/60 transition-colors group">
                  {/* Task Label on the left */}
                  <div className="w-72 shrink-0 p-3 border-r border-zinc-200 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p
                        onClick={() => openEditModal(task)}
                        className="text-xs font-bold text-zinc-900 truncate hover:text-blue-600 cursor-pointer"
                        title={task.title}
                      >
                        {task.title}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-0.5">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: task.assigneeColor || '#3b82f6' }}
                        />
                        <span className="truncate">{task.assigneeName}</span>
                        <span>•</span>
                        <span>{task.loggedHours || 0}h/{task.estimatedHours || 0}h</span>
                      </div>
                    </div>
                    <button
                      onClick={() => openEditModal(task)}
                      className="p-1 text-zinc-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Chỉnh sửa"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Timeline Bar Area */}
                  <div className="flex-1 relative flex items-center h-14">
                    {/* Grid background lines */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {ganttDays.map((d) => (
                        <div
                          key={d.dateStr}
                          className={`w-12 shrink-0 border-r border-zinc-100 ${
                            d.isToday ? 'bg-blue-50/30' : ''
                          }`}
                        />
                      ))}
                    </div>

                    {/* Gantt Bar */}
                    <div
                      onClick={() => openEditModal(task)}
                      className={`absolute h-8 rounded-lg shadow-xs flex items-center px-2 cursor-pointer transition-all hover:brightness-105 overflow-hidden ${
                        task.column === 'done'
                          ? 'bg-emerald-500 text-white'
                          : task.column === 'blocked'
                          ? 'bg-rose-500 text-white ring-2 ring-rose-300'
                          : task.column === 'review'
                          ? 'bg-amber-500 text-white'
                          : task.column === 'in_progress'
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-400 text-white'
                      }`}
                      style={{
                        left: `${leftOffset}px`,
                        width: `${Math.max(barWidth, 60)}px`,
                      }}
                      title={`${task.title} (${task.startDate || '—'} đến ${task.dueDate || '—'})`}
                    >
                      {/* Inner progress overlay */}
                      {progressPct > 0 && task.column !== 'done' && (
                        <div
                          className="absolute left-0 top-0 bottom-0 bg-black/20"
                          style={{ width: `${progressPct}%` }}
                        />
                      )}

                      <span className="relative z-10 text-[10px] font-bold truncate flex items-center gap-1">
                        {task.column === 'blocked' && <AlertCircle className="w-3 h-3 shrink-0" />}
                        {task.title} ({progressPct}%)
                      </span>
                    </div>

                    {/* Dependency Arrow Badge */}
                    {depTask && (
                      <div
                        className="absolute top-1 text-[9px] font-medium text-zinc-500 bg-white border border-zinc-200 px-1.5 py-0.5 rounded shadow-xs"
                        style={{ left: `${Math.max(0, leftOffset - 50)}px` }}
                        title={`Chờ việc: ${depTask.title}`}
                      >
                        ↳ Chờ #{depTask.title.slice(0, 10)}...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
