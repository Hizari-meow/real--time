'use client';

import React, { useState } from 'react';
import { useDriveState } from './useDriveState';
import { DriveSidebar } from './DriveSidebar';
import { DriveToolbar } from './DriveToolbar';
import { DriveFileList } from './DriveFileList';
import { FilePreviewModal } from './FilePreviewModal';
import { FileShareModal } from './FileShareModal';
import { FileVersionHistoryModal } from './FileVersionHistoryModal';
import { FolderPlus, X } from 'lucide-react';

export function CloudDriveExplorer() {
  const {
    files,
    folders,
    loading,
    error,
    driveTab,
    setDriveTab,
    currentFolderId,
    setCurrentFolderId,
    categoryFilter,
    setCategoryFilter,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    viewMode,
    setViewMode,
    displayedFiles,
    previewFile,
    setPreviewFile,
    sharingFile,
    setSharingFile,
    versioningFile,
    setVersioningFile,
    isNewFolderModalOpen,
    setIsNewFolderModalOpen,
    toastMessage,
    handleUploadFiles,
    handleDownloadFile,
    handleToggleStar,
    handleMoveToTrash,
    handleRestoreFromTrash,
    handlePermanentDelete,
    handleRenameFile,
    handleMoveFile,
    handleCreateFolder,
    handleDeleteFolder,
    serverStorageUsed,
    reload,
  } = useDriveState();

  const [newFolderName, setNewFolderName] = useState('');

  const totalStorageUsed = serverStorageUsed !== null
    ? serverStorageUsed
    : files.reduce((acc, f) => acc + (f.isDeleted ? 0 : f.size), 0);

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-3xl border border-zinc-200/80 shadow-xs overflow-hidden relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-4 right-4 z-50 bg-zinc-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}

      {/* Left Sidebar */}
      <DriveSidebar
        driveTab={driveTab}
        setDriveTab={setDriveTab}
        currentFolderId={currentFolderId}
        setCurrentFolderId={setCurrentFolderId}
        folders={folders}
        onOpenNewFolder={() => setIsNewFolderModalOpen(true)}
        onDeleteFolder={handleDeleteFolder}
        totalStorageUsed={totalStorageUsed}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        {/* Toolbar */}
        <DriveToolbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onUploadFiles={handleUploadFiles}
          onOpenNewFolder={() => setIsNewFolderModalOpen(true)}
        />

        {/* File Grid/List Area */}
        <div className="flex-1 overflow-y-auto pt-4 pr-1">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-sm text-zinc-400">
              Đang đồng bộ tệp tin từ MinIO S3...
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl text-center">
              {error}
            </div>
          ) : (
            <DriveFileList
              files={displayedFiles}
              driveTab={driveTab}
              viewMode={viewMode}
              onPreview={setPreviewFile}
              onDownload={handleDownloadFile}
              onToggleStar={handleToggleStar}
              onShare={setSharingFile}
              onVersions={setVersioningFile}
              onMoveToTrash={handleMoveToTrash}
              onRestore={handleRestoreFromTrash}
              onPermanentDelete={handlePermanentDelete}
              onMoveFolder={handleMoveFile}
            />
          )}
        </div>
      </div>

      {/* New Folder Modal */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-zinc-200 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-zinc-900 text-sm">Tạo thư mục mới</h3>
              </div>
              <button
                onClick={() => setIsNewFolderModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newFolderName.trim()) {
                  handleCreateFolder(newFolderName.trim());
                  setNewFolderName('');
                }
              }}
            >
              <input
                type="text"
                placeholder="Nhập tên thư mục..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                autoFocus
                className="w-full px-3.5 py-2 text-sm bg-zinc-50 rounded-xl border border-zinc-200 focus:bg-white focus:border-blue-500 focus:outline-hidden mb-4"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewFolderModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-xs"
                >
                  Tạo thư mục
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals */}
      {previewFile && (
        <FilePreviewModal
          isOpen={!!previewFile}
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onDownload={(f) => handleDownloadFile(f)}
          onShare={(f) => {
            setSharingFile(f);
            setPreviewFile(null);
          }}
        />
      )}

      {sharingFile && (
        <FileShareModal
          file={sharingFile}
          onClose={() => {
            setSharingFile(null);
            reload();
          }}
        />
      )}

      {versioningFile && (
        <FileVersionHistoryModal
          file={versioningFile}
          onClose={() => {
            setVersioningFile(null);
            reload();
          }}
          onRevertVersion={(ver) => {
            reload();
          }}
        />
      )}
    </div>
  );
}

export default CloudDriveExplorer;
