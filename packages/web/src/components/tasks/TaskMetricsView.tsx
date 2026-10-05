'use client';

import React from 'react';
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { KanbanTask, COLUMNS } from './types';

interface TaskMetricsViewProps {
  stats: {
    total: number;
    inProgress: number;
    blocked: number;
    done: number;
    percent: number;
    totalLogged: number;
    totalEstimated: number;
    overdueCount: number;
  };
  tasks: KanbanTask[];
  availableUsers: { id: string; name: string; color: string; department?: string }[];
  openEditModal: (task: KanbanTask) => void;
}

export function TaskMetricsView({
  stats,
  tasks,
  availableUsers,
  openEditModal,
}: TaskMetricsViewProps) {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-xs">
          <p className="text-xs font-semibold text-zinc-500 uppercase">Tổng số công việc</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-extrabold text-zinc-900">{stats.total}</span>
            <span className="text-xs font-medium text-zinc-400">100% Sprint</span>
          </div>
        </div>

        <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-xs">
          <p className="text-xs font-semibold text-blue-600 uppercase">Đang thực hiện</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-extrabold text-blue-600">{stats.inProgress}</span>
            <span className="text-xs font-medium text-blue-600">
              {stats.total > 0 ? Math.round((stats.inProgress / stats.total) * 100) : 0}%
            </span>
          </div>
        </div>

        <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-xs">
          <p className="text-xs font-semibold text-rose-600 uppercase">Bị chặn (Blocked)</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-extrabold text-rose-600">{stats.blocked}</span>
            <span className="text-xs font-medium text-rose-600">Cần xử lý ngay</span>
          </div>
        </div>

        <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-xs">
          <p className="text-xs font-semibold text-emerald-600 uppercase">Đã hoàn thành</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-extrabold text-emerald-600">{stats.done}</span>
            <span className="text-xs font-medium text-emerald-600">{stats.percent}% đạt</span>
          </div>
        </div>
      </div>

      {/* Time Tracking & Overdue Alert Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase">Tổng thời gian ghi nhận</p>
            <p className="text-2xl font-bold text-zinc-900 mt-1">
              {stats.totalLogged}h <span className="text-sm font-normal text-zinc-500">/ {stats.totalEstimated}h dự kiến</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase">Trạng thái hạn chót</p>
            <p className={`text-2xl font-bold mt-1 ${stats.overdueCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {stats.overdueCount > 0 ? `${stats.overdueCount} việc quá hạn!` : 'Tất cả đúng tiến độ'}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stats.overdueCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {stats.overdueCount > 0 ? <AlertCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
          </div>
        </div>
      </div>

      {/* Charts & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Status */}
        <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-xs">
          <h3 className="text-sm font-bold text-zinc-900 mb-4 flex items-center justify-between">
            <span>Phân bổ theo giai đoạn</span>
            <span className="text-xs font-normal text-zinc-500">5 Cột Kanban</span>
          </h3>
          <div className="space-y-3">
            {COLUMNS.map((col) => {
              const count = tasks.filter((t) => t.column === col.id).length;
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={col.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-zinc-700">{col.label}</span>
                    <span className="font-mono text-zinc-500">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        col.id === 'done'
                          ? 'bg-emerald-500'
                          : col.id === 'review'
                          ? 'bg-amber-500'
                          : col.id === 'blocked'
                          ? 'bg-rose-500'
                          : col.id === 'in_progress'
                          ? 'bg-blue-500'
                          : 'bg-zinc-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Priority */}
        <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-xs">
          <h3 className="text-sm font-bold text-zinc-900 mb-4 flex items-center justify-between">
            <span>Phân bổ theo mức độ ưu tiên</span>
            <span className="text-xs font-normal text-zinc-500">SLA & Khẩn cấp</span>
          </h3>
          <div className="space-y-3">
            {[
              { key: 'urgent', label: 'Khẩn cấp (Urgent)', color: 'bg-rose-500' },
              { key: 'high', label: 'Ưu tiên cao (High)', color: 'bg-amber-500' },
              { key: 'normal', label: 'Bình thường (Normal)', color: 'bg-blue-500' },
              { key: 'low', label: 'Thấp (Low)', color: 'bg-zinc-400' },
            ].map((item) => {
              const count = tasks.filter((t) => t.priority === item.key).length;
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={item.key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-zinc-700">{item.label}</span>
                    <span className="font-mono text-zinc-500">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Team Workload Balance */}
      <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-xs">
        <h3 className="text-sm font-bold text-zinc-900 mb-4 flex items-center justify-between">
          <span>Khối lượng công việc theo nhân sự (Team Workload Balance)</span>
          <span className="text-xs font-normal text-zinc-500">Phát hiện quá tải & phân bổ lại</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {availableUsers.map((user) => {
            const userTasks = tasks.filter((t) => t.assigneeId === user.id);
            const activeTasks = userTasks.filter(
              (t) => t.column === 'in_progress' || t.column === 'review' || t.column === 'blocked'
            );
            const doneCount = userTasks.filter((t) => t.column === 'done').length;
            const userLogged = userTasks.reduce((acc, t) => acc + (t.loggedHours || 0), 0);
            const userEst = userTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);

            let statusText = '🟢 Sẵn sàng nhận việc';
            let statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
            if (activeTasks.length >= 3) {
              statusText = '⚠️ Quá tải';
              statusColor = 'text-rose-700 bg-rose-50 border-rose-200';
            } else if (activeTasks.length >= 1) {
              statusText = '✅ Cân đối';
              statusColor = 'text-blue-700 bg-blue-50 border-blue-200';
            }

            return (
              <div key={user.id} className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-center flex flex-col justify-between">
                <div>
                  <div
                    className="w-10 h-10 rounded-full mx-auto flex items-center justify-center text-white text-xs font-bold mb-2 shadow-xs"
                    style={{ backgroundColor: user.color }}
                  >
                    {user.name.slice(0, 1)}
                  </div>
                  <p className="text-xs font-bold text-zinc-900 truncate">{user.name}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    {activeTasks.length} đang làm • {doneCount} xong
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    {userLogged}h / {userEst}h
                  </p>
                </div>
                <div className={`mt-3 py-1 px-2 rounded-lg text-[10px] font-bold border ${statusColor}`}>
                  {statusText}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Blocked Tasks Deep Dive */}
      {stats.blocked > 0 && (
        <div className="p-5 bg-rose-50/50 border border-rose-200 rounded-2xl">
          <h4 className="text-xs font-bold text-rose-900 mb-3 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Danh sách công việc đang bị chặn (Cần tháo gỡ)</span>
          </h4>
          <div className="space-y-2">
            {tasks
              .filter((t) => t.column === 'blocked')
              .map((t) => (
                <div
                  key={t.id}
                  className="p-3 bg-white border border-rose-200 rounded-xl flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-xs font-bold text-zinc-900">{t.title}</p>
                    <p className="text-[11px] text-rose-700 mt-0.5 font-medium">
                      ⚠️ Lý do: {t.blockedReason || 'Chưa cung cấp lý do'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500">Phụ trách: {t.assigneeName}</span>
                    <button
                      onClick={() => openEditModal(t)}
                      className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 text-[11px] font-semibold rounded-lg transition-colors"
                    >
                      Tháo gỡ / Cập nhật
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
