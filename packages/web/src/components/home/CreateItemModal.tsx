'use client';

import React from 'react';
import { FileText, Table, Palette, PenTool } from 'lucide-react';
import { WorkspaceItemType } from './seed-workspace-items';

export interface CreateItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  createType: WorkspaceItemType;
  setCreateType: (type: WorkspaceItemType) => void;
  newTitle: string;
  setNewTitle: (title: string) => void;
  creating: boolean;
  handleCreateItem: (e: React.FormEvent) => void;
}

export function CreateItemModal({
  isOpen,
  onClose,
  createType,
  setCreateType,
  newTitle,
  setNewTitle,
  creating,
  handleCreateItem,
}: CreateItemModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200/90 w-full max-w-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
          <div>
            <h3 className="text-sm font-bold text-zinc-900">Khởi Tạo Mục Cộng Tác Mới</h3>
            <p className="text-[11px] text-zinc-500">
              Chọn định dạng để bắt đầu với một không gian làm việc sạch hoàn toàn.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 text-xs cursor-pointer"
          >
            Hủy
          </button>
        </div>

        <form onSubmit={handleCreateItem} className="p-6 space-y-5">
          {/* Type Selection 4-Col Grid */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-2">
              Chọn định dạng làm việc mới:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Option 1: Document */}
              <div
                onClick={() => setCreateType('doc')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col items-center text-center ${
                  createType === 'doc'
                    ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-zinc-200 hover:border-zinc-300 bg-white'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-1.5">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-zinc-900 mb-0.5">Văn bản</span>
                <span className="text-[9px] text-zinc-500 leading-tight">Trang trắng mới tinh</span>
              </div>

              {/* Option 2: Spreadsheet (Excel) */}
              <div
                onClick={() => setCreateType('sheet')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col items-center text-center ${
                  createType === 'sheet'
                    ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-zinc-200 hover:border-zinc-300 bg-white'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1.5">
                  <Table className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-zinc-900 mb-0.5">Bảng tính</span>
                <span className="text-[9px] text-zinc-500 leading-tight">Lưới ô trống mới</span>
              </div>

              {/* Option 3: Figma Design Canvas */}
              <div
                onClick={() => setCreateType('design')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col items-center text-center ${
                  createType === 'design'
                    ? 'border-purple-600 bg-purple-50/60 ring-2 ring-purple-500/20 shadow-xs'
                    : 'border-zinc-200 hover:border-zinc-300 bg-white'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-1.5">
                  <Palette className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-zinc-900 mb-0.5">Bản vẽ Figma</span>
                <span className="text-[9px] text-zinc-500 leading-tight">UI, Slide &amp; CSS</span>
              </div>

              {/* Option 4: Whiteboard */}
              <div
                onClick={() => setCreateType('whiteboard')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col items-center text-center ${
                  createType === 'whiteboard'
                    ? 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-500/20 shadow-xs'
                    : 'border-zinc-200 hover:border-zinc-300 bg-white'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-1.5">
                  <PenTool className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-zinc-900 mb-0.5">Bảng trắng</span>
                <span className="text-[9px] text-zinc-500 leading-tight">Vẽ tự do &amp; Sticky</span>
              </div>
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-2">
              Tiêu đề{' '}
              {createType === 'sheet'
                ? 'bảng tính mới'
                : createType === 'design'
                ? 'bản vẽ thiết kế Figma mới'
                : createType === 'whiteboard'
                ? 'bảng trắng động não mới'
                : 'tài liệu văn bản mới'}
            </label>
            <input
              type="text"
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={
                createType === 'sheet'
                  ? 'Ví dụ: Kế Hoạch Doanh Thu Tháng 11 (Excel)'
                  : createType === 'design'
                  ? 'Ví dụ: Giao Diện Mobile App & Slide Thuyết Trình'
                  : createType === 'whiteboard'
                  ? 'Ví dụ: Brainstorming Tính Năng Mới'
                  : 'Ví dụ: Kế Hoạch Triển Khai Hệ Thống'
              }
              className="w-full px-4 py-2.5 rounded-2xl border border-zinc-200 text-xs font-medium text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0068ff] transition-all"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-xs font-semibold text-zinc-600 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={creating}
              className={`px-4 py-2 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors cursor-pointer ${
                createType === 'sheet'
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : createType === 'design'
                  ? 'bg-purple-700 hover:bg-purple-800'
                  : createType === 'whiteboard'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-zinc-900 hover:bg-black'
              }`}
            >
              {creating ? 'Đang tạo...' : 'Tạo & Mở ngay'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
