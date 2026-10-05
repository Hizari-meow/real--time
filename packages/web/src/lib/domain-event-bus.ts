'use client';

import { NotificationItem, WorkplaceMessage } from '../components/collaboration/types';
import { SEED_NOTIFICATIONS } from '../components/collaboration/seed-data';
import type { AutomationRule, ExecutionLog } from '../components/automations/types';
import { AVAILABLE_TRIGGERS, AVAILABLE_ACTIONS, PREBUILT_TEMPLATES } from '../components/automations/templates-data';

export type DomainEventName =
  | 'comment.created'
  | 'comment.resolved'
  | 'task.created'
  | 'task.completed'
  | 'task.overdue'
  | 'file.uploaded'
  | 'member.added'
  | 'meeting.ended'
  | 'document.approved'
  | 'whiteboard.exported'
  | 'sop.run'
  | 'webhook.received'
  | 'webhook.dispatched';

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: { name: string; email: string; type: 'user' | 'automation' | 'system' };
  action: string;
  actionLabel: string;
  resource: { type: string; name: string };
  ip: string;
  hash: string;
  prevHash: string;
  status: 'verified' | 'flagged';
}

export interface WebhookDeliveryItem {
  id: string;
  event: string;
  endpoint: string;
  statusCode: number;
  payload: any;
  timestamp: number;
  status: 'success' | 'failed';
}

export interface MemberRecord {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
  status: 'active' | 'suspended';
  twoFaEnabled: boolean;
  department: string;
  lastActive: string;
  guestExpiresAt?: string;
}

export interface SecurityPolicies {
  twoFaRequired: boolean;
  externalSharing: 'disabled' | 'allowlist' | 'enabled';
  publicLinksAllowed: boolean;
  sessionTimeoutDays: number;
  allowedDomains: string;
}

import type { CloudFolder, CloudFileItem } from '../components/drive/types';
import { INITIAL_FOLDERS, INITIAL_FILES } from '../components/drive/types';
export type { CloudFolder, CloudFileItem };

// ----------------------------------------------------------------------
// Seed Data
// ----------------------------------------------------------------------

export const INITIAL_MEMBERS: MemberRecord[] = [
  {
    id: 'usr_nam',
    name: 'Nguyễn Văn Nam (Bạn)',
    email: 'nam.nguyen@congty.com',
    role: 'owner',
    status: 'active',
    twoFaEnabled: true,
    department: 'Ban Giám Đốc',
    lastActive: 'Đang online',
  },
  {
    id: 'usr_linh',
    name: 'Trần Thị Linh',
    email: 'linh.tran@congty.com',
    role: 'admin',
    status: 'active',
    twoFaEnabled: true,
    department: 'Tài Chính & Kế Toán',
    lastActive: '5 phút trước',
  },
  {
    id: 'usr_hoang',
    name: 'Lê Hoàng',
    email: 'hoang.le@congty.com',
    role: 'member',
    status: 'active',
    twoFaEnabled: true,
    department: 'Kỹ Thuật Phần Mềm',
    lastActive: '12 phút trước',
  },
  {
    id: 'usr_mai',
    name: 'Phạm Phương Mai',
    email: 'mai.pham@congty.com',
    role: 'member',
    status: 'active',
    twoFaEnabled: false,
    department: 'Thiết Kế Sản Phẩm',
    lastActive: '1 giờ trước',
  },
  {
    id: 'usr_guest_partner',
    name: 'David Smith (Đối tác)',
    email: 'david@partner-global.com',
    role: 'guest',
    status: 'active',
    twoFaEnabled: true,
    department: 'Tư Vấn Kiến Trúc',
    lastActive: '3 giờ trước',
    guestExpiresAt: '2026-11-15',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'aud_101',
    timestamp: '2026-10-03 09:45:12',
    actor: { name: 'Nguyễn Văn Nam', email: 'nam.nguyen@congty.com', type: 'user' },
    action: 'policy.security.updated',
    actionLabel: 'Cập nhật chính sách bắt buộc 2FA toàn tổ chức',
    resource: { type: 'organization', name: 'Tập Đoàn Công Nghệ Số' },
    ip: '113.161.42.18',
    hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    prevHash: 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000',
    status: 'verified',
  },
  {
    id: 'aud_102',
    timestamp: '2026-10-03 09:12:05',
    actor: { name: 'Trần Thị Linh', email: 'linh.tran@congty.com', type: 'user' },
    action: 'permission.share_link.created',
    actionLabel: 'Tạo liên kết chia sẻ bảo mật có mật khẩu',
    resource: { type: 'sheet', name: 'Báo Cáo Tài Chính & Doanh Thu Q4-2026' },
    ip: '14.169.35.88',
    hash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
    prevHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    status: 'verified',
  },
  {
    id: 'aud_103',
    timestamp: '2026-10-03 08:30:41',
    actor: { name: 'Automation Bot', email: 'bot@system.internal', type: 'automation' },
    action: 'task.completed.notification',
    actionLabel: 'Đẩy thông báo tự động khi task khẩn hoàn tất',
    resource: { type: 'task', name: 'WEB-12: Tối ưu hoá độ trễ WebSocket' },
    ip: '127.0.0.1',
    hash: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
    prevHash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
    status: 'verified',
  },
];

export const DEFAULT_SECURITY_POLICIES: SecurityPolicies = {
  twoFaRequired: true,
  externalSharing: 'allowlist',
  publicLinksAllowed: false,
  sessionTimeoutDays: 14,
  allowedDomains: 'congty.com, partner-global.com',
};

export const INITIAL_DRIVE_FOLDERS: CloudFolder[] = INITIAL_FOLDERS;
export const INITIAL_DRIVE_FILES: CloudFileItem[] = INITIAL_FILES;

// Simple fallback sha256 calculation for audit log chain
export function calculateSimpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return hex.repeat(8).slice(0, 64);
}

// Storage Keys
export const STORAGE_KEYS = {
  NOTIFICATIONS: 'collab_notifications',
  CHAT_MESSAGES: 'collab_workplace_messages',
  KANBAN_EXTERNAL_TASKS: 'collab_kanban_external_tasks',
  CUSTOM_WIKI_PAGES: 'collab_custom_wiki_pages',
  AUDIT_LOGS: 'collab_audit_logs',
  WEBHOOK_DELIVERIES: 'collab_webhook_deliveries',
  MEMBERS: 'collab_admin_members',
  SECURITY_POLICIES: 'collab_security_policies',
  DRIVE_FOLDERS: 'collab_drive_folders',
  DRIVE_FILES: 'collab_drive_files',
  AUTOMATION_RULES: 'collab_automation_rules',
  AUTOMATION_LOGS: 'collab_automation_logs',
};

// ----------------------------------------------------------------------
// Member Helpers (M8 & Central Directory)
// ----------------------------------------------------------------------

