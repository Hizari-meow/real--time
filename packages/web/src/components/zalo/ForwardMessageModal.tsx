'use client';

import React, { useState } from 'react';
import { X, Search, Send, Users, Check } from 'lucide-react';
import { ZaloConversation, ZaloMessage } from './types';

interface ForwardMessageModalProps {
  isOpen: boolean;
  message: ZaloMessage | null;
  conversations: ZaloConversation[];
  currentRoomId: string;
  onForward: (targetRoomId: string) => void;
  onClose: () => void;
}

export function ForwardMessageModal({
  isOpen,
  message,
  conversations,
  currentRoomId,
  onForward,
  onClose,
}: ForwardMessageModalProps) {
  const [search, setSearch] = useState('');
  const [forwardedRooms, setForwardedRooms] = useState<string[]>([]);

  if (!isOpen || !message) return null;

  const filtered = conversations.filter(
    (c) => c.id !== currentRoomId && c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSend = (roomId: string) => {
    onForward(roomId);
    setForwardedRooms((prev) => [...prev, roomId]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200 w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="h-16 px-6 border-b border-zinc-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-bold text-zinc-900">Chuyển tiếp tin nhắn</h3>
            <p className="text-[11px] text-zinc-500 truncate max-w-xs">
              "{message.content || 'Đính kèm phương tiện'}"
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-zinc-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm người nhận hoặc nhóm..."
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-zinc-900"
            />
          </div>
        </div>

        {/* List of targets */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              Không tìm thấy hội thoại phù hợp
            </div>
          ) : (
            filtered.map((c) => {
              const isSent = forwardedRooms.includes(c.id);

              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
                      style={{ backgroundColor: c.members[0]?.color || '#2563eb' }}
                    >
                      {c.type === 'group' ? (
                        <Users className="w-5 h-5 text-white" />
                      ) : (
                        c.name.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-semibold text-zinc-900 truncate">{c.name}</p>
                      <p className="text-[10px] text-zinc-400 font-mono">
                        {c.type === 'group' ? `${c.members.length} thành viên` : 'Hội thoại trực tiếp'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSend(c.id)}
                    disabled={isSent}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isSent
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs active:scale-95'
                    }`}
                  >
                    {isSent ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Đã gửi</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3" />
                        <span>Gửi</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-200/70 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
