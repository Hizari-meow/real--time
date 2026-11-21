import React from 'react';
import {
  Folder,
  HardDrive,
  Users,
  Star,
  Clock,
  Trash2,
  Plus,
  FolderPlus,
  Database,
} from 'lucide-react';
import { CloudFolder, DriveTab } from './types';

interface DriveSidebarProps {
  driveTab: DriveTab;
  setDriveTab: (tab: DriveTab) => void;
  currentFolderId: string | null;
  setCurrentFolderId: (id: string | null) => void;
  folders: CloudFolder[];
  onOpenNewFolder: () => void;
  onDeleteFolder: (id: string) => void;
  totalStorageUsed: number;
}

export function DriveSidebar({
  driveTab,
  setDriveTab,
  currentFolderId,
  setCurrentFolderId,
  folders,
  onOpenNewFolder,
  onDeleteFolder,
  totalStorageUsed,
}: DriveSidebarProps) {
  const maxStorage = 10 * 1024 * 1024 * 1024; // 10 GB
  const usedPercent = Math.min(100, Math.round((totalStorageUsed / maxStorage) * 100));

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const navItems = [
    { id: 'all' as DriveTab, label: 'Tất cả tệp tin', icon: HardDrive },
    { id: 'my_drive' as DriveTab, label: 'Drive của tôi', icon: Folder },
    { id: 'shared' as DriveTab, label: 'Được chia sẻ với tôi', icon: Users },
    { id: 'starred' as DriveTab, label: 'Đã gắn sao', icon: Star },
    { id: 'trash' as DriveTab, label: 'Thùng rác', icon: Trash2 },
  ];

  return (
    <div className="w-64 border-r border-zinc-200/80 bg-zinc-50/50 p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-6">
        {/* Main Navigation */}
        <div className="space-y-1">
          <p className="px-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Điều hướng Drive
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = driveTab === item.id && currentFolderId === null;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setDriveTab(item.id);
                  setCurrentFolderId(null);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Folder Hierarchy */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Thư mục nhóm
            </p>
            <button
              onClick={onOpenNewFolder}
              className="p-1 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Tạo thư mục mới"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
            {folders.length === 0 ? (
              <p className="px-3 py-2 text-xs text-zinc-400 italic">Chưa có thư mục nào</p>
            ) : (
              folders.map((folder) => {
                const isSelected = currentFolderId === folder.id;
                return (
                  <div
                    key={folder.id}
                    onClick={() => {
                      setCurrentFolderId(folder.id);
                      setDriveTab('all');
                    }}
                    className={`group flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Folder
                        className="w-4 h-4 shrink-0"
                        style={{ color: folder.color || '#3b82f6' }}
                      />
                      <span className="truncate">{folder.name}</span>
                    </div>
                    <span className="text-xs text-zinc-400 shrink-0 group-hover:hidden">
                      {folder.fileCount || 0}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFolder(folder.id);
                      }}
                      className="hidden group-hover:block text-zinc-400 hover:text-red-500 p-0.5"
                      title="Xóa thư mục"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Storage Quota Widget */}
      <div className="p-3.5 bg-white rounded-2xl border border-zinc-200/80 shadow-2xs">
        <div className="flex items-center gap-2 text-zinc-700 text-xs font-semibold mb-2">
          <Database className="w-4 h-4 text-blue-600" />
          <span>Dung lượng MinIO S3</span>
        </div>
        <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden mb-2">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.max(usedPercent, 2)}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[11px] text-zinc-500">
          <span>Đã dùng {formatSize(totalStorageUsed)}</span>
          <span className="font-medium text-zinc-700">10 GB</span>
        </div>
      </div>
    </div>
  );
}
