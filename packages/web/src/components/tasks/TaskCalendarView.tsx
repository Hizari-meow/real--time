'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { KanbanTask, TaskColumn } from './types';

interface TaskCalendarViewProps {
  monthLabel: string;
  calendarDate: Date;
  setCalendarDate: (d: Date) => void;
  calendarDays: {
    dateStr: string;
    dayNum: number;
    isCurrentMonth: boolean;
    isToday: boolean;
  }[];
  tasks: KanbanTask[];
  openCreateModal: (column: TaskColumn, dateStr?: string) => void;
  openEditModal: (task: KanbanTask) => void;
}

export function TaskCalendarView({
  monthLabel,
  calendarDate,
  setCalendarDate,
  calendarDays,
  tasks,
  openCreateModal,
  openEditModal,
}: TaskCalendarViewProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs">
      {/* Calendar Controls */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-100">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-bold text-zinc-900">{monthLabel}</h3>
          <span className="text-xs text-zinc-500 font-medium hidden sm:inline">
            (Bấm vào ô ngày để tạo công việc với hạn chót tương ứng)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))
            }
            className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
            title="Tháng trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCalendarDate(new Date(2026, 9, 1))}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-100"
          >
            Tháng này
          </button>
          <button
            onClick={() =>
              setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))
            }
            className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
            title="Tháng sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Header */}
      <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-zinc-500 uppercase">
        <div>Thứ 2</div>
        <div>Thứ 3</div>
        <div>Thứ 4</div>
        <div>Thứ 5</div>
        <div>Thứ 6</div>
        <div>Thứ 7</div>
        <div>Chủ Nhật</div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((day, idx) => {
          const dayTasks = tasks.filter((t) => t.dueDate === day.dateStr);

          return (
            <div
              key={idx}
              onClick={() => openCreateModal('todo', day.dateStr)}
              className={`min-h-[110px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                day.isToday
                  ? 'border-blue-500 bg-blue-50/20 shadow-xs'
                  : day.isCurrentMonth
                  ? 'border-zinc-200 bg-white hover:border-blue-300 hover:bg-zinc-50/50'
                  : 'border-zinc-100 bg-zinc-50/50 opacity-40'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-bold ${
                    day.isToday
                      ? 'w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center'
                      : day.isCurrentMonth
                      ? 'text-zinc-800'
                      : 'text-zinc-400'
                  }`}
                >
                  {day.dayNum}
                </span>
                <span className="text-[10px] text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  + Thêm
                </span>
              </div>

              <div className="space-y-1 flex-1 overflow-y-auto max-h-[80px]">
                {dayTasks.map((t) => {
                  const isDone = t.column === 'done';
                  const isBlocked = t.column === 'blocked';
                  return (
                    <div
                      key={t.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(t);
                      }}
                      className={`p-1.5 rounded-lg text-[10px] font-medium border flex items-center justify-between gap-1 transition-transform hover:scale-[1.02] ${
                        isDone
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 line-through opacity-75'
                          : isBlocked
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : t.priority === 'urgent'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                      title={`${t.title} - ${t.assigneeName}`}
                    >
                      <span className="truncate flex-1 font-semibold">{t.title}</span>
                      <div
                        className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-white text-[8px] shrink-0"
                        style={{ backgroundColor: t.assigneeColor || '#3b82f6' }}
                      >
                        {(t.assigneeName || 'U').slice(0, 1)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
