'use client';

import React, { useState, useEffect } from 'react';
import { EditorContent } from '@tiptap/react';
import {
  Eye,
  EyeOff,
  Lightbulb,
  Edit3,
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Mic,
  MicOff,
  Headphones,
  Bell,
} from 'lucide-react';
import { useResilientWebSocket } from '../../hooks/useResilientWebSocket';
import { useCollaborativeEditor } from '../../hooks/useCollaborativeEditor';
import { EditorHeader } from './EditorHeader';
import { EditorToolbar, EditorMode } from './EditorToolbar';
import { SlashCommandMenu } from './SlashCommandMenu';
import { CollaborativeChat } from '../chat/CollaborativeChat';
import { HistoryDrawer } from '../history/HistoryDrawer';
import { UserProfileModal } from '../profile/UserProfileModal';
import { ShareModal, DocumentPermission } from './ShareModal';
import { ConflictExplainerModal } from './ConflictExplainerModal';
import { DocCommentsDrawer } from './DocCommentsDrawer';
import { NotificationCenterDrawer } from '../collaboration/NotificationCenterDrawer';

export interface CollaborativeEditorProps {
  documentId: string;
  documentTitle?: string;
  user: {
    id: string;
    name: string;
    color: string;
  };
}

export function CollaborativeEditor({
  documentId,
  documentTitle: initialTitle = 'Untitled Document',
  user: initialUser,
}: CollaborativeEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [currentUser, setCurrentUser] = useState(initialUser);

  // Drawers & Modals
  const [chatOpen, setChatOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // In-Doc Collaboration & Communication States
  const [selectionSnippet, setSelectionSnippet] = useState('');
  const [commentDrawerMode, setCommentDrawerMode] = useState<'comment' | 'suggest'>('comment');
  const [isDocHuddleActive, setIsDocHuddleActive] = useState(false);
  const [isHuddleMuted, setIsHuddleMuted] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Document Modes & Permissions
  const [editorMode, setEditorMode] = useState<EditorMode>('editing');
  const [permission, setPermission] = useState<DocumentPermission>('editor');

  // Follow Mode (Live Spotlight on Peer Cursor)
  const [followingUser, setFollowingUser] = useState<{
    id: string;
    name: string;
    color: string;
  } | null>(null);

  // 1. Establish resilient Yjs CRDT connection + IndexedDB offline store
  const { ydoc, awareness, provider, status, isSynced } = useResilientWebSocket(
    documentId,
    currentUser
  );

  // Read-only logic: If user permission is viewer or mode is viewing
  const isEditable = permission !== 'viewer' && editorMode !== 'viewing';

  // 2. Bind Tiptap to collaborative Y.Doc and Awareness
  const editor = useCollaborativeEditor({
    ydoc,
    provider,
    user: currentUser,
    editable: isEditable,
  });

  // Calculate live document statistics
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    if (!editor) return;

    const updateStats = () => {
      const text = editor.getText();
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      setWordCount(words);
      setCharCount(text.length);
    };

    updateStats();
    editor.on('update', updateStats);

    return () => {
      editor.off('update', updateStats);
    };
  }, [editor]);

  // Update editor editability whenever mode or permission changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditable);
    }
  }, [editor, isEditable]);

  // Seed initial RFC content for doc_rfc_consensus if editor is empty
  useEffect(() => {
    if (!editor || documentId !== 'doc_rfc_consensus') return;

    const timer = setTimeout(() => {
      const currentText = editor.getText().trim();
      if (!currentText || currentText === '') {
        editor.commands.setContent(`
          <h1>Báo Cáo Kiến Trúc Đồng Thuận Phân Tán CRDT v4</h1>
          <p><strong>Dự án:</strong> Real-time Distributed Collaborative Workspace • <strong>Trạng thái:</strong> Đang thảo luận RFC</p>
          <hr />
          <h2>1. Tổng quan Kiến trúc Hội tụ</h2>
          <p>Hệ thống cộng tác thời gian thực sử dụng thuật toán Yjs CRDT để đảm bảo tính nhất quán cuối cùng (Eventual Consistency). Trong các thử nghiệm tải cao, cụm 2 máy chủ WebSocket (ws-node-1 và ws-node-2) đã duy trì thành công 5,000 kết nối đồng thời với độ trễ hội tụ dưới 5ms. Số liệu ghi nhận tổng cộng 2,450 người dùng hoạt động cùng lúc mà không xảy ra bất kỳ xung đột dữ liệu hay mất mát ký tự nào.</p>
          <h2>2. Đo lường Hiệu năng Mạng Phân tán</h2>
          <p>Độ trễ trung bình của vòng lặp đồng thuận CRDT duy trì ở mức dưới 50ms khi có 500 kết nối đồng thời. Giao thức hội tụ đảm bảo zero-conflict convergence ngay cả trong điều kiện mạng lag hoặc mất gói.</p>
          <h2>3. Giao thức Khám phá Trạng thái Phòng &amp; Heartbeat</h2>
          <p>Hệ thống sử dụng cơ chế Polling HTTP định kỳ 2 giây một lần để kiểm tra trạng thái phòng. Đang được xem xét chuyển đổi sang WebSocket Heartbeat Ping/Pong để giảm tải.</p>
          <h2>4. Lịch sử &amp; Nén Dữ liệu State Vector</h2>
          <p>Thuật toán Vector Clock ban đầu dự kiến lưu trữ toàn bộ lịch sử 10,000 phiên bản. Nhóm kỹ thuật đã kích hoạt cơ chế nén State Vector Compaction để tối ưu dung lượng bộ nhớ RAM của cụm máy chủ.</p>
        `);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [editor, documentId]);

  // Listen for selection changes in the editor for contextual commenting
  useEffect(() => {
    if (!editor) return;

    const handleSelection = () => {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        const text = editor.state.doc.textBetween(from, to, ' ');
        if (text && text.trim().length > 0) {
          setSelectionSnippet(text.trim());
          return;
        }
      }
    };

    editor.on('selectionUpdate', handleSelection);
    return () => {
      editor.off('selectionUpdate', handleSelection);
    };
  }, [editor]);

  // Apply accepted suggestion directly to the document
  const handleAcceptSuggestion = (orig: string, replacement: string, commentId: string) => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    if (currentHtml.includes(orig)) {
      editor.commands.setContent(currentHtml.replace(orig, replacement));
    } else {
      editor.commands.insertContent(replacement);
    }
  };

  // Follow User Screen Auto-Scroll Effect
  useEffect(() => {
    if (!followingUser || !awareness) return;

    const handleAwarenessUpdate = () => {
      // Find cursor label in DOM
      const labels = document.querySelectorAll('.collaboration-cursor__label');
      for (const label of Array.from(labels)) {
        if (label.textContent?.includes(followingUser.name)) {
          label.scrollIntoView({ behavior: 'smooth', block: 'center' });
          break;
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFollowingUser(null);
      }
    };

    awareness.on('change', handleAwarenessUpdate);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      awareness.off('change', handleAwarenessUpdate);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [followingUser, awareness]);

  // Sync user updates to awareness
  const handleUserUpdate = (updated: { id: string; name: string; color: string }) => {
    setCurrentUser(updated);
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Top Application Bar */}
      <EditorHeader
        documentId={documentId}
        documentTitle={title}
        onTitleChange={setTitle}
        status={status}
        isSynced={isSynced}
        awareness={awareness}
        currentUser={currentUser}
        wordCount={wordCount}
        charCount={charCount}
        unreadChatCount={unreadChatCount}
        isChatOpen={chatOpen}
        onToggleChat={() => setChatOpen((prev) => !prev)}
        isHistoryOpen={historyOpen}
        onToggleHistory={() => setHistoryOpen((prev) => !prev)}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenShare={() => setShareOpen(true)}
        onFollowUser={(u) => setFollowingUser(u)}
        followingUserId={followingUser?.id}
        onToggleHuddle={() => setIsDocHuddleActive((prev) => !prev)}
        isHuddleActive={isDocHuddleActive}
        onToggleNotifications={() => setNotificationsOpen(true)}
        unreadNotificationsCount={3}
      />

      {/* In-Doc Instant Audio Huddle Banner */}
      {isDocHuddleActive && (
        <div className="bg-emerald-600 text-white px-6 py-2.5 flex items-center justify-between sticky top-14 z-20 shadow-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 bg-emerald-700/80 px-2.5 py-1 rounded-full font-bold">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>PHÒNG THOẠI HUDDLE</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Đang đàm thoại nhanh với các đồng nghiệp trên tài liệu này</span>
              <span className="text-emerald-200">•</span>
              <div className="flex items-center gap-1 font-mono text-[11px] bg-emerald-700/50 px-2 py-0.5 rounded">
                <span className="w-1 h-3 bg-white animate-pulse" />
                <span className="w-1 h-2 bg-white animate-pulse" />
                <span className="w-1 h-4 bg-white animate-pulse" />
                <span className="ml-1">Độ trễ: 12ms</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsHuddleMuted(!isHuddleMuted)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isHuddleMuted ? 'bg-rose-500 text-white' : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
            >
              {isHuddleMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span>{isHuddleMuted ? 'Đã tắt mic' : 'Đang bật mic'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDocHuddleActive(false)}
              className="px-3 py-1 bg-white text-emerald-900 hover:bg-zinc-100 rounded-xl text-xs font-bold transition-colors"
            >
              Rời phòng
            </button>
          </div>
        </div>
      )}

      {/* Editor Action Toolbar */}
      <EditorToolbar
        editor={editor}
        mode={editorMode}
        onModeChange={(m) => setEditorMode(m)}
        onToggleComments={() => setCommentsOpen((prev) => !prev)}
        onOpenConflictModal={() => setConflictOpen(true)}
      />

      {/* Live Follow Mode Banner */}
      {followingUser && (
        <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between shadow-xs sticky top-28 z-20 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <Eye className="w-4 h-4 text-blue-200" />
            <span>
              Đang theo dõi màn hình trực tiếp của{' '}
              <strong className="underline underline-offset-2">{followingUser.name}</strong> • Màn
              hình sẽ tự cuộn theo con trỏ
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFollowingUser(null)}
            className="flex items-center gap-1 px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Dừng theo dõi (Esc)</span>
          </button>
        </div>
      )}

      {/* Mode Notification Banners */}
      {editorMode === 'suggesting' && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Chế độ Gợi ý:</strong> Bạn có thể thêm bình luận và đề xuất chỉnh sửa để chủ
              tài liệu chấp thuận hoặc từ chối.
            </span>
          </div>
          <button
            onClick={() => setCommentsOpen(true)}
            className="text-amber-800 font-bold hover:underline"
          >
            Mở danh sách bình luận →
          </button>
        </div>
      )}

      {!isEditable && (
        <div className="bg-zinc-100 border-b border-zinc-200 px-6 py-2 flex items-center justify-between text-xs text-zinc-700">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-zinc-500 shrink-0" />
            <span>
              <strong>Chế độ Chỉ xem:</strong> Bạn đang xem tài liệu ở trạng thái đọc an toàn, không
              thay đổi nội dung.
            </span>
          </div>
          {permission !== 'viewer' && (
            <button
              onClick={() => setEditorMode('editing')}
              className="text-blue-600 font-bold hover:underline"
            >
              Chuyển sang Chỉnh sửa
            </button>
          )}
        </div>
      )}

      {/* Main Document Workspace */}
      <main className="flex-1 flex justify-center py-8 px-4 sm:px-6 md:px-8">
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xs border border-zinc-200/80 p-8 sm:p-12 md:p-16 min-h-[850px] flex flex-col relative editor-container">
          {/* Document Title Header */}
          <div className="mb-6 pb-4 border-b border-zinc-100 flex items-start justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight leading-tight">
                {title}
              </h1>
              <p className="text-xs text-zinc-400 font-mono mt-1 flex items-center gap-2">
                <span>Real-time CRDT Document</span>
                <span>•</span>
                <span>Yjs WebSocket Peer Sync</span>
                <span>•</span>
                <span>Per-user Undo Enabled</span>
              </p>
            </div>
          </div>

          {/* Collaborative Text Canvas */}
          <div className="flex-1">
            <EditorContent editor={editor} />
          </div>

          {/* Notion-Style Slash Command Menu */}
          {isEditable && <SlashCommandMenu editor={editor} />}
        </div>
      </main>

      {/* Floating Selection Comment & Suggestion Action Bar */}
      {selectionSnippet && !commentsOpen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-zinc-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-zinc-700 flex items-center gap-3 text-xs animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-1.5 font-medium max-w-xs truncate text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            <span className="truncate">"{selectionSnippet}"</span>
          </div>
          <div className="h-4 w-px bg-zinc-700" />
          <button
            type="button"
            onClick={() => {
              setCommentDrawerMode('comment');
              setCommentsOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold text-white transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Bình luận</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCommentDrawerMode('suggest');
              setCommentsOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 rounded-xl font-semibold text-white transition-colors"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Gợi ý sửa</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectionSnippet('')}
            className="p-1 text-zinc-400 hover:text-white"
            title="Bỏ chọn"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Real-time Collaborative Chat Panel */}
      <CollaborativeChat
        ydoc={ydoc}
        awareness={awareness}
        currentUser={currentUser}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        onUnreadChange={setUnreadChatCount}
      />

      {/* Comments & Task Assignment Drawer with Selection & Suggesting Mode */}
      <DocCommentsDrawer
        documentId={documentId}
        documentTitle={title}
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        currentUser={currentUser}
        ydoc={ydoc}
        selectedText={selectionSnippet}
        onClearSelectedText={() => setSelectionSnippet('')}
        onAcceptSuggestion={handleAcceptSuggestion}
        initialMode={commentDrawerMode}
      />

      {/* Version History Drawer */}
      <HistoryDrawer
        documentId={documentId}
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />

      {/* User Identity Modal */}
      <UserProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        currentUser={currentUser}
        awareness={awareness}
        onUpdateUser={handleUserUpdate}
      />

      {/* Share & Permissions Modal */}
      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        documentId={documentId}
        documentTitle={title}
        currentPermission={permission}
        onPermissionChange={(p) => setPermission(p)}
        currentUser={currentUser}
      />

      {/* Conflict Resolution & CRDT Explainer Modal */}
      <ConflictExplainerModal
        isOpen={conflictOpen}
        onClose={() => setConflictOpen(false)}
      />

      {/* Notification Center Drawer */}
      <NotificationCenterDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </div>
  );
}