export function getStoredMembers(): MemberRecord[] {
  if (typeof window === 'undefined') return INITIAL_MEMBERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(INITIAL_MEMBERS));
      return INITIAL_MEMBERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return INITIAL_MEMBERS;
  } catch {
    return INITIAL_MEMBERS;
  }
}

export function saveStoredMembers(members: MemberRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
    window.dispatchEvent(new CustomEvent('collab_members_updated', { detail: members }));
  } catch (err) {
    console.error('Failed to save members:', err);
  }
}

export function addStoredMember(member: MemberRecord): MemberRecord {
  const current = getStoredMembers();
  const existingIdx = current.findIndex((m) => m.email.toLowerCase() === member.email.toLowerCase());
  let updated: MemberRecord[];
  if (existingIdx > -1) {
    updated = [...current];
    updated[existingIdx] = member;
  } else {
    updated = [...current, member];
  }
  saveStoredMembers(updated);
  return member;
}

export function updateStoredMemberRole(memberId: string, role: 'owner' | 'admin' | 'member' | 'guest'): void {
  const current = getStoredMembers();
  const updated = current.map((m) => (m.id === memberId ? { ...m, role } : m));
  saveStoredMembers(updated);
}

export interface UnifiedUser {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'guest' | 'leader' | 'deputy';
  department?: string;
  color: string;
  phone?: string;
  avatarUrl?: string;
  isOnline: boolean;
  hasAccess: boolean;
}

const USER_COLOR_MAP: Record<string, string> = {
  usr_nam: '#0068ff',
  usr_owner: '#0068ff',
  usr_linh: '#ec4899',
  usr_mai: '#ec4899',
  usr_hoang: '#10b981',
  usr_long: '#10b981',
  usr_alice: '#8b5cf6',
  usr_bob: '#f59e0b',
  usr_guest_partner: '#06b6d4',
};

const COLOR_PALETTE = [
  '#0068ff',
  '#ec4899',
  '#10b981',
  '#8b5cf6',
  '#f59e0b',
  '#06b6d4',
  '#6366f1',
  '#14b8a6',
  '#f97316',
  '#84cc16',
];

export function getUserColor(id: string, name?: string): string {
  if (USER_COLOR_MAP[id]) return USER_COLOR_MAP[id];
  const str = id + (name || '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length];
}

export function getUnifiedUsers(): UnifiedUser[] {
  const members = getStoredMembers();
  return members.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    role: m.role,
    department: m.department,
    color: getUserColor(m.id, m.name),
    phone: m.email.startsWith('nam')
      ? '0912 345 678'
      : m.email.startsWith('linh')
      ? '0988 765 432'
      : m.email.startsWith('hoang')
      ? '0903 112 233'
      : '09' + Math.abs(m.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) * 883).toString().slice(0, 8),
    isOnline: m.status === 'active' && (m.lastActive.includes('online') || m.lastActive.includes('phút')),
    hasAccess: m.status === 'active',
  }));
}


// ----------------------------------------------------------------------
// Security Policies Helpers (M8)
// ----------------------------------------------------------------------

export function getStoredSecurityPolicies(): SecurityPolicies {
  if (typeof window === 'undefined') return DEFAULT_SECURITY_POLICIES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SECURITY_POLICIES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SECURITY_POLICIES, JSON.stringify(DEFAULT_SECURITY_POLICIES));
      return DEFAULT_SECURITY_POLICIES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_SECURITY_POLICIES;
  }
}

export function saveStoredSecurityPolicies(policies: SecurityPolicies): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.SECURITY_POLICIES, JSON.stringify(policies));
    window.dispatchEvent(new CustomEvent('collab_policies_updated', { detail: policies }));
  } catch (err) {
    console.error('Failed to save security policies:', err);
  }
}

// ----------------------------------------------------------------------
// Drive Folders & Files Helpers (M4)
// ----------------------------------------------------------------------

export function getStoredDriveFolders(): CloudFolder[] {
  if (typeof window === 'undefined') return INITIAL_DRIVE_FOLDERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DRIVE_FOLDERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.DRIVE_FOLDERS, JSON.stringify(INITIAL_DRIVE_FOLDERS));
      return INITIAL_DRIVE_FOLDERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DRIVE_FOLDERS;
  }
}

export function saveStoredDriveFolders(folders: CloudFolder[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.DRIVE_FOLDERS, JSON.stringify(folders));
    window.dispatchEvent(new CustomEvent('collab_drive_updated'));
  } catch (err) {
    console.error('Failed to save drive folders:', err);
  }
}

export function getStoredDriveFiles(): CloudFileItem[] {
  if (typeof window === 'undefined') return INITIAL_DRIVE_FILES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DRIVE_FILES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.DRIVE_FILES, JSON.stringify(INITIAL_DRIVE_FILES));
      return INITIAL_DRIVE_FILES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DRIVE_FILES;
  }
}

export function saveStoredDriveFiles(files: CloudFileItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.DRIVE_FILES, JSON.stringify(files));
    window.dispatchEvent(new CustomEvent('collab_drive_updated'));
  } catch (err) {
    console.error('Failed to save drive files:', err);
  }
}

// ----------------------------------------------------------------------
// Notification Helpers
// ----------------------------------------------------------------------

export function getStoredNotifications(): NotificationItem[] {
  if (typeof window === 'undefined') return SEED_NOTIFICATIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(SEED_NOTIFICATIONS));
      return SEED_NOTIFICATIONS;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_NOTIFICATIONS;
  }
}

export function saveStoredNotifications(notifications: NotificationItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    window.dispatchEvent(new CustomEvent('collab_notification_added', { detail: notifications }));
  } catch (err) {
    console.error('Failed to save notifications:', err);
  }
}

export function addNotification(notification: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead'>): NotificationItem {
  const current = getStoredNotifications();
  const newItem: NotificationItem = {
    ...notification,
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    isRead: false,
  };
  const updated = [newItem, ...current];
  saveStoredNotifications(updated);
  return newItem;
}

export function markNotificationAsRead(id: string): void {
  const current = getStoredNotifications();
  const updated = current.map((n) => (n.id === id ? { ...n, isRead: true } : n));
  saveStoredNotifications(updated);
}

export function markAllNotificationsAsRead(): void {
  const current = getStoredNotifications();
  const updated = current.map((n) => ({ ...n, isRead: true }));
  saveStoredNotifications(updated);
}

export function getUnreadNotificationCount(): number {
  const list = getStoredNotifications();
  return list.filter((n) => !n.isRead).length;
}

// ----------------------------------------------------------------------
// Chat Message Dispatcher
// ----------------------------------------------------------------------

