import React, { useState } from 'react';
import {
  FileText,
  FileCode,
  FileArchive,
  FileSpreadsheet,
  Image as ImageIcon,
  File,
  Star,
  Download,
  Share2,
  History,
  Trash2,
  RotateCcw,
  MoreVertical,
  Eye,
  FolderInput,
} from 'lucide-react';
import { CloudFileItem, DriveTab } from './types';

interface DriveFileListProps {
  files: CloudFileItem[];
  driveTab: DriveTab;
  viewMode: 'grid' | 'table';
  onPreview: (file: CloudFileItem) => void;
  onDownload: (file: CloudFileItem) => void;
  onToggleStar: (fileId: string, isStarred: boolean) => void;
  onShare: (file: CloudFileItem) => void;
  onVersions: (file: CloudFileItem) => void;
  onMoveToTrash: (fileId: string, name: string) => void;
  onRestore: (fileId: string, name: string) => void;
  onPermanentDelete: (fileId: string, name: string) => void;
  onMoveFolder: (fileId: string, targetFolderId: string | null) => void;
}

export function DriveFileList({
  files,
  driveTab,
  viewMode,
  onPreview,
  onDownload,
  onToggleStar,
  onShare,
  onVersions,
  onMoveToTrash,
  onRestore,
  onPermanentDelete,
  onMoveFolder,
}: DriveFileListProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (category: string) => {
    switch (category) {
      case 'document':
        return <FileText className="w-8 h-8 text-blue-500" />;
      case 'image':
        return <ImageIcon className="w-8 h-8 text-emerald-500" />;
      case 'spreadsheet':
        return <FileSpreadsheet className="w-8 h-8 text-teal-500" />;
      case 'code':
        return <FileCode className="w-8 h-8 text-amber-500" />;
      case 'archive':
        return <FileArchive className="w-8 h-8 text-purple-500" />;
      default:
        return <File className="w-8 h-8 text-zinc-400" />;
    }
  };

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 mb-3">
          <File className="w-8 h-8" />
        </div>
        <p className="text-sm font-semibold text-zinc-700">Không tìm thấy tệp nào</p>
        <p className="text-xs text-zinc-400 max-w-sm mt-1">
          {driveTab === 'trash'
            ? 'Thùng rác hiện đang trống.'
            : 'Hãy kéo thả tệp từ máy tính hoặc bấm "Tải lên tệp" để thêm tệp mới vào không gian lưu trữ.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.map((file) => {
            const isMenuOpen = activeMenuId === file.id;
            return (
              <div
                key={file.id}
                onClick={() => onPreview(file)}
                className="group relative bg-white hover:bg-zinc-50/80 p-4 rounded-2xl border border-zinc-200/80 hover:border-blue-400/80 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between h-48"
              >
                {/* Header: Icon & Menu */}
                <div className="flex items-start justify-between">
                  <div className="p-2.5 bg-zinc-50 rounded-xl group-hover:bg-blue-50/50 transition-colors">
                    {getFileIcon(file.category)}
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onToggleStar(file.id, Boolean(file.isStarred))}
                      className={`p-1.5 rounded-lg transition-colors ${
                        file.isStarred
                          ? 'text-amber-500 hover:text-amber-600'
                          : 'text-zinc-300 hover:text-amber-500 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${file.isStarred ? 'fill-current' : ''}`} />
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenuId(isMenuOpen ? null : file.id)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {isMenuOpen && (
                        <div className="absolute right-0 top-8 z-30 w-44 bg-white rounded-xl shadow-lg border border-zinc-200 py-1 text-xs text-zinc-700">
                          {driveTab === 'trash' ? (
                            <>
                              <button
                                onClick={() => {
                                  onRestore(file.id, file.name);
                                  setActiveMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-100"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Khôi phục</span>
                              </button>
                              <button
                                onClick={() => {
                                  onPermanentDelete(file.id, file.name);
                                  setActiveMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Xóa vĩnh viễn</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  onPreview(file);
                                  setActiveMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-100"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Xem trước</span>
                              </button>
                              <button
                                onClick={() => {
                                  onDownload(file);
                                  setActiveMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-100"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Tải xuống</span>
                              </button>
                              <button
                                onClick={() => {
                                  onShare(file);
                                  setActiveMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-100"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                                <span>Chia sẻ...</span>
                              </button>
                              <button
                                onClick={() => {
                                  onVersions(file);
                                  setActiveMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-100"
                              >
                                <History className="w-3.5 h-3.5" />
                                <span>Lịch sử phiên bản</span>
                              </button>
                              <div className="h-px bg-zinc-100 my-1" />
                              <button
                                onClick={() => {
                                  onMoveToTrash(file.id, file.name);
                                  setActiveMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Chuyển vào thùng rác</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Body: Title & Meta */}
                <div>
                  <h4 className="font-medium text-zinc-900 text-sm truncate mb-1" title={file.name}>
                    {file.name}
                  </h4>
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>{formatSize(file.size)}</span>
                    <span className="truncate max-w-[100px]">{file.ownerName}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-2xs">
          <table className="w-full text-left text-sm text-zinc-600">
            <thead className="bg-zinc-50/80 text-xs text-zinc-400 uppercase border-b border-zinc-200/80">
              <tr>
                <th className="px-4 py-3 font-semibold">Tên tệp tin</th>
                <th className="px-4 py-3 font-semibold">Người tải lên</th>
                <th className="px-4 py-3 font-semibold">Kích thước</th>
                <th className="px-4 py-3 font-semibold">Cập nhật</th>
                <th className="px-4 py-3 text-right font-semibold">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {files.map((file) => (
                <tr
                  key={file.id}
                  onClick={() => onPreview(file)}
                  className="hover:bg-zinc-50/80 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium text-zinc-900 flex items-center gap-2.5">
                    <span className="shrink-0">{getFileIcon(file.category)}</span>
                    <span className="truncate max-w-xs">{file.name}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{file.ownerName}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{formatSize(file.size)}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {new Date(file.updatedAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td
                    className="px-4 py-3 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onDownload(file)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100"
                        title="Tải xuống"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onShare(file)}
                        className="p-1.5 text-zinc-400 hover:text-blue-600 rounded-lg hover:bg-zinc-100"
                        title="Chia sẻ"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onMoveToTrash(file.id, file.name)}
                        className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-zinc-100"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
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
