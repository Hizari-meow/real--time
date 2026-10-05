'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Table,
  Palette,
  Plus,
  Search,
  Clock,
  LayoutGrid,
  List as ListIcon,
  Trash2,
  ExternalLink,
  ChevronRight,
  HardDrive,
  Users,
  MessageSquare,
  Shield,
  Layers,
  Sparkles,
  Star,
  Settings,
  CheckSquare,
  PenTool,
  BookOpen,
  Activity,
  Server,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  Bookmark,
  Share2,
  Lock,
  Headphones,
  Check,
  Zap,
  Bell,
  Filter,
  ArrowUpRight,
  Presentation,
  Component,
  LogOut,
} from 'lucide-react';
import { formatDate, timeAgo } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from '../components/auth/AuthModal';
import { UserProfileModal } from '../components/profile/UserProfileModal';
import { AICopilotDrawer } from '../components/ai/AICopilotDrawer';
import { CommandPalette } from '../components/common/CommandPalette';
import { CloudDriveExplorer } from '../components/drive/CloudDriveExplorer';
import { InternalWikiKnowledgeBase } from '../components/wiki/InternalWikiKnowledgeBase';
import { IntegrationsHub } from '../components/automations/IntegrationsHub';
import { TeamCollaborationHub } from '../components/collaboration/TeamCollaborationHub';
import { NotificationCenterDrawer } from '../components/collaboration/NotificationCenterDrawer';
import { CollaborativeKanban } from '../components/tasks/CollaborativeKanban';
import { AdminSecurityConsole } from '../components/admin/AdminSecurityConsole';
import { CollaborativeWhiteboard } from '../components/whiteboard/CollaborativeWhiteboard';
import { API_BASE, WS_BASE } from '../lib/api-client';
import {
  getStoredDriveFiles,
  saveStoredDriveFiles,
  emitDomainEvent,
  CloudFileItem,
} from '../lib/domain-event-bus';

export type WorkspaceItemType = 'doc' | 'sheet' | 'design' | 'whiteboard';

export interface WorkspaceItem {
  id: string;
  title: string;
  type: WorkspaceItemType;
  href: string;
  currentVersion: number;
  updatedAt: string;
  createdAt: string;
  owner?: { id: string; name: string; email?: string };
  badgeText: string;
  badgeClass: string;
  iconBgClass: string;
  iconTextClass: string;
  detailsSummary: string;
}

// Seed Real Workspaces Items across all 4 separate modalities
const SEED_WORKSPACE_ITEMS: WorkspaceItem[] = [
  // 1. SPREADSHEETS (Bảng tính Excel thật -> /sheet/...)
  {
    id: 'sheet_fin_q4',
    title: 'Báo Cáo Tài Chính & Doanh Thu Q4-2026 (Excel)',
    type: 'sheet',
    href: '/sheet/sheet_fin_q4',
    currentVersion: 8,
    updatedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    owner: { id: 'usr_linh', name: 'Trần Thị Linh' },
    badgeText: 'Bảng tính Excel',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconBgClass: 'bg-emerald-50 group-hover:bg-emerald-600',
    iconTextClass: 'text-emerald-600 group-hover:text-white',
    detailsSummary: '25 dòng • 11 cột • Công thức SUM/VAT • Ô C12 đang có bình luận',
  },
  {
    id: 'sheet_budget_2027',
    title: 'Dự Toán Ngân Sách Dự Án Kỹ Thuật 2027 (Excel)',
    type: 'sheet',
    href: '/sheet/sheet_budget_2027',
    currentVersion: 4,
    updatedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    owner: { id: 'usr_nam', name: 'Nguyễn Văn Nam' },
    badgeText: 'Bảng tính Excel',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconBgClass: 'bg-emerald-50 group-hover:bg-emerald-600',
    iconTextClass: 'text-emerald-600 group-hover:text-white',
    detailsSummary: 'Kế hoạch phân bổ chi phí cụm máy chủ & bản quyền 2027',
  },
  {
    id: 'sheet_kpi_metrics',
    title: 'Bảng Theo Dõi KPI & Hiệu Suất Nhóm (Excel)',
    type: 'sheet',
    href: '/sheet/sheet_kpi_metrics',
    currentVersion: 3,
    updatedAt: new Date(Date.now() - 1000 * 60 * 420).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
    owner: { id: 'usr_hoang', name: 'Lê Hoàng' },
    badgeText: 'Bảng tính Excel',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconBgClass: 'bg-emerald-50 group-hover:bg-emerald-600',
    iconTextClass: 'text-emerald-600 group-hover:text-white',
    detailsSummary: 'Chỉ số hoàn thành Sprint 24 & Đo lường SLA hội tụ CRDT',
  },

  // 2. FIGMA DESIGN CANVAS (Bản vẽ Thiết kế UI & Slide Figma -> /design/...)
  {
    id: 'design_ui_workspace',
    title: 'Bản Thiết Kế Trực Quan UI Workspace & Slide Giới Thiệu (Figma)',
    type: 'design',
    href: '/design/design_ui_workspace',
    currentVersion: 12,
    updatedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    owner: { id: 'usr_giang', name: 'Trần Thị Giang (Design Lead)' },
    badgeText: 'Bản vẽ Figma',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    iconBgClass: 'bg-purple-50 group-hover:bg-purple-600',
    iconTextClass: 'text-purple-600 group-hover:text-white',
    detailsSummary: 'Khung Artboards Desktop 1440px & Slide 16:9 • Ghim Pin #1 tại nút CTA tím • Xuất mã CSS',
  },

  // 3. WHITEBOARD (Bảng trắng Động não & Brainstorming -> /whiteboard?board=...)
  {
    id: 'open_brainstorm',
    title: 'Bảng Trắng Động Não & Sơ Đồ Kiến Trúc (Whiteboard)',
    type: 'whiteboard',
    href: '/whiteboard?board=open_brainstorm',
    currentVersion: 6,
    updatedAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
    owner: { id: 'usr_alice', name: 'Alice Tech (Kiến trúc sư)' },
    badgeText: 'Bảng trắng',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    iconBgClass: 'bg-amber-50 group-hover:bg-amber-600',
    iconTextClass: 'text-amber-600 group-hover:text-white',
    detailsSummary: 'Mindmap sơ đồ tư duy • Giấy ghi chú sticky notes màu • Bút dạ vẽ tự do',
  },

  // 4. DOCUMENTS (Tài liệu văn bản thật -> /doc/...)
  {
    id: 'doc_rfc_consensus',
    title: 'Kiến Trúc Hội Tụ Dữ Liệu Thời Gian Thực Bằng Yjs CRDT (RFC v4)',
    type: 'doc',
    href: '/doc/doc_rfc_consensus',
    currentVersion: 15,
    updatedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
    owner: { id: 'usr_nam', name: 'Nguyễn Văn Nam' },
    badgeText: 'Văn bản',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    iconBgClass: 'bg-blue-50 group-hover:bg-blue-600',
    iconTextClass: 'text-blue-600 group-hover:text-white',
    detailsSummary: 'Thuật toán CRDT • Thử nghiệm tải 5,000 CCU • Độ trễ <5ms',
  },
  {
    id: 'doc_sop_01',
    title: 'Quy Trình Ứng Phó Sự Cố & Triển Khai Cụm Máy Chủ (SOP-01)',
    type: 'doc',
    href: '/doc/doc_sop_01',
    currentVersion: 7,
    updatedAt: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    owner: { id: 'usr_hoang', name: 'Lê Hoàng' },
    badgeText: 'Văn bản',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    iconBgClass: 'bg-blue-50 group-hover:bg-blue-600',
    iconTextClass: 'text-blue-600 group-hover:text-white',
    detailsSummary: 'Quy chuẩn DevOps • Tự động failover NGINX • Lưu trữ sao lưu Redis',
  },
  {
    id: 'doc_roadmap_2026',
    title: 'Lộ Trình Nâng Cấp Nền Tảng Cộng Tác Toàn Diện 2026',
    type: 'doc',
    href: '/doc/doc_roadmap_2026',
    currentVersion: 4,
    updatedAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 16).toISOString(),
    owner: { id: 'usr_linh', name: 'Trần Thị Linh' },
    badgeText: 'Văn bản',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    iconBgClass: 'bg-blue-50 group-hover:bg-blue-600',
    iconTextClass: 'text-blue-600 group-hover:text-white',
    detailsSummary: 'Kế hoạch triển khai AI Copilot, Google Meet WebRTC và Ghim bình luận Canvas',
  },
];

