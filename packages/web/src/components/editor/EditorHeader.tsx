'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import * as awarenessProtocol from 'y-protocols/awareness';
import {
  ChevronRight,
  MessageSquare,
  History,
  User,
  Check,
  CheckCheck,
  Wifi,
  WifiOff,
  RefreshCw,
  FileText,
  Clock,
  ExternalLink,
  Edit2,
  Share2,
  LayoutGrid,
  Palette,
  CheckSquare,
  Headphones,
  Bell,
  Hash,
} from 'lucide-react';
import { PresenceBar } from '../presence/PresenceBar';
import { ConnectionStatus } from '@collab/shared';

export interface EditorHeaderProps {
  documentId: string;
  documentTitle: string;
  onTitleChange: (newTitle: string) => void;
  status: ConnectionStatus;
  isSynced: boolean;
  awareness: awarenessProtocol.Awareness;
  currentUser: {
    id: string;
    name: string;
    color: string;
  };
  wordCount: number;
  charCount: number;
  unreadChatCount: number;
  isChatOpen: boolean;
  onToggleChat: () => void;
  isHistoryOpen: boolean;
  onToggleHistory: () => void;
  onOpenProfile: () => void;
  onOpenShare?: () => void;
  onFollowUser?: (user: { id: string; name: string; color: string } | null) => void;
  followingUserId?: string | null;
  onToggleHuddle?: () => void;
  isHuddleActive?: boolean;
  onToggleNotifications?: () => void;
  unreadNotificationsCount?: number;
}

