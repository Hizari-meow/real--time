'use client';

import React from 'react';
import {
  Bell,
  Sparkles,
} from 'lucide-react';
import { NotificationItem } from '@/components/collaboration/types';
import { TEAM_COMMUNICATION_NORMS } from '@/components/collaboration/seed-data';

interface NotificationsTabProps {
  notifications: NotificationItem[];
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  notificationFilter: 'all' | 'mention' | 'comment' | 'task' | 'watch' | 'meeting' | 'system' | 'dm';
  setNotificationFilter: (f: 'all' | 'mention' | 'comment' | 'task' | 'watch' | 'meeting' | 'system' | 'dm') => void;
  isDndActive: boolean;
  setIsDndActive: (b: boolean | ((prev: boolean) => boolean)) => void;
  focusCountdown: string | null;
  focusModeUntil: number | null;
  setFocusModeUntil: (n: number | null) => void;
  digestExpanded: boolean;
  setDigestExpanded: (b: boolean | ((prev: boolean) => boolean)) => void;
  setMobilePushPreviewOpen: (b: boolean) => void;
  isDeduplicationActive: boolean;
  setIsDeduplicationActive: (b: boolean | ((prev: boolean) => boolean)) => void;
  setChannelPrefModalOpen: (b: boolean) => void;
  handleTriggerDesktopPush: () => void;
  setActiveTab: (t: 'channels' | 'meetings' | 'comments' | 'notifications') => void;
  showToast: (msg: string) => void;
}

