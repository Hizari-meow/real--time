'use client';

import React from 'react';
import { Search, Plus, Filter, AlertCircle, RefreshCw } from 'lucide-react';
import { useWikiState } from './useWikiState';
import { WikiSidebar } from './WikiSidebar';
import { WikiPageDetail } from './WikiPageDetail';
import { WikiPageModal } from './WikiPageModal';
import { WIKI_AREAS, WikiPage, WikiArea } from './types';

export { WIKI_AREAS };
export type { WikiPage, WikiArea };

export function InternalWikiKnowledgeBase() {
  const {
    pages,
    tree,
    tags,
    activePage,
    activePageId,
    setActivePageId,
    backlinks,
    selectedArea,
    setSelectedArea,
    selectedTag,
    setSelectedTag,
    searchQuery,
    setSearchQuery,
    displayedPages,
    loading,
    error,
    isModalOpen,
    setIsModalOpen,
    editingPage,
    setEditingPage,
    toastMessage,
    showToast,
    handleCreateOrUpdatePage,
    handleUpdateStatus,
    handleArchivePage,
    handleDeletePage,
    reload,
  } = useWikiState();

  const handleOpenCreateModal = () => {
    setEditingPage(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (page: WikiPage) => {
    setEditingPage(page);
    setIsModalOpen(true);
  };

  const handleCopyLink = (page: WikiPage) => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/?tab=wiki&page=${page.id}`;
      navigator.clipboard?.writeText?.(url);
      showToast(`Đã sao chép liên kết trang: "${page.title}"`);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-4 right-4 z-50 bg-slate-800 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Search & Filter Toolbar */}
      <header className="h-14 border-b border-slate-800 px-4 flex items-center justify-between gap-4 bg-slate-900/40 shrink-0">
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm tài liệu, quy trình SOP, từ khóa..."
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {error && (
            <button
              onClick={reload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg text-xs"
              title="Thử lại"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tải lại</span>
            </button>
          )}

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo tài liệu mới</span>
          </button>
        </div>
      </header>

      {/* Main Layout: Sidebar + Detail Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <WikiSidebar
          areas={WIKI_AREAS}
          selectedArea={selectedArea}
          onSelectArea={setSelectedArea}
          pages={pages}
          tree={tree}
          activePageId={activePageId}
          onSelectPage={setActivePageId}
          tags={tags}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
          onOpenCreateModal={handleOpenCreateModal}
        />

        {/* Center Detail Pane */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            <p className="text-sm">Đang đồng bộ cơ sở tri thức từ máy chủ...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-rose-400">
            <AlertCircle className="w-10 h-10 mb-2 stroke-1" />
            <p className="text-sm font-medium">{error}</p>
            <button
              onClick={reload}
              className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700"
            >
              Thử kết nối lại
            </button>
          </div>
        ) : (
          <WikiPageDetail
            page={activePage}
            backlinks={backlinks}
            onSelectPage={setActivePageId}
            onEdit={handleOpenEditModal}
            onUpdateStatus={handleUpdateStatus}
            onArchive={handleArchivePage}
            onDelete={handleDeletePage}
            onCopyLink={handleCopyLink}
          />
        )}
      </div>

      {/* Create / Edit Modal */}
      <WikiPageModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPage(null);
        }}
        onSave={handleCreateOrUpdatePage}
        editingPage={editingPage}
        existingPages={pages}
      />
    </div>
  );
}
