'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Table,
  Palette,
  PenTool,
  Layers,
  Plus,
  Star,
  Clock,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { timeAgo } from '../../lib/utils';
import { WorkspaceItem, WorkspaceItemType } from './seed-workspace-items';

export interface WorkspaceExplorerProps {
  filteredItems: WorkspaceItem[];
  workspaceItemsCount: number;
  sheetCount: number;
  designCount: number;
  whiteboardCount: number;
  docCount: number;
  categoryFilter: 'all' | WorkspaceItemType;
  setCategoryFilter: (cat: 'all' | WorkspaceItemType) => void;
  viewMode: 'grid' | 'table';
  favorites: string[];
  toggleFavorite: (id: string, e: React.MouseEvent) => void;
  handleDeleteItem: (id: string, e: React.MouseEvent) => void;
  onOpenCreateModalWithType: (type: WorkspaceItemType) => void;
  onResetFilter: () => void;
}

export function WorkspaceExplorer({
  filteredItems,
  workspaceItemsCount,
  sheetCount,
  designCount,
  whiteboardCount,
  docCount,
  categoryFilter,
  setCategoryFilter,
  viewMode,
  favorites,
  toggleFavorite,
  handleDeleteItem,
  onOpenCreateModalWithType,
  onResetFilter,
}: WorkspaceExplorerProps) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/80 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mr-1">
            Phân loại:
          </span>

          <button
            onClick={() => setCategoryFilter('all')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              categoryFilter === 'all'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Tất cả ({workspaceItemsCount})</span>
          </button>

          <button
            onClick={() => setCategoryFilter('sheet')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              categoryFilter === 'sheet'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Bảng tính Excel ({sheetCount})</span>
          </button>

          <button
            onClick={() => setCategoryFilter('design')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              categoryFilter === 'design'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Bản vẽ Figma ({designCount})</span>
          </button>

          <button
            onClick={() => setCategoryFilter('whiteboard')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              categoryFilter === 'whiteboard'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Bảng trắng ({whiteboardCount})</span>
          </button>

          <button
            onClick={() => setCategoryFilter('doc')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              categoryFilter === 'doc'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Văn bản ({docCount})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenCreateModalWithType('sheet')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Tạo Excel mới</span>
          </button>

          <button
            onClick={() => onOpenCreateModalWithType('design')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Tạo Figma mới</span>
          </button>

          <button
            onClick={() => onOpenCreateModalWithType('whiteboard')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Tạo Bảng trắng mới</span>
          </button>

          <button
            onClick={() => onOpenCreateModalWithType('doc')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Tạo Văn bản mới</span>
          </button>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="max-w-md mx-auto text-center py-20 px-6 bg-white rounded-3xl border border-zinc-200/80 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4 text-zinc-400">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900 mb-1">Không tìm thấy tài liệu phù hợp</h3>
          <p className="text-xs text-zinc-500 mb-6">
            Hãy thử thay đổi bộ lọc tìm kiếm hoặc khởi tạo tài liệu/bảng tính mới.
          </p>
          <button
            onClick={onResetFilter}
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-black transition-colors cursor-pointer"
          >
            <span>Xem lại tất cả</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const isFav = favorites.includes(item.id);
            return (
              <Link
                key={item.id}
                href={item.href}
                className="group bg-white rounded-2xl border border-zinc-200/80 p-5 hover:border-zinc-300 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${item.iconBgClass} ${item.iconTextClass}`}
                    >
                      {item.type === 'sheet' ? (
                        <Table className="w-4 h-4" />
                      ) : item.type === 'design' ? (
                        <Palette className="w-4 h-4" />
                      ) : item.type === 'whiteboard' ? (
                        <PenTool className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(item.id, e)}
                        className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-amber-500 transition-colors cursor-pointer"
                        title={isFav ? 'Bỏ yêu thích' : 'Yêu thích'}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            isFav ? 'text-amber-500 fill-amber-500' : ''
                          }`}
                        />
                      </button>
                      <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${item.badgeClass}`}>
                        {item.badgeText}
                      </span>
                    </div>
                  </div>

                  <h4 className="text-sm font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors mb-1 truncate">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-zinc-500 mb-2 truncate">
                    {item.detailsSummary}
                  </p>
                  <p className="text-[10px] text-zinc-400 font-mono mb-4 truncate">
                    ID: {item.id} • {item.owner?.name || 'Nguyễn Văn Nam'}
                  </p>
                </div>

                <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{timeAgo(item.updatedAt)}</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteItem(item.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-600 rounded transition-opacity cursor-pointer"
                      title="Xóa mục này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-700 group-hover:text-blue-600">
                      <span>Mở</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                <th className="py-3 px-4">Tên tài liệu &amp; Dữ liệu</th>
                <th className="py-3 px-4">Định dạng</th>
                <th className="py-3 px-4">Mô tả tóm tắt</th>
                <th className="py-3 px-4">Người phụ trách</th>
                <th className="py-3 px-4">Cập nhật</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-sans">
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => router.push(item.href)}
                  className="hover:bg-zinc-50/80 cursor-pointer transition-colors group"
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg shrink-0 ${item.badgeClass}`}>
                        {item.type === 'sheet' ? (
                          <Table className="w-3.5 h-3.5" />
                        ) : item.type === 'design' ? (
                          <Palette className="w-3.5 h-3.5" />
                        ) : item.type === 'whiteboard' ? (
                          <PenTool className="w-3.5 h-3.5" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <span className="font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors truncate max-w-xs">
                        {item.title}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${item.badgeClass}`}>
                      {item.badgeText}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-zinc-500 truncate max-w-sm">
                    {item.detailsSummary}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-600">
                    {item.owner?.name || 'Nguyễn Văn Nam'}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">
                    {timeAgo(item.updatedAt)}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(item.id, e)}
                        className="p-1 text-zinc-400 hover:text-amber-500 transition-colors cursor-pointer"
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            favorites.includes(item.id) ? 'text-amber-500 fill-amber-500' : ''
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteItem(item.id, e)}
                        className="p-1 text-zinc-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                        title="Xóa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
