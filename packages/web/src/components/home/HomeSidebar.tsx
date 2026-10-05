'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  FileText,
  MessageSquare,
  CheckSquare,
  HardDrive,
  PenTool,
  BookOpen,
  Zap,
  Shield,
  Star,
  Clock,
  ChevronRight,
  Users,
  Headphones,
  LogOut,
  Check,
} from 'lucide-react';

export interface TodayTaskItem {
  id: string;
  text: string;
  done: boolean;
}

export interface TeammateItem {
  id: string;
  name: string;
  role: string;
  color: string;
  isOnline: boolean;
}

export interface HomeSidebarProps {
  workspaces: Array<{ orgId: string; orgName: string; slug?: string; role?: string }>;
  workspace: { orgId: string; orgName: string; slug?: string; role?: string } | null;
  switchWorkspace: (orgId: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeTab:
    | 'all'
    | 'recent'
    | 'favorites'
    | 'drive'
    | 'wiki'
    | 'tasks'
    | 'admin'
    | 'telemetry'
    | 'automations'
    | 'collab'
    | 'whiteboard';
  setActiveTab: (
    tab:
      | 'all'
      | 'recent'
      | 'favorites'
      | 'drive'
      | 'wiki'
      | 'tasks'
      | 'admin'
      | 'telemetry'
      | 'automations'
      | 'collab'
      | 'whiteboard'
  ) => void;
  setCategoryFilter: (cat: 'all' | 'doc' | 'sheet' | 'design' | 'whiteboard') => void;
  workspaceItemsCount: number;
  favoritesCount: number;
  todayTasks: TodayTaskItem[];
  toggleTodayTask: (id: string) => void;
  onlineTeammates: TeammateItem[];
  currentUser: { id: string; name: string; color: string };
  onOpenProfile: () => void;
  onLogout: () => void;
}

export function HomeSidebar({
  workspaces,
  workspace,
  switchWorkspace,
  searchQuery,
  setSearchQuery,
  activeTab,
  setActiveTab,
  setCategoryFilter,
  workspaceItemsCount,
  favoritesCount,
  todayTasks,
  toggleTodayTask,
  onlineTeammates,
  currentUser,
  onOpenProfile,
  onLogout,
}: HomeSidebarProps) {
  const router = useRouter();

  return (
    <aside className="w-64 bg-white border-r border-zinc-200/80 hidden md:flex flex-col h-full shrink-0 shadow-xs">
      {/* Workspace Switcher Header */}
      <div className="h-16 px-4 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
            {(workspace?.orgName || 'CW').slice(0, 2).toUpperCase()}
          </div>
          <div className="truncate">
            {workspaces.length > 1 ? (
              <select
                value={workspace?.orgId}
                onChange={(e) => switchWorkspace(e.target.value)}
                className="text-xs font-bold text-zinc-900 bg-transparent border-none p-0 focus:outline-none cursor-pointer truncate max-w-[140px] block"
              >
                {workspaces.map((w) => (
                  <option key={w.orgId} value={w.orgId}>
                    {w.orgName}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs font-bold text-zinc-900 truncate">{workspace?.orgName || 'Workspace'}</p>
            )}
            <p className="text-[10px] text-zinc-400 font-mono truncate">{workspace?.slug || 'collab'}</p>
          </div>
        </div>
      </div>

      {/* Scrollable Navigation & Widgets Body */}
      <div className="flex-1 overflow-y-auto">
        {/* Quick Search Input */}
        <div className="p-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm tài liệu, tệp, task... (⌘K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-100/70 border border-zinc-200/50 rounded-xl text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-400 transition-all"
            />
          </div>
        </div>

        {/* Core Modules Navigation (Section 18.1) */}
        <nav className="px-3 space-y-4">
          <div>
            <span className="px-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Các Phân Hệ Cốt Lõi
            </span>
            <div className="space-y-0.5">
              {/* 1. M1: Trang chủ & Tài liệu */}
              <button
                onClick={() => {
                  setActiveTab('all');
                  setCategoryFilter('all');
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-zinc-100 text-zinc-900 font-semibold shadow-2xs'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Trang chủ &amp; Tài liệu</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">{workspaceItemsCount}</span>
              </button>

              {/* 2. M2: Giao tiếp & Trao đổi */}
              <button
                onClick={() => setActiveTab('collab')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'collab'
                    ? 'bg-blue-50 text-blue-900 font-semibold shadow-2xs border border-blue-200/60'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#0068ff]" />
                  <span>Kênh trao đổi &amp; Họp</span>
                </div>
                <span className="px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold">
                  Chat &amp; Meet
                </span>
              </button>

              {/* 3. M3: Quản lý công việc */}
              <button
                onClick={() => setActiveTab('tasks')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'tasks'
                    ? 'bg-indigo-50 text-indigo-900 font-semibold shadow-2xs border border-indigo-200/60'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                  <span>Quản lý công việc (Kanban)</span>
                </div>
                <span className="px-1.5 py-0.2 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                  M3
                </span>
              </button>

              {/* 4. M4: Quản lý và chia sẻ tệp */}
              <button
                onClick={() => setActiveTab('drive')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'drive'
                    ? 'bg-amber-50 text-amber-900 font-semibold shadow-2xs border border-amber-200/60'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-amber-600" />
                  <span>Kho tệp &amp; Drive (S3)</span>
                </div>
                <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-700 text-[10px] font-mono">
                  M4
                </span>
              </button>

              {/* 5. M5: Bảng trắng động não */}
              <button
                onClick={() => setActiveTab('whiteboard')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'whiteboard'
                    ? 'bg-amber-50 text-amber-900 font-semibold shadow-2xs border border-amber-200/60'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-amber-600" />
                  <span>Bảng trắng động não</span>
                </div>
                <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                  M5
                </span>
              </button>

              {/* 6. M6: Wiki & Tri thức */}
              <button
                onClick={() => setActiveTab('wiki')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'wiki'
                    ? 'bg-emerald-50 text-emerald-900 font-semibold shadow-2xs border border-emerald-200/60'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <span>Wiki &amp; Tri thức (SOP)</span>
                </div>
                <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                  M6
                </span>
              </button>

              {/* 7. M7: Tích hợp & Tự động hóa */}
              <button
                onClick={() => setActiveTab('automations')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'automations'
                    ? 'bg-purple-50 text-purple-900 font-semibold shadow-2xs border border-purple-200/60'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-600" />
                  <span>Tích hợp &amp; Tự động hóa</span>
                </div>
                <span className="px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-700 text-[10px] font-mono">
                  M7
                </span>
              </button>

              {/* 8. M8: Quản trị & Bảo mật */}
              <button
                onClick={() => setActiveTab('admin')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-rose-50 text-rose-900 font-semibold shadow-2xs border border-rose-200/60'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-rose-600" />
                  <span>Quản trị &amp; Bảo mật (RBAC)</span>
                </div>
                <span className="px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold">
                  M8
                </span>
              </button>
            </div>
          </div>

          {/* Quick Filters */}
          <div>
            <span className="px-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Bộ Lọc Nhanh
            </span>
            <div className="space-y-0.5">
              <button
                onClick={() => {
                  setActiveTab('favorites');
                  setCategoryFilter('all');
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'favorites'
                    ? 'bg-zinc-100 text-zinc-900 font-semibold shadow-2xs'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span>Yêu thích</span>
                </div>
                {favoritesCount > 0 && (
                  <span className="text-[10px] font-mono text-zinc-400">{favoritesCount}</span>
                )}
              </button>

              <button
                onClick={() => {
                  setActiveTab('recent');
                  setCategoryFilter('all');
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'recent'
                    ? 'bg-zinc-100 text-zinc-900 font-semibold shadow-2xs'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-zinc-500" />
                  <span>Chỉnh sửa gần đây</span>
                </div>
              </button>
            </div>
          </div>
        </nav>

        {/* SECTION 1: VIỆC CẦN LÀM HÔM NAY */}
        <div className="px-3 pt-5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-700">
            <span className="flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
              <span>Việc cần làm hôm nay</span>
            </span>
            <span className="text-[10px] font-mono text-blue-600 font-bold bg-blue-50 px-1.5 py-0.2 rounded">
              {todayTasks.filter((t) => t.done).length}/{todayTasks.length}
            </span>
          </div>

          <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{
                width: `${todayTasks.length > 0 ? (todayTasks.filter((t) => t.done).length / todayTasks.length) * 100 : 0}%`,
              }}
            />
          </div>

          <div className="space-y-1 pt-1">
            {todayTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => toggleTodayTask(t.id)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-zinc-100/80 cursor-pointer transition-colors group text-[11px]"
              >
                <button
                  type="button"
                  className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors shrink-0 ${
                    t.done
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-zinc-300 group-hover:border-zinc-400 bg-white'
                  }`}
                >
                  {t.done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </button>
                <span
                  className={`truncate transition-all ${
                    t.done ? 'line-through text-zinc-400' : 'text-zinc-700 group-hover:text-zinc-900 font-medium'
                  }`}
                >
                  {t.text}
                </span>
              </div>
            ))}
          </div>

          <Link
            href="/tasks"
            className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-700 font-semibold pt-0.5 hover:underline"
          >
            <span>Xem chi tiết trên Kanban</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* SECTION 2: ĐỒNG NGHIỆP TRỰC TUYẾN */}
        <div className="px-3 pt-4 pb-2 space-y-2 border-t border-zinc-100/80 mt-3">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-700">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>Đồng nghiệp trực tuyến</span>
            </span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {onlineTeammates.length} online
            </span>
          </div>

          <div className="space-y-1">
            {onlineTeammates.map((u) => (
              <div
                key={u.id}
                onClick={() => router.push('/chat')}
                className="flex items-center justify-between p-1.5 rounded-xl hover:bg-zinc-100/80 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-2xs"
                      style={{ backgroundColor: u.color }}
                    >
                      {u.name.slice(0, 1)}
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white absolute -bottom-0.5 -right-0.5" />
                  </div>
                  <div className="truncate">
                    <p className="text-[11px] font-semibold text-zinc-800 truncate group-hover:text-blue-600">
                      {u.name}
                    </p>
                    <p className="text-[9px] text-zinc-400 truncate">{u.role}</p>
                  </div>
                </div>
                <MessageSquare className="w-3 h-3 text-zinc-300 group-hover:text-blue-500 transition-colors shrink-0" />
              </div>
            ))}
          </div>

          <button
            onClick={() => router.push('/chat')}
            className="w-full mt-1.5 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700 hover:text-zinc-900 rounded-xl text-[11px] font-semibold transition-all border border-zinc-200/60 shadow-2xs cursor-pointer"
          >
            <Headphones className="w-3.5 h-3.5 text-zinc-600" />
            <span>Họp nhanh (Huddle)</span>
          </button>
        </div>

        <div className="px-4 py-2 text-[10px] text-zinc-400 flex items-center gap-1.5 border-t border-zinc-100/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span>Đã kết nối • Đồng bộ tức thì</span>
        </div>
      </div>

      {/* Current User Profile Footer */}
      <div className="p-3 border-t border-zinc-100 shrink-0 bg-white">
        <div className="flex items-center justify-between gap-1">
          <button
            onClick={onOpenProfile}
            className="flex-1 flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-zinc-100/70 transition-colors text-left truncate cursor-pointer"
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
              style={{ backgroundColor: currentUser.color }}
            >
              {(currentUser.name || 'U').slice(0, 1).toUpperCase()}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-zinc-900 truncate">{currentUser.name || 'User'}</p>
              <p className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {workspace?.role ? workspace.role.toUpperCase() : 'MEMBER'}
              </p>
            </div>
          </button>
          <button
            onClick={onLogout}
            title="Đăng xuất"
            className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
