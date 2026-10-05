'use client';

import React from 'react';
import {
  Hash,
  Lock,
  Search,
  Pin,
  Bookmark,
  Plus,
} from 'lucide-react';
import {
  WorkplaceChannel,
  WorkplaceMessage,
  UserPresenceStatus,
} from '@/components/collaboration/types';

interface ChannelSidebarProps {
  channels: WorkplaceChannel[];
  selectedChannelId: string;
  setSelectedChannelId: (id: string) => void;
  setActiveThreadMessage: (m: WorkplaceMessage | null) => void;
  selectedUserPresence: UserPresenceStatus;
  setSelectedUserPresence: (s: UserPresenceStatus) => void;
  channelSearch: string;
  setChannelSearch: (s: string) => void;
  pinnedOnlyFilter: boolean;
  setPinnedOnlyFilter: (b: boolean) => void;
  bookmarkedOnlyFilter: boolean;
  setBookmarkedOnlyFilter: (b: boolean) => void;
  setCreateChannelModalOpen: (b: boolean) => void;
  showToast: (msg: string) => void;
}

export function ChannelSidebar({
  channels,
  selectedChannelId,
  setSelectedChannelId,
  setActiveThreadMessage,
  selectedUserPresence,
  setSelectedUserPresence,
  channelSearch,
  setChannelSearch,
  pinnedOnlyFilter,
  setPinnedOnlyFilter,
  bookmarkedOnlyFilter,
  setBookmarkedOnlyFilter,
  setCreateChannelModalOpen,
  showToast,
}: ChannelSidebarProps) {
  return (
    <div className="w-full md:w-72 border-r border-zinc-200/80 flex flex-col h-full bg-zinc-50/60 shrink-0">
      {/* User Presence Card */}
      <div className="p-3 border-b border-zinc-200/60 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative">
            <div className="w-7 h-7 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow-xs">
              N
            </div>
            <span
              className={`w-2 h-2 rounded-full absolute -bottom-0.5 -right-0.5 ring-1 ring-white ${
                selectedUserPresence === 'online'
                  ? 'bg-emerald-500'
                  : selectedUserPresence === 'meeting'
                  ? 'bg-amber-500'
                  : selectedUserPresence === 'dnd'
                  ? 'bg-rose-500'
                  : 'bg-zinc-400'
              }`}
            />
          </div>
          <div className="truncate">
            <p className="text-xs font-bold text-zinc-900 truncate">Nguyễn Văn Nam</p>
            <select
              value={selectedUserPresence}
              onChange={(e) => {
                setSelectedUserPresence(e.target.value as any);
                showToast(`Đã đổi trạng thái sang "${e.target.value}".`);
              }}
              className="text-[10px] font-medium text-zinc-500 bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
            >
              <option value="online">🟢 Đang online</option>
              <option value="meeting">🟡 Đang họp</option>
              <option value="dnd">🔴 Đừng làm phiền</option>
              <option value="away">⚪ Vắng mặt</option>
              <option value="focus">🟣 Tập trung</option>
            </select>
          </div>
        </div>
        <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[9px] font-mono font-bold uppercase tracking-wider">
          Lead
        </span>
      </div>

      {/* Search Bar & Filter Buttons */}
      <div className="p-2.5 space-y-2 border-b border-zinc-200/60 bg-white/70">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={channelSearch}
            onChange={(e) => setChannelSearch(e.target.value)}
            placeholder="Tìm kiếm kênh hoặc tin..."
            className="w-full pl-8 pr-2.5 py-1.5 bg-zinc-100 rounded-xl text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 text-[11px]">
          <button
            onClick={() => setPinnedOnlyFilter(!pinnedOnlyFilter)}
            className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg font-medium transition-colors ${
              pinnedOnlyFilter ? 'bg-amber-100 text-amber-900 font-bold' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            <Pin className="w-3 h-3" />
            <span>Ghim</span>
          </button>
          <button
            onClick={() => setBookmarkedOnlyFilter(!bookmarkedOnlyFilter)}
            className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg font-medium transition-colors ${
              bookmarkedOnlyFilter ? 'bg-blue-100 text-blue-900 font-bold' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            <Bookmark className="w-3 h-3" />
            <span>Đánh dấu</span>
          </button>
        </div>
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {(
          [
            { cat: 'project', label: 'Kênh Dự Án' },
            { cat: 'team', label: 'Kênh Phòng Ban' },
            { cat: 'topic', label: 'Chủ Đề & Thảo Luận' },
            { cat: 'external', label: 'Đối Tác & Khách Ngoài' },
            { cat: 'dm', label: 'Tin Nhắn Riêng (1-1)' },
          ] as const
        ).map((group) => {
          const list = channels.filter((c) => c.category === group.cat);
          if (list.length === 0) return null;

          return (
            <div key={group.cat} className="space-y-1">
              <div className="flex items-center justify-between px-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                <span>{group.label}</span>
                <span className="font-mono text-zinc-400">{list.length}</span>
              </div>

              <div className="space-y-0.5">
                {list.map((chan) => (
                  <button
                    key={chan.id}
                    onClick={() => {
                      setSelectedChannelId(chan.id);
                      setActiveThreadMessage(null);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                      selectedChannelId === chan.id
                        ? 'bg-zinc-900 text-white shadow-2xs'
                        : 'text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {chan.isPrivate ? (
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                      ) : chan.category === 'dm' ? (
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      ) : (
                        <Hash className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span className="truncate">{chan.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {chan.hasActiveHuddle && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      )}
                      {chan.unreadCount ? (
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                            selectedChannelId === chan.id
                              ? 'bg-white text-zinc-900'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {chan.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Add Channel Button */}
      <div className="p-2 border-t border-zinc-200/60 bg-white shrink-0">
        <button
          onClick={() => setCreateChannelModalOpen(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 border border-dashed border-zinc-300 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-50 hover:border-zinc-400 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm kênh mới</span>
        </button>
      </div>
    </div>
  );
}
