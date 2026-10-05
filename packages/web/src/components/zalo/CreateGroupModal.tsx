'use client';

import React, { useState } from 'react';
import { X, Users, Search, Check, Camera } from 'lucide-react';
import { ZaloUser } from './types';

interface CreateGroupModalProps {
  isOpen: boolean;
  currentUser: ZaloUser;
  availableUsers: ZaloUser[];
  onClose: () => void;
  onCreateGroup: (name: string, selectedUserIds: string[]) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  currentUser,
  availableUsers,
  onClose,
  onCreateGroup,
}) => {
  const [groupName, setGroupName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState('');

  if (!isOpen) return null;

  const filteredUsers = availableUsers.filter(
    (u) =>
      u.id !== currentUser.id &&
      u.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const toggleUser = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const name = groupName.trim() || `Nhóm của ${currentUser.name}`;
    onCreateGroup(name, [currentUser.id, ...selectedIds]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="h-14 px-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Tạo nhóm trò chuyện</h3>
              <p className="text-[11px] text-zinc-500">Kết nối nhiều đồng nghiệp cùng lúc</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCreate} className="flex flex-col flex-1 overflow-hidden">
          {/* Group Name input */}
          <div className="p-4 border-b border-zinc-100 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 border-2 border-dashed border-blue-300 text-blue-600 flex items-center justify-center shrink-0 cursor-pointer hover:bg-blue-100 transition-colors">
              <Camera className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Nhập tên nhóm..."
                className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                autoFocus
              />
            </div>
          </div>

          {/* Search Member input */}
          <div className="px-4 py-2.5 bg-zinc-50/50 border-b border-zinc-100">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Nhập tên để tìm kiếm người thêm vào nhóm..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Member List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-2 py-1">
              Danh bạ ({filteredUsers.length})
            </div>

            {filteredUsers.map((u) => {
              const isSelected = selectedIds.includes(u.id);
              return (
                <div
                  key={u.id}
                  onClick={() => toggleUser(u.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected ? 'bg-blue-50/80 border border-blue-200/80' : 'hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-xs"
                        style={{ backgroundColor: u.color }}
                      >
                        {u.name.slice(0, 1).toUpperCase()}
                      </div>
                      {u.isOnline && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-900">{u.name}</p>
                      <p className="text-[11px] text-zinc-500 font-mono">
                        {u.phone || 'Thành viên'}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'border-zinc-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer actions */}
          <div className="p-4 border-t border-zinc-100 flex items-center justify-between bg-zinc-50/50">
            <div className="text-xs text-zinc-500">
              Đã chọn: <span className="font-bold text-blue-600">{selectedIds.length}</span> thành viên
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-200/60 rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={selectedIds.length === 0}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm"
              >
                Tạo nhóm ({selectedIds.length + 1})
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
