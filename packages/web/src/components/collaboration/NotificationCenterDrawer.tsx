'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Moon,
  Clock,
  Sparkles,
  Filter,
  MessageSquare,
  CheckSquare,
  FileText,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  Volume2,
  VolumeX,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { NotificationItem, NotificationPreferences } from './types';
import { TEAM_COMMUNICATION_NORMS } from './seed-data';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api-client';

export interface NotificationCenterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNorms?: () => void;
}

export function NotificationCenterDrawer({
  isOpen,
  onClose,
  onOpenNorms,
}: NotificationCenterDrawerProps) {
  const { token, workspace } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'mention' | 'comment' | 'task' | 'system'>('all');
  const [isDndActive, setIsDndActive] = useState(false);
  const [focusModeDuration, setFocusModeDuration] = useState<number | null>(null);
  const [isNormsOpen, setIsNormsOpen] = useState(false);
  const [showDigestPreview, setShowDigestPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!token && typeof window === 'undefined') return;
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/notifications`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          'x-workspace-id': workspace?.orgId || '',
        },
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.items) {
          const mapped: NotificationItem[] = json.data.items.map((n: any) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            body: n.body,
            senderName: n.senderName,
            senderColor: n.senderColor || '#0068ff',
            timestamp: new Date(n.createdAt).getTime(),
            targetUrl: n.targetUrl,
            targetLabel: n.targetLabel,
            targetDocId: n.targetDocId,
            isRead: n.isRead,
            isPriority: n.isPriority,
          }));
          setNotifications(mapped);
        }
      }
    } catch (err) {
      console.error('[NotificationCenterDrawer] Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync notifications on mount, when opened, or when workspace changes
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }

    const handleUpdate = () => {
      fetchNotifications();
    };

    window.addEventListener('collab_notification_added', handleUpdate);
    window.addEventListener('collab_notification_read', handleUpdate);
    return () => {
      window.removeEventListener('collab_notification_added', handleUpdate);
      window.removeEventListener('collab_notification_read', handleUpdate);
    };
  }, [isOpen, token, workspace?.orgId]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'all') return true;
    return n.type === activeFilter;
  });

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'PATCH',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          'x-workspace-id': workspace?.orgId || '',
        },
        credentials: 'include',
      });
      window.dispatchEvent(new CustomEvent('collab_notification_read_all'));
    } catch (err) {
      console.error('[NotificationCenterDrawer] Error marking all as read:', err);
    }
  };

  const handleMarkSingleAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          'x-workspace-id': workspace?.orgId || '',
        },
        credentials: 'include',
      });
      window.dispatchEvent(new CustomEvent('collab_notification_read', { detail: { id } }));
    } catch (err) {
      console.error(`[NotificationCenterDrawer] Error marking ${id} as read:`, err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-zinc-200/80 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-900">Trung Tâm Thông Báo</h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-600 text-white font-mono">
                    {unreadCount} mới
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">Giao tiếp gắn với công việc &amp; tài liệu</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="p-1.5 text-zinc-500 hover:text-blue-600 rounded-lg text-xs flex items-center gap-1 font-medium hover:bg-zinc-100 transition-colors"
                title="Đánh dấu tất cả là đã đọc"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Anti-Overload Control Bar (Chống Quá Tải Thông Báo) */}
        <div className="p-3 bg-zinc-50/80 border-b border-zinc-100 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-zinc-600 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
                Kiểm soát sự tập trung:
              </span>
            </div>

            {/* DND Switch */}
            <button
              onClick={() => setIsDndActive(!isDndActive)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                isDndActive
                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                  : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200'
              }`}
            >
              {isDndActive ? <VolumeX className="w-3 h-3 text-rose-600" /> : <Volume2 className="w-3 h-3 text-zinc-400" />}
              <span>{isDndActive ? 'Giờ yên tĩnh (Bật)' : 'Giờ yên tĩnh'}</span>
            </button>
          </div>

          {/* Focus mode presets & Digest trigger */}
          <div className="flex items-center justify-between gap-1 text-[11px]">
            <div className="flex items-center gap-1">
              <span className="text-zinc-400 text-[10px]">Tập trung:</span>
              {[
                { label: 'Tắt', value: null },
                { label: '30p', value: 30 },
                { label: '1h', value: 60 },
                { label: '2h', value: 120 },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setFocusModeDuration(item.value)}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                    focusModeDuration === item.value
                      ? 'bg-zinc-900 text-white font-semibold'
                      : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowDigestPreview(!showDigestPreview)}
              className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 font-medium"
            >
              <Sparkles className="w-3 h-3 text-blue-500" />
              <span>Gom bản tin</span>
            </button>
          </div>

          {/* Digest Preview Box */}
          {showDigestPreview && (
            <div className="p-2.5 bg-blue-50/70 border border-blue-200/60 rounded-xl text-xs space-y-1 animate-in fade-in">
              <div className="flex items-center justify-between font-bold text-blue-900 text-[11px]">
                <span>Bản Tin Tóm Tắt (Smart Digest)</span>
                <span className="font-mono text-[10px] text-blue-600">08:30 &amp; 17:30</span>
              </div>
              <p className="text-[11px] text-zinc-600 leading-snug">
                Thay vì rung chuông liên tục, hệ thống gom 12 thông báo không khẩn cấp vào bản tin sáng lúc 08:30 và chiều lúc 17:30 giúp bạn duy trì luồng làm việc sâu (Deep Work).
              </p>
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="px-3 pt-2 pb-1 border-b border-zinc-100 flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'mention', label: '@Nhắc tên' },
            { id: 'comment', label: 'Bình luận' },
            { id: 'task', label: 'Nhiệm vụ' },
            { id: 'system', label: 'Hệ thống' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                activeFilter === tab.id
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 text-xs">
              Không có thông báo nào trong mục này.
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleMarkSingleAsRead(n.id)}
                className={`p-3.5 hover:bg-zinc-50/80 transition-colors flex items-start gap-3 cursor-pointer group ${
                  !n.isRead ? 'bg-blue-50/30' : ''
                }`}
              >
                {/* Avatar / Icon */}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-2xs"
                  style={{ backgroundColor: n.senderColor }}
                >
                  {n.senderName.slice(0, 1).toUpperCase()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs truncate ${!n.isRead ? 'font-bold text-zinc-900' : 'font-medium text-zinc-700'}`}>
                      {n.title}
                    </p>
                    <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                      {new Date(n.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed">
                    {n.body}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <Link
                      href={n.targetUrl}
                      onClick={onClose}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                    >
                      <span>Mở: {n.targetLabel}</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>

                    {n.isPriority && (
                      <span className="px-1.5 py-0.2 rounded-md bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                        Ưu tiên cao
                      </span>
                    )}
                  </div>
                </div>

                {!n.isRead && (
                  <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer with Norms Cheat Sheet Link */}
        <div className="p-3 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between text-xs">
          <button
            onClick={() => setIsNormsOpen(true)}
            className="flex items-center gap-1.5 text-zinc-600 hover:text-blue-600 font-medium"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>Quy ước giao tiếp văn minh</span>
          </button>
          <span className="text-[10px] text-zinc-400 font-mono">Đồng bộ đa thiết bị</span>
        </div>
      </div>

      {/* Norms Dialog Modal */}
      {isNormsOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>Quy Ước Giao Tiếp &amp; Trao Đổi Trong Nhóm</span>
                </h3>
                <p className="text-xs text-zinc-500">Giữ ngữ cảnh, tránh ngập thông báo và nâng cao hiệu suất làm việc.</p>
              </div>
              <button
                onClick={() => setIsNormsOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {TEAM_COMMUNICATION_NORMS.map((norm, idx) => (
                <div key={idx} className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/60 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900">{norm.situation}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                      {norm.badge}
                    </span>
                  </div>
                  <p className="text-zinc-700 font-medium">➡️ {norm.recommendedTool}</p>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">{norm.rationale}</p>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsNormsOpen(false)}
                className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-black"
              >
                Đã hiểu quy ước
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
