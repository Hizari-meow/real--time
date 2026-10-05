import { useState, useEffect } from 'react';
import { NotificationItem } from '@/components/collaboration/types';
import { SEED_NOTIFICATIONS } from '@/components/collaboration/seed-data';

export function useNotificationsState(showToast: (msg: string) => void) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(SEED_NOTIFICATIONS);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'mention' | 'comment' | 'task' | 'watch' | 'meeting' | 'system' | 'dm'>('all');
  const [isDndActive, setIsDndActive] = useState(false);
  const [focusModeUntil, setFocusModeUntil] = useState<number | null>(null);
  const [focusCountdown, setFocusCountdown] = useState<string | null>(null);
  const [digestExpanded, setDigestExpanded] = useState(false);
  const [mobilePushPreviewOpen, setMobilePushPreviewOpen] = useState(false);
  const [isDeduplicationActive, setIsDeduplicationActive] = useState(false);
  const [channelNotificationPrefs, setChannelNotificationPrefs] = useState<Record<string, 'all' | 'mention' | 'mute'>>({
    chan_proj_website: 'all',
    chan_infra_devops: 'mention',
    chan_priv_bod: 'all',
    chan_topic_general: 'all',
  });
  const [channelPrefModalOpen, setChannelPrefModalOpen] = useState(false);

  // Focus mode countdown
  useEffect(() => {
    if (!focusModeUntil) {
      setFocusCountdown(null);
      return;
    }

    const interval = setInterval(() => {
      const remaining = focusModeUntil - Date.now();
      if (remaining <= 0) {
        setFocusModeUntil(null);
        setFocusCountdown(null);
        showToast('Chế độ tập trung đã kết thúc. Bạn có thể nhận lại thông báo bình thường.');
      } else {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setFocusCountdown(`${mins}m ${secs < 10 ? '0' : ''}${secs}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [focusModeUntil]);

  const handleTriggerDesktopPush = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification('Collab Workspace • Trần Thị Linh', {
            body: 'Linh vừa nhắc bạn: "@Nam kiểm tra lại độ trễ kết nối CRDT trước 17h"',
            icon: '/favicon.ico',
          });
          showToast('Đã phát thông báo nổi Desktop qua Web Notification API!');
        } catch {
          showToast('Thông báo Desktop: Trần Thị Linh vừa nhắc tên bạn.');
        }
      } else {
        Notification.requestPermission().then((res) => {
          showToast(`Quyền thông báo Desktop: ${res}`);
          if (res === 'granted') {
            try {
              new Notification('Collab Workspace', {
                body: 'Thông báo Desktop đã được kích hoạt thành công!',
              });
            } catch {}
          }
        });
      }
    } else {
      showToast('Trình duyệt không hỗ trợ Web Notification API.');
    }
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    showToast('Đã đánh dấu tất cả thông báo là đã đọc!');
  };

  const handleMarkNotificationRead = (notifId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
    );
  };

  return {
    notifications,
    setNotifications,
    notificationFilter,
    setNotificationFilter,
    isDndActive,
    setIsDndActive,
    focusModeUntil,
    setFocusModeUntil,
    focusCountdown,
    digestExpanded,
    setDigestExpanded,
    mobilePushPreviewOpen,
    setMobilePushPreviewOpen,
    isDeduplicationActive,
    setIsDeduplicationActive,
    channelNotificationPrefs,
    setChannelNotificationPrefs,
    channelPrefModalOpen,
    setChannelPrefModalOpen,
    handleTriggerDesktopPush,
    handleMarkAllRead,
    handleMarkNotificationRead,
  };
}
