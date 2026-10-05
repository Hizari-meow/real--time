'use client';

import React, { useState } from 'react';
import {
  X,
  LayoutTemplate,
  Search,
  Sparkles,
  ArrowRight,
  Lightbulb,
  RotateCcw,
  BarChart3,
  Palette,
} from 'lucide-react';
import { TEMPLATE_METAS, TemplateMeta } from './templates';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: string) => void;
}

export function TemplatesModal({
  isOpen,
  onClose,
  onSelectTemplate,
}: TemplatesModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const filteredTemplates = TEMPLATE_METAS.filter((t) => {
    const matchesCat = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const categories = [
    { id: 'all', label: 'Tất cả mẫu', icon: LayoutTemplate },
    { id: 'brainstorm', label: 'Brainstorming (4)', icon: Lightbulb },
    { id: 'retro', label: 'Họp Retrospective (4)', icon: RotateCcw },
    { id: 'strategy', label: 'Chiến lược & Kế hoạch (4)', icon: BarChart3 },
    { id: 'design', label: 'Thiết kế & Khách hàng (3)', icon: Palette },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">
                Thư Viện Mẫu Bảng Trắng & Workshop (15 Mẫu)
              </h3>
              <p className="text-xs text-zinc-500">
                Chọn mẫu dựng sẵn chuẩn quốc tế để bắt đầu cuộc họp ngay mà không cần thiết kế từ đầu
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

        {/* Filter & Search Bar */}
        <div className="px-6 py-3 border-b border-zinc-200 bg-white flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {categories.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === c.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>

          <div className="relative w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm mẫu..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Templates Grid */}
        <div className="p-6 overflow-y-auto flex-1 bg-zinc-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((t) => (
              <div
                key={t.id}
                onClick={() => {
                  onSelectTemplate(t.id);
                  onClose();
                }}
                className="bg-white rounded-2xl border border-zinc-200 p-4 hover:shadow-lg hover:border-blue-400 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl p-2 rounded-xl bg-zinc-100 group-hover:scale-110 transition-transform">
                      {t.icon}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold">
                      {t.categoryLabel}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-zinc-900 group-hover:text-blue-600 transition-colors mb-1.5">
                    {t.title}
                  </h4>
                  <p className="text-xs text-zinc-500 line-clamp-3 leading-relaxed mb-3">
                    {t.description}
                  </p>
                </div>

                <div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {t.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 text-[10px]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-zinc-50 group-hover:bg-blue-600 text-zinc-700 group-hover:text-white text-xs font-bold transition-all shadow-2xs"
                  >
                    <span>Áp dụng mẫu</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12 text-zinc-400 text-xs">
              Không tìm thấy mẫu phù hợp với từ khóa &quot;{searchQuery}&quot;.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 bg-white flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            Mẹo: Bạn có thể chèn nhiều mẫu liên tiếp và kéo thả sắp xếp trên cùng một bảng vô hạn.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
