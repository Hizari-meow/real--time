'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Download,
  Share2,
  FileText,
  Image as ImageIcon,
  Table as TableIcon,
  Layers,
  Code,
  ZoomIn,
  ZoomOut,
  Calendar,
  User,
  HardDrive,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { CloudFileItem } from './types';

export interface FilePreviewModalProps {
  file: CloudFileItem | null;
  isOpen: boolean;
  onClose: () => void;
  onShare: (file: CloudFileItem) => void;
  onDownload: (file: CloudFileItem) => void;
}

export function FilePreviewModal({
  file,
  isOpen,
  onClose,
  onShare,
  onDownload,
}: FilePreviewModalProps) {
  const { token, workspace } = useAuth();
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api').replace(/\/+$/, '');

  const [zoomLevel, setZoomLevel] = useState(100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
    if (!isOpen || !file) {
      setPreviewData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (workspace?.orgId) headers['x-workspace-id'] = workspace.orgId;

    fetch(`${apiUrl}/files/${file.id}/preview`, { headers })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Máy chủ phản hồi mã lỗi ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.data) {
          setPreviewData(data.data);
        } else {
          setError(data.error || 'Không thể xem trước tệp này');
        }
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setError(err.message || 'Lỗi kết nối khi tải nội dung xem trước');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, file, token, workspace, apiUrl]);

  if (!isOpen || !file) return null;

  const formatSize = (bytes: number) => {
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return bytes + ' B';
  };

  const fileCategory = previewData?.category || file.category;
  const previewType = previewData?.previewType;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-4xl h-[88vh] flex flex-col overflow-hidden font-sans">
        {/* Header */}
        <div className="h-16 px-6 border-b border-zinc-200 bg-zinc-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 shadow-xs flex items-center justify-center shrink-0">
              {fileCategory === 'image' ? (
                <ImageIcon className="w-5 h-5 text-pink-600" />
              ) : fileCategory === 'spreadsheet' ? (
                <TableIcon className="w-5 h-5 text-emerald-600" />
              ) : fileCategory === 'snapshot' ? (
                <Layers className="w-5 h-5 text-blue-600" />
              ) : fileCategory === 'code' ? (
                <Code className="w-5 h-5 text-purple-600" />
              ) : (
                <FileText className="w-5 h-5 text-indigo-600" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-zinc-900 truncate" title={file.name}>
                {file.name}
              </h3>
              <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-0.5">
                <span className="flex items-center gap-1 font-mono">
                  <HardDrive className="w-3 h-3 text-zinc-400" />
                  {formatSize(file.size)}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-zinc-400" />
                  {file.ownerName}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-zinc-400" />
                  {new Date(file.updatedAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Zoom Controls for PDF / Image */}
            {previewType === 'image' && (
              <div className="hidden sm:flex items-center bg-zinc-100 p-0.5 rounded-xl border border-zinc-200 text-xs">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
                  className="p-1.5 hover:bg-white rounded-lg text-zinc-600 hover:text-zinc-900 transition-colors"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 font-mono text-[10px] text-zinc-600 font-semibold">
                  {zoomLevel}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(200, z + 25))}
                  className="p-1.5 hover:bg-white rounded-lg text-zinc-600 hover:text-zinc-900 transition-colors"
                  title="Phóng to"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              onClick={() => onShare(file)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold transition-colors"
              title="Chia sẻ tệp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chia sẻ</span>
            </button>

            <button
              onClick={() => onDownload(file)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs transition-colors"
              title="Tải về máy tính"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tải về</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors ml-1"
              title="Đóng xem trước (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Area */}
        <div className="flex-1 bg-zinc-100/70 p-4 sm:p-6 overflow-auto flex items-center justify-center">
          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 text-zinc-500">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-xs font-medium">Đang tải nội dung xem trước...</p>
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="bg-white rounded-2xl p-8 border border-zinc-200 shadow-md max-w-md text-center flex flex-col items-center gap-3">
              <AlertCircle className="w-10 h-10 text-amber-500" />
              <h4 className="text-sm font-bold text-zinc-900">Không thể xem trước tệp</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">{error}</p>
              <button
                onClick={() => onDownload(file)}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Tải về để mở trên máy tính</span>
              </button>
            </div>
          )}

          {/* 1. Real Text / Code preview */}
          {!loading && !error && previewType === 'text' && (
            <div className="bg-white rounded-xl shadow-lg border border-zinc-200 p-6 w-full max-w-3xl overflow-auto max-h-[70vh]">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-100 text-xs text-zinc-500">
                <span className="font-semibold text-zinc-800">{file.name}</span>
                <span className="font-mono text-[11px]">{previewData.mimeType || 'text/plain'}</span>
              </div>
              <pre className="font-mono text-xs text-zinc-800 whitespace-pre-wrap leading-relaxed overflow-x-auto bg-zinc-50 p-4 rounded-lg border border-zinc-100">
                {previewData.content || '(Tệp trống)'}
              </pre>
            </div>
          )}

          {/* 2. Real CSV spreadsheet preview */}
          {!loading && !error && previewType === 'csv' && (
            <div className="bg-white rounded-xl shadow-lg border border-zinc-200 p-6 w-full max-w-4xl overflow-auto max-h-[70vh]">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-100">
                <span className="text-xs font-bold text-zinc-900">{file.name}</span>
                <span className="text-[11px] text-zinc-500 font-mono">Bảng tính CSV</span>
              </div>
              {Array.isArray(previewData.rows) && previewData.rows.length > 0 ? (
                <div className="overflow-x-auto border border-zinc-200 rounded-lg">
                  <table className="w-full text-left text-xs divide-y divide-zinc-200">
                    <thead className="bg-zinc-50 text-zinc-700 font-bold">
                      <tr>
                        {previewData.rows[0].map((h: string, idx: number) => (
                          <th key={idx} className="p-2 border-r border-zinc-200 last:border-r-0">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-mono text-[11px]">
                      {previewData.rows.slice(1).map((row: string[], rIdx: number) => (
                        <tr key={rIdx} className="hover:bg-zinc-50">
                          {row.map((cell: string, cIdx: number) => (
                            <td key={cIdx} className="p-2 border-r border-zinc-100 last:border-r-0 text-zinc-700">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-zinc-500">Tệp CSV trống hoặc không có dữ liệu bảng.</p>
              )}
            </div>
          )}

          {/* 3. Real Image preview */}
          {!loading && !error && previewType === 'image' && (
            <div
              className="flex items-center justify-center transition-transform duration-200"
              style={{ transform: `scale(${zoomLevel / 100})` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${apiUrl}/files/${file.id}/download`}
                alt={file.name}
                className="max-h-[65vh] max-w-full object-contain rounded-xl shadow-xl border border-zinc-200"
              />
            </div>
          )}

          {/* 4. Real PDF preview */}
          {!loading && !error && previewType === 'pdf' && (
            <iframe
              src={`${apiUrl}/files/${file.id}/download`}
              title={file.name}
              className="w-full h-[68vh] rounded-xl border border-zinc-200 shadow-md bg-white"
            />
          )}

          {/* 5. Unsupported binary or other formats */}
          {!loading && !error && previewType === 'unsupported' && (
            <div className="bg-white rounded-2xl p-8 border border-zinc-200 shadow-lg max-w-md text-center flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-600 mb-1">
                {fileCategory === 'spreadsheet' ? (
                  <TableIcon className="w-7 h-7 text-emerald-600" />
                ) : fileCategory === 'snapshot' ? (
                  <Layers className="w-7 h-7 text-blue-600" />
                ) : (
                  <FileText className="w-7 h-7 text-indigo-600" />
                )}
              </div>
              <h4 className="text-sm font-bold text-zinc-900">{file.name}</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {previewData.message || 'Không hỗ trợ xem trước trực tiếp định dạng tệp này.'}
              </p>
              <button
                onClick={() => onDownload(file)}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Tải về máy tính ({formatSize(file.size)})</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FilePreviewModal;
