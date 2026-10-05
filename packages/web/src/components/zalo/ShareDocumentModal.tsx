'use client';

import React, { useState, useEffect } from 'react';
import { X, FileText, Search, ExternalLink, Clock, Layers } from 'lucide-react';

interface ShareDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShareDocument: (doc: { id: string; title: string; currentVersion: number }) => void;
}

export function ShareDocumentModal({
  isOpen,
  onClose,
  onShareDocument,
}: ShareDocumentModalProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch('http://localhost:8080/api/documents')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDocuments(data.data);
        }
      })
      .catch((err) => {
        // Fallback default docs
        setDocuments([
          { id: 'doc_default_1', title: 'Tài liệu Kiến trúc Hệ thống Phân tán', currentVersion: 3 },
          { id: 'doc_default_2', title: 'Quy trình Chuẩn (SOP) & Triển khai', currentVersion: 1 },
        ]);
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = documents.filter((d) =>
    (d.title || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-md overflow-hidden flex flex-col font-sans">
        <div className="h-14 px-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-zinc-900">Chia sẻ tài liệu Workspace</h3>
              <p className="text-[10px] text-zinc-500">Gửi thẻ tài liệu tương tác vào phòng chat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 border-b border-zinc-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tài liệu..."
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="p-3 max-h-64 overflow-y-auto space-y-1.5">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="p-3 rounded-xl border border-zinc-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-900 truncate">{doc.title || 'Untitled'}</p>
                  <p className="text-[10px] text-zinc-400 font-mono">Phiên bản v{doc.currentVersion || 1}</p>
                </div>
              </div>

              <button
                onClick={() => {
                  onShareDocument({
                    id: doc.id,
                    title: doc.title || 'Untitled Workspace',
                    currentVersion: doc.currentVersion || 1,
                  });
                  onClose();
                }}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0 ml-2"
              >
                Gửi vào chat
              </button>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-6 text-xs text-zinc-400">
              Không tìm thấy tài liệu nào
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
