'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Clock,
  RotateCcw,
  Tag,
  CheckCircle2,
  HardDrive,
  User,
  ArrowRight,
  GitCompare,
  Plus,
} from 'lucide-react';
import { CloudFileItem, FileVersionItem } from './types';

export interface FileVersionHistoryModalProps {
  file: CloudFileItem | null;
  isOpen?: boolean;
  onClose: () => void;
  onRestoreVersion?: (fileId: string, versionNumber: number) => void;
  onRevertVersion?: (versionNumber: number) => void;
  onAddMilestoneName?: (fileId: string, versionNumber: number, nameTag: string) => void;
}

export function FileVersionHistoryModal({
  file,
  isOpen = true,
  onClose,
  onRestoreVersion,
  onRevertVersion,
  onAddMilestoneName,
}: FileVersionHistoryModalProps) {
  const { token, workspace } = useAuth();
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api').replace(/\/+$/, '');
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [isEditingTag, setIsEditingTag] = useState<number | null>(null);
  const [tagInput, setTagInput] = useState('');

  if (!isOpen || !file) return null;

  const versions = file.versions && file.versions.length > 0 ? file.versions : [
    {
      version: 1,
      size: file.size,
      updatedAt: file.updatedAt,
      updatedBy: file.ownerName,
      changeSummary: 'Tải lên phiên bản khởi tạo ban đầu',
    },
  ];

  const formatSize = (bytes: number) => {
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return bytes + ' B';
  };

  const handleSaveTag = (verNum: number) => {
    if (tagInput.trim()) {
      onAddMilestoneName?.(file.id, verNum, tagInput.trim());
      setIsEditingTag(null);
      setTagInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[88vh] font-sans">
        {/* Header */}
        <div className="h-14 px-6 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-zinc-900 truncate">Lịch sử phiên bản tệp</h3>
              <p className="text-[11px] text-zinc-500 truncate">{file.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-600 flex items-center justify-between">
            <div>
              <p className="font-semibold text-zinc-900">Quay ngược thời gian & Khôi phục</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Mọi mốc chỉnh sửa được lưu trữ an toàn. Bấm "Khôi phục" để đưa tệp về bản cũ.
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold text-[10px]">
              {versions.length} phiên bản
            </span>
          </div>

          {/* Timeline List */}
          <div className="space-y-3 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-zinc-200">
            {versions.map((ver, idx) => {
              const isCurrent = idx === 0;

              return (
                <div
                  key={ver.version}
                  className={`relative pl-9 p-3.5 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-blue-50/20 border-blue-200 ring-1 ring-blue-100'
                      : 'bg-white border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  {/* Timeline Dot */}
                  <div
                    className={`absolute left-2.5 top-5 w-3 h-3 rounded-full border-2 border-white shadow-xs ${
                      isCurrent ? 'bg-blue-600 ring-2 ring-blue-200' : 'bg-zinc-400'
                    }`}
                  />

                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-zinc-900">
                        Phiên bản {ver.version}
                      </span>
                      {isCurrent && (
                        <span className="px-1.5 py-0.2 rounded bg-zinc-900 text-white text-[9px] font-bold uppercase tracking-wider">
                          HIỆN TẠI
                        </span>
                      )}

                      {/* Milestone tag badge */}
                      {ver.nameTag && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                          <Tag className="w-2.5 h-2.5 text-amber-600" />
                          <span>{ver.nameTag}</span>
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] text-zinc-400 font-mono">
                      {new Date(ver.updatedAt).toLocaleString('vi-VN')}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-700 mb-2 leading-relaxed">{ver.changeSummary}</p>

                  {/* Metadata and Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-[11px] text-zinc-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-zinc-400" />
                        <span>{ver.updatedBy}</span>
                      </span>
                      <span className="font-mono text-zinc-400">{formatSize(ver.size)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Name Milestone Button */}
                      {isEditingTag === ver.version ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            placeholder="Ví dụ: Bản gửi khách..."
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            className="px-2 py-0.5 text-[10px] border border-zinc-300 rounded bg-white w-32 focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveTag(ver.version)}
                            className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold"
                          >
                            Lưu
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setIsEditingTag(ver.version);
                            setTagInput(ver.nameTag || '');
                          }}
                          className="text-[10px] text-zinc-500 hover:text-zinc-800 flex items-center gap-1 hover:underline"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          <span>{ver.nameTag ? 'Đổi tên mốc' : 'Đặt tên mốc'}</span>
                        </button>
                      )}

                      {!isCurrent && (
                        <button
                          onClick={async () => {
                            if (
                              confirm(
                                `Bạn có chắc muốn khôi phục tệp về Phiên bản ${ver.version}?`
                              )
                            ) {
                              try {
                                const headers: Record<string, string> = {};
                                if (token) headers['Authorization'] = `Bearer ${token}`;
                                if (workspace?.orgId) headers['x-workspace-id'] = workspace.orgId;
                                await fetch(`${apiUrl}/files/${file.id}/versions/${ver.version}/revert`, {
                                  method: 'POST',
                                  headers,
                                });
                              } catch (err) {
                                console.warn('Failed to revert file version:', err);
                              }
                              if (onRestoreVersion) onRestoreVersion(file.id, ver.version);
                              if (onRevertVersion) onRevertVersion(ver.version);
                              onClose();
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-100 hover:bg-zinc-900 hover:text-white text-zinc-800 rounded-lg text-xs font-semibold transition-all"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Khôi phục</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="h-14 px-6 border-t border-zinc-200 bg-zinc-50 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl shadow-xs transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
