import React, { useRef } from 'react';
import {
  Search,
  Upload,
  FolderPlus,
  LayoutGrid,
  List,
  SlidersHorizontal,
} from 'lucide-react';
import { FileCategory, FileSortBy } from './types';

interface DriveToolbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  categoryFilter: FileCategory | 'all';
  setCategoryFilter: (cat: FileCategory | 'all') => void;
  sortBy: FileSortBy;
  setSortBy: (sort: FileSortBy) => void;
  viewMode: 'grid' | 'table';
  setViewMode: (vm: 'grid' | 'table') => void;
  onUploadFiles: (files: FileList | null) => void;
  onOpenNewFolder: () => void;
}

export function DriveToolbar({
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  onUploadFiles,
  onOpenNewFolder,
}: DriveToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories: { id: FileCategory | 'all'; label: string }[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'document', label: 'Văn bản & PDF' },
    { id: 'image', label: 'Hình ảnh' },
    { id: 'spreadsheet', label: 'Bảng tính' },
    { id: 'code', label: 'Mã nguồn' },
    { id: 'archive', label: 'Tệp nén' },
    { id: 'other', label: 'Khác' },
  ];

  return (
    <div className="space-y-4 pb-4 border-b border-zinc-200/80">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Tìm kiếm tệp theo tên hoặc người tải..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-50/80 hover:bg-zinc-100/80 focus:bg-white rounded-xl border border-zinc-200/80 focus:border-blue-500 focus:outline-hidden transition-all shadow-2xs"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              onUploadFiles(e.target.files);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            multiple
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-all shadow-xs"
          >
            <Upload className="w-4 h-4" />
            <span>Tải lên tệp</span>
          </button>

          <button
            onClick={onOpenNewFolder}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200/80 rounded-xl text-sm font-medium transition-all shadow-2xs"
          >
            <FolderPlus className="w-4 h-4 text-zinc-500" />
            <span>Thư mục mới</span>
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-zinc-100 p-0.5 rounded-xl border border-zinc-200/60 ml-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
              title="Xem dạng lưới"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
              title="Xem dạng danh sách"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as FileSortBy)}
            className="bg-white text-xs font-medium text-zinc-600 border border-zinc-200/80 rounded-xl px-2.5 py-2 outline-hidden cursor-pointer shadow-2xs"
          >
            <option value="updatedAt">Mới cập nhật</option>
            <option value="name">Tên (A-Z)</option>
            <option value="size">Kích thước</option>
          </select>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => {
          const isSelected = categoryFilter === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200/60'
                  : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100 border border-zinc-200/60'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
