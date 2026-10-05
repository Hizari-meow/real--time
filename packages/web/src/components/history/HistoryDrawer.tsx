'use client';

import React, { useState, useEffect } from 'react';
import { History, X, RotateCcw, Clock, CheckCircle2, AlertCircle, HardDrive, ShieldCheck } from 'lucide-react';
import { formatDate } from '../../lib/utils';

export interface HistoryDrawerProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
  onRestored?: (newVersion: number) => void;
}

interface MilestoneItem {
  id: string;
  documentId: string;
  version: number;
  authorId: string | null;
  author?: { name: string; email: string } | null;
  changeSummary: string;
  createdAt: string;
  snapshot?: {
    id: string;
    byteSize: number;
    mutationCount: number;
    s3Key: string;
  } | null;
}

export function HistoryDrawer({
  documentId,
  isOpen,
  onClose,
  onRestored,
}: HistoryDrawerProps) {
  const [history, setHistory] = useState<MilestoneItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
      const res = await fetch(`${apiUrl}/documents/${documentId}/history`);
      const data = await res.json();
      if (data.success) {
        setHistory(data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, documentId]);

  const handleRestore = async (version: number) => {
    if (!confirm(`Rollback to Version ${version}? Connected peers will synchronize state immediately.`)) {
      return;
    }

    setRestoringId(String(version));
    setFeedback(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
      const res = await fetch(`${apiUrl}/documents/${documentId}/restore/${version}`, {
        method: 'POST',
      });
      const data = await res.json();

      if (data.success) {
        setFeedback({
          type: 'success',
          message: `Restored state to Version ${version}. Broadcasted to all peers.`,
        });
        await fetchHistory();
        onRestored?.(data.data.newVersion);
      } else {
        setFeedback({ type: 'error', message: data.error || 'Restore failed' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setRestoringId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-white shadow-2xl border-l border-zinc-200/80 z-40 flex flex-col font-sans animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="h-14 px-4 border-b border-zinc-200/80 flex items-center justify-between bg-zinc-50/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
              Version Timeline
            </h3>
            <p className="text-[11px] text-zinc-500 font-mono">
              MinIO S3 Snapshots • Postgres
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-zinc-200/60 text-zinc-500 hover:text-zinc-800 transition-colors"
          title="Close history (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`mx-4 mt-3 p-3 rounded-xl text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/30">
        {loading ? (
          <div className="text-center py-12 text-xs text-zinc-400">Loading checkpoints...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-xs text-zinc-400 max-w-[220px] mx-auto">
            No snapshots recorded yet. Mutations will auto-snapshot after 5s idle or 100 keystrokes.
          </div>
        ) : (
          history.map((item, idx) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border transition-all ${
                idx === 0
                  ? 'border-zinc-900 bg-white shadow-xs'
                  : 'border-zinc-200/80 bg-white hover:border-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-zinc-900 font-mono">
                    v{item.version}
                  </span>
                  {idx === 0 && (
                    <span className="text-[9px] bg-zinc-900 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                      LATEST
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-zinc-400 flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3" />
                  {formatDate(item.createdAt)}
                </span>
              </div>

              <p className="text-xs text-zinc-600 mb-2 leading-relaxed">{item.changeSummary}</p>

              {item.snapshot && (
                <div className="flex items-center gap-2 mb-2 text-[10px] text-zinc-400 font-mono bg-zinc-50 px-2 py-1 rounded-md border border-zinc-100">
                  <HardDrive className="w-3 h-3 text-zinc-500" />
                  <span>{(item.snapshot.byteSize / 1024).toFixed(1)} KB</span>
                  <span>•</span>
                  <span>{item.snapshot.mutationCount} mutations</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-[11px] text-zinc-500">
                <span className="truncate max-w-[140px]">
                  By{' '}
                  <span className="font-medium text-zinc-700">
                    {item.author?.name || 'System Auto'}
                  </span>
                </span>

                {idx !== 0 && (
                  <button
                    onClick={() => handleRestore(item.version)}
                    disabled={restoringId === String(item.version)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-100 hover:bg-zinc-900 hover:text-white text-zinc-800 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{restoringId === String(item.version) ? 'Restoring...' : 'Restore'}</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
