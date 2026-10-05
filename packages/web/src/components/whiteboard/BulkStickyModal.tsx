'use client';

import React, { useState } from 'react';
import { X, StickyNote, Plus, Layers, Grid, ArrowRight } from 'lucide-react';
import { StickyColor, STICKY_COLOR_MAP } from './types';

interface BulkStickyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBulkStickies: (
    items: string[],
    color: StickyColor,
    layout: 'grid' | 'row',
    tag?: string
  ) => void;
}

export function BulkStickyModal({
  isOpen,
  onClose,
  onAddBulkStickies,
}: BulkStickyModalProps) {
  const [text, setText] = useState('');
  const [selectedColor, setSelectedColor] = useState<StickyColor>('yellow');
  const [layout, setLayout] = useState<'grid' | 'row'>('grid');
  const [tag, setTag] = useState('');

  if (!isOpen) return null;

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0) return;
    onAddBulkStickies(lines, selectedColor, layout, tag.trim() || undefined);
    setText('');
    onClose();
  };

  const colors: StickyColor[] = ['yellow', 'blue', 'pink', 'green', 'orange', 'purple', 'gray'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">
                Thêm Hàng Loạt Ghi Chú (Bulk Sticky Notes)
              </h3>
              <p className="text-xs text-zinc-500">
                Nhập danh sách ý tưởng (mỗi dòng một ghi chú) để tạo nhanh
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Nội Dung Ý Tưởng ({lines.length} ghi chú)
              </label>
              <button
                type="button"
                onClick={() =>
                  setText(
                    'Đơn giản hóa giao diện tạo phòng họp\nTối ưu tốc độ tải ảnh dưới 1 giây\nThêm phím tắt di chuyển trên bảng\nTích hợp thông báo qua Zalo Chat'
                  )
                }
                className="text-[11px] font-semibold text-blue-600 hover:underline"
              >
                Nhập mẫu thử
              </button>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Dán hoặc gõ các ý tưởng tại đây, mỗi dòng sẽ tạo thành một thẻ ghi chú riêng biệt..."
              rows={6}
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-sans leading-relaxed"
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
              Màu Thẻ Ghi Chú
            </label>
            <div className="flex items-center gap-2">
              {colors.map((c) => {
                const cfg = STICKY_COLOR_MAP[c];
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`w-8 h-8 rounded-xl border ${cfg.bg} ${cfg.border} transition-all shadow-xs ${
                      selectedColor === c
                        ? 'ring-2 ring-blue-600 ring-offset-2 scale-110'
                        : 'hover:scale-105'
                    }`}
                    title={c}
                  />
                );
              })}
            </div>
          </div>

          {/* Layout & Tag Options */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                Bố Cục Hiển Thị
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLayout('grid')}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                    layout === 'grid'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                      : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Dạng lưới</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLayout('row')}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                    layout === 'row'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                      : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Hàng ngang</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                Gắn Tag (Tùy chọn)
              </label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Ví dụ: Sprint 12, UI/UX"
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Footer Action */}
          <div className="pt-4 border-t border-zinc-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={lines.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo {lines.length} Thẻ Ghi Chú</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