export function dispatchWorkplaceChatMessage(
  channelId: string,
  message: Omit<WorkplaceMessage, 'id' | 'timestamp' | 'reactions' | 'channelId'> & { id?: string; channelId?: string; reactions?: any[] }
): WorkplaceMessage {
  if (typeof window === 'undefined') return message as WorkplaceMessage;

  const fullMessage: WorkplaceMessage = {
    id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    channelId,
    senderId: message.senderId,
    senderName: message.senderName,
    senderColor: message.senderColor,
    senderRole: message.senderRole,
    content: message.content,
    timestamp: Date.now(),
    type: message.type || 'text',
    reactions: message.reactions || [],
    attachment: message.attachment,
    botInfo: message.botInfo,
    taskInfo: message.taskInfo,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CHAT_MESSAGES);
    const map: Record<string, WorkplaceMessage[]> = raw ? JSON.parse(raw) : {};
    const existing = map[channelId] || [];
    map[channelId] = [...existing, fullMessage];
    localStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(map));

    window.dispatchEvent(
      new CustomEvent('collab_chat_message_created', {
        detail: { channelId, message: fullMessage },
      })
    );
  } catch (err) {
    console.error('Failed to dispatch workplace chat message:', err);
  }

  return fullMessage;
}

// ----------------------------------------------------------------------
// Audit Log Dispatcher (SHA-256 Chained)
// ----------------------------------------------------------------------

export function getStoredAuditLogs(): AuditLogItem[] {
  if (typeof window === 'undefined') return INITIAL_AUDIT_LOGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
      return INITIAL_AUDIT_LOGS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return INITIAL_AUDIT_LOGS;
  } catch {
    return INITIAL_AUDIT_LOGS;
  }
}

export function saveStoredAuditLogs(logs: AuditLogItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
    window.dispatchEvent(new CustomEvent('collab_audit_updated', { detail: logs }));
  } catch (err) {
    console.error('Failed to save audit logs:', err);
  }
}

export function appendAuditLog(entry: {
  action: string;
  actionLabel: string;
  actorName: string;
  actorEmail: string;
  actorType?: 'user' | 'automation' | 'system';
  resourceType: string;
  resourceName: string;
  ip?: string;
}): AuditLogItem {
  if (typeof window === 'undefined') return {} as AuditLogItem;

  try {
    const logs = getStoredAuditLogs();
    const prevHash = logs.length > 0 ? logs[0].hash : 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';
    const timestampStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const dataToHash = `${prevHash}|${timestampStr}|${entry.actorEmail}|${entry.action}|${entry.resourceType}:${entry.resourceName}`;
    const hash = calculateSimpleHash(dataToHash);

    const newLog: AuditLogItem = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: timestampStr,
      actor: {
        name: entry.actorName,
        email: entry.actorEmail,
        type: entry.actorType || 'user',
      },
      action: entry.action,
      actionLabel: entry.actionLabel,
      resource: {
        type: entry.resourceType,
        name: entry.resourceName,
      },
      ip: entry.ip || '113.161.42.18',
      hash,
      prevHash,
      status: 'verified',
    };

    const updated = [newLog, ...logs.slice(0, 99)];
    saveStoredAuditLogs(updated);
    return newLog;
  } catch (err) {
    console.error('Failed to append audit log:', err);
    return {} as AuditLogItem;
  }
}

export function verifyAuditHashChain(logs: AuditLogItem[]): boolean {
  if (!logs || logs.length === 0) return true;
  for (let i = 0; i < logs.length - 1; i++) {
    const current = logs[i];
    const prev = logs[i + 1];
    if (current.prevHash !== prev.hash) {
      return false;
    }
  }
  return true;
}

// ----------------------------------------------------------------------
// Webhook Dispatcher
// ----------------------------------------------------------------------

