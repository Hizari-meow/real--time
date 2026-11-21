'use client';

import React from 'react';
import {
  BookOpen,
  Plus,
  Folder,
  FileText,
  ChevronRight,
  ChevronDown,
  Tag,
  Archive,
} from 'lucide-react';
import { WikiPage, WIKI_AREAS } from './types';

interface WikiSidebarProps {
  areas: typeof WIKI_AREAS;
  selectedArea: string;
  onSelectArea: (areaId: string) => void;
  pages: WikiPage[];
  tree: any[];
  activePageId: string | null;
  onSelectPage: (pageId: string) => void;
  tags: { tag: string; count: number }[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  onOpenCreateModal: () => void;
}

export function WikiSidebar({
  areas,
  selectedArea,
  onSelectArea,
  pages,
  tree,
  activePageId,
  onSelectPage,
  tags,
  selectedTag,
  onSelectTag,
  onOpenCreateModal,
}: WikiSidebarProps) {
  // Count pages per area
  const areaCounts = React.useMemo(() => {
    const counts: Record<string, number> = { all: pages.filter((p) => !p.isArchived).length };
    pages.forEach((p) => {
      if (p.isArchived) {
        counts['archive'] = (counts['archive'] || 0) + 1;
      } else {
        counts[p.areaId] = (counts[p.areaId] || 0) + 1;
      }
    });
    return counts;
  }, [pages]);

  const renderTreeNode = (node: any, level: number = 0) => {
    const isSelected = activePageId === node.id;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="select-none">
        <button
          onClick={() => onSelectPage(node.id)}
          style={{ paddingLeft: `${Math.max(8, level * 16 + 8)}px` }}
          className={`w-full flex items-center justify-between py-1.5 pr-2 rounded-lg text-sm text-left transition-colors ${
            isSelected
              ? 'bg-blue-600/15 text-blue-400 font-medium'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <span className="text-sm shrink-0">{node.icon || '📄'}</span>
            <span className="truncate">{node.title}</span>
          </div>
          {node.status && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 ml-1 ${
                node.status === 'approved' || node.status === 'Đã duyệt'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : node.status === 'pending_approval' || node.status === 'Cần cập nhật'
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'bg-slate-700/50 text-slate-400'
              }`}
            >
              {node.status === 'approved' || node.status === 'Đã duyệt'
                ? 'SOP'
                : node.status === 'pending_approval' || node.status === 'Cần cập nhật'
                ? 'Review'
                : 'Nháp'}
            </span>
          )}
        </button>
        {hasChildren && (
          <div className="border-l border-slate-800/80 ml-3">
            {node.children.map((child: any) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-72 bg-slate-900/90 border-r border-slate-800 flex flex-col shrink-0 h-full overflow-hidden">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white font-semibold">
          <BookOpen className="w-5 h-5 text-blue-400" />
          <span>Kho Tri Thức</span>
        </div>
        <button
          onClick={onOpenCreateModal}
          className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-1 text-xs font-medium shadow-sm"
          title="Tạo bài viết mới"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo mới</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">
        {/* Khu vực tri thức */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 mb-2">
            Khu vực tri thức
          </div>
          <div className="space-y-0.5">
            {areas.map((area) => {
              const count = areaCounts[area.id] || 0;
              const isSelected = selectedArea === area.id;
              return (
                <button
                  key={area.id}
                  onClick={() => {
                    onSelectArea(area.id);
                    onSelectTag(null);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm text-left transition-colors ${
                    isSelected
                      ? 'bg-slate-800 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-base">{area.icon}</span>
                    <span className="truncate">{area.name.replace(/^[^\s]+\s*/, '')}</span>
                  </div>
                  {count > 0 && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        isSelected ? 'bg-slate-700 text-slate-200' : 'bg-slate-800/80 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cây phân cấp trang (Hierarchy Tree) */}
        {tree.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 mb-2 flex items-center justify-between">
              <span>Cây tài liệu</span>
              <span className="text-[10px] text-slate-500 font-normal">{tree.length} mục chính</span>
            </div>
            <div className="space-y-0.5">{tree.map((node) => renderTreeNode(node, 0))}</div>
          </div>
        )}

        {/* Tag Cloud */}
        {tags.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 mb-2 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span>Chủ đề & Thẻ (#tags)</span>
            </div>
            <div className="flex flex-wrap gap-1.5 px-2">
              {tags.map((t) => {
                const isSelected = selectedTag === t.tag;
                return (
                  <button
                    key={t.tag}
                    onClick={() => onSelectTag(isSelected ? null : t.tag)}
                    className={`text-xs px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 ${
                      isSelected
                        ? 'bg-blue-600 text-white font-medium'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-750 hover:text-slate-200'
                    }`}
                  >
                    <span>{t.tag}</span>
                    <span className="text-[10px] opacity-70">({t.count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
