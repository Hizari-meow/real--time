'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  TrendingUp,
  Download,
  MessageSquare,
  Plus,
  Search,
  LayoutGrid,
  ListFilter,
  Calendar,
  Clock,
  BarChart3,
  AlertTriangle,
  Zap,
  FileSpreadsheet,
} from 'lucide-react';
import {
  Project,
  Sprint,
  TaskColumn,
  COLUMNS,
} from './types';

interface TaskHeaderToolbarProps {
  onlineUsers: { id: string; name: string; color: string }[];
  projects: Project[];
  sprints: Sprint[];
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  selectedSprintId: string;
  setSelectedSprintId: (id: string) => void;
  setIsProjectModalOpen: (b: boolean) => void;
  setIsSprintModalOpen: (b: boolean) => void;
  currentSprintForBurndown: Sprint | null;
  setSelectedBurndownSprint: (s: Sprint | null) => void;
  handleExportCSV: () => void;
  openCreateModal: (column: TaskColumn) => void;
  stats: {
    total: number;
    inProgress: number;
    blocked: number;
    done: number;
    percent: number;
    overdueCount: number;
  };
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  filterColumn: string;
  setFilterColumn: (s: string) => void;
  filterPriority: string;
  setFilterPriority: (s: string) => void;
  filterAssignee: string;
  setFilterAssignee: (s: string) => void;
  availableUsers: { id: string; name: string; color: string; department?: string }[];
  viewMode: 'board' | 'list' | 'calendar' | 'gantt' | 'metrics';
  setViewMode: (m: 'board' | 'list' | 'calendar' | 'gantt' | 'metrics') => void;
  handleTriggerScanOverdue: (showToast?: boolean) => void;
  autoNotifyDone: boolean;
  setAutoNotifyDone: (b: boolean | ((prev: boolean) => boolean)) => void;
  automationToast: { id: string; title: string } | null;
  exportToast: boolean;
}