export function EditorHeader({
  documentId,
  documentTitle,
  onTitleChange,
  status,
  isSynced,
  awareness,
  currentUser,
  wordCount,
  charCount,
  unreadChatCount,
  isChatOpen,
  onToggleChat,
  isHistoryOpen,
  onToggleHistory,
  onOpenProfile,
  onOpenShare,
  onFollowUser,
  followingUserId,
  onToggleHuddle,
  isHuddleActive,
  onToggleNotifications,
  unreadNotificationsCount = 0,
}: EditorHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(documentTitle);
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  useEffect(() => {
    setTitleInput(documentTitle);
  }, [documentTitle]);

  const handleSaveTitle = async () => {
    const trimmed = titleInput.trim();
    if (!trimmed || trimmed === documentTitle) {
      setIsEditingTitle(false);
      return;
    }

    setIsSavingTitle(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
      const res = await fetch(`${apiUrl}/documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });
      const data = await res.json();
      if (data.success) {
        onTitleChange(trimmed);
      }
    } catch (err) {
      console.error('Failed to update title:', err);
    } finally {
      setIsSavingTitle(false);
      setIsEditingTitle(false);
    }
  };

  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <header className="h-14 px-4 md:px-6 bg-white border-b border-zinc-200/80 flex items-center justify-between sticky top-0 z-30 font-sans shadow-xs">
      {/* Left: Breadcrumbs & Editable Title & Suite Quick Links */}
      <div className="flex items-center gap-2 max-w-[55%]">
        <Link
          href="/"
          className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-1.5 shrink-0"
        >
          <div className="w-6 h-6 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-[10px] shadow-xs">
            CW
          </div>
          <span className="hidden sm:inline font-bold text-zinc-900">Workspace</span>
        </Link>

        <ChevronRight className="w-3.5 h-3.5 text-zinc-300 shrink-0" />

        {/* In-place Editable Title */}
        {isEditingTitle ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveTitle();
            }}
            className="flex items-center gap-1 min-w-[200px]"
          >
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleSaveTitle}
              autoFocus
              className="text-xs font-semibold text-zinc-900 px-2 py-1 rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 w-full"
            />
            {isSavingTitle && <RefreshCw className="w-3 h-3 text-zinc-400 animate-spin" />}
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditingTitle(true)}
            className="group flex items-center gap-1.5 text-xs font-bold text-zinc-900 hover:bg-zinc-100 px-2 py-1 rounded-lg transition-colors truncate text-left"
            title="Nhấp để đổi tên tài liệu"
          >
            <span className="truncate max-w-[240px] sm:max-w-[320px]">{documentTitle}</span>
            <Edit2 className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </button>
        )}

        {/* Quick Suite Jump (Whiteboard, Tasks) */}
        <div className="hidden xl:flex items-center gap-1 pl-2 border-l border-zinc-200">
          <Link
            href="/whiteboard"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors flex items-center gap-1 text-[11px] font-medium"
            title="Mở Bảng trắng ý tưởng"
          >
            <Palette className="w-3.5 h-3.5 text-purple-600" />
            <span>Bảng trắng</span>
          </Link>
          <Link
            href="/tasks"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors flex items-center gap-1 text-[11px] font-medium"
            title="Mở Bảng quản lý dự án & nhiệm vụ"
          >
            <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
            <span>Quản lý việc</span>
          </Link>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Document Stats Pill */}
        <div className="hidden 2xl:flex items-center gap-2 text-[11px] text-zinc-400 font-mono border-r border-zinc-200 pr-3">
          <span>{wordCount} từ</span>
          <span>•</span>
          <span>{charCount} ký tự</span>
          <span>•</span>
          <span>{readingTimeMinutes} phút đọc</span>
        </div>

        {/* Sync & Connection Status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border bg-zinc-50 border-zinc-200 text-zinc-600">
          {status === 'CONNECTED' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">{isSynced ? 'Đã lưu đám mây' : 'Đang đồng bộ...'}</span>
            </>
          ) : status === 'CONNECTING' || status === 'RECONNECTING' ? (
            <>
              <RefreshCw className="w-3 h-3 text-amber-500 animate-spin" />
              <span className="hidden sm:inline">Đang kết nối...</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="hidden sm:inline">Ngoại tuyến (IndexedDB)</span>
            </>
          )}
        </div>

        {/* Presence Bar with Live Follow Cursor capability */}
        <PresenceBar
          awareness={awareness}
          currentUserId={currentUser.id}
          onFollowUser={onFollowUser}
          followingUserId={followingUserId}
        />

        {/* Share Button (Chia sẻ & Phân quyền) */}
        {onOpenShare && (
          <button
            type="button"
            onClick={onOpenShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-transform active:scale-95"
            title="Chia sẻ liên kết & Cài đặt phân quyền"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Chia sẻ</span>
          </button>
        )}

        {/* Link to Team Workplace Chat */}
        <Link
          href="/chat"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700 border border-zinc-200/80 transition-colors"
          title="Mở Kênh trao đổi nhóm & Họp trực tuyến"
        >
          <Hash className="w-3.5 h-3.5 text-zinc-500" />
          <span className="hidden md:inline">Kênh trao đổi</span>
        </Link>

        {/* In-Doc Instant Audio Huddle Button */}
        {onToggleHuddle && (
          <button
            type="button"
            onClick={onToggleHuddle}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isHuddleActive
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
            }`}
            title="Bật phòng thoại nhanh (Audio Huddle) trong tài liệu này"
          >
            <Headphones className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{isHuddleActive ? 'Huddle Đang bật' : 'Họp nhanh'}</span>
          </button>
        )}

        {/* Notifications Bell Button */}
        {onToggleNotifications && (
          <button
            type="button"
            onClick={onToggleNotifications}
            className="relative p-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 transition-colors"
            title="Trung tâm thông báo & Hộp thư"
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                {unreadNotificationsCount}
              </span>
            )}
          </button>
        )}

        {/* Discussion / Chat Drawer Toggle */}
        <button
          onClick={onToggleChat}
          className={`relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            isChatOpen
              ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs'
              : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300'
          }`}
          title="Mở kênh trao đổi tài liệu"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Trao đổi</span>
          {unreadChatCount > 0 && !isChatOpen && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
              {unreadChatCount}
            </span>
          )}
        </button>

        {/* Version History Toggle */}
        <button
          onClick={onToggleHistory}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            isHistoryOpen
              ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs'
              : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300'
          }`}
          title="Lịch sử phiên bản và khôi phục snapshot"
        >
          <History className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Lịch sử</span>
        </button>

        {/* User Identity Profile Button */}
        <button
          onClick={onOpenProfile}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-zinc-200 hover:ring-zinc-400 transition-all shadow-xs"
          style={{ backgroundColor: currentUser.color }}
          title={`Danh tính: ${currentUser.name} (Bấm để đổi tên/màu)`}
        >
          {currentUser.name.slice(0, 1).toUpperCase()}
        </button>
      </div>
    </header>
  );
}
