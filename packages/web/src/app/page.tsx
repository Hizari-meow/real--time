'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
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
import {
  WorkspaceItem,
  WorkspaceItemType,
  SEED_WORKSPACE_ITEMS,
} from '../components/home/seed-workspace-items';
import { HomeSidebar } from '../components/home/HomeSidebar';
import { HomeHeader } from '../components/home/HomeHeader';
import { WorkspaceExplorer } from '../components/home/WorkspaceExplorer';
import { TelemetryTab } from '../components/home/TelemetryTab';
import { CreateItemModal } from '../components/home/CreateItemModal';

export type { WorkspaceItem, WorkspaceItemType };

export default function WorkspaceDashboard() {
  const router = useRouter();
  const [workspaceItems, setWorkspaceItems] = useState<WorkspaceItem[]>(SEED_WORKSPACE_ITEMS);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Sub-category filter: 'all' | 'doc' | 'sheet' | 'design' | 'whiteboard'
  const [categoryFilter, setCategoryFilter] = useState<'all' | WorkspaceItemType>('all');

  // Expanded main navigation tabs (Modules M1-M9)
  const [activeTab, setActiveTab] = useState<
    'all' | 'recent' | 'favorites' | 'drive' | 'wiki' | 'tasks' | 'admin' | 'telemetry' | 'automations' | 'collab' | 'whiteboard'
  >('all');

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
        localStorage.setItem(`collab_doc_title_${generatedId}`, title);
        try {
          await fetch(`${apiUrl}/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: generatedId, title, userId: currentUser.id }),
          });
        } catch {}
      } else if (createType === 'sheet') {
        localStorage.setItem(`collab_sheet_title_${generatedId}`, title);
        localStorage.setItem(`collab_sheet_data_${generatedId}`, JSON.stringify({}));
        localStorage.setItem(`collab_sheet_comments_${generatedId}`, JSON.stringify([]));
      } else if (createType === 'design') {
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
      <HomeSidebar
        workspaces={workspaces}
        workspace={workspace}
        switchWorkspace={switchWorkspace}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setCategoryFilter={setCategoryFilter}
        workspaceItemsCount={workspaceItems.length}
        favoritesCount={favorites.length}
        todayTasks={todayTasks}
        toggleTodayTask={toggleTodayTask}
        onlineTeammates={onlineTeammates}
        currentUser={currentUser}
        onOpenProfile={() => setProfileOpen(true)}
        onLogout={() => logout()}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Control Bar */}
        <HomeHeader
          activeTab={activeTab}
          categoryFilter={categoryFilter}
          filteredCount={filteredItems.length}
          viewMode={viewMode}
          setViewMode={setViewMode}
          unreadNotificationsCount={unreadNotificationsCount}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onOpenNotifications={() => setNotificationDrawerOpen(true)}
          onOpenCreateModal={() => setIsCreatingModal(true)}
        />

        {/* Dashboard Body */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
          {/* TAB 1: ALL WORKSPACE ITEMS */}
          {(activeTab === 'all' || activeTab === 'favorites' || activeTab === 'recent') && (
            <WorkspaceExplorer
              filteredItems={filteredItems}
              workspaceItemsCount={workspaceItems.length}
              sheetCount={sheetCount}
              designCount={designCount}
              whiteboardCount={whiteboardCount}
              docCount={docCount}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              viewMode={viewMode}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              handleDeleteItem={handleDeleteItem}
              onOpenCreateModalWithType={(type) => {
                setCreateType(type);
                setIsCreatingModal(true);
              }}
              onResetFilter={() => {
                setCategoryFilter('all');
                setSearchQuery('');
              }}
            />
          )}

          {/* TAB: CLOUD DRIVE */}
          {activeTab === 'drive' && <CloudDriveExplorer />}

          {/* TAB: WIKI & KNOWLEDGE BASE */}
          {activeTab === 'wiki' && <InternalWikiKnowledgeBase />}

          {/* TAB: TELEMETRY */}
          {activeTab === 'telemetry' && <TelemetryTab />}

          {/* TAB: TASKS / KANBAN (MODULE M3) */}
          {activeTab === 'tasks' && <CollaborativeKanban currentUser={currentUser} />}

          {/* TAB: ADMIN & SECURITY CONSOLE (MODULE M8) */}
          {activeTab === 'admin' && <AdminSecurityConsole />}

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
          {activeTab === 'automations' && <IntegrationsHub />}

          {/* TAB: TEAM COMMUNICATION & COLLABORATION */}
          {activeTab === 'collab' && <TeamCollaborationHub />}
        </div>
      </main>

      {/* Multi-modal Creation Modal (Doc / Sheet / Design / Whiteboard) */}
      <CreateItemModal
        isOpen={isCreatingModal}
        onClose={() => setIsCreatingModal(false)}
        createType={createType}
        setCreateType={setCreateType}
        newTitle={newTitle}
        setNewTitle={setNewTitle}
        creating={creating}
        handleCreateItem={handleCreateItem}
      />

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