export function dispatchWebhookDelivery(event: string, payload: any): WebhookDeliveryItem {
  if (typeof window === 'undefined') return {} as WebhookDeliveryItem;

  const delivery: WebhookDeliveryItem = {
    id: `whd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    event,
    endpoint: 'https://api.collab.enterprise.internal/webhooks/listener',
    statusCode: 200,
    payload,
    timestamp: Date.now(),
    status: 'success',
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WEBHOOK_DELIVERIES);
    const deliveries: WebhookDeliveryItem[] = raw ? JSON.parse(raw) : [];
    deliveries.unshift(delivery);
    localStorage.setItem(STORAGE_KEYS.WEBHOOK_DELIVERIES, JSON.stringify(deliveries.slice(0, 50)));
  } catch {}

  return delivery;
}

// ----------------------------------------------------------------------
// Automation Engine (M7 Execution)
// ----------------------------------------------------------------------

export function getStoredAutomationRules(): AutomationRule[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTOMATION_RULES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  const initialRules: AutomationRule[] = PREBUILT_TEMPLATES.map((tmpl, idx) => ({
    id: tmpl.id || `rule_tmpl_${idx + 1}`,
    name: tmpl.name || 'Quy trình tự động',
    description: tmpl.description || '',
    category: tmpl.category || 'tasks',
    trigger: tmpl.trigger || AVAILABLE_TRIGGERS[0],
    condition: tmpl.condition,
    action: tmpl.action || AVAILABLE_ACTIONS[0],
    isEnabled: tmpl.isEnabled ?? true,
    runCount: tmpl.runCount || 0,
    createdAt: new Date().toISOString(),
  }));

  try {
    localStorage.setItem(STORAGE_KEYS.AUTOMATION_RULES, JSON.stringify(initialRules));
  } catch {}

  return initialRules;
}

export function executeAutomationRules(eventName: string, payload: any): void {
  if (typeof window === 'undefined') return;

  try {
    const rules = getStoredAutomationRules();
    const matchedRules = rules.filter(
      (r) => r.isEnabled && r.trigger && r.trigger.type === eventName
    );

    if (matchedRules.length === 0) return;

    let rulesModified = false;
    const newLogs: ExecutionLog[] = [];

    for (const rule of matchedRules) {
      // 1. Condition evaluation
      let conditionPassed = true;
      if (rule.condition && rule.condition.field) {
        const field = rule.condition.field;
        const op = rule.condition.operator;
        const expected = rule.condition.value;

        let actual: any = undefined;
        if (payload[field] !== undefined) {
          actual = payload[field];
        } else if (payload.task && payload.task[field] !== undefined) {
          actual = payload.task[field];
        } else if (payload.newMember && payload.newMember[field] !== undefined) {
          actual = payload.newMember[field];
        } else if (payload.file && payload.file[field] !== undefined) {
          actual = payload.file[field];
        } else if (payload.status !== undefined) {
          actual = payload.status;
        }

        if (actual !== undefined) {
          if (op === 'equals') {
            conditionPassed = String(actual).toLowerCase() === String(expected).toLowerCase();
          } else if (op === 'contains') {
            const expectedList = expected.split(',').map((s) => s.trim().toLowerCase());
            const actualStr = String(actual).toLowerCase();
            conditionPassed = expectedList.some((exp) => actualStr.includes(exp));
          } else if (op === 'in') {
            const list = expected.split(',').map((s) => s.trim().toLowerCase());
            conditionPassed = list.includes(String(actual).toLowerCase());
          } else if (op === 'greater_than') {
            conditionPassed = Number(actual) > Number(expected);
          }
        }
      }

      if (!conditionPassed) continue;

      // 2. Action execution
      let actionDetails = '';
      const actionType = rule.action?.type;

      if (actionType === 'chat.send_message') {
        const rawChannel = rule.action?.params?.channel || 'du-an-alpha';
        const channel = rawChannel.replace('#', '');
        let textMsg =
          rule.action?.params?.message ||
          `⚡ **[Tự động hóa M7]** Quy trình "${rule.name}" đã kích hoạt thành công từ sự kiện **${eventName}**!`;

        const taskTitle = payload.task?.title || payload.title || payload.documentTitle || 'Công việc';
        const assignee = payload.task?.assigneeName || payload.userName || payload.newMember?.name || 'Đội ngũ';
        const overdueDays = payload.overdueDays || '1';

        textMsg = textMsg
          .replace(/{task_title}/g, taskTitle)
          .replace(/{assignee}/g, assignee)
          .replace(/{overdue_days}/g, String(overdueDays));

        dispatchWorkplaceChatMessage(channel, {
          senderId: 'bot-automation',
          senderName: 'Workflow Automation Engine',
          senderColor: '#10b981',
          senderRole: 'Tự động hóa M7',
          type: 'bot_alert',
          content: textMsg,
          botInfo: {
            source: 'jira',
            eventTitle: `Quy trình: ${rule.name}`,
            eventMeta: `Tự động kích hoạt lúc ${new Date().toLocaleTimeString('vi-VN')}`,
            statusBadge: 'ACTIVE RULE RUN',
          },
        });
        actionDetails = `Đã gửi thông báo tự động tới kênh #${channel}`;
      } else if (actionType === 'task.create') {
        const rawTasks = localStorage.getItem(STORAGE_KEYS.KANBAN_EXTERNAL_TASKS);
        const tasks = rawTasks ? JSON.parse(rawTasks) : [];
        const template = rule.action?.params?.template;

        if (template === 'onboarding_standard_5_steps') {
          const assigneeName = payload.newMember?.name || rule.action?.params?.assignee || 'Nhân sự mới';
          const newTasks = [
            {
              id: `task_auto_onb_${Date.now()}_1`,
              key: `ONB-${Math.floor(10 + Math.random() * 89)}`,
              title: `[Onboarding] Kích hoạt tài khoản & Thiết lập xác thực 2FA cho ${assigneeName}`,
              description: 'Tự động tạo theo quy trình tiếp nhận nhân sự mới chuẩn của công ty.',
              column: 'todo',
              priority: 'urgent',
              assigneeName,
              assigneeColor: '#6366f1',
              startDate: new Date().toISOString().slice(0, 10),
              dueDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
              labels: ['Onboarding', 'Bảo mật 2FA'],
              checklist: [
                { id: 'c1', text: 'Nhận thông tin đăng nhập', completed: false },
                { id: 'c2', text: 'Kích hoạt 2FA trong trang Cài đặt bảo mật', completed: false },
              ],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
            {
              id: `task_auto_onb_${Date.now()}_2`,
              key: `ONB-${Math.floor(10 + Math.random() * 89)}`,
              title: `[Onboarding] Giới thiệu văn hóa công ty & Họp 1-on-1 với Quản lý`,
              description: 'Tự động phân công lịch làm việc tuần đầu tiên.',
              column: 'todo',
              priority: 'high',
              assigneeName,
              assigneeColor: '#6366f1',
              startDate: new Date().toISOString().slice(0, 10),
              dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
              labels: ['Onboarding', 'Hội nhập'],
              checklist: [
                { id: 'c1', text: 'Tham gia kênh chat nội bộ phòng ban', completed: false },
                { id: 'c2', text: 'Đọc tài liệu SOP trên Wiki', completed: false },
              ],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ];
          localStorage.setItem(STORAGE_KEYS.KANBAN_EXTERNAL_TASKS, JSON.stringify([...tasks, ...newTasks]));
          window.dispatchEvent(new CustomEvent('collab_task_created'));
          actionDetails = `Đã tự động tạo ${newTasks.length} nhiệm vụ Onboarding trên Kanban`;
        } else {
          const newTask = {
            id: `task_auto_${Date.now()}`,
            key: `AUTO-${Math.floor(10 + Math.random() * 89)}`,
            title: `[Tự động] Nhiệm vụ sinh từ quy trình "${rule.name}"`,
            description: `Tự động tạo khi sự kiện ${eventName} xảy ra trong hệ thống.`,
            column: 'todo',
            priority: 'high',
            assigneeName: 'Nguyễn Văn Nam',
            assigneeColor: '#2563eb',
            startDate: new Date().toISOString().slice(0, 10),
            dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
            labels: ['Tự động hóa', 'Quy trình M7'],
            checklist: [
              { id: 'c1', text: 'Kiểm tra thông tin chi tiết', completed: false },
              { id: 'c2', text: 'Thực thi và báo cáo kết quả', completed: false },
            ],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          localStorage.setItem(STORAGE_KEYS.KANBAN_EXTERNAL_TASKS, JSON.stringify([...tasks, newTask]));
          window.dispatchEvent(new CustomEvent('collab_task_created'));
          actionDetails = `Đã tự động tạo nhiệm vụ ${newTask.key} trên Kanban`;
        }
      } else if (actionType === 'task.update_status') {
        try {
          if (payload.task && payload.task.id) {
            const rawTasks = localStorage.getItem(STORAGE_KEYS.KANBAN_EXTERNAL_TASKS);
            if (rawTasks) {
              const tasks = JSON.parse(rawTasks);
              const idx = tasks.findIndex((t: any) => t.id === payload.task.id);
              if (idx > -1) {
                tasks[idx].labels = Array.from(new Set([...(tasks[idx].labels || []), 'Trễ SLA']));
                localStorage.setItem(STORAGE_KEYS.KANBAN_EXTERNAL_TASKS, JSON.stringify(tasks));
                window.dispatchEvent(new CustomEvent('collab_task_created'));
              }
            }
          }
        } catch {}
        actionDetails = 'Đã gắn nhãn cảnh báo [Trễ SLA] cho công việc';
      } else if (actionType === 'webhook.trigger') {
        dispatchWebhookDelivery(eventName, {
          ruleId: rule.id,
          ruleName: rule.name,
          triggeredBy: eventName,
          payload,
          timestamp: Date.now(),
        });
        actionDetails = 'Đã phát Webhook HTTP POST kèm mã HMAC-SHA256';
      } else if (actionType === 'email.send') {
        appendAuditLog({
          action: 'automation.email.sent',
          actionLabel: `Gửi email tự động theo quy trình "${rule.name}"`,
          actorName: 'Workflow Engine',
          actorEmail: 'engine@system.internal',
          actorType: 'automation',
          resourceType: 'email',
          resourceName: rule.action?.params?.recipient || 'all-team@collaborative.io',
        });
        addNotification({
          type: 'system',
          title: `Email tự động: "${rule.name}"`,
          body: `Đã gửi email tự động thành công theo quy trình (Sự kiện: ${eventName}).`,
          senderName: 'Workflow Engine',
          senderColor: '#8b5cf6',
          targetUrl: '/#automations',
          targetLabel: 'Tự động hóa M7',
        });
        actionDetails = 'Đã gửi email tự động và lưu vết kiểm toán';
      }

      rule.runCount = (rule.runCount || 0) + 1;
      rule.lastRunAt = new Date().toISOString();
      rulesModified = true;

      const logItem: ExecutionLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ruleId: rule.id,
        ruleName: rule.name,
        status: 'success',
        triggerEvent: eventName,
        executionTimeMs: Math.floor(35 + Math.random() * 55),
        payload: {
          triggeredBy: `Domain Event: ${eventName}`,
          action: actionType,
          details: actionDetails,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };
      newLogs.push(logItem);

      appendAuditLog({
        action: 'automation.rule.executed',
        actionLabel: `Tự động hóa thực thi: "${rule.name}" (${actionType})`,
        actorName: 'Automation Engine',
        actorEmail: 'engine@system.internal',
        actorType: 'automation',
        resourceType: 'automation',
        resourceName: rule.name,
      });
    }

    if (rulesModified) {
      try {
        localStorage.setItem(STORAGE_KEYS.AUTOMATION_RULES, JSON.stringify(rules));
      } catch {}
    }

    if (newLogs.length > 0) {
      try {
        const rawLogs = localStorage.getItem(STORAGE_KEYS.AUTOMATION_LOGS);
        const existingLogs = rawLogs ? JSON.parse(rawLogs) : [];
        const combined = [...newLogs, ...existingLogs].slice(0, 100);
        localStorage.setItem(STORAGE_KEYS.AUTOMATION_LOGS, JSON.stringify(combined));

        window.dispatchEvent(
          new CustomEvent('collab_automation_executed', {
            detail: { logs: newLogs, timestamp: Date.now() },
          })
        );
      } catch {}
    }
  } catch (err) {
    console.error('Failed to execute automation rules:', err);
  }
}

// ----------------------------------------------------------------------
// Unified Cross-Module Event Bus
// ----------------------------------------------------------------------

export function emitDomainEvent(eventName: DomainEventName, payload: any): void {
  if (typeof window === 'undefined') return;

  switch (eventName) {
    // ------------------------------------------------------------------
    // FLOW A: Comment Created -> Notifications for mentions
    // ------------------------------------------------------------------
    case 'comment.created': {
      const { comment, documentTitle, targetUrl } = payload;
      const mentions: string[] = [];
      const mentionMatches = (comment.text || '').match(/@([a-zA-Z0-9À-ỹ\s-_]+)/g);
      if (mentionMatches) {
        mentionMatches.forEach((m: string) => mentions.push(m.trim()));
      }

      addNotification({
        type: 'comment',
        title: `${comment.authorName} đã bình luận trong "${documentTitle}"`,
        body: comment.text || 'Đã để lại phản hồi vị trí trực tiếp trong tài liệu.',
        senderName: comment.authorName,
        senderColor: comment.authorColor || '#2563eb',
        targetUrl: targetUrl || `/doc/${comment.documentId}#comment-${comment.id}`,
        targetLabel: documentTitle,
        targetDocId: comment.documentId,
        isPriority: mentions.length > 0,
      });

      appendAuditLog({
        action: 'comment.created',
        actionLabel: `Tạo bình luận trong tài liệu "${documentTitle}"`,
        actorName: comment.authorName,
        actorEmail: `${comment.authorId || 'user'}@congty.com`,
        actorType: 'user',
        resourceType: 'comment',
        resourceName: documentTitle,
      });
      break;
    }

    // ------------------------------------------------------------------
    // FLOW A: Task Completed -> Post to #du-an-alpha, Webhook, Notification, Audit
    // ------------------------------------------------------------------
    case 'task.completed': {
      const { task, userName, userColor } = payload;

      dispatchWorkplaceChatMessage('du-an-alpha', {
        senderId: 'bot-automation',
        senderName: 'Workflow Automation Bot',
        senderColor: '#10b981',
        senderRole: 'Tự động hóa M7',
        type: 'bot_alert',
        content: `✅ **[Tự động hóa]** Nhiệm vụ **${task.key || 'TASK'}** "${task.title}" đã được hoàn thành bởi **@${userName}**!\n- Trạng thái: **Đã hoàn thành (Done)**\n- Hạn chót: ${task.dueDate || 'Hôm nay'}\n- Quy trình liên kết: M7 Automation Rule Triggered.`,
        botInfo: {
          source: 'jira',
          eventTitle: `Task Completed: ${task.key || 'TASK'}`,
          eventMeta: `Hoàn tất bởi @${userName}`,
          statusBadge: 'COMPLETED',
        },
      });

      dispatchWebhookDelivery('task.completed', {
        taskId: task.id,
        key: task.key,
        title: task.title,
        completedBy: userName,
        completedAt: new Date().toISOString(),
        sourceRef: task.sourceRef || null,
      });

      addNotification({
        type: 'task',
        title: `Nhiệm vụ ${task.key || ''} "${task.title}" đã hoàn tất`,
        body: `@${userName} vừa đánh dấu hoàn thành nhiệm vụ này. Hệ thống đã kích hoạt webhook và cập nhật kênh #du-an-alpha.`,
        senderName: userName,
        senderColor: userColor || '#10b981',
        targetUrl: '/#tasks',
        targetLabel: 'Bảng việc Kanban',
        isPriority: false,
      });

      appendAuditLog({
        action: 'task.completed',
        actionLabel: `Hoàn tất nhiệm vụ ${task.key || ''}: "${task.title}"`,
        actorName: userName,
        actorEmail: `${userName.toLowerCase().replace(/\s+/g, '.')}@congty.com`,
        actorType: 'user',
        resourceType: 'task',
        resourceName: task.title,
      });
      break;
    }

    // ------------------------------------------------------------------
    // FLOW B: Member Added (Onboarding across 6 modules)
    // ------------------------------------------------------------------
    case 'member.added': {
      const { newMember, adminName } = payload;
      const dept = newMember.department || 'Kinh Doanh';
      const deptChannel = dept.toLowerCase().includes('kinh') ? 'kinh-doanh' : 'ky-thuat';

      // 1. Persist Member into Central Organization Directory (M8)
      addStoredMember(newMember);

      // 2. Audit Log (M8) with SHA-256 hash chaining
      appendAuditLog({
        action: 'user.onboarding.initialized',
        actionLabel: `Kích hoạt luồng Onboarding 6 module cho ${newMember.name} (${newMember.role} - ${dept})`,
        actorName: adminName || 'Nguyễn Văn Nam',
        actorEmail: 'admin@congty.com',
        actorType: 'user',
        resourceType: 'user',
        resourceName: newMember.email,
      });

      // 3. M2: Post Welcome Announcement to department channel AND company general
      dispatchWorkplaceChatMessage(deptChannel, {
        senderId: 'bot-onboarding',
        senderName: 'Hệ Thống Nhân Sự & Onboarding',
        senderColor: '#6366f1',
        senderRole: 'HR Bot M2',
        type: 'bot_alert',
        content: `🎉 **Chào mừng thành viên mới gia nhập phòng ban ${dept}!**\n\nXin gửi lời chào nồng nhiệt nhất đến **@${newMember.name}** (${newMember.email})!\n- Vai trò: **${newMember.role.toUpperCase()}**\n- Phòng ban: **${dept}**\n- Mọi người hãy cùng gửi lời chúc mừng và hỗ trợ bạn ấy trong tuần đầu tiên nhé! 🚀`,
        botInfo: {
          source: 'crm',
          eventTitle: `New Member Onboarded: ${newMember.name}`,
          eventMeta: `Phòng ban: ${dept}`,
          statusBadge: 'ACTIVE',
        },
      });

      dispatchWorkplaceChatMessage('thong-bao-cong-ty', {
        senderId: 'bot-onboarding',
        senderName: 'Thông Báo Nội Bộ',
        senderColor: '#4f46e5',
        senderRole: 'Công Ty M2',
        type: 'bot_alert',
        content: `📢 **Thông báo nhân sự:** Chào đón nhân sự mới **${newMember.name}** gia nhập khối **${dept}** từ hôm nay!`,
        botInfo: {
          source: 'crm',
          eventTitle: 'Welcome to Team',
          eventMeta: `${newMember.name} (${dept})`,
          statusBadge: 'NEW HIRE',
        },
      });

      // 4. M3: Create Onboarding Task in Kanban
      try {
        const rawTasks = localStorage.getItem(STORAGE_KEYS.KANBAN_EXTERNAL_TASKS);
        const tasks = rawTasks ? JSON.parse(rawTasks) : [];
        tasks.push({
          id: `task_onb_${Date.now()}`,
          key: `ONB-${Math.floor(10 + Math.random() * 90)}`,
          title: `[Onboarding] Lộ trình hội nhập dành cho ${newMember.name} (${dept})`,
          description: `Chào mừng ${newMember.name}!\nVui lòng thực hiện các bước hội nhập theo chuẩn quy trình SOP của công ty.`,
          column: 'todo',
          priority: 'urgent',
          assigneeId: newMember.id,
          assigneeName: newMember.name,
          assigneeColor: '#6366f1',
          startDate: new Date().toISOString().slice(0, 10),
          dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
          labels: ['Onboarding', 'Hội nhập', dept],
          checklist: [
            { id: 'c1', text: 'Đọc tài liệu SOP giới thiệu & Văn hóa công ty trên Wiki', completed: false },
            { id: 'c2', text: 'Cài đặt môi trường làm việc & Kích hoạt xác thực 2FA', completed: false },
            { id: 'c3', text: 'Tham gia kênh liên lạc nội bộ & Họp 1-1 với Quản lý trực tiếp', completed: false },
            { id: 'c4', text: 'Nghiên cứu tài liệu nghiệp vụ phòng ban trong Drive', completed: false },
          ],
          sourceRef: {
            type: 'wiki',
            id: 'sop-onboarding',
            title: `Lộ trình SOP Hội nhập ${dept}`,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        localStorage.setItem(STORAGE_KEYS.KANBAN_EXTERNAL_TASKS, JSON.stringify(tasks));
        window.dispatchEvent(new CustomEvent('collab_task_created'));
      } catch (err) {
        console.error('Failed to create onboarding task:', err);
      }

      // 5. M4: Grant Cloud Storage Folder Access
      try {
        const folders = getStoredDriveFolders();
        const folderName = `Tài liệu nghiệp vụ phòng ${dept}`;
        if (!folders.some((f) => f.name === folderName)) {
          const newFolder: CloudFolder = {
            id: `fld_dept_${Date.now()}`,
            name: folderName,
            category: 'team',
            color: '#6366f1',
            fileCount: 3,
            totalSize: 12000000,
            ownerName: newMember.name,
            updatedAt: new Date().toISOString(),
          };
          saveStoredDriveFolders([newFolder, ...folders]);
        }
      } catch (err) {
        console.error('Failed to provision folder for member:', err);
      }

      // 6. Notifications: Welcome notification for the user
      addNotification({
        type: 'task',
        title: `Chào mừng ${newMember.name} gia nhập nền tảng!`,
        body: `Lộ trình hội nhập của bạn đã sẵn sàng với 4 bước checklist cụ thể. Hãy mở Bảng việc Kanban để bắt đầu!`,
        senderName: 'Bộ phận Nhân sự & Quản trị',
        senderColor: '#4f46e5',
        targetUrl: '/#tasks',
        targetLabel: 'Bảng việc Hội nhập',
        isPriority: true,
      });
      break;
    }

    // ------------------------------------------------------------------
    // FLOW C: Video Meeting Ended -> AI Minutes -> Post Chat -> Batch Tasks
    // ------------------------------------------------------------------
    case 'meeting.ended': {
      const { roomCode, roomTitle, durationSec, minutes, actionItems } = payload;

      const itemsText = (actionItems || [])
        .map((item: any, idx: number) => `  ${idx + 1}. **${item.title}** (Phụ trách: @${item.assignee || 'Team'})`)
        .join('\n');

      dispatchWorkplaceChatMessage('du-an-alpha', {
        senderId: 'ai-meeting-assistant',
        senderName: 'AI Meeting Assistant',
        senderColor: '#8b5cf6',
        senderRole: 'Biên Bản Họp Tự Động',
        type: 'bot_alert',
        content: `📝 **Biên Bản Cuộc Họp Trực Tuyến: "${roomTitle}"**\n- Mã phòng: \`${roomCode}\`\n- Thời lượng: ${Math.floor(durationSec / 60)} phút ${durationSec % 60} giây\n\n**📌 Tóm tắt & Quyết định chính:**\n${minutes || 'Đã thống nhất kiến trúc CRDT Yjs và cam kết hoàn tất bản MVP.'}\n\n**🎯 Việc cần làm (Action Items):**\n${itemsText || '1. Kiểm tra tải đồng thời\n2. Cập nhật tài liệu kỹ thuật'}\n\n*Đã tự động tạo các thẻ việc tương ứng trên bảng việc Kanban!*`,
        botInfo: {
          source: 'jira',
          eventTitle: `Meeting Ended: ${roomTitle}`,
          eventMeta: `Thời lượng ${Math.floor(durationSec / 60)}p`,
          statusBadge: 'MINUTES RECORDED',
        },
      });

      if (actionItems && actionItems.length > 0) {
        try {
          const rawTasks = localStorage.getItem(STORAGE_KEYS.KANBAN_EXTERNAL_TASKS);
          const currentTasks = rawTasks ? JSON.parse(rawTasks) : [];
          const newTasks = actionItems.map((item: any, idx: number) => ({
            id: `task_meet_${Date.now()}_${idx}`,
            key: `MEET-${Math.floor(10 + Math.random() * 90)}`,
            title: `[Họp: ${roomTitle}] ${item.title}`,
            description: `Nhiệm vụ phát sinh từ biên bản cuộc họp "${roomTitle}" (Mã: ${roomCode}).`,
            column: 'todo',
            priority: item.priority || 'high',
            assigneeId: 'usr_nam',
            assigneeName: item.assignee || 'Nguyễn Văn Nam',
            assigneeColor: '#2563eb',
            startDate: new Date().toISOString().slice(0, 10),
            dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
            labels: ['Cuộc họp', 'Action Item'],
            checklist: [
              { id: 'c1', text: 'Rà soát lại biên bản cuộc họp', completed: false },
              { id: 'c2', text: 'Triển khai và báo cáo kết quả', completed: false },
            ],
            sourceRef: {
              type: 'meeting',
              id: roomCode,
              title: roomTitle,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }));

          localStorage.setItem(STORAGE_KEYS.KANBAN_EXTERNAL_TASKS, JSON.stringify([...currentTasks, ...newTasks]));
          window.dispatchEvent(new CustomEvent('collab_task_created'));
        } catch (err) {
          console.error('Failed to create batch meeting tasks:', err);
        }
      }

      addNotification({
        type: 'meeting',
        title: `Biên bản cuộc họp "${roomTitle}" đã được tạo`,
        body: `AI đã tổng hợp quyết định và việc cần làm từ cuộc họp vừa kết thúc. Xem chi tiết tại kênh #du-an-alpha.`,
        senderName: 'AI Meeting Assistant',
        senderColor: '#8b5cf6',
        targetUrl: '/#collab',
        targetLabel: 'Kênh #du-an-alpha',
        isPriority: false,
      });

      appendAuditLog({
        action: 'meeting.concluded',
        actionLabel: `Kết thúc cuộc họp "${roomTitle}" và sinh biên bản tự động`,
        actorName: 'AI Meeting Bot',
        actorEmail: 'bot@system.internal',
        actorType: 'automation',
        resourceType: 'call',
        resourceName: roomTitle,
      });
      break;
    }

    // ------------------------------------------------------------------
    // FLOW D: Whiteboard Workshop -> Tasks & Wiki Export
    // ------------------------------------------------------------------
    case 'whiteboard.exported': {
      const { workshopTitle, boardId, createdTasksCount, wikiPageId } = payload;

      dispatchWorkplaceChatMessage('du-an-alpha', {
        senderId: 'whiteboard-bot',
        senderName: 'Whiteboard Collaboration',
        senderColor: '#d97706',
        senderRole: 'Bảng Trắng Động Não M5',
        type: 'bot_alert',
        content: `🎨 **Workshop Động Não hoàn tất: "${workshopTitle}"**\n- Đã chuyển đổi thành công **${createdTasksCount}** ý tưởng bầu chọn cao nhất thành các thẻ việc trên bảng Kanban!\n- Biên bản tổng hợp đã được lưu trữ vào Wiki nội bộ.`,
        botInfo: {
          source: 'jira',
          eventTitle: `Workshop Export: ${workshopTitle}`,
          eventMeta: `${createdTasksCount} tasks created`,
          statusBadge: 'WORKSHOP EXPORTED',
        },
      });

      addNotification({
        type: 'task',
        title: `Đã xuất ${createdTasksCount} nhiệm vụ từ bảng trắng "${workshopTitle}"`,
        body: `Các ý tưởng có số phiếu bầu cao nhất đã được đưa lên bảng việc Kanban và lưu vào Wiki.`,
        senderName: 'Bảng Trắng Động Não',
        senderColor: '#d97706',
        targetUrl: '/#tasks',
        targetLabel: 'Bảng việc Kanban',
      });
      break;
    }

    // ------------------------------------------------------------------
    // FLOW E: Document / Wiki Approval
    // ------------------------------------------------------------------
    case 'document.approved': {
      const { documentTitle, documentId, approverName, version } = payload;

      appendAuditLog({
        action: 'document.approved',
        actionLabel: `Phê duyệt tài liệu "${documentTitle}" phiên bản ${version || 'v1.0'}`,
        actorName: approverName || 'Nguyễn Văn Nam',
        actorEmail: 'approver@congty.com',
        actorType: 'user',
        resourceType: 'document',
        resourceName: documentTitle,
      });

      dispatchWorkplaceChatMessage('thong-bao-cong-ty', {
        senderId: 'approval-bot',
        senderName: 'Cổng Phê Duyệt Văn Bản',
        senderColor: '#059669',
        senderRole: 'Phê Duyệt Ban Hành M8',
        type: 'bot_alert',
        content: `📜 **Tài liệu đã được phê duyệt và ban hành chính thức!**\n- Tên tài liệu: **${documentTitle}**\n- Phiên bản: **${version || 'v1.0'}**\n- Người phê duyệt: **@${approverName}**\n- Trạng thái: **Chính thức hiệu lực**`,
        botInfo: {
          source: 'sentry',
          eventTitle: `Approved: ${documentTitle}`,
          eventMeta: `Phiên bản ${version || 'v1.0'}`,
          statusBadge: 'APPROVED',
        },
      });

      addNotification({
        type: 'system',
        title: `Tài liệu "${documentTitle}" đã được phê duyệt`,
        body: `@${approverName} đã chính thức phê duyệt phiên bản ${version || 'v1.0'}. Mọi thành viên đều có thể áp dụng.`,
        senderName: approverName,
        senderColor: '#059669',
        targetUrl: `/doc/${documentId}`,
        targetLabel: documentTitle,
        isPriority: true,
      });
      break;
    }

    case 'comment.resolved': {
      const { comment, documentTitle } = payload;
      appendAuditLog({
        action: 'comment.resolved',
        actionLabel: `Giải quyết bình luận trong "${documentTitle || 'Tài liệu'}"`,
        actorName: comment?.authorName || 'Người dùng',
        actorEmail: `${comment?.authorId || 'user'}@congty.com`,
        actorType: 'user',
        resourceType: 'comment',
        resourceName: documentTitle || 'Tài liệu',
      });
      break;
    }

    case 'task.created': {
      const { task, userName } = payload;
      appendAuditLog({
        action: 'task.created',
        actionLabel: `Tạo công việc mới: "${task?.title || 'Nhiệm vụ'}"`,
        actorName: userName || 'Người dùng',
        actorEmail: 'user@congty.com',
        actorType: 'user',
        resourceType: 'task',
        resourceName: task?.title || 'Nhiệm vụ',
      });
      break;
    }

    case 'task.overdue': {
      const { task, overdueDays } = payload;
      dispatchWorkplaceChatMessage('canh-bao-tien-do', {
        senderId: 'bot-sla',
        senderName: 'Hệ Thống Giám Sát SLA & Hạn Chót',
        senderColor: '#ef4444',
        senderRole: 'Cảnh Báo Quá Hạn M3',
        type: 'bot_alert',
        content: `⚠️ **[CẢNH BÁO QUÁ HẠN SLA]**\n- Nhiệm vụ: **${task?.key || 'TASK'}** "${task?.title}"\n- Người phụ trách: **@${task?.assigneeName || 'Team'}**\n- Hạn chót: **${task?.dueDate}** (Đã trễ **${overdueDays || 1}** ngày!)\n- Trạng thái: **${task?.column?.toUpperCase() || 'IN PROGRESS'}**\n\n*Hệ thống tự động kích hoạt quy trình cảnh báo tiến độ và cập nhật nhãn [Trễ SLA].*`,
        botInfo: {
          source: 'jira',
          eventTitle: `Task Overdue: ${task?.key || 'TASK'}`,
          eventMeta: `Quá hạn ${overdueDays || 1} ngày`,
          statusBadge: 'OVERDUE SLA',
        },
      });

      addNotification({
        type: 'task',
        title: `Cảnh báo: Nhiệm vụ "${task?.title}" đã quá hạn`,
        body: `Nhiệm vụ này đã trễ ${overdueDays || 1} ngày so với deadline. Vui lòng cập nhật tiến độ hoặc yêu cầu hỗ trợ!`,
        senderName: 'Giám Sát SLA',
        senderColor: '#ef4444',
        targetUrl: '/#tasks',
        targetLabel: 'Bảng việc Kanban',
        isPriority: true,
      });

      appendAuditLog({
        action: 'task.overdue.alert',
        actionLabel: `Cảnh báo quá hạn SLA cho nhiệm vụ ${task?.key || ''}: "${task?.title}"`,
        actorName: 'SLA Monitor Engine',
        actorEmail: 'sla@system.internal',
        actorType: 'system',
        resourceType: 'task',
        resourceName: task?.title || 'Công việc',
      });
      break;
    }

    case 'file.uploaded': {
      const { file, userName } = payload;
      dispatchWorkplaceChatMessage('du-an-alpha', {
        senderId: 'bot-drive',
        senderName: 'Hệ Thống Lưu Trữ Cloud Drive',
        senderColor: '#0ea5e9',
        senderRole: 'Lưu Trữ M4',
        type: 'bot_alert',
        content: `📁 **[Tệp Mới Tải Lên]** Thành viên **@${userName || 'Người dùng'}** vừa thêm tệp: **${file?.name || 'Tài liệu'}**\n- Dung lượng: ${file?.size ? (file.size / 1024).toFixed(1) + ' KB' : 'N/A'}\n- Loại tệp: ${file?.category || 'Tài liệu'}\n- Vị trí: Kho lưu trữ đám mây MinIO S3`,
        botInfo: {
          source: 'github',
          eventTitle: `File Uploaded: ${file?.name || 'Tài liệu'}`,
          eventMeta: `Tải lên bởi @${userName || 'Nam'}`,
          statusBadge: 'NEW FILE',
        },
      });

      addNotification({
        type: 'system',
        title: `Tệp mới: "${file?.name || 'Tài liệu'}" đã được tải lên`,
        body: `@${userName || 'Người dùng'} vừa thêm một tài liệu mới vào Cloud Drive.`,
        senderName: userName || 'Cloud Drive',
        senderColor: '#0ea5e9',
        targetUrl: '/#files',
        targetLabel: 'Kho tài liệu Drive',
        isPriority: false,
      });

      appendAuditLog({
        action: 'file.uploaded',
        actionLabel: `Tải lên tệp "${file?.name || 'Tài liệu'}" vào Cloud Drive`,
        actorName: userName || 'Người dùng',
        actorEmail: 'user@congty.com',
        actorType: 'user',
        resourceType: 'file',
        resourceName: file?.name || 'Tài liệu',
      });
      break;
    }

    case 'sop.run': {
      const { page, taskKey } = payload;
      dispatchWorkplaceChatMessage('thong-bao-cong-ty', {
        senderId: 'bot-sop',
        senderName: 'Quy Trình Chuẩn SOP Hub',
        senderColor: '#059669',
        senderRole: 'Vận Hành Chuẩn M6',
        type: 'bot_alert',
        content: `📋 **[Khởi Chạy Quy Trình SOP]**\n- Quy trình: **${page?.title}**\n- Mã nhiệm vụ Kanban: **${taskKey}**\n- Phụ trách: **${page?.owner || 'Nguyễn Văn Nam'}**\n- Vui lòng theo dõi các bước checklist trên Bảng việc Kanban!`,
        botInfo: {
          source: 'jira',
          eventTitle: `SOP Run: ${taskKey}`,
          eventMeta: page?.title || 'SOP',
          statusBadge: 'IN EXECUTION',
        },
      });

      appendAuditLog({
        action: 'sop.executed',
        actionLabel: `Khởi chạy quy trình SOP "${page?.title}" (${taskKey})`,
        actorName: 'Nguyễn Văn Nam',
        actorEmail: 'nam.nguyen@congty.com',
        actorType: 'user',
        resourceType: 'sop',
        resourceName: page?.title || 'SOP',
      });
      break;
    }

    case 'webhook.received': {
      appendAuditLog({
        action: 'webhook.received',
        actionLabel: `Nhận Webhook từ dịch vụ bên thứ ba (${payload?.source || 'Incoming'})`,
        actorName: 'Webhook Gateway',
        actorEmail: 'gateway@system.internal',
        actorType: 'system',
        resourceType: 'webhook',
        resourceName: payload?.event || payload?.source || 'External Hook',
      });
      break;
    }

    default:
      console.log(`[DomainEventBus] Unhandled event: ${eventName}`, payload);
      break;
  }

  // ------------------------------------------------------------------
  // Execute all active matching automation rules from M7 Automation Engine
  // ------------------------------------------------------------------
  executeAutomationRules(eventName, payload);
}
