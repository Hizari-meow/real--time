'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  HardDrive,
  UploadCloud,
  Search,
  FileText,
  Image as ImageIcon,
  Archive,
  Shield,
  Trash2,
  Download,
  Share2,
  Check,
  Filter,
  Plus,
  Clock,
  Layers,
  Sparkles,
  Star,
  Folder,
  FolderPlus,
  RotateCcw,
  Eye,
  ChevronRight,
  MoreVertical,
  CheckSquare,
  Users,
  Lock,
  ArrowUpDown,
  History,
  FileSpreadsheet,
  Code,
  FileBox,
  ExternalLink,
} from 'lucide-react';
import {
  CloudFileItem,
  CloudFolder,
  FileCategory,
  FilePermission,
  INITIAL_FOLDERS,
  INITIAL_FILES,
} from './types';
import { FilePreviewModal } from './FilePreviewModal';
import { FileShareModal } from './FileShareModal';
import { FileVersionHistoryModal } from './FileVersionHistoryModal';
import {
  getStoredDriveFolders,
  saveStoredDriveFolders,
  getStoredDriveFiles,
  saveStoredDriveFiles,
  emitDomainEvent,
} from '../../lib/domain-event-bus';

export function CloudDriveExplorer() {
  const [folders, setFolders] = useState<CloudFolder[]>([]);
  const [files, setFiles] = useState<CloudFileItem[]>([]);
  const [driveTab, setDriveTab] = useState<
    'all' | 'folders' | 'my_drive' | 'shared' | 'starred' | 'recent' | 'trash'
  >('all');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Sync drive data from persistent storage and domain event bus
  useEffect(() => {
    const loadDriveData = () => {
      setFolders(getStoredDriveFolders());
      setFiles(getStoredDriveFiles());
    };
    loadDriveData();
    window.addEventListener('collab_drive_updated', loadDriveData);
    window.addEventListener('storage', loadDriveData);
    return () => {
      window.removeEventListener('collab_drive_updated', loadDriveData);
      window.removeEventListener('storage', loadDriveData);
    };
  }, []);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'name' | 'size'>('updated');

  // Drag and Drop Zone
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modals state
  const [previewFile, setPreviewFile] = useState<CloudFileItem | null>(null);
  const [shareFile, setShareFile] = useState<CloudFileItem | null>(null);
  const [historyFile, setHistoryFile] = useState<CloudFileItem | null>(null);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const currentFolder = folders.find((f) => f.id === currentFolderId);

  const formatSize = (bytes: number) => {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return bytes + ' B';
  };

  // Storage Stats (15.2 GB / 100 GB used)
  const totalStorageCapacity = 100 * 1073741824; // 100 GB
  const activeFiles = files.filter((f) => !f.isDeleted);
  const totalUsedBytes = activeFiles.reduce((acc, f) => acc + f.size, 0) + 14 * 1073741824; // Base demo usage
  const usedPercentage = Math.min(100, Math.round((totalUsedBytes / totalStorageCapacity) * 100));

  // Toggle Star
  const handleToggleStar = (fileId: string) => {
    const updated = files.map((f) => (f.id === fileId ? { ...f, isStarred: !f.isStarred } : f));
    setFiles(updated);
    saveStoredDriveFiles(updated);
  };

  // Move to Trash
  const handleMoveToTrash = (file: CloudFileItem) => {
    const updated = files.map((f) =>
      f.id === file.id
        ? { ...f, isDeleted: true, deletedAt: new Date().toISOString() }
        : f
    );
    setFiles(updated);
    saveStoredDriveFiles(updated);
    showToast(`Đã chuyển tệp "${file.name}" vào Thùng rác (lưu giữ 30 ngày).`);
  };

  // Restore from Trash
  const handleRestoreFromTrash = (file: CloudFileItem) => {
    const updated = files.map((f) =>
      f.id === file.id ? { ...f, isDeleted: false, deletedAt: undefined } : f
    );
    setFiles(updated);
    saveStoredDriveFiles(updated);
    showToast(`Đã khôi phục tệp "${file.name}" về kho lưu trữ!`);
  };

  // Permanent Delete
  const handlePermanentDelete = (fileId: string, fileName: string) => {
    if (confirm(`Xác nhận xóa vĩnh viễn tệp "${fileName}"? Thao tác này không thể hoàn tác.`)) {
      const updated = files.filter((f) => f.id !== fileId);
      setFiles(updated);
      saveStoredDriveFiles(updated);
      showToast(`Đã xóa vĩnh viễn tệp "${fileName}".`);
    }
  };

  // Empty Trash
  const handleEmptyTrash = () => {
    if (confirm('Bạn có chắc muốn dọn sạch toàn bộ thùng rác? Tất cả tệp sẽ bị xóa vĩnh viễn.')) {
      const updated = files.filter((f) => !f.isDeleted);
      setFiles(updated);
      saveStoredDriveFiles(updated);
      showToast('Đã dọn sạch thùng rác.');
    }
  };

  // Upload handler
  const handleFileUpload = (uploadedFiles: FileList | null) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    const newItems: CloudFileItem[] = Array.from(uploadedFiles).map((file, idx) => {
      let category: FileCategory = 'other';
      if (file.type.includes('pdf') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        category = 'document';
      } else if (file.type.startsWith('image/')) {
        category = 'image';
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.csv')) {
        category = 'spreadsheet';
      } else if (file.name.endsWith('.sql') || file.name.endsWith('.ts') || file.name.endsWith('.json')) {
        category = 'code';
      }

      return {
        id: `f-${Date.now()}-${idx}`,
        name: file.name,
        key: `uploads/${file.name}`,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        category,
        folderId: currentFolderId || undefined,
        updatedAt: new Date().toISOString(),
        url: '#',
        ownerId: 'usr_nam',
        ownerName: 'Nguyễn Văn Nam (Bạn)',
        permission: 'owner',
        isStarred: false,
        isDeleted: false,
        shareSettings: {
          linkAccess: 'organization',
          allowDownload: true,
        },
        versions: [
          {
            version: 1,
            size: file.size,
            updatedAt: new Date().toISOString(),
            updatedBy: 'Nguyễn Văn Nam',
            changeSummary: 'Tải lên từ máy tính',
          },
        ],
      };
    });

    const updated = [...newItems, ...files];
    setFiles(updated);
    saveStoredDriveFiles(updated);

    try {
      emitDomainEvent('file.uploaded', {
        file: newItems[0],
        files: newItems,
        userName: 'Nguyễn Văn Nam',
      });
    } catch (err) {
      console.warn('Failed to emit file.uploaded event', err);
    }

    showToast(`Đã tải lên thành công ${newItems.length} tệp vào đám mây MinIO S3!`);
  };

  // Create new folder
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const newFld: CloudFolder = {
      id: `fld-${Date.now()}`,
      name: newFolderName.trim(),
      category: 'project',
      color: '#3b82f6',
      fileCount: 0,
      totalSize: 0,
      ownerName: 'Nguyễn Văn Nam',
      updatedAt: new Date().toISOString(),
    };

    const updated = [newFld, ...folders];
    setFolders(updated);
    saveStoredDriveFolders(updated);
    setNewFolderName('');
    setIsNewFolderModalOpen(false);
    showToast(`Đã tạo thư mục mới "${newFld.name}".`);
  };

  // Filtered files logic
  const displayedFiles = files.filter((f) => {
    // Trash filter
    if (driveTab === 'trash') {
      return f.isDeleted;
    }
    // Exclude deleted files in normal views
    if (f.isDeleted) return false;

    // Folder filter
    if (currentFolderId && f.folderId !== currentFolderId) {
      return false;
    }

    // Tab filter
    if (driveTab === 'starred' && !f.isStarred) return false;
    if (driveTab === 'my_drive' && f.ownerId !== 'usr_nam') return false;
    if (driveTab === 'shared' && f.ownerId === 'usr_nam') return false;
    if (driveTab === 'recent') {
      const isRecent = Date.now() - new Date(f.updatedAt).getTime() < 3600000 * 24;
      if (!isRecent) return false;
    }

    // Category filter
    if (categoryFilter !== 'all' && f.category !== categoryFilter) return false;

    // Search query (search name and preview text)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = f.name.toLowerCase().includes(q);
      const matchContent = f.previewContent?.textSample?.toLowerCase().includes(q);
      const matchOwner = f.ownerName.toLowerCase().includes(q);
      if (!matchName && !matchContent && !matchOwner) return false;
    }

    return true;
  });

  // Sort files
  displayedFiles.sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'size') return b.size - a.size;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs overflow-hidden font-sans flex flex-col min-h-[750px]">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-zinc-700 text-xs font-semibold flex items-center gap-2.5 animate-in slide-in-from-bottom-5">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header / Breadcrumb & Storage Meter */}
      <div className="px-6 py-4 border-b border-zinc-200/80 bg-zinc-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
            <span
              onClick={() => {
                setCurrentFolderId(null);
                setDriveTab('all');
              }}
              className="hover:text-zinc-900 cursor-pointer flex items-center gap-1"
            >
              <HardDrive className="w-3.5 h-3.5 text-indigo-600" />
              <span>Kho lưu trữ đám mây (Cloud Drive)</span>
            </span>
            {currentFolder && (
              <>
                <ChevronRight className="w-3 h-3 text-zinc-400" />
                <span className="text-zinc-900 font-bold">{currentFolder.name}</span>
              </>
            )}
          </div>
          <h2 className="text-lg font-bold text-zinc-900 mt-1">
            {currentFolder
              ? currentFolder.name
              : driveTab === 'trash'
              ? 'Thùng rác (Trash)'
              : driveTab === 'starred'
              ? 'Tệp đã gắn sao'
              : driveTab === 'shared'
              ? 'Được chia sẻ với tôi'
              : driveTab === 'my_drive'
              ? 'Tệp của tôi (My Drive)'
              : 'Tất cả tài liệu & tệp tin'}
          </h2>
        </div>

        {/* Storage Capacity Bar */}
        <div className="min-w-[240px] bg-white p-3 rounded-2xl border border-zinc-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-zinc-700">Dung lượng đám mây</span>
            <span className="font-mono text-zinc-500 font-bold">
              {formatSize(totalUsedBytes)} / 100 GB
            </span>
          </div>
          <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden flex">
            <div className="h-full bg-indigo-500" style={{ width: '40%' }} title="Tài liệu Docs/PDF" />
            <div className="h-full bg-pink-500" style={{ width: '25%' }} title="Hình ảnh" />
            <div className="h-full bg-emerald-500" style={{ width: '15%' }} title="Bảng tính" />
            <div className="h-full bg-blue-500" style={{ width: '10%' }} title="Bản chụp CRDT" />
          </div>
          <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1.5 font-medium">
            <span>{usedPercentage}% đã dùng</span>
            <span className="text-indigo-600 font-semibold">MinIO S3 AWS</span>
          </div>
        </div>
      </div>

      {/* Main Container: Sidebar Navigation + Explorer Grid */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left Sub-Sidebar */}
        <aside className="w-full md:w-56 p-4 border-r border-zinc-200/80 bg-zinc-50/40 space-y-4 shrink-0">
          {/* Actions: Upload & New Folder */}
          <div className="space-y-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-transform active:scale-95"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Tải tệp mới lên</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              multiple
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
            />

            <button
              onClick={() => setIsNewFolderModalOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-800 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5 text-zinc-600" />
              <span>Tạo thư mục mới</span>
            </button>
          </div>

          {/* Drive Navigation Links */}
          <nav className="space-y-1 text-xs font-semibold">
            <button
              onClick={() => {
                setCurrentFolderId(null);
                setDriveTab('all');
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                driveTab === 'all' && !currentFolderId
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <HardDrive className="w-3.5 h-3.5" />
                <span>Tất cả tệp</span>
              </span>
              <span className="text-[10px] font-mono opacity-60">{activeFiles.length}</span>
            </button>

            <button
              onClick={() => {
                setCurrentFolderId(null);
                setDriveTab('my_drive');
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                driveTab === 'my_drive'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <Folder className="w-3.5 h-3.5 text-blue-500" />
                <span>Tệp của tôi</span>
              </span>
            </button>

            <button
              onClick={() => {
                setCurrentFolderId(null);
                setDriveTab('shared');
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                driveTab === 'shared'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-emerald-500" />
                <span>Được chia sẻ</span>
              </span>
            </button>

            <button
              onClick={() => {
                setCurrentFolderId(null);
                setDriveTab('starred');
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                driveTab === 'starred'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-amber-500" />
                <span>Đã gắn sao</span>
              </span>
              <span className="text-[10px] font-mono opacity-60">
                {files.filter((f) => f.isStarred && !f.isDeleted).length}
              </span>
            </button>

            <button
              onClick={() => {
                setCurrentFolderId(null);
                setDriveTab('recent');
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                driveTab === 'recent'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-purple-500" />
                <span>Gần đây</span>
              </span>
            </button>

            <div className="pt-2 border-t border-zinc-200/80">
              <button
                onClick={() => {
                  setCurrentFolderId(null);
                  setDriveTab('trash');
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                  driveTab === 'trash'
                    ? 'bg-rose-50 text-rose-700 font-bold border border-rose-200'
                    : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Thùng rác</span>
                </span>
                <span className="text-[10px] font-mono text-rose-600 font-bold">
                  {files.filter((f) => f.isDeleted).length}
                </span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Right Main Explorer Pane */}
        <main
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFileUpload(e.dataTransfer.files);
          }}
          className={`flex-1 p-6 space-y-6 overflow-y-auto transition-colors ${
            isDragging ? 'bg-blue-50/40 ring-2 ring-blue-400 ring-inset' : ''
          }`}
        >
          {/* Drag & Drop Overlay Notice */}
          {isDragging && (
            <div className="p-8 border-2 border-dashed border-blue-400 bg-blue-50/80 rounded-2xl text-center text-blue-900 animate-in fade-in">
              <UploadCloud className="w-10 h-10 mx-auto mb-2 text-blue-600 animate-bounce" />
              <p className="font-bold text-sm">Thả tệp vào đây để tải lên ngay lập tức!</p>
              <p className="text-xs text-blue-600 mt-1">
                Tự động lưu trữ và đồng bộ hóa trên cụm MinIO S3
              </p>
            </div>
          )}

          {/* Search Bar & Filters Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm kiếm tệp theo tên hoặc nội dung toàn văn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>

            {/* Filter by Category & Sorting */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-700 focus:outline-none cursor-pointer"
              >
                <option value="all">Mọi loại tệp</option>
                <option value="document">Tài liệu (PDF, Word)</option>
                <option value="spreadsheet">Bảng tính (Excel, CSV)</option>
                <option value="image">Hình ảnh</option>
                <option value="code">Mã nguồn & SQL</option>
                <option value="snapshot">Bản chụp CRDT Yjs</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-700 focus:outline-none cursor-pointer"
              >
                <option value="updated">Cập nhật mới nhất</option>
                <option value="name">Tên tệp (A-Z)</option>
                <option value="size">Dung lượng lớn nhất</option>
              </select>

              {driveTab === 'trash' && files.some((f) => f.isDeleted) && (
                <button
                  onClick={handleEmptyTrash}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors shrink-0"
                >
                  Dọn sạch thùng rác
                </button>
              )}
            </div>
          </div>

          {/* SECTION: TEAM FOLDERS (Bộ nhớ dùng chung theo thư mục) */}
          {!currentFolderId && driveTab !== 'trash' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Thư mục dùng chung của nhóm (Team Folders)</span>
                </span>
                <span className="text-[11px] text-zinc-400">Tự động phân quyền kế thừa</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {folders.map((fld) => (
                  <div
                    key={fld.id}
                    onClick={() => setCurrentFolderId(fld.id)}
                    className="p-3.5 bg-zinc-50/80 hover:bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0"
                        style={{ backgroundColor: fld.color }}
                      >
                        <Folder className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-900 truncate group-hover:text-blue-600">
                          {fld.name}
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          {fld.fileCount} tệp • {formatSize(fld.totalSize)}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION: FILES TABLE (Danh sách tệp tin) */}
          <div className="border border-zinc-200/80 rounded-2xl overflow-hidden shadow-2xs bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold text-[10px] uppercase">
                    <th className="py-3 px-4">Tên tệp tin</th>
                    <th className="py-3 px-3">Phân loại</th>
                    <th className="py-3 px-3">Dung lượng</th>
                    <th className="py-3 px-3">Người sở hữu</th>
                    <th className="py-3 px-3">Phân quyền</th>
                    <th className="py-3 px-3">Cập nhật</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-700">
                  {displayedFiles.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-zinc-400 text-xs">
                        {driveTab === 'trash'
                          ? 'Thùng rác trống. Chưa có tệp nào bị xóa.'
                          : 'Không tìm thấy tệp tin nào phù hợp.'}
                      </td>
                    </tr>
                  ) : (
                    displayedFiles.map((file) => (
                      <tr key={file.id} className="hover:bg-zinc-50/70 transition-colors group">
                        {/* File Name & Icon */}
                        <td className="py-3 px-4 min-w-[240px]">
                          <div className="flex items-center gap-2.5">
                            <button
                              onClick={() => handleToggleStar(file.id)}
                              className={`p-1 rounded transition-colors ${
                                file.isStarred
                                  ? 'text-amber-500'
                                  : 'text-zinc-300 hover:text-amber-400 opacity-0 group-hover:opacity-100'
                              }`}
                              title={file.isStarred ? 'Bỏ gắn sao' : 'Gắn sao tệp'}
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${
                                  file.isStarred ? 'fill-amber-400 text-amber-400' : ''
                                }`}
                              />
                            </button>

                            <div
                              onClick={() => setPreviewFile(file)}
                              className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 cursor-pointer"
                            >
                              {file.category === 'image' ? (
                                <ImageIcon className="w-3.5 h-3.5 text-pink-600" />
                              ) : file.category === 'spreadsheet' ? (
                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                              ) : file.category === 'snapshot' ? (
                                <Layers className="w-3.5 h-3.5 text-blue-600" />
                              ) : file.category === 'code' ? (
                                <Code className="w-3.5 h-3.5 text-purple-600" />
                              ) : (
                                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                              )}
                            </div>

                            <span
                              onClick={() => setPreviewFile(file)}
                              className="font-semibold text-zinc-900 truncate max-w-xs hover:text-blue-600 cursor-pointer"
                              title={file.name}
                            >
                              {file.name}
                            </span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-600 capitalize">
                            {file.category}
                          </span>
                        </td>

                        {/* Size */}
                        <td className="py-3 px-3 font-mono text-[11px] text-zinc-500 whitespace-nowrap">
                          {formatSize(file.size)}
                        </td>

                        {/* Owner */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-medium text-zinc-800">{file.ownerName}</span>
                        </td>

                        {/* Permission */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                              file.permission === 'owner'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : file.permission === 'editor'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            <Shield className="w-2.5 h-2.5" />
                            <span>
                              {file.permission === 'owner'
                                ? 'Chủ sở hữu'
                                : file.permission === 'editor'
                                ? 'Chỉnh sửa'
                                : file.permission === 'commenter'
                                ? 'Bình luận'
                                : 'Chỉ xem'}
                            </span>
                          </span>
                        </td>

                        {/* Date */}
                        <td className="py-3 px-3 text-zinc-400 text-[11px] font-mono whitespace-nowrap">
                          {new Date(file.updatedAt).toLocaleDateString('vi-VN')}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {/* Direct Open in Full Editor */}
                            {file.category === 'spreadsheet' && (
                              <a
                                href={`/sheet/${file.id === 'f-2' ? 'sheet_fin_q4' : file.id}`}
                                className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                                title="Mở trong Editor Bảng tính (Excel) đầy đủ"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {file.category === 'document' && (
                              <a
                                href={`/doc/${file.id === 'f-1' ? 'doc_rfc_consensus' : file.id === 'f-4' ? 'doc_sop_01' : file.id}`}
                                className="p-1.5 rounded-lg text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                                title="Mở trong Trình soạn thảo văn bản đầy đủ"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {/* Live Preview Button */}
                            <button
                              onClick={() => setPreviewFile(file)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Xem trước tệp (Live Preview)"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Normal Actions (if not in trash) */}
                            {!file.isDeleted ? (
                              <>
                                {/* Share Modal Button */}
                                <button
                                  onClick={() => setShareFile(file)}
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Chia sẻ & Phân quyền"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </button>

                                {/* Version History Button */}
                                <button
                                  onClick={() => setHistoryFile(file)}
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                                  title="Lịch sử phiên bản"
                                >
                                  <History className="w-3.5 h-3.5" />
                                </button>

                                {/* Download */}
                                <button
                                  onClick={() => showToast(`Bắt đầu tải về "${file.name}"...`)}
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
                                  title="Tải về máy tính"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>

                                {/* Move to Trash */}
                                <button
                                  onClick={() => handleMoveToTrash(file)}
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Chuyển vào thùng rác"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              /* Trash Actions */
                              <>
                                <button
                                  onClick={() => handleRestoreFromTrash(file)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold"
                                  title="Khôi phục tệp về kho lưu trữ"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Khôi phục</span>
                                </button>
                                <button
                                  onClick={() => handlePermanentDelete(file.id, file.name)}
                                  className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg"
                                  title="Xóa vĩnh viễn"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* MODAL 1: FILE PREVIEW */}
      <FilePreviewModal
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        onShare={(f) => {
          setPreviewFile(null);
          setShareFile(f);
        }}
        onDownload={(f) => showToast(`Đang tải xuống tệp "${f.name}"...`)}
      />

      {/* MODAL 2: SHARE & PERMISSIONS */}
      <FileShareModal
        file={shareFile}
        isOpen={!!shareFile}
        onClose={() => setShareFile(null)}
        onUpdateShareSettings={(fileId, perm, settings) => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId ? { ...f, permission: perm, shareSettings: settings } : f
            )
          );
          showToast('Đã lưu thiết lập phân quyền và liên kết chia sẻ!');
        }}
      />

      {/* MODAL 3: VERSION HISTORY */}
      <FileVersionHistoryModal
        file={historyFile}
        isOpen={!!historyFile}
        onClose={() => setHistoryFile(null)}
        onRestoreVersion={(fileId, verNum) => {
          setFiles((prev) =>
            prev.map((f) => {
              if (f.id === fileId) {
                const targetVer = f.versions.find((v) => v.version === verNum);
                return {
                  ...f,
                  size: targetVer ? targetVer.size : f.size,
                  updatedAt: new Date().toISOString(),
                };
              }
              return f;
            })
          );
          showToast(`Đã khôi phục tệp về Phiên bản ${verNum}!`);
        }}
        onAddMilestoneName={(fileId, verNum, nameTag) => {
          setFiles((prev) =>
            prev.map((f) => {
              if (f.id === fileId) {
                return {
                  ...f,
                  versions: f.versions.map((v) =>
                    v.version === verNum ? { ...v, nameTag } : v
                  ),
                };
              }
              return f;
            })
          );
          showToast(`Đã đặt tên mốc "${nameTag}" cho phiên bản ${verNum}!`);
        }}
      />

      {/* MODAL 4: CREATE NEW FOLDER */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-indigo-600" />
                <span>Tạo thư mục mới</span>
              </h3>
              <button
                onClick={() => setIsNewFolderModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateFolder} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Nhập tên thư mục..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                autoFocus
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewFolderModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                >
                  Tạo thư mục
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