export function TaskHeaderToolbar({
  onlineUsers,
  projects,
  sprints,
  selectedProjectId,
  setSelectedProjectId,
  selectedSprintId,
  setSelectedSprintId,
  setIsProjectModalOpen,
  setIsSprintModalOpen,
  currentSprintForBurndown,
  setSelectedBurndownSprint,
  handleExportCSV,
  openCreateModal,
  stats,
  searchQuery,
  setSearchQuery,
  filterColumn,
  setFilterColumn,
  filterPriority,
  setFilterPriority,
  filterAssignee,
  setFilterAssignee,
  availableUsers,
  viewMode,
  setViewMode,
  handleTriggerScanOverdue,
  autoNotifyDone,
  setAutoNotifyDone,
  automationToast,
  exportToast,
}: TaskHeaderToolbarProps) {
  return (
    <>
      {/* Top Header */}
      <header className="h-16 px-6 bg-white border-b border-zinc-200/80 flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition-all shadow-xs active:scale-95 border border-zinc-200"
            title="Thoát và quay lại Không gian làm việc"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-700" />
            <span className="hidden sm:inline">Thoát / Về Trang Chủ</span>
          </Link>
          <div>
            <h1 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <span>Quản Lý Công Việc & Dự Án (Project Management)</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                CRDT Yjs Live
              </span>
            </h1>
            <p className="text-[11px] text-zinc-500">
              Kanban • Danh sách • Lịch hạn chót • Gantt Timeline • Báo cáo & Cân bằng tải
            </p>
          </div>
        </div>

        {/* Presence & Actions */}
        <div className="flex items-center gap-3">
          {/* Active Collaborators */}
          <div className="flex items-center -space-x-1.5 mr-2">
            {onlineUsers.slice(0, 4).map((u, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-white shadow-xs"
                style={{ backgroundColor: u.color }}
                title={`${u.name} (Đang trực tuyến)`}
              >
                {u.name.slice(0, 1).toUpperCase()}
              </div>
            ))}
            {onlineUsers.length > 4 && (
              <div className="w-7 h-7 rounded-full bg-zinc-200 text-zinc-600 flex items-center justify-center text-[10px] font-bold border-2 border-white">
                +{onlineUsers.length - 4}
              </div>
            )}
          </div>

          {/* Project & Sprint Controls */}
          <div className="hidden xl:flex items-center gap-2 mr-2">
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setSelectedSprintId('');
              }}
              className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 text-xs font-semibold rounded-xl focus:outline-none cursor-pointer"
            >
              <option value="">📁 Tất cả dự án</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.key}] {p.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-300 text-xs font-semibold rounded-xl"
              title="Quản lý dự án"
            >
              + Dự án
            </button>

            <select
              value={selectedSprintId}
              onChange={(e) => setSelectedSprintId(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 text-xs font-semibold rounded-xl focus:outline-none cursor-pointer"
            >
              <option value="">🏃 Tất cả Sprint</option>
              {sprints
                .filter((s) => !selectedProjectId || s.projectId === selectedProjectId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.status === 'active' ? 'Đang chạy' : s.status === 'completed' ? 'Đã xong' : 'Kế hoạch'})
                  </option>
                ))}
            </select>
            <button
              onClick={() => setIsSprintModalOpen(true)}
              className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-300 text-xs font-semibold rounded-xl"
              title="Lập kế hoạch Sprint"
            >
              + Sprint
            </button>

            {currentSprintForBurndown && (
              <button
                onClick={() => setSelectedBurndownSprint(currentSprintForBurndown)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-xl shadow-xs"
                title="Xem biểu đồ Burndown Sprint"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Burndown</span>
              </button>
            )}
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-300/80 text-xs font-semibold rounded-xl transition-colors shadow-xs active:scale-95"
            title="Xuất danh sách công việc sang file CSV / Excel"
          >
            <Download className="w-3.5 h-3.5 text-zinc-600" />
            <span className="hidden md:inline">Xuất CSV</span>
          </button>

          <Link
            href="/chat"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold rounded-xl transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mở Chat Zalo</span>
          </Link>

          <button
            onClick={() => openCreateModal('todo')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo công việc mới</span>
          </button>
        </div>
      </header>

      {/* Overview Metric Banner */}
      <section className="px-6 py-3.5 bg-white border-b border-zinc-200/80">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Progress stats */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div>
              <p className="text-[11px] text-zinc-500 font-medium">Tổng việc</p>
              <p className="text-xl font-bold text-zinc-900">{stats.total}</p>
            </div>
            <div className="w-px h-7 bg-zinc-200 hidden sm:block" />
            <div>
              <p className="text-[11px] text-zinc-500 font-medium">Đang xử lý</p>
              <p className="text-xl font-bold text-blue-600">{stats.inProgress}</p>
            </div>
            <div className="w-px h-7 bg-zinc-200 hidden sm:block" />
            <div>
              <p className="text-[11px] text-zinc-500 font-medium">Bị chặn (Blocked)</p>
              <p className={`text-xl font-bold ${stats.blocked > 0 ? 'text-rose-600' : 'text-zinc-400'}`}>
                {stats.blocked}
              </p>
            </div>
            <div className="w-px h-7 bg-zinc-200 hidden sm:block" />
            <div>
              <p className="text-[11px] text-zinc-500 font-medium">Đã xong</p>
              <p className="text-xl font-bold text-emerald-600">{stats.done}</p>
            </div>
            <div className="w-px h-7 bg-zinc-200 hidden sm:block" />
            <div>
              <p className="text-[11px] text-zinc-500 font-medium">Quá hạn</p>
              <p className={`text-xl font-bold ${stats.overdueCount > 0 ? 'text-rose-600' : 'text-zinc-400'}`}>
                {stats.overdueCount}
              </p>
            </div>
            <div className="w-px h-7 bg-zinc-200 hidden sm:block" />
            <div className="min-w-[130px]">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-zinc-700 truncate max-w-[110px]" title={currentSprintForBurndown ? `Sprint: ${currentSprintForBurndown.name}` : 'Tiến độ'}>
                  {currentSprintForBurndown ? currentSprintForBurndown.name : 'Tiến độ Sprint'}
                </span>
                <span className="font-bold text-blue-600">
                  {currentSprintForBurndown?.progress !== undefined ? currentSprintForBurndown.progress : stats.percent}%
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/60">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{
                    width: `${currentSprintForBurndown?.progress !== undefined ? currentSprintForBurndown.progress : stats.percent}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Tìm việc, nhãn, mô tả..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 focus:bg-white w-44 sm:w-52 transition-all"
              />
            </div>

            <select
              value={filterColumn}
              onChange={(e) => setFilterColumn(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-700 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Mọi giai đoạn</option>
              {COLUMNS.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.label}
                </option>
              ))}
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-700 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Mọi mức ưu tiên</option>
              <option value="urgent">Khẩn cấp</option>
              <option value="high">Ưu tiên cao</option>
              <option value="normal">Bình thường</option>
              <option value="low">Thấp</option>
            </select>

            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-700 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Tất cả nhân sự</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} {(u as any).department ? `(${(u as any).department})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* View Switcher & Automation Bar */}
      <section className="px-6 py-2.5 bg-zinc-50/80 border-b border-zinc-200/80 flex flex-wrap items-center justify-between gap-3">
        {/* 5 View Switcher Tabs */}
        <div className="flex items-center bg-zinc-200/70 p-1 rounded-xl gap-0.5 overflow-x-auto">
          <button
            onClick={() => setViewMode('board')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              viewMode === 'board'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Bảng Kanban</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              viewMode === 'list'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Danh sách việc (List)</span>
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              viewMode === 'calendar'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Lịch hạn chót (Calendar)</span>
          </button>
          <button
            onClick={() => setViewMode('gantt')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              viewMode === 'gantt'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Biểu đồ Gantt (Timeline)</span>
          </button>
          <button
            onClick={() => setViewMode('metrics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              viewMode === 'metrics'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Báo cáo & Dashboard</span>
          </button>
        </div>

        {/* Automation Status Badge & Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleTriggerScanOverdue(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors shadow-xs active:scale-95"
            title="Kích hoạt động cơ tự động hóa M7 quét toàn bộ công việc quá hạn chót và phát cảnh báo SLA tức thì"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>Quét &amp; Báo Động Quá Hạn SLA ({stats.overdueCount})</span>
          </button>

          <button
            onClick={() => setAutoNotifyDone((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              autoNotifyDone
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-zinc-100 border-zinc-300 text-zinc-500'
            }`}
            title="Quy tắc tự động hóa: Khi task chuyển sang Hoàn thành, tự động thông báo Chat nhóm và ghi Audit Log"
          >
            <Zap className={`w-3.5 h-3.5 ${autoNotifyDone ? 'text-emerald-600' : 'text-zinc-400'}`} />
            <span>
              Tự động hóa hoàn tất: <strong>{autoNotifyDone ? 'ĐANG BẬT' : 'ĐÃ TẮT'}</strong>
            </span>
          </button>
        </div>
      </section>

      {/* Floating Automation Triggered Toast */}
      {automationToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-300">Tự động hóa kích hoạt thành công!</p>
            <p className="text-[11px] text-zinc-300">
              Đã ghi nhận Audit Log và bắn thông báo hoàn tất "{automationToast.title}" đến kênh Chat nhóm.
            </p>
          </div>
        </div>
      )}

      {/* Floating Export CSV Toast */}
      {exportToast && (
        <div className="fixed bottom-6 left-6 z-50 bg-zinc-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-blue-500/50 flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-blue-300">Đã xuất báo cáo CSV thành công!</p>
            <p className="text-[11px] text-zinc-300">File đã được tải xuống máy tính của bạn.</p>
          </div>
        </div>
      )}
    </>
  );
}
