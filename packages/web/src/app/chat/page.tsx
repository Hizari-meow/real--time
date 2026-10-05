'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bell,
  MessageSquare,
  Users,
  CheckCircle2,
  Moon,
  Clock,
  ExternalLink,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react';
import { TeamCollaborationHub } from '../../components/collaboration/TeamCollaborationHub';
import { NotificationCenterDrawer } from '../../components/collaboration/NotificationCenterDrawer';
import { SEED_NOTIFICATIONS } from '../../components/collaboration/seed-data';

export default function WorkplaceCommunicationPage() {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [currentUserStatus, setCurrentUserStatus] = useState<'online' | 'meeting' | 'away' | 'dnd' | 'focus'>('online');

  const unreadCount = SEED_NOTIFICATIONS.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-zinc-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Top Application Bar */}
      <header className="h-16 px-4 md:px-8 border-b border-zinc-200/80 bg-white flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200/80 hover:bg-zinc-50 text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition-colors shadow-2xs"
            title="Quay lại bảng điều khiển chính"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Không gian làm việc</span>
          </Link>

          <span className="text-zinc-300">/</span>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-zinc-900 tracking-tight leading-none">
                Kênh Giao Tiếp &amp; Họp Trực Tuyến
              </h1>
              <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                Workplace Communication &amp; Collaboration Platform
              </p>
            </div>
          </div>
        </div>

        {/* Right Status & Notification Center Trigger */}
        <div className="flex items-center gap-2.5">
          {/* Status selector */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-50 border border-zinc-200/80 rounded-xl text-xs font-medium">
            <span
              className={`w-2 h-2 rounded-full ${
                currentUserStatus === 'online'
                  ? 'bg-emerald-500 animate-pulse'
                  : currentUserStatus === 'meeting'
                  ? 'bg-amber-500'
                  : currentUserStatus === 'dnd'
                  ? 'bg-rose-500'
                  : 'bg-zinc-400'
              }`}
            />
            <select
              value={currentUserStatus}
              onChange={(e) => setCurrentUserStatus(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-zinc-700 focus:outline-none cursor-pointer"
            >
              <option value="online">Trực tuyến (Online)</option>
              <option value="meeting">Đang họp (Meeting)</option>
              <option value="away">Ra ngoài (Away)</option>
              <option value="dnd">Không làm phiền (DND)</option>
              <option value="focus">Tập trung (Focus Mode)</option>
            </select>
          </div>

          {/* Notification Center Trigger */}
          <button
            onClick={() => setNotificationsOpen(true)}
            className="relative p-2 rounded-xl border border-zinc-200/80 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 transition-colors"
            title="Trung tâm thông báo & Hộp thư (Notifications)"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center ring-2 ring-white shadow-2xs">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Workspace Communication Studio */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
        <TeamCollaborationHub />
      </main>

      {/* Notification Center Drawer */}
      <NotificationCenterDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </div>
  );
}
