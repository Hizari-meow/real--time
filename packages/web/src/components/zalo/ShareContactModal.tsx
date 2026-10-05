'use client';

import React, { useState } from 'react';
import { X, UserCheck, Search, Send } from 'lucide-react';
import { ZaloUser } from './types';

interface ShareContactModalProps {
  isOpen: boolean;
  users: ZaloUser[];
  onShare: (user: ZaloUser) => void;
  onClose: () => void;
}

export function ShareContactModal({ isOpen, users, onShare, onClose }: ShareContactModalProps) {
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<ZaloUser | null>(null);

  if (!isOpen) return null;

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      (u.phone && u.phone.includes(search))
  );

  const handleSend = () => {
    if (selectedUser) {
      onShare(selectedUser);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200 w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
        <div className="h-16 px-6 border-b border-zinc-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Gửi danh thiếp liên hệ</h3>
              <p className="text-[11px] text-zinc-500">Chia sẻ thông tin đồng nghiệp vào nhóm</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
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
              placeholder="Tìm theo tên hoặc số điện thoại..."
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {filtered.map((u) => {
            const isSelected = selectedUser?.id === u.id;
            return (
              <div
                key={u.id}
                onClick={() => setSelectedUser(u)}
                className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer border transition-all ${
                  isSelected
                    ? 'bg-blue-50/70 border-blue-200 text-blue-950 shadow-xs'
                    : 'bg-white border-transparent hover:bg-zinc-50 text-zinc-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-xs shadow-xs"
                    style={{ backgroundColor: u.color }}
                  >
                    {u.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{u.name}</p>
                    <p className="text-[10px] text-zinc-400 font-mono">{u.phone || 'Chưa cập nhật số'}</p>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-zinc-300'
                  }`}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-200/70 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSend}
            disabled={!selectedUser}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white shadow-xs transition-transform active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Gửi danh thiếp</span>
          </button>
        </div>
      </div>
    </div>
  );
}
