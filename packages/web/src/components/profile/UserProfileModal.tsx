'use client';

import React, { useState } from 'react';
import * as awarenessProtocol from 'y-protocols/awareness';
import { User, Check, X, Palette, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    id: string;
    name: string;
    color: string;
  };
  awareness?: awarenessProtocol.Awareness;
  onUpdateUser: (updated: { id: string; name: string; color: string }) => void;
}

const COLOR_OPTIONS = [
  '#2563eb', // Blue
  '#059669', // Emerald
  '#dc2626', // Red
  '#7c3aed', // Purple
  '#ea580c', // Orange
  '#0891b2', // Cyan
  '#db2777', // Pink
  '#475569', // Slate
];

export function UserProfileModal({
  isOpen,
  onClose,
  currentUser,
  awareness,
  onUpdateUser,
}: UserProfileModalProps) {
  const { logout, user, workspace } = useAuth();
  const [name, setName] = useState(currentUser.name);
  const [selectedColor, setSelectedColor] = useState(currentUser.color);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim() || 'Anonymous Collaborator';

    localStorage.setItem('collab_user_name', trimmedName);
    localStorage.setItem('collab_user_color', selectedColor);

    const updated = {
      id: currentUser.id,
      name: trimmedName,
      color: selectedColor,
    };

    if (awareness) {
      awareness.setLocalStateField('user', updated);
    }

    onUpdateUser(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200/90 w-full max-w-sm overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150 font-sans">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Collaborator Profile</h3>
              <p className="text-[11px] text-zinc-400">Configure your presence identity</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Rivera"
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all text-zinc-900 font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5 flex items-center justify-between">
              <span>Avatar Color</span>
              <span className="text-[10px] text-zinc-400 font-mono">Live Cursor Color</span>
            </label>
            <div className="grid grid-cols-4 gap-2 pt-1">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className="h-9 rounded-xl flex items-center justify-center transition-transform hover:scale-105 relative"
                  style={{ backgroundColor: c }}
                >
                  {selectedColor === c && <Check className="w-4 h-4 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 truncate">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0"
                style={{ backgroundColor: selectedColor }}
              >
                {(name || 'U').slice(0, 2).toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-zinc-900 truncate">{name || 'Your Name'}</p>
                <p className="text-[10px] text-zinc-500 truncate">{user?.email || currentUser.id}</p>
                {workspace && (
                  <p className="text-[10px] text-blue-600 font-semibold truncate">
                    {workspace.orgName} ({workspace.role.toUpperCase()})
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                await logout();
                onClose();
              }}
              className="px-2.5 py-1 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors shrink-0 cursor-pointer"
            >
              Đăng xuất
            </button>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-xs font-semibold text-zinc-600 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              Lưu Thay Đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