export function NotificationsTab({
  notifications,
  setNotifications,
  notificationFilter,
  setNotificationFilter,
  isDndActive,
  setIsDndActive,
  focusCountdown,
  focusModeUntil,
  setFocusModeUntil,
  digestExpanded,
  setDigestExpanded,
  setMobilePushPreviewOpen,
  isDeduplicationActive,
  setIsDeduplicationActive,
  setChannelPrefModalOpen,
  handleTriggerDesktopPush,
  setActiveTab,
  showToast,
}: NotificationsTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-xs space-y-6">
        {/* Notification Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600" />
              <span>Trung Tâm Thông Báo Tức Thời &amp; Kiểm Soát Sự Tập Trung</span>
            </h3>
            <p className="text-xs text-zinc-500">
              Thông báo thông minh gắn với công việc, hỗ trợ chế độ Deep Work tránh ngập thông báo (Notification Fatigue).
            </p>
          </div>

          {/* DND Toggle & Actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-semibold">
              <span>Giờ yên tĩnh (DND):</span>
              <button
                onClick={() => {
                  setIsDndActive((prev) => !prev);
                  showToast(isDndActive ? 'Đã tắt DND, nhận lại thông báo bình thường.' : 'Đã bật DND, tạm hoãn mọi chuông thông báo.');
                }}
                className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                  isDndActive ? 'bg-rose-600' : 'bg-zinc-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    isDndActive ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <button
              onClick={() => setChannelPrefModalOpen(true)}
              className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 rounded-xl text-xs font-semibold text-zinc-700 transition-colors"
            >
              Tùy chỉnh theo kênh
            </button>

            <button
              onClick={() => {
                setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
                showToast('Đã đánh dấu tất cả thông báo là đã đọc!');
              }}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors"
            >
              Đọc tất cả
            </button>
          </div>
        </div>

        {/* Filter Tabs Bar with Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-zinc-100 text-xs">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'mention', label: '@Nhắc tên' },
            { id: 'comment', label: 'Bình luận' },
            { id: 'task', label: 'Nhiệm vụ & Hạn chót' },
            { id: 'watch', label: 'Tài liệu theo dõi' },
            { id: 'meeting', label: 'Cuộc họp & Lời mời' },
            { id: 'dm', label: 'Tin nhắn riêng 1-1' },
            { id: 'system', label: 'Bot cảnh báo' },
          ].map((tab) => {
            const count = tab.id === 'all'
              ? notifications.filter((n) => !n.isRead).length
              : notifications.filter((n) => !n.isRead && n.type === tab.id).length;
            return (
              <button
                key={tab.id}
                onClick={() => setNotificationFilter(tab.id as any)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold shrink-0 transition-all ${
                  notificationFilter === tab.id
                    ? 'bg-zinc-900 text-white shadow-2xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    notificationFilter === tab.id ? 'bg-white text-zinc-900' : 'bg-blue-600 text-white'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Focus Mode & Deduplication Controls Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: Focus Mode (Pomodoro Deep Work) */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex flex-col justify-between text-xs space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                🎯
              </div>
              <div>
                <span className="font-bold text-blue-950 block">Chế Độ Tập Trung (Focus Mode):</span>
                <span className="text-[11px] text-zinc-600">
                  {focusCountdown
                    ? `Đang khóa thông báo. Còn lại: ${focusCountdown}`
                    : 'Khóa thông báo tạm thời để làm việc sâu.'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 pt-1">
              <button
                onClick={() => {
                  setFocusModeUntil(Date.now() + 25 * 60 * 1000);
                  showToast('Đã kích hoạt Pomodoro 25 phút!');
                }}
                className="px-2 py-1 bg-white border border-blue-200 hover:bg-blue-100 text-blue-800 rounded-lg text-[11px] font-semibold"
              >
                25p (Pomodoro)
              </button>
              <button
                onClick={() => {
                  setFocusModeUntil(Date.now() + 45 * 60 * 1000);
                  showToast('Đã kích hoạt Focus 45 phút!');
                }}
                className="px-2 py-1 bg-white border border-blue-200 hover:bg-blue-100 text-blue-800 rounded-lg text-[11px] font-semibold"
              >
                45p
              </button>
              {focusModeUntil && (
                <button
                  onClick={() => {
                    setFocusModeUntil(null);
                    showToast('Đã dừng chế độ tập trung.');
                  }}
                  className="px-2 py-1 text-rose-600 hover:underline font-bold text-[11px]"
                >
                  Dừng
                </button>
              )}
            </div>
          </div>

          {/* Card 2: Desktop Push & Mobile Push Simulator */}
          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl flex flex-col justify-between text-xs space-y-2">
            <div>
              <span className="font-bold text-zinc-900 block">Kênh Phân Phối Thông Báo:</span>
              <p className="text-[11px] text-zinc-500">Nhận trên màn hình máy tính (Desktop) hoặc trên điện thoại (Mobile Push).</p>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <button
                onClick={handleTriggerDesktopPush}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold shadow-2xs"
              >
                Test Desktop Push
              </button>
              <button
                onClick={() => setMobilePushPreviewOpen(true)}
                className="px-2.5 py-1 bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 rounded-lg text-[11px] font-semibold"
              >
                Xem Mobile Push
              </button>
            </div>
          </div>

          {/* Card 3: Deduplication & Smart Digest */}
          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl flex flex-col justify-between text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-900">Gộp Thông Báo &amp; Digest:</span>
              <button
                onClick={() => {
                  setIsDeduplicationActive((prev) => !prev);
                  showToast(isDeduplicationActive ? 'Đã tắt gộp thông báo trùng lặp.' : 'Đã bật gộp tự động thông báo trùng lặp.');
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isDeduplicationActive ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-600'
                }`}
              >
                {isDeduplicationActive ? 'Đã gộp trùng' : 'Gộp thông báo'}
              </button>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-zinc-500">Bản tin tóm tắt 08:30 &amp; 17:30</span>
              <button
                onClick={() => setDigestExpanded((prev) => !prev)}
                className="text-blue-600 hover:underline font-semibold text-[11px]"
              >
                {digestExpanded ? 'Thu gọn' : 'Xem trước bản tin'}
              </button>
            </div>
          </div>
        </div>

        {/* Smart Digest Expanded Preview Box */}
        {digestExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50/40 border border-blue-200 rounded-2xl text-xs animate-in fade-in">
            <div className="p-3 bg-white rounded-xl border border-zinc-200 space-y-1">
              <span className="font-bold text-zinc-900 block flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Bản Tin Tóm Tắt Sáng (08:30)</span>
              </span>
              <p className="text-zinc-600 text-[11px] leading-relaxed">
                • 2 tài liệu cập nhật trong đêm: RFC Consensus v4, Kế hoạch Q4.<br />
                • 1 nhiệm vụ đến hạn hôm nay: Kiểm thử hội tụ CRDT 500 CCU.<br />
                • Cuộc họp lúc 10:00: Sprint Review cùng Alice và Linh.
              </p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-zinc-200 space-y-1">
              <span className="font-bold text-zinc-900 block flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Bản Tin Tóm Tắt Chiều (17:30)</span>
              </span>
              <p className="text-zinc-600 text-[11px] leading-relaxed">
                • Tổng kết 4 PR đã được merge trên nhánh main bởi Lê Hoàng.<br />
                • 2 bình luận đề xuất sửa đổi đang chờ bạn duyệt.<br />
                • Hệ thống cluster WebSocket hoạt động ổn định 100% uptime.
              </p>
            </div>
          </div>
        )}

        {/* Notifications Feed */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500 pb-1">
            <span>
              Hiển thị{' '}
              {
                notifications.filter((n) => {
                  if (notificationFilter === 'all') return true;
                  return n.type === notificationFilter;
                }).length
              }{' '}
              thông báo ({notifications.filter((n) => !n.isRead).length} chưa đọc)
            </span>
            <span className="text-[11px] text-zinc-400">Bấm vào từng thông báo để mở đúng ngữ cảnh tài liệu</span>
          </div>

          <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-2xl overflow-hidden bg-white">
            {notifications
              .filter((n) => {
                if (notificationFilter === 'all') return true;
                return n.type === notificationFilter;
              })
              .map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    setNotifications((prev) =>
                      prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
                    );
                    if (n.targetDocId || n.targetUrl?.includes('/doc')) {
                      setActiveTab('comments');
                    }
                    showToast(`Đã mở ngữ cảnh: ${n.title}`);
                  }}
                  className={`p-4 flex items-start gap-3.5 hover:bg-zinc-50 cursor-pointer transition-colors ${
                    !n.isRead ? 'bg-blue-50/20' : ''
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-2xs"
                    style={{ backgroundColor: n.senderColor || '#2563eb' }}
                  >
                    {n.senderName ? n.senderName.slice(0, 1) : '!'}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${!n.isRead ? 'font-bold text-zinc-900' : 'text-zinc-700'}`}>
                          {n.title}
                        </span>
                        {n.isPriority && (
                          <span className="px-1.5 py-0.2 rounded-md bg-rose-50 text-rose-700 text-[9px] font-bold border border-rose-200">
                            Khẩn cấp
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {new Date(n.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed">{n.content || n.body}</p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-blue-600 font-semibold hover:underline">
                        ➡️ Mở: {n.targetLabel}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {n.type === 'mention'
                          ? '@Nhắc tên'
                          : n.type === 'task'
                          ? 'Nhiệm vụ'
                          : n.type === 'watch'
                          ? 'Tài liệu theo dõi'
                          : n.type === 'meeting'
                          ? 'Cuộc họp'
                          : n.type === 'dm'
                          ? 'Nhắn tin 1-1'
                          : 'Bình luận'}
                      </span>
                    </div>
                  </div>

                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* Team Communication Norms Table */}
        <div className="border border-zinc-200 rounded-2xl p-5 bg-zinc-50/70 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
            <div>
              <h4 className="font-bold text-zinc-900">Bảng Quy Ước Lựa Chọn Hình Thức Giao Tiếp Chuẩn</h4>
              <p className="text-zinc-500 text-[11px]">Tránh họp lan man, bảo toàn ngữ cảnh và duy trì nhịp làm việc hiệu quả.</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-200 text-zinc-700">
              Chuẩn quy ước
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-[10px] font-bold text-zinc-400 uppercase">
                  <th className="py-2 px-3">Tình huống</th>
                  <th className="py-2 px-3">Hình thức nên dùng</th>
                  <th className="py-2 px-3">Lợi ích cốt lõi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60 text-[11px]">
                {TEAM_COMMUNICATION_NORMS.map((norm, idx) => (
                  <tr key={idx} className="hover:bg-white/80 transition-colors">
                    <td className="py-2 px-3 font-semibold text-zinc-900">{norm.situation}</td>
                    <td className="py-2 px-3 text-blue-700 font-medium">{norm.recommendedTool}</td>
                    <td className="py-2 px-3 text-zinc-600">{norm.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