// Audit Log Seed Data
const AUDIT_LOGS = [
  {
    id: 'audit_1',
    user: 'Nguyễn Văn Nam',
    action: 'Chỉnh sửa tài liệu',
    target: 'Distributed Consensus Engine RFC v4',
    module: 'Documents',
    time: Date.now() - 1000 * 60 * 8,
    role: 'Trưởng nhóm (Admin)',
    status: 'success',
  },
  {
    id: 'audit_2',
    user: 'Lê Hoàng Long',
    action: 'Cập nhật trạng thái công việc',
    target: 'Kiểm thử hội tụ CRDT 500 client -> Done',
    module: 'Kanban Tasks',
    time: Date.now() - 1000 * 60 * 18,
    role: 'Thành viên',
    status: 'success',
  },
  {
    id: 'audit_3',
    user: 'Trần Thị Mai',
    action: 'Ghim Pin #1 tại Nút CTA trên Bản vẽ Figma',
    target: 'Bản Thiết Kế Trực Quan UI Workspace (Figma)',
    module: 'Design Canvas',
    time: Date.now() - 1000 * 60 * 25,
    role: 'Phó nhóm',
    status: 'success',
  },
  {
    id: 'audit_4',
    user: 'Trần Thị Linh',
    action: 'Tính toán công thức =SUM(D4:D6) và trao đổi ô C12',
    target: 'Báo Cáo Tài Chính & Doanh Thu Q4-2026 (Excel)',
    module: 'Spreadsheet',
    time: Date.now() - 1000 * 60 * 35,
    role: 'Product Manager',
    status: 'success',
  },
  {
    id: 'audit_5',
    user: 'Alice (Kiến trúc sư)',
    action: 'Vẽ sơ đồ tư duy trên Bảng trắng',
    target: 'Bảng Trắng Động Não Ý Tưởng & Sơ Đồ Kiến Trúc',
    module: 'Whiteboard',
    time: Date.now() - 1000 * 60 * 50,
    role: 'Trưởng nhóm (Admin)',
    status: 'success',
  },
];

