'use client';

import React from 'react';
import Link from 'next/link';
import {
  LayoutGrid,
  List as ListIcon,
  Search,
  MessageSquare,
  Bell,
  Plus,
} from 'lucide-react';
import { WorkspaceItemType } from './seed-workspace-items';

export interface HomeHeaderProps {
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
  categoryFilter: 'all' | WorkspaceItemType;
  filteredCount: number;
  viewMode: 'grid' | 'table';
  setViewMode: (mode: 'grid' | 'table') => void;
  unreadNotificationsCount: number;
  onOpenCommandPalette: () => void;
  onOpenNotifications: () => void;
  onOpenCreateModal: () => void;
}

export function HomeHeader({
  activeTab,
  categoryFilter,
  filteredCount,
  viewMode,
  setViewMode,
  unreadNotificationsCount,
  onOpenCommandPalette,
  onOpenNotifications,
  onOpenCreateModal,
}: HomeHeaderProps) {
  const getHeaderTitle = () => {
    if (activeTab === 'all') {
      if (categoryFilter === 'sheet') return 'Bảng tính Excel cộng tác';
      if (categoryFilter === 'design') return 'Bản vẽ Thiết kế UI & Slide (Figma Canvas)';
      if (categoryFilter === 'whiteboard') return 'Bảng trắng Động não (Whiteboard)';
      if (categoryFilter === 'doc') return 'Tài liệu văn bản';
      return 'Tất cả tài liệu & dữ liệu';
    }
    if (activeTab === 'favorites') return 'Tài liệu yêu thích';
    if (activeTab === 'recent') return 'Chỉnh sửa gần đây';
    if (activeTab === 'tasks') return 'Quản lý Công việc & Dự án (Kanban M3)';
    if (activeTab === 'admin') return 'Quản trị Tổ chức & Bảo mật RBAC (M8)';
    if (activeTab === 'whiteboard') return 'Bảng trắng Động não & Sơ đồ (M5)';
    if (activeTab === 'drive') return 'Kho Lưu Trữ Đám Mây (S3 Drive)';
    if (activeTab === 'wiki') return 'Cơ sở tri thức (Wiki & SOPs)';
    if (activeTab === 'automations') return 'Tích hợp & Tự động hóa';
    if (activeTab === 'telemetry') return 'Giám sát Cụm máy chủ (Telemetry)';
    return 'Giao tiếp & Trao đổi (Team Communication)';
  };

  const getHeaderBadge = () => {
    if (activeTab === 'all' || activeTab === 'favorites' || activeTab === 'recent') {
      return `${filteredCount} mục`;
    }
    if (activeTab === 'tasks') return 'Sprint Active';
    if (activeTab === 'admin') return 'RBAC Active';
    if (activeTab === 'whiteboard') return 'Canvas Live';
    if (activeTab === 'drive') return 'MinIO S3';
    if (activeTab === 'wiki') return '4 SOPs';
    if (activeTab === 'automations') return '12 Apps';
    if (activeTab === 'telemetry') return '2 nodes';
    return '4 Phân hệ';
  };

  return (
    <header className="h-16 px-6 md:px-8 border-b border-zinc-200/80 bg-white flex items-center justify-between shrink-0 z-10">
      <div className="flex items-center gap-2.5">
        <span className="text-xs text-zinc-400 font-medium">Không gian làm việc</span>
        <span className="text-zinc-300">/</span>
        <h1 className="text-sm font-bold text-zinc-900">{getHeaderTitle()}</h1>
        <span className="text-[11px] text-zinc-400 font-mono bg-zinc-100 px-2 py-0.5 rounded-full ml-1">
          {getHeaderBadge()}
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5">
        {(activeTab === 'all' || activeTab === 'favorites' || activeTab === 'recent') && (
          <div className="flex items-center border border-zinc-200 rounded-xl p-0.5 bg-zinc-50">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-zinc-900 shadow-2xs font-bold'
                  : 'text-zinc-400 hover:text-zinc-700'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-zinc-900 shadow-2xs font-bold'
                  : 'text-zinc-400 hover:text-zinc-700'
              }`}
              title="List View"
            >
              <ListIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 rounded-xl text-xs font-medium transition-colors border border-zinc-200/70 cursor-pointer"
          title="Mở thanh tìm kiếm & lệnh nhanh (⌘K / Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-zinc-400" />
          <span>Tìm kiếm...</span>
          <kbd className="px-1 py-0.2 bg-white border border-zinc-200 rounded text-[9px] font-mono text-zinc-400">
            ⌘K
          </kbd>
        </button>

        {/* Mở Kênh Giao tiếp */}
        <Link
          href="/chat"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200/80 hover:bg-zinc-50 text-zinc-700 rounded-xl text-xs font-semibold transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5 text-[#0068ff]" />
          <span>Kênh giao tiếp</span>
        </Link>

        {/* Notification Center Trigger */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-xl border border-zinc-200/80 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
          title="Trung tâm thông báo & Hộp thư (Notifications)"
        >
          <Bell className="w-3.5 h-3.5" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center ring-2 ring-white shadow-2xs">
              {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
            </span>
          )}
        </button>

        {/* + Tạo mới Button */}
        <button
          onClick={onOpenCreateModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tạo mới</span>
        </button>
      </div>
    </header>
  );
}