export default function WorkspaceDashboard() {
  const router = useRouter();
  const [workspaceItems, setWorkspaceItems] = useState<WorkspaceItem[]>(SEED_WORKSPACE_ITEMS);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Sub-category filter: 'all' | 'doc' | 'sheet' | 'design' | 'whiteboard'
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'doc' | 'sheet' | 'design' | 'whiteboard'>('all');

  // Expanded main navigation tabs (Modules M1-M9)
  const [activeTab, setActiveTab] = useState<
    'all' | 'recent' | 'favorites' | 'drive' | 'wiki' | 'tasks' | 'admin' | 'telemetry' | 'automations' | 'collab' | 'whiteboard'
  >('all');

  const [currentOrg, setCurrentOrg] = useState({
    id: 'org_main',
    name: 'Tập Đoàn Công Nghệ Số',
    slug: 'tech-corp',
  });

  const SPACES = [
    { id: 'space_all', name: 'Toàn Không Gian Làm Việc' },
    { id: 'space_eng', name: 'Phòng Kỹ Thuật & Sản Phẩm' },
    { id: 'space_biz', name: 'Phòng Kinh Doanh & Tiếp Thị' },
    { id: 'space_ops', name: 'Phòng Vận Hành & Nhân Sự' },
  ];

  const [selectedSpaceId, setSelectedSpaceId] = useState('space_all');

  const [favorites, setFavorites] = useState<string[]>([
    'sheet_fin_q4',
    'design_ui_workspace',
    'doc_rfc_consensus',
  ]);

  // Unified Creation Modal State (Doc / Sheet / Design / Whiteboard)
  const [isCreatingModal, setIsCreatingModal] = useState(false);
  const [createType, setCreateType] = useState<WorkspaceItemType>('doc');
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Real authenticated user state from AuthContext
  const { user, workspace, workspaces, token, switchWorkspace, logout, isAuthenticated, isLoading } = useAuth();
  const [userColor, setUserColor] = useState('#0068ff');

  const currentUser = useMemo(() => {
    if (user) {
      return {
        id: user.userId,
        name: user.name,
        color: userColor,
      };
    }
    return {
      id: '',
      name: '',
      color: userColor,
    };
  }, [user, userColor]);

  // Sidebar Today's Focus Tasks
  const [todayTasks, setTodayTasks] = useState([
    { id: 'tt1', text: 'Rà soát kiến trúc CRDT Yjs', done: true },
    { id: 'tt2', text: 'Kiểm tra công thức ô C12 trên Bảng tính Excel', done: false },
    { id: 'tt3', text: 'Duyệt bản vẽ nút CTA màu tím trên Figma Canvas', done: true },
  ]);

  const toggleTodayTask = (id: string) => {
    setTodayTasks((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
      try {
        localStorage.setItem('collab_sidebar_today_tasks', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const onlineTeammates = [
    { id: 'usr_linh', name: 'Trần Thị Linh', role: 'Product Manager', color: '#ec4899', isOnline: true },
    { id: 'usr_hoang', name: 'Lê Hoàng', role: 'DevOps Lead', color: '#f59e0b', isOnline: true },
    { id: 'usr_alice', name: 'Alice Tech', role: 'Kiến trúc sư', color: '#8b5cf6', isOnline: true },
  ];

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

  // Load custom items and favorites
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedColor = localStorage.getItem('collab_user_color');
    if (storedColor) {
      setUserColor(storedColor);
    }

    const storedFavs = localStorage.getItem('collab_favorites');
    if (storedFavs) {
      try {
        setFavorites(JSON.parse(storedFavs));
      } catch {}
    }

    // Load any user-created custom items from local storage
    try {
      const customItemsRaw = localStorage.getItem('collab_custom_workspace_items');
      if (customItemsRaw) {
        const customItems: WorkspaceItem[] = JSON.parse(customItemsRaw);
        setWorkspaceItems((prev) => {
          const map = new Map<string, WorkspaceItem>();
          prev.forEach((i) => map.set(i.id, i));
          customItems.forEach((i) => map.set(i.id, i));
          return Array.from(map.values());
        });
      }
    } catch {}

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Real-time unread notification count & WebSocket listener
  useEffect(() => {
    if (!token && typeof window === 'undefined') return;

    const fetchUnreadCount = async () => {
      try {
        const res = await fetch(`${API_BASE}/notifications/unread-count`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
            'x-workspace-id': workspace?.orgId || '',
          },
          credentials: 'include',
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && typeof json.data?.unreadCount === 'number') {
            setUnreadNotificationsCount(json.data.unreadCount);
          }
        }
      } catch (err) {
        console.error('[Page] Error fetching unread notification count:', err);
      }
    };

    fetchUnreadCount();

    const handleNotificationEvent = () => fetchUnreadCount();
    window.addEventListener('collab_notification_added', handleNotificationEvent);
    window.addEventListener('collab_notification_read', handleNotificationEvent);
    window.addEventListener('collab_notification_read_all', handleNotificationEvent);

    // Realtime WebSocket for notifications
    let ws: WebSocket | null = null;
    let reconnectTimer: any = null;

    if (token) {
      const connectWebSocket = () => {
        try {
          const wsUrl = `${WS_BASE}?token=${encodeURIComponent(token)}&orgId=${encodeURIComponent(workspace?.orgId || '')}`;
          ws = new WebSocket(wsUrl);

          ws.onmessage = (event) => {
            try {
              const msg = JSON.parse(event.data);
              if (msg.type === 'notification:created') {
                if (typeof msg.unreadCount === 'number') {
                  setUnreadNotificationsCount(msg.unreadCount);
                } else {
                  setUnreadNotificationsCount((prev) => prev + 1);
                }
                window.dispatchEvent(new CustomEvent('collab_notification_added', { detail: msg.data }));
              } else if (msg.type === 'notification:read') {
                if (typeof msg.unreadCount === 'number') {
                  setUnreadNotificationsCount(msg.unreadCount);
                } else {
                  setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));
                }
                window.dispatchEvent(new CustomEvent('collab_notification_read', { detail: msg.data }));
              } else if (msg.type === 'notification:read_all') {
                setUnreadNotificationsCount(0);
                window.dispatchEvent(new CustomEvent('collab_notification_read_all'));
              }
            } catch {}
          };

          ws.onclose = () => {
            reconnectTimer = setTimeout(connectWebSocket, 5000);
          };

          ws.onerror = () => {
            ws?.close();
          };
        } catch {}
      };

      connectWebSocket();
    }

    return () => {
      window.removeEventListener('collab_notification_added', handleNotificationEvent);
      window.removeEventListener('collab_notification_read', handleNotificationEvent);
      window.removeEventListener('collab_notification_read_all', handleNotificationEvent);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [token, workspace?.orgId]);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      localStorage.setItem('collab_favorites', JSON.stringify(next));
      return next;
    });
  };

  // Create Document, Spreadsheet, Figma Design, or Whiteboard
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;

    setCreating(true);
    const title = newTitle.trim() || (
      createType === 'sheet'
        ? 'Bảng Tính Excel Mới'
        : createType === 'design'
        ? 'Bản Vẽ Thiết Kế UI Mới (Figma)'
        : createType === 'whiteboard'
        ? 'Bảng Trắng Động Não Mới'
        : 'Tài Liệu Văn Bản Mới'
    );

    const generatedId = `${
      createType === 'sheet'
        ? 'sheet_'
        : createType === 'design'
        ? 'design_'
        : createType === 'whiteboard'
        ? 'board_'
        : 'doc_'
    }${Date.now()}`;

    try {
      if (createType === 'doc') {
        // Save title to localStorage so document editor picks it up
        localStorage.setItem(`collab_doc_title_${generatedId}`, title);
        try {
          await fetch(`${apiUrl}/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: generatedId, title, userId: currentUser.id }),
          });
        } catch {}
      } else if (createType === 'sheet') {
        // Initialize clean empty spreadsheet
        localStorage.setItem(`collab_sheet_title_${generatedId}`, title);
        localStorage.setItem(`collab_sheet_data_${generatedId}`, JSON.stringify({}));
        localStorage.setItem(`collab_sheet_comments_${generatedId}`, JSON.stringify([]));
      } else if (createType === 'design') {
        // Initialize clean empty Figma design canvas
        localStorage.setItem(`collab_design_title_${generatedId}`, title);
        localStorage.setItem(`collab_figma_elements_${generatedId}`, JSON.stringify([
          {
            id: `frame_clean_${Date.now()}`,
            name: `${title} (1000×600)`,
            type: 'frame',
            x: 100,
            y: 100,
            width: 1000,
            height: 600,
            borderRadius: 20,
            fill: '#ffffff',
            stroke: '#e4e4e7',
            strokeWidth: 2,
            shadow: { x: 0, y: 8, blur: 24, color: 'rgba(0,0,0,0.06)' },
          }
        ]));
        localStorage.setItem(`collab_figma_comments_${generatedId}`, JSON.stringify([]));
      }

      // Synchronize file into Cloud Drive (M4) so it appears in Drive explorer immediately
      try {
        const driveFiles = getStoredDriveFiles();
        const driveFileCategory =
          createType === 'sheet'
            ? 'spreadsheet'
            : createType === 'design'
            ? 'image'
            : createType === 'whiteboard'
            ? 'snapshot'
            : 'document';
        const fileExt =
          createType === 'sheet'
            ? '.xlsx'
            : createType === 'design'
            ? '.fig'
            : createType === 'whiteboard'
            ? '.board'
            : '.docx';
        const mime =
          createType === 'sheet'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : createType === 'design'
            ? 'application/figma'
            : createType === 'whiteboard'
            ? 'application/x-whiteboard'
            : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        const newDriveFile: CloudFileItem = {
          id: generatedId,
          name: `${title}${fileExt}`,
          key: `${driveFileCategory}s/${generatedId}${fileExt}`,
          size: createType === 'sheet' ? 24500 : createType === 'design' ? 120000 : 18000,
          mimeType: mime,
          category: driveFileCategory as any,
          folderId: 'fld-1',
          updatedAt: new Date().toISOString(),
          url:
            createType === 'sheet'
              ? `/sheet/${generatedId}`
              : createType === 'design'
              ? `/design/${generatedId}`
              : createType === 'whiteboard'
              ? `/whiteboard?board=${generatedId}`
              : `/doc/${generatedId}`,
          ownerId: currentUser.id,
          ownerName: currentUser.name,
          permission: 'editor',
          isStarred: false,
          isDeleted: false,
          versions: [
            {
              version: 1,
              size: createType === 'sheet' ? 24500 : 18000,
              updatedAt: new Date().toISOString(),
              updatedBy: currentUser.name,
              changeSummary: `Khởi tạo ${
                createType === 'sheet' ? 'bảng tính Excel' : createType === 'design' ? 'bản vẽ Figma' : 'tài liệu'
              } mới`,
            },
          ],
        };
        saveStoredDriveFiles([newDriveFile, ...driveFiles]);

        try {
          emitDomainEvent('file.uploaded', {
            file: newDriveFile,
            userName: currentUser.name,
          });
        } catch {}
      } catch (err) {
        console.warn('Failed to sync new item to Drive:', err);
      }

      // Add to local workspace items
      const newItem: WorkspaceItem = {
        id: generatedId,
        title,
        type: createType,
        href:
          createType === 'sheet'
            ? `/sheet/${generatedId}`
            : createType === 'design'
            ? `/design/${generatedId}`
            : createType === 'whiteboard'
            ? `/whiteboard?board=${generatedId}`
            : `/doc/${generatedId}`,
        currentVersion: 1,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        owner: { id: currentUser.id, name: currentUser.name },
        badgeText:
          createType === 'sheet'
            ? 'Bảng tính Excel'
            : createType === 'design'
            ? 'Bản vẽ Figma'
            : createType === 'whiteboard'
            ? 'Bảng trắng'
            : 'Văn bản',
        badgeClass:
          createType === 'sheet'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : createType === 'design'
            ? 'bg-purple-50 text-purple-700 border-purple-200'
            : createType === 'whiteboard'
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-blue-50 text-blue-700 border-blue-200',
        iconBgClass:
          createType === 'sheet'
            ? 'bg-emerald-50 group-hover:bg-emerald-600'
            : createType === 'design'
            ? 'bg-purple-50 group-hover:bg-purple-600'
            : createType === 'whiteboard'
            ? 'bg-amber-50 group-hover:bg-amber-600'
            : 'bg-blue-50 group-hover:bg-blue-600',
        iconTextClass:
          createType === 'sheet'
            ? 'text-emerald-600 group-hover:text-white'
            : createType === 'design'
            ? 'text-purple-600 group-hover:text-white'
            : createType === 'whiteboard'
            ? 'text-amber-600 group-hover:text-white'
            : 'text-blue-600 group-hover:text-white',
        detailsSummary:
          createType === 'sheet'
            ? 'Bảng tính vừa tạo • Lưới ô trống sẵn sàng nhập công thức'
            : createType === 'design'
            ? 'Bản vẽ Figma vừa tạo • Khung artboard trắng sẵn sàng thiết kế'
            : createType === 'whiteboard'
            ? 'Bảng trắng vừa tạo • Bút vẽ tự do & giấy ghi chú dán tường'
            : 'Tài liệu văn bản vừa tạo • Trang trắng sẵn sàng soạn thảo',
      };

      setWorkspaceItems((prev) => [newItem, ...prev]);

      try {
        const stored = localStorage.getItem('collab_custom_workspace_items');
        const list = stored ? JSON.parse(stored) : [];
        list.unshift(newItem);
        localStorage.setItem('collab_custom_workspace_items', JSON.stringify(list));
      } catch {}

      setIsCreatingModal(false);
      setNewTitle('');
      router.push(newItem.href);
    } catch (err) {
      console.error('Failed to create item:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Bạn có chắc muốn xóa mục này khỏi không gian làm việc?')) return;

    setWorkspaceItems((prev) => prev.filter((d) => d.id !== id));

    try {
      const stored = localStorage.getItem('collab_custom_workspace_items');
      if (stored) {
        const list: WorkspaceItem[] = JSON.parse(stored);
        const filtered = list.filter((i) => i.id !== id);
        localStorage.setItem('collab_custom_workspace_items', JSON.stringify(filtered));
      }
    } catch {}

    try {
      await fetch(`${apiUrl}/documents/${id}`, { method: 'DELETE' });
    } catch {}
  };

  // Filtered workspace items
  const filteredItems = useMemo(() => {
    return workspaceItems.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.detailsSummary.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeTab === 'favorites') {
        if (!favorites.includes(item.id)) return false;
      } else if (activeTab === 'recent') {
        const itemDate = new Date(item.updatedAt).getTime();
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        if (itemDate < oneDayAgo) return false;
      }

      if (categoryFilter !== 'all' && item.type !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [workspaceItems, searchQuery, activeTab, favorites, categoryFilter]);

  // Counts by type
  const sheetCount = useMemo(() => workspaceItems.filter((i) => i.type === 'sheet').length, [workspaceItems]);
  const designCount = useMemo(() => workspaceItems.filter((i) => i.type === 'design').length, [workspaceItems]);
  const whiteboardCount = useMemo(() => workspaceItems.filter((i) => i.type === 'whiteboard').length, [workspaceItems]);
  const docCount = useMemo(() => workspaceItems.filter((i) => i.type === 'doc').length, [workspaceItems]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-zinc-400 font-medium">Đang nạp phiên làm việc &amp; kiểm tra phân quyền...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthModal />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc] font-sans text-zinc-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Sleek Left Navigation Sidebar */}
      <aside className="w-64 bg-white border-r border-zinc-200/80 hidden md:flex flex-col h-full shrink-0 shadow-xs">
        {/* Workspace Switcher Header */}
        {/* Workspace & Space Switcher Header (Section 18.1) */}
        <div className="h-16 px-4 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              {(workspace?.orgName || 'CW').slice(0, 2).toUpperCase()}
            </div>
            <div className="truncate">
              {workspaces.length > 1 ? (
                <select
                  value={workspace?.orgId}
                  onChange={(e) => switchWorkspace(e.target.value)}
                  className="text-xs font-bold text-zinc-900 bg-transparent border-none p-0 focus:outline-none cursor-pointer truncate max-w-[140px] block"
                >
                  {workspaces.map((w) => (
                    <option key={w.orgId} value={w.orgId}>
                      {w.orgName}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs font-bold text-zinc-900 truncate">{workspace?.orgName || 'Workspace'}</p>
              )}
              <p className="text-[10px] text-zinc-400 font-mono truncate">{workspace?.slug || 'collab'}</p>
            </div>
          </div>
        </div>

        {/* Scrollable Navigation & Widgets Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Quick Search Input */}
          <div className="p-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm kiếm tài liệu, tệp, task... (⌘K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-100/70 border border-zinc-200/50 rounded-xl text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-400 transition-all"
              />
            </div>
          </div>

          {/* Core Modules Navigation (Section 18.1) */}
          <nav className="px-3 space-y-4">
            <div>
              <span className="px-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                Các Phân Hệ Cốt Lõi
              </span>
              <div className="space-y-0.5">
                {/* 1. M1: Trang chủ & Tài liệu */}
                <button
                  onClick={() => {
                    setActiveTab('all');
                    setCategoryFilter('all');
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeTab === 'all'
                      ? 'bg-zinc-100 text-zinc-900 font-semibold shadow-2xs'
                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Trang chủ &amp; Tài liệu</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">{workspaceItems.length}</span>
                </button>

                {/* 2. M2: Giao tiếp & Trao đổi */}
                <button
                  onClick={() => setActiveTab('collab')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeTab === 'collab'
                      ? 'bg-blue-50 text-blue-900 font-semibold shadow-2xs border border-blue-200/60'
                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#0068ff]" />
                    <span>Kênh trao đổi &amp; Họp</span>
                  </div>
                  <span className="px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold">
                    Chat &amp; Meet
                  </span>
                </button>

                {/* 3. M3: Quản lý công việc */}
                <button
                  onClick={() => setActiveTab('tasks')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeTab === 'tasks'
                      ? 'bg-indigo-50 text-indigo-900 font-semibold shadow-2xs border border-indigo-200/60'
                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                    <span>Quản lý công việc (Kanban)</span>
                  </div>
                  <span className="px-1.5 py-0.2 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                    M3
                  </span>
                </button>

                {/* 4. M4: Quản lý và chia sẻ tệp */}
                <button
                  onClick={() => setActiveTab('drive')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeTab === 'drive'
                      ? 'bg-amber-50 text-amber-900 font-semibold shadow-2xs border border-amber-200/60'
                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-amber-600" />
                    <span>Kho tệp &amp; Drive (S3)</span>
                  </div>
                  <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-700 text-[10px] font-mono">
                    M4
                  </span>
                </button>

                {/* 5. M5: Bảng trắng động não */}
                <button
                  onClick={() => setActiveTab('whiteboard')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeTab === 'whiteboard'
                      ? 'bg-amber-50 text-amber-900 font-semibold shadow-2xs border border-amber-200/60'
                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-amber-600" />
                    <span>Bảng trắng động não</span>
                  </div>
                  <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                    M5
                  </span>
                </button>

                {/* 6. M6: Wiki & Tri thức */}
                <button
                  onClick={() => setActiveTab('wiki')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeTab === 'wiki'
                      ? 'bg-emerald-50 text-emerald-900 font-semibold shadow-2xs border border-emerald-200/60'
                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    <span>Wiki &amp; Tri thức (SOP)</span>
                  </div>
                  <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                    M6
                  </span>
                </button>

                {/* 7. M7: Tích hợp & Tự động hóa */}
                <button
                  onClick={() => setActiveTab('automations')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeTab === 'automations'
                      ? 'bg-purple-50 text-purple-900 font-semibold shadow-2xs border border-purple-200/60'
                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-600" />
                    <span>Tích hợp &amp; Tự động hóa</span>
                  </div>
                  <span className="px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-700 text-[10px] font-mono">
                    M7
                  </span>
                </button>

                {/* 8. M8: Quản trị & Bảo mật */}
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeTab === 'admin'
                      ? 'bg-rose-50 text-rose-900 font-semibold shadow-2xs border border-rose-200/60'
                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-rose-600" />
                    <span>Quản trị &amp; Bảo mật (RBAC)</span>
                  </div>
                  <span className="px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold">
                    M8
                  </span>
                </button>
              </div>
            </div>

            {/* Quick Filters */}
            <div>
              <span className="px-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                Bộ Lọc Nhanh
              </span>
              <div className="space-y-0.5">
                <button
                  onClick={() => {
                    setActiveTab('favorites');
                    setCategoryFilter('all');
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    activeTab === 'favorites'
                      ? 'bg-zinc-100 text-zinc-900 font-semibold shadow-2xs'
                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500" />
                    <span>Yêu thích</span>
                  </div>
                  {favorites.length > 0 && (
                    <span className="text-[10px] font-mono text-zinc-400">{favorites.length}</span>
                  )}
                </button>

                <button
                  onClick={() => {
                    setActiveTab('recent');
                    setCategoryFilter('all');
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    activeTab === 'recent'
                      ? 'bg-zinc-100 text-zinc-900 font-semibold shadow-2xs'
                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-zinc-500" />
                    <span>Chỉnh sửa gần đây</span>
                  </div>
                </button>
              </div>
            </div>
          </nav>

          {/* SECTION 1: VIỆC CẦN LÀM HÔM NAY */}
          <div className="px-3 pt-5 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-700">
              <span className="flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                <span>Việc cần làm hôm nay</span>
              </span>
              <span className="text-[10px] font-mono text-blue-600 font-bold bg-blue-50 px-1.5 py-0.2 rounded">
                {todayTasks.filter((t) => t.done).length}/{todayTasks.length}
              </span>
            </div>

            <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{
                  width: `${(todayTasks.filter((t) => t.done).length / todayTasks.length) * 100}%`,
                }}
              />
            </div>

            <div className="space-y-1 pt-1">
              {todayTasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => toggleTodayTask(t.id)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-zinc-100/80 cursor-pointer transition-colors group text-[11px]"
                >
                  <button
                    type="button"
                    className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors shrink-0 ${
                      t.done
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-zinc-300 group-hover:border-zinc-400 bg-white'
                    }`}
                  >
                    {t.done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </button>
                  <span
                    className={`truncate transition-all ${
                      t.done ? 'line-through text-zinc-400' : 'text-zinc-700 group-hover:text-zinc-900 font-medium'
                    }`}
                  >
                    {t.text}
                  </span>
                </div>
              ))}
            </div>

            <Link
              href="/tasks"
              className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-700 font-semibold pt-0.5 hover:underline"
            >
              <span>Xem chi tiết trên Kanban</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* SECTION 2: ĐỒNG NGHIỆP TRỰC TUYẾN */}
          <div className="px-3 pt-4 pb-2 space-y-2 border-t border-zinc-100/80 mt-3">
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-700">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Đồng nghiệp trực tuyến</span>
              </span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                3 online
              </span>
            </div>

            <div className="space-y-1">
              {onlineTeammates.map((u) => (
                <div
                  key={u.id}
                  onClick={() => router.push('/chat')}
                  className="flex items-center justify-between p-1.5 rounded-xl hover:bg-zinc-100/80 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-2xs"
                        style={{ backgroundColor: u.color }}
                      >
                        {u.name.slice(0, 1)}
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white absolute -bottom-0.5 -right-0.5" />
                    </div>
                    <div className="truncate">
                      <p className="text-[11px] font-semibold text-zinc-800 truncate group-hover:text-blue-600">
                        {u.name}
                      </p>
                      <p className="text-[9px] text-zinc-400 truncate">{u.role}</p>
                    </div>
                  </div>
                  <MessageSquare className="w-3 h-3 text-zinc-300 group-hover:text-blue-500 transition-colors shrink-0" />
                </div>
              ))}
            </div>

            <button
              onClick={() => router.push('/chat')}
              className="w-full mt-1.5 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700 hover:text-zinc-900 rounded-xl text-[11px] font-semibold transition-all border border-zinc-200/60 shadow-2xs cursor-pointer"
            >
              <Headphones className="w-3.5 h-3.5 text-zinc-600" />
              <span>Họp nhanh (Huddle)</span>
            </button>
          </div>

          <div className="px-4 py-2 text-[10px] text-zinc-400 flex items-center gap-1.5 border-t border-zinc-100/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Đã kết nối • Đồng bộ tức thì</span>
          </div>
        </div>

        {/* Current User Profile Footer */}
        <div className="p-3 border-t border-zinc-100 shrink-0 bg-white">
          <div className="flex items-center justify-between gap-1">
            <button
              onClick={() => setProfileOpen(true)}
              className="flex-1 flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-zinc-100/70 transition-colors text-left truncate cursor-pointer"
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
                style={{ backgroundColor: currentUser.color }}
              >
                {(currentUser.name || 'U').slice(0, 1).toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-zinc-900 truncate">{currentUser.name || 'User'}</p>
                <p className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {workspace?.role ? workspace.role.toUpperCase() : 'MEMBER'}
                </p>
              </div>
            </button>
            <button
              onClick={() => logout()}
              title="Đăng xuất"
              className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Control Bar */}
        <header className="h-16 px-6 md:px-8 border-b border-zinc-200/80 bg-white flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-zinc-400 font-medium">Không gian làm việc</span>
            <span className="text-zinc-300">/</span>
            <h1 className="text-sm font-bold text-zinc-900">
              {activeTab === 'all'
                ? categoryFilter === 'sheet'
                  ? 'Bảng tính Excel cộng tác'
                  : categoryFilter === 'design'
                  ? 'Bản vẽ Thiết kế UI & Slide (Figma Canvas)'
                  : categoryFilter === 'whiteboard'
                  ? 'Bảng trắng Động não (Whiteboard)'
                  : categoryFilter === 'doc'
                  ? 'Tài liệu văn bản'
                  : 'Tất cả tài liệu & dữ liệu'
                : activeTab === 'favorites'
                ? 'Tài liệu yêu thích'
                : activeTab === 'recent'
                ? 'Chỉnh sửa gần đây'
                : activeTab === 'tasks'
                ? 'Quản lý Công việc & Dự án (Kanban M3)'
                : activeTab === 'admin'
                ? 'Quản trị Tổ chức & Bảo mật RBAC (M8)'
                : activeTab === 'whiteboard'
                ? 'Bảng trắng Động não & Sơ đồ (M5)'
                : activeTab === 'drive'
                ? 'Kho Lưu Trữ Đám Mây (S3 Drive)'
                : activeTab === 'wiki'
                ? 'Cơ sở tri thức (Wiki & SOPs)'
                : activeTab === 'automations'
                ? 'Tích hợp & Tự động hóa'
                : activeTab === 'telemetry'
                ? 'Giám sát Cụm máy chủ (Telemetry)'
                : 'Giao tiếp & Trao đổi (Team Communication)'}
            </h1>
            <span className="text-[11px] text-zinc-400 font-mono bg-zinc-100 px-2 py-0.5 rounded-full ml-1">
              {activeTab === 'all' || activeTab === 'favorites' || activeTab === 'recent'
                ? `${filteredItems.length} mục`
                : activeTab === 'tasks'
                ? 'Sprint Active'
                : activeTab === 'admin'
                ? 'RBAC Active'
                : activeTab === 'whiteboard'
                ? 'Canvas Live'
                : activeTab === 'drive'
                ? 'MinIO S3'
                : activeTab === 'wiki'
                ? '4 SOPs'
                : activeTab === 'automations'
                ? '12 Apps'
                : activeTab === 'telemetry'
                ? '2 nodes'
                : '4 Phân hệ'}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            {(activeTab === 'all' || activeTab === 'favorites' || activeTab === 'recent') && (
              <div className="flex items-center border border-zinc-200 rounded-xl p-0.5 bg-zinc-50">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-white text-zinc-900 shadow-2xs font-bold'
                      : 'text-zinc-400 hover:text-zinc-700'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-white text-zinc-900 shadow-2xs font-bold'
                      : 'text-zinc-400 hover:text-zinc-700'
                  }`}
                  title="List View"
                >
                  <ListIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Command Palette Trigger */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 rounded-xl text-xs font-medium transition-colors border border-zinc-200/70 cursor-pointer"
              title="Mở thanh tìm kiếm & lệnh nhanh (⌘K / Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-zinc-400" />
              <span>Tìm kiếm...</span>
              <kbd className="px-1 py-0.2 bg-white border border-zinc-200 rounded text-[9px] font-mono text-zinc-400">
                ⌘K
              </kbd>
            </button>

            {/* Mở Kênh Giao tiếp */}
            <Link
              href="/chat"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200/80 hover:bg-zinc-50 text-zinc-700 rounded-xl text-xs font-semibold transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#0068ff]" />
              <span>Kênh giao tiếp</span>
            </Link>

            {/* Notification Center Trigger */}
            <button
              onClick={() => setNotificationDrawerOpen(true)}
              className="relative p-2 rounded-xl border border-zinc-200/80 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
              title="Trung tâm thông báo & Hộp thư (Notifications)"
            >
              <Bell className="w-3.5 h-3.5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center ring-2 ring-white shadow-2xs">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* + Tạo mới Button */}
            <button
              onClick={() => setIsCreatingModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo mới</span>
            </button>
          </div>
        </header>

        {/* Dashboard Body */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
          {/* TAB 1: ALL WORKSPACE ITEMS */}
          {(activeTab === 'all' || activeTab === 'favorites' || activeTab === 'recent') && (
            <div className="space-y-6">
              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/80 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mr-1">
                    Phân loại:
                  </span>

                  <button
                    onClick={() => setCategoryFilter('all')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      categoryFilter === 'all'
                        ? 'bg-zinc-900 text-white shadow-xs'
                        : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Tất cả ({workspaceItems.length})</span>
                  </button>

                  <button
                    onClick={() => setCategoryFilter('sheet')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      categoryFilter === 'sheet'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                    }`}
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>Bảng tính Excel ({sheetCount})</span>
                  </button>

                  <button
                    onClick={() => setCategoryFilter('design')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      categoryFilter === 'design'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200'
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>Bản vẽ Figma ({designCount})</span>
                  </button>

                  <button
                    onClick={() => setCategoryFilter('whiteboard')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      categoryFilter === 'whiteboard'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
                    }`}
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Bảng trắng ({whiteboardCount})</span>
                  </button>

                  <button
                    onClick={() => setCategoryFilter('doc')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      categoryFilter === 'doc'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Văn bản ({docCount})</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setCreateType('sheet');
                      setIsCreatingModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Tạo Excel mới</span>
                  </button>

                  <button
                    onClick={() => {
                      setCreateType('design');
                      setIsCreatingModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Tạo Figma mới</span>
                  </button>

                  <button
                    onClick={() => {
                      setCreateType('whiteboard');
                      setIsCreatingModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Tạo Bảng trắng mới</span>
                  </button>

                  <button
                    onClick={() => {
                      setCreateType('doc');
                      setIsCreatingModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Tạo Văn bản mới</span>
                  </button>
                </div>
              </div>

              {filteredItems.length === 0 ? (
                <div className="max-w-md mx-auto text-center py-20 px-6 bg-white rounded-3xl border border-zinc-200/80 shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4 text-zinc-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900 mb-1">Không tìm thấy tài liệu phù hợp</h3>
                  <p className="text-xs text-zinc-500 mb-6">
                    Hãy thử thay đổi bộ lọc tìm kiếm hoặc khởi tạo tài liệu/bảng tính mới.
                  </p>
                  <button
                    onClick={() => {
                      setCategoryFilter('all');
                      setSearchQuery('');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-black transition-colors cursor-pointer"
                  >
                    <span>Xem lại tất cả</span>
                  </button>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredItems.map((item) => {
                    const isFav = favorites.includes(item.id);
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className="group bg-white rounded-2xl border border-zinc-200/80 p-5 hover:border-zinc-300 hover:shadow-xs transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${item.iconBgClass} ${item.iconTextClass}`}>
                              {item.type === 'sheet' ? (
                                <Table className="w-4 h-4" />
                              ) : item.type === 'design' ? (
                                <Palette className="w-4 h-4" />
                              ) : item.type === 'whiteboard' ? (
                                <PenTool className="w-4 h-4" />
                              ) : (
                                <FileText className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => toggleFavorite(item.id, e)}
                                className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-amber-500 transition-colors cursor-pointer"
                                title={isFav ? 'Bỏ yêu thích' : 'Yêu thích'}
                              >
                                <Star
                                  className={`w-3.5 h-3.5 ${
                                    isFav ? 'text-amber-500 fill-amber-500' : ''
                                  }`}
                                />
                              </button>
                              <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${item.badgeClass}`}>
                                {item.badgeText}
                              </span>
                            </div>
                          </div>

                          <h4 className="text-sm font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors mb-1 truncate">
                            {item.title}
                          </h4>
                          <p className="text-[11px] text-zinc-500 mb-2 truncate">
                            {item.detailsSummary}
                          </p>
                          <p className="text-[10px] text-zinc-400 font-mono mb-4 truncate">
                            ID: {item.id} • {item.owner?.name || 'Nguyễn Văn Nam'}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{timeAgo(item.updatedAt)}</span>
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => handleDeleteItem(item.id, e)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-600 rounded transition-opacity cursor-pointer"
                              title="Xóa mục này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-700 group-hover:text-blue-600">
                              <span>Mở</span>
                              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        <th className="py-3 px-4">Tên tài liệu &amp; Dữ liệu</th>
                        <th className="py-3 px-4">Định dạng</th>
                        <th className="py-3 px-4">Mô tả tóm tắt</th>
                        <th className="py-3 px-4">Người phụ trách</th>
                        <th className="py-3 px-4">Cập nhật</th>
                        <th className="py-3 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-sans">
                      {filteredItems.map((item) => (
                        <tr
                          key={item.id}
                          onClick={() => router.push(item.href)}
                          className="hover:bg-zinc-50/80 cursor-pointer transition-colors group"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-1.5 rounded-lg shrink-0 ${item.badgeClass}`}>
                                {item.type === 'sheet' ? (
                                  <Table className="w-3.5 h-3.5" />
                                ) : item.type === 'design' ? (
                                  <Palette className="w-3.5 h-3.5" />
                                ) : item.type === 'whiteboard' ? (
                                  <PenTool className="w-3.5 h-3.5" />
                                ) : (
                                  <FileText className="w-3.5 h-3.5" />
                                )}
                              </div>
                              <span className="font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors truncate max-w-xs">
                                {item.title}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${item.badgeClass}`}>
                              {item.badgeText}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-zinc-500 truncate max-w-sm">
                            {item.detailsSummary}
                          </td>
                          <td className="py-3.5 px-4 text-zinc-600">
                            {item.owner?.name || 'Nguyễn Văn Nam'}
                          </td>
                          <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">
                            {timeAgo(item.updatedAt)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => toggleFavorite(item.id, e)}
                                className="p-1 text-zinc-400 hover:text-amber-500 transition-colors cursor-pointer"
                              >
                                <Star
                                  className={`w-3.5 h-3.5 ${
                                    favorites.includes(item.id) ? 'text-amber-500 fill-amber-500' : ''
                                  }`}
                                />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteItem(item.id, e)}
                                className="p-1 text-zinc-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                title="Xóa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: CLOUD DRIVE */}
          {activeTab === 'drive' && (
            <CloudDriveExplorer />
          )}

          {/* TAB: WIKI & KNOWLEDGE BASE */}
          {activeTab === 'wiki' && (
            <InternalWikiKnowledgeBase />
          )}

          {/* TAB: TELEMETRY */}
          {activeTab === 'telemetry' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>WebSocket Node 1</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  </div>
                  <p className="text-xl font-black text-zinc-900">ws-node-1:4001</p>
                  <p className="text-[11px] text-zinc-400 font-mono">24 Kết nối • 0% Lỗi</p>
                </div>

                <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>WebSocket Node 2</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  </div>
                  <p className="text-xl font-black text-zinc-900">ws-node-2:4002</p>
                  <p className="text-[11px] text-zinc-400 font-mono">19 Kết nối • 0% Lỗi</p>
                </div>

                <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>Redis 7.2 Pub/Sub</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  </div>
                  <p className="text-xl font-black text-zinc-900">Port 6380</p>
                  <p className="text-[11px] text-zinc-400 font-mono">Hội tụ CRDT &lt;5ms</p>
                </div>

                <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>NGINX Load Balancer</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  </div>
                  <p className="text-xl font-black text-zinc-900">Port 8080</p>
                  <p className="text-[11px] text-zinc-400 font-mono">Round-Robin Active</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-zinc-900">
                  Đặc tính Kỹ thuật Kiến trúc Quy mô lớn (Scalability &amp; High Availability)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-600">
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/60 space-y-1">
                    <h5 className="font-bold text-zinc-900">Khả năng mở rộng ngang (Horizontal Scaling)</h5>
                    <p className="text-zinc-500">
                      Kiến trúc Stateless WebSocket kết hợp phân tải NGINX cho phép tăng số lượng máy chủ dễ dàng khi người dùng tăng đột biến.
                    </p>
                  </div>
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/60 space-y-1">
                    <h5 className="font-bold text-zinc-900">Chịu lỗi cao (Fault Tolerance)</h5>
                    <p className="text-zinc-500">
                      Khi một node gặp sự cố, NGINX tự động định tuyến lại người dùng sang node còn lại mà không làm gián đoạn phiên làm việc.
                    </p>
                  </div>
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/60 space-y-1">
                    <h5 className="font-bold text-zinc-900">Nhất quán dữ liệu (CRDT Consistency)</h5>
                    <p className="text-zinc-500">
                      Sử dụng Yjs CRDT đảm bảo mọi thao tác gõ chữ, tính toán bảng tính, kéo task và vẽ bảng trắng đều hội tụ chính xác 100%.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: TASKS / KANBAN (MODULE M3) */}
          {activeTab === 'tasks' && (
            <CollaborativeKanban currentUser={currentUser} />
          )}

          {/* TAB: ADMIN & SECURITY CONSOLE (MODULE M8) */}
          {activeTab === 'admin' && (
            <AdminSecurityConsole />
          )}

          {/* TAB: WHITEBOARD BRAINSTORMING (MODULE M5) */}
          {activeTab === 'whiteboard' && (
            <div className="h-[calc(100vh-140px)] -m-6 md:-m-8 rounded-2xl overflow-hidden border border-zinc-200/80 shadow-xs relative bg-white">
              <React.Suspense
                fallback={
                  <div className="h-full flex items-center justify-center bg-zinc-50 text-xs text-zinc-400 font-medium">
                    Đang tải không gian bảng trắng tương tác...
                  </div>
                }
              >
                <CollaborativeWhiteboard />
              </React.Suspense>
            </div>
          )}

          {/* TAB: INTEGRATIONS & AUTOMATIONS */}
          {activeTab === 'automations' && (
            <IntegrationsHub />
          )}

          {/* TAB: TEAM COMMUNICATION & COLLABORATION */}
          {activeTab === 'collab' && (
            <TeamCollaborationHub />
          )}
        </div>
      </main>

      {/* Multi-modal Creation Modal (Doc / Sheet / Design / Whiteboard) */}
      {isCreatingModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200/90 w-full max-w-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Khởi Tạo Mục Cộng Tác Mới</h3>
                <p className="text-[11px] text-zinc-500">Chọn định dạng để bắt đầu với một không gian làm việc sạch hoàn toàn.</p>
              </div>
              <button
                onClick={() => setIsCreatingModal(false)}
                className="text-zinc-400 hover:text-zinc-700 text-xs cursor-pointer"
              >
                Hủy
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="p-6 space-y-5">
              {/* Type Selection 4-Col Grid */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-2">
                  Chọn định dạng làm việc mới:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Option 1: Document */}
                  <div
                    onClick={() => setCreateType('doc')}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col items-center text-center ${
                      createType === 'doc'
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-zinc-200 hover:border-zinc-300 bg-white'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-1.5">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-zinc-900 mb-0.5">Văn bản</span>
                    <span className="text-[9px] text-zinc-500 leading-tight">Trang trắng mới tinh</span>
                  </div>

                  {/* Option 2: Spreadsheet (Excel) */}
                  <div
                    onClick={() => setCreateType('sheet')}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col items-center text-center ${
                      createType === 'sheet'
                        ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-zinc-200 hover:border-zinc-300 bg-white'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1.5">
                      <Table className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-zinc-900 mb-0.5">Bảng tính</span>
                    <span className="text-[9px] text-zinc-500 leading-tight">Lưới ô trống mới</span>
                  </div>

                  {/* Option 3: Figma Design Canvas */}
                  <div
                    onClick={() => setCreateType('design')}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col items-center text-center ${
                      createType === 'design'
                        ? 'border-purple-600 bg-purple-50/60 ring-2 ring-purple-500/20 shadow-xs'
                        : 'border-zinc-200 hover:border-zinc-300 bg-white'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-1.5">
                      <Palette className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-zinc-900 mb-0.5">Bản vẽ Figma</span>
                    <span className="text-[9px] text-zinc-500 leading-tight">UI, Slide &amp; CSS</span>
                  </div>

                  {/* Option 4: Whiteboard */}
                  <div
                    onClick={() => setCreateType('whiteboard')}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col items-center text-center ${
                      createType === 'whiteboard'
                        ? 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-500/20 shadow-xs'
                        : 'border-zinc-200 hover:border-zinc-300 bg-white'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-1.5">
                      <PenTool className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-zinc-900 mb-0.5">Bảng trắng</span>
                    <span className="text-[9px] text-zinc-500 leading-tight">Vẽ tự do &amp; Sticky</span>
                  </div>
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-2">
                  Tiêu đề {
                    createType === 'sheet'
                      ? 'bảng tính mới'
                      : createType === 'design'
                      ? 'bản vẽ thiết kế Figma mới'
                      : createType === 'whiteboard'
                      ? 'bảng trắng động não mới'
                      : 'tài liệu văn bản mới'
                  }
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={
                    createType === 'sheet'
                      ? 'Ví dụ: Kế Hoạch Doanh Thu Tháng 11 (Excel)'
                      : createType === 'design'
                      ? 'Ví dụ: Giao Diện Mobile App & Slide Thuyết Trình'
                      : createType === 'whiteboard'
                      ? 'Ví dụ: Brainstorming Tính Năng Mới'
                      : 'Ví dụ: Kế Hoạch Triển Khai Hệ Thống'
                  }
                  className="w-full px-4 py-2.5 rounded-2xl border border-zinc-200 text-xs font-medium text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0068ff] transition-all"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingModal(false)}
                  className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-xs font-semibold text-zinc-600 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className={`px-4 py-2 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors cursor-pointer ${
                    createType === 'sheet'
                      ? 'bg-emerald-700 hover:bg-emerald-800'
                      : createType === 'design'
                      ? 'bg-purple-700 hover:bg-purple-800'
                      : createType === 'whiteboard'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-zinc-900 hover:bg-black'
                  }`}
                >
                  {creating ? 'Đang tạo...' : 'Tạo & Mở ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        currentUser={currentUser}
        onUpdateUser={(updated) => setUserColor(updated.color)}
      />

      {/* Floating AI Copilot Trigger Button */}
      <button
        onClick={() => setCopilotOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-full shadow-lg shadow-purple-500/25 text-xs font-bold transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
      >
        <Sparkles className="w-4 h-4 animate-pulse" />
        <span>Trợ lý AI Copilot</span>
      </button>

      {/* AI Copilot Drawer */}
      <AICopilotDrawer isOpen={copilotOpen} onClose={() => setCopilotOpen(false)} />

      {/* Omni Command Palette (⌘K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenAICopilot={() => setCopilotOpen(true)}
        onOpenDrive={() => setActiveTab('drive')}
      />

      {/* Notification Center Drawer */}
      <NotificationCenterDrawer
        isOpen={notificationDrawerOpen}
        onClose={() => setNotificationDrawerOpen(false)}
      />
    </div>
  );
}
