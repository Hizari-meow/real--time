'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import * as Y from 'yjs';
import { emitDomainEvent, getUnifiedUsers, UnifiedUser } from '../../lib/domain-event-bus';
import {
  MessageSquare,
  X,
  Plus,
  CheckCircle2,
  Trash2,
  CheckSquare,
  User,
  Clock,
  Sparkles,
  ArrowRight,
  Send,
  Tag,
  AlertCircle,
  Lightbulb,
  ThumbsUp,
  Heart,
  Smile,
  Mic,
  MicOff,
  Play,
  Pause,
  Reply,
  ShieldAlert,
  UserCheck,
  Calendar,
  Layers,
  ChevronRight,
  Check,
  RotateCcw,
} from 'lucide-react';

export interface DocCommentReply {
  id: string;
  authorName: string;
  authorColor: string;
  content: string;
  timestamp: number;
}

export interface DocComment {
  id: string;
  documentId: string;
  authorId: string;
  authorName: string;
  authorColor: string;
  text: string;
  selectedText?: string;
  isSuggestion?: boolean;
  suggestedReplacement?: string;
  suggestionStatus?: 'pending' | 'accepted' | 'rejected';
  assignedToId?: string;
  assignedToName?: string;
  isTask: boolean;
  taskDeadline?: string;
  taskPriority?: 'low' | 'medium' | 'high' | 'urgent';
  resolved: boolean;
  createdAt: number;
  reactions?: { emoji: string; count: number; users: string[] }[];
  replies?: DocCommentReply[];
  voiceNote?: { duration: string; url: string };
}

export interface DocCommentsDrawerProps {
  documentId: string;
  documentTitle: string;
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    id: string;
    name: string;
    color: string;
  };
  ydoc?: Y.Doc;
  selectedText?: string;
  onClearSelectedText?: () => void;
  onAcceptSuggestion?: (originalText: string, replacementText: string, commentId: string) => void;
  initialMode?: 'comment' | 'suggest';
}

const AVAILABLE_USERS = [
  { id: 'usr_nam', name: 'Nguyễn Văn Nam', role: 'Lead Kỹ thuật', color: '#2563eb', hasAccess: true },
  { id: 'usr_linh', name: 'Trần Thị Linh', role: 'Product Manager', color: '#ec4899', hasAccess: true },
  { id: 'usr_hoang', name: 'Lê Hoàng', role: 'DevOps Lead', color: '#f59e0b', hasAccess: true },
  { id: 'usr_alice', name: 'Alice Tech', role: 'Kiến trúc sư', color: '#8b5cf6', hasAccess: false },
  { id: 'usr_bob', name: 'Bob Cloud', role: 'SRE Specialist', color: '#10b981', hasAccess: false },
];

const MENTION_OPTIONS = [
  { type: 'user', label: 'Nguyễn Văn Nam', detail: 'Trưởng nhóm Kỹ thuật (Lead)', tag: '@Nguyễn Văn Nam' },
  { type: 'user', label: 'Trần Thị Linh', detail: 'Product Manager', tag: '@Trần Thị Linh' },
  { type: 'user', label: 'Lê Hoàng', detail: 'DevOps & SRE Lead', tag: '@Lê Hoàng' },
  { type: 'user', label: 'Alice Tech', detail: 'Kiến trúc sư Hệ thống', tag: '@Alice Tech' },
  { type: 'group', label: 'ky-thuat', detail: 'Nhóm Kỹ thuật Backend', tag: '@ky-thuat' },
  { type: 'group', label: 'thiet-ke', detail: 'Nhóm Thiết kế UI/UX', tag: '@thiet-ke' },
  { type: 'special', label: 'channel / mọi người', detail: 'Thông báo toàn bộ người theo dõi', tag: '@channel' },
  { type: 'doc', label: 'RFC Consensus v4', detail: 'Liên kết đến tài liệu kỹ thuật', tag: '@RFC-Consensus-v4' },
  { type: 'date', label: 'Thứ Sáu (03/10)', detail: 'Hạn chót hoàn thành', tag: '@hạn-chót-thứ-sáu' },
];

export function DocCommentsDrawer({
  documentId,
  documentTitle,
  isOpen,
  onClose,
  currentUser,
  ydoc,
  selectedText = '',
  onClearSelectedText,
  onAcceptSuggestion,
  initialMode = 'comment',
}: DocCommentsDrawerProps) {
  const [comments, setComments] = useState<DocComment[]>([]);
  const [mode, setMode] = useState<'comment' | 'suggest'>(initialMode);
  const [commentText, setCommentText] = useState('');
  const [suggestedText, setSuggestedText] = useState('');
  const [isTask, setIsTask] = useState(false);
  const [assignedToId, setAssignedToId] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('2026-10-05');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('high');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Mention dropdown
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionWarningUser, setMentionWarningUser] = useState<string | null>(null);

  // Thread replies
  const [replyInputCommentId, setReplyInputCommentId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // Voice note simulator
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [hasVoiceAttached, setHasVoiceAttached] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  // Storage key for doc comments
  const storageKey = `collab_doc_comments_${documentId}`;

  const [activeUsers, setActiveUsers] = useState<UnifiedUser[]>([]);

  useEffect(() => {
    const syncUsers = () => {
      const u = getUnifiedUsers();
      if (u.length > 0) {
        setActiveUsers(u);
      }
    };
    syncUsers();
    window.addEventListener('collab_members_updated', syncUsers);
    window.addEventListener('storage', syncUsers);
    return () => {
      window.removeEventListener('collab_members_updated', syncUsers);
      window.removeEventListener('storage', syncUsers);
    };
  }, []);

  const availableUsers = useMemo(() => {
    if (activeUsers.length > 0) {
      return activeUsers.map((u) => ({
        id: u.id,
        name: u.name,
        role: u.department ? `${u.role} • ${u.department}` : u.role,
        color: u.color,
        hasAccess: u.hasAccess,
      }));
    }
    return AVAILABLE_USERS;
  }, [activeUsers]);

  const mentionOptions = useMemo(() => {
    const userMentions = availableUsers.map((u) => ({
      type: 'user' as const,
      label: u.name,
      detail: u.role,
      tag: `@${u.name}`,
    }));
    const staticMentions = [
      { type: 'group' as const, label: 'ky-thuat', detail: 'Nhóm Kỹ thuật Backend', tag: '@ky-thuat' },
      { type: 'group' as const, label: 'thiet-ke', detail: 'Nhóm Thiết kế UI/UX', tag: '@thiet-ke' },
      { type: 'special' as const, label: 'channel / mọi người', detail: 'Thông báo toàn bộ người theo dõi', tag: '@channel' },
      { type: 'doc' as const, label: 'RFC Consensus v4', detail: 'Liên kết đến tài liệu kỹ thuật', tag: '@RFC-Consensus-v4' },
      { type: 'date' as const, label: 'Thứ Sáu (03/10)', detail: 'Hạn chót hoàn thành', tag: '@hạn-chót-thứ-sáu' },
    ];
    return [...userMentions, ...staticMentions];
  }, [availableUsers]);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setComments(JSON.parse(stored));
      } else {
        // High fidelity seed comments demonstrating all requirements
        const sample: DocComment[] = [
          {
            id: 'cmt_init_1',
            documentId,
            authorId: 'usr_nam',
            authorName: 'Nguyễn Văn Nam',
            authorColor: '#2563eb',
            text: '@Trần Thị Linh số liệu 2,450 người dùng này đã tính cả cụm cluster dự phòng chưa?',
            selectedText: '2,450 người dùng hoạt động',
            isTask: true,
            assignedToId: 'usr_linh',
            assignedToName: 'Trần Thị Linh',
            taskDeadline: '2026-10-04',
            taskPriority: 'urgent',
            resolved: false,
            createdAt: Date.now() - 1000 * 60 * 45,
            reactions: [{ emoji: '👀', count: 2, users: ['usr_nam', 'usr_linh'] }],
            replies: [
              {
                id: 'rep_1',
                authorName: 'Trần Thị Linh',
                authorColor: '#ec4899',
                content: 'Mình vừa kiểm tra lại từ Prometheus, con số này đã bao gồm cả 2 node ws-node-1 và ws-node-2 nhé!',
                timestamp: Date.now() - 1000 * 60 * 20,
              },
            ],
          },
          {
            id: 'cmt_init_2',
            documentId,
            authorId: 'usr_hoang',
            authorName: 'Lê Hoàng',
            authorColor: '#f59e0b',
            text: 'Đề xuất cập nhật lại ngưỡng chịu tải tối đa lên 100,000 kết nối đồng thời để chuẩn bị cho chiến dịch Tết.',
            selectedText: '5,000 kết nối đồng thời',
            isSuggestion: true,
            suggestedReplacement: '100,000 kết nối đồng thời qua cụm NGINX',
            suggestionStatus: 'pending',
            isTask: false,
            resolved: false,
            createdAt: Date.now() - 1000 * 60 * 90,
            reactions: [{ emoji: '💡', count: 3, users: ['usr_nam', 'usr_hoang', 'usr_alice'] }],
            replies: [],
          },
          {
            id: 'cmt_init_3',
            documentId,
            authorId: 'usr_alice',
            authorName: 'Alice Tech',
            authorColor: '#8b5cf6',
            text: 'Gửi ghi chú thoại về phương án nén State Vector CRDT khi truyền qua mạng 4G yếu.',
            selectedText: 'Hội tụ CRDT < 5ms',
            isTask: false,
            resolved: false,
            createdAt: Date.now() - 1000 * 60 * 130,
            voiceNote: { duration: '0:18', url: '#' },
            reactions: [{ emoji: '👍', count: 2, users: ['usr_nam', 'usr_alice'] }],
            replies: [],
          },
        ];
        setComments(sample);
        localStorage.setItem(storageKey, JSON.stringify(sample));
      }
    } catch (e) {
      console.warn('Failed to load doc comments', e);
    }
  }, [documentId, storageKey]);

  const saveComments = (newComments: DocComment[]) => {
    setComments(newComments);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newComments));
    } catch (e) {
      console.warn('Failed to save comments', e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCommentText(val);

    // Detect @ trigger
    const lastAtPos = val.lastIndexOf('@');
    if (lastAtPos !== -1 && lastAtPos === val.length - 1) {
      setShowMentionMenu(true);
      setMentionFilter('');
    } else if (lastAtPos !== -1 && lastAtPos < val.length - 1) {
      const query = val.slice(lastAtPos + 1);
      if (!query.includes(' ')) {
        setShowMentionMenu(true);
        setMentionFilter(query.toLowerCase());
      } else {
        setShowMentionMenu(false);
      }
    } else {
      setShowMentionMenu(false);
    }
  };

  const handleSelectMention = (option: any) => {
    const lastAtPos = commentText.lastIndexOf('@');
    const before = commentText.slice(0, lastAtPos);
    const updated = `${before}${option.tag} `;
    setCommentText(updated);
    setShowMentionMenu(false);

    // Check if mentioned user lacks access
    if (option.type === 'user') {
      const userObj = availableUsers.find((u) => u.name === option.label);
      if (userObj && !userObj.hasAccess) {
        setMentionWarningUser(userObj.name);
      }
    }
  };

  const handleGrantAccess = (userName: string, role: string) => {
    setToastMessage(`Đã tự động cấp quyền "${role}" cho ${userName} và gửi thông báo mời!`);
    setMentionWarningUser(null);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleVoiceRecord = () => {
    if (!isRecordingVoice) {
      setIsRecordingVoice(true);
      setTimeout(() => {
        setIsRecordingVoice(false);
        setHasVoiceAttached(true);
        setToastMessage('Đã ghi âm ghi chú thoại (0:15) gắn vào bình luận!');
        setTimeout(() => setToastMessage(null), 3000);
      }, 2500);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && !suggestedText.trim() && !hasVoiceAttached) return;

    const assignedUser = availableUsers.find((u) => u.id === assignedToId);

    const newComment: DocComment = {
      id: 'cmt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      documentId,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorColor: currentUser.color,
      text: commentText.trim() || (mode === 'suggest' ? 'Đề xuất thay đổi nội dung văn bản:' : ''),
      selectedText: selectedText || undefined,
      isSuggestion: mode === 'suggest',
      suggestedReplacement: mode === 'suggest' ? suggestedText.trim() : undefined,
      suggestionStatus: mode === 'suggest' ? 'pending' : undefined,
      isTask: isTask && !!assignedUser,
      assignedToId: isTask && assignedUser ? assignedUser.id : undefined,
      assignedToName: isTask && assignedUser ? assignedUser.name : undefined,
      taskDeadline: isTask ? taskDeadline : undefined,
      taskPriority: isTask ? taskPriority : undefined,
      resolved: false,
      createdAt: Date.now(),
      reactions: [],
      replies: [],
      voiceNote: hasVoiceAttached ? { duration: '0:15', url: '#' } : undefined,
    };

    const nextList = [newComment, ...comments];
    saveComments(nextList);

    // Emit Domain Event for Comment Created (generates live Notification and Audit Log)
    try {
      emitDomainEvent('comment.created', {
        comment: newComment,
        documentTitle,
        targetUrl: `/doc/${documentId}#comment-${newComment.id}`,
      });
    } catch (err) {
      console.warn('Failed to emit comment.created event', err);
    }

    // If marked as task, dispatch to Kanban board external tasks
    if (isTask && assignedUser) {
      try {
        const stored = localStorage.getItem('collab_kanban_external_tasks');
        const tasks = stored ? JSON.parse(stored) : [];
        tasks.push({
          id: 'task_from_doc_' + Date.now(),
          key: `DOC-${Math.floor(10 + Math.random() * 90)}`,
          title: `[Tài liệu: ${documentTitle}] ${commentText.trim().slice(0, 50)}...`,
          description: `Giao việc từ bình luận trong "${documentTitle}": "${commentText.trim()}"\nĐoạn trích: "${selectedText}"`,
          column: 'todo',
          priority: taskPriority,
          assigneeId: assignedUser.id,
          assigneeName: assignedUser.name,
          assigneeColor: assignedUser.color,
          startDate: new Date().toISOString().slice(0, 10),
          dueDate: taskDeadline,
          labels: ['Tài liệu', 'Review'],
          checklist: [
            { id: 'c1', text: 'Mở đoạn bình luận trong tài liệu', completed: false },
            { id: 'c2', text: 'Chỉnh sửa và phản hồi lại tác giả', completed: false },
          ],
          sourceDocId: documentId,
          sourceRef: {
            type: 'comment',
            id: newComment.id,
            title: documentTitle,
            url: `/doc/${documentId}#comment-${newComment.id}`,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        localStorage.setItem('collab_kanban_external_tasks', JSON.stringify(tasks));
        window.dispatchEvent(new CustomEvent('collab_task_created'));

        setToastMessage(`Đã giao việc cho @${assignedUser.name} với hạn chót ${taskDeadline}!`);
        setTimeout(() => setToastMessage(null), 3500);
      } catch (err) {
        console.warn('Failed to forward task to Kanban', err);
      }
    }

    setCommentText('');
    setSuggestedText('');
    setIsTask(false);
    setAssignedToId('');
    setHasVoiceAttached(false);
    onClearSelectedText?.();
  };

  const handleAcceptSuggestion = (comment: DocComment) => {
    if (!comment.selectedText || !comment.suggestedReplacement) return;
    onAcceptSuggestion?.(comment.selectedText, comment.suggestedReplacement, comment.id);

    const updated = comments.map((c) =>
      c.id === comment.id
        ? { ...c, suggestionStatus: 'accepted' as const, resolved: true }
        : c
    );
    saveComments(updated);
    setToastMessage('Đã chấp nhận đề xuất và tự động áp dụng vào nội dung tài liệu!');
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRejectSuggestion = (commentId: string) => {
    const updated = comments.map((c) =>
      c.id === commentId ? { ...c, suggestionStatus: 'rejected' as const } : c
    );
    saveComments(updated);
    setToastMessage('Đã từ chối đề xuất chỉnh sửa.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleResolve = (commentId: string) => {
    const updated = comments.map((c) =>
      c.id === commentId ? { ...c, resolved: !c.resolved } : c
    );
    saveComments(updated);
  };

  const handleDeleteComment = (commentId: string) => {
    const updated = comments.filter((c) => c.id !== commentId);
    saveComments(updated);
  };

  const handleReaction = (commentId: string, emoji: string) => {
    const updated = comments.map((c) => {
      if (c.id !== commentId) return c;
      const currentReactions = c.reactions || [];
      const found = currentReactions.find((r) => r.emoji === emoji);
      let nextReactions;
      if (found) {
        if (found.users.includes(currentUser.id)) {
          nextReactions = currentReactions
            .map((r) =>
              r.emoji === emoji
                ? { ...r, count: r.count - 1, users: r.users.filter((u) => u !== currentUser.id) }
                : r
            )
            .filter((r) => r.count > 0);
        } else {
          nextReactions = currentReactions.map((r) =>
            r.emoji === emoji
              ? { ...r, count: r.count + 1, users: [...r.users, currentUser.id] }
              : r
          );
        }
      } else {
        nextReactions = [...currentReactions, { emoji, count: 1, users: [currentUser.id] }];
      }
      return { ...c, reactions: nextReactions };
    });
    saveComments(updated);
  };

  const handleAddReply = (commentId: string) => {
    if (!replyContent.trim()) return;

    const newReply: DocCommentReply = {
      id: `rep_${Date.now()}`,
      authorName: currentUser.name,
      authorColor: currentUser.color,
      content: replyContent.trim(),
      timestamp: Date.now(),
    };

    const updated = comments.map((c) =>
      c.id === commentId ? { ...c, replies: [...(c.replies || []), newReply] } : c
    );
    saveComments(updated);
    setReplyContent('');
    setReplyInputCommentId(null);
  };

  const handleConvertCommentToTask = (comment: DocComment) => {
    try {
      const stored = localStorage.getItem('collab_kanban_external_tasks');
      const tasks = stored ? JSON.parse(stored) : [];
      const taskKey = `WEB-${Math.floor(10 + Math.random() * 89)}`;
      const deadline = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);

      const newTask = {
        id: `task_from_doc_${Date.now()}`,
        key: taskKey,
        title: `[${documentTitle}] ${comment.selectedText ? `"${comment.selectedText.slice(0, 35)}..."` : comment.text.slice(0, 35)}`,
        description: `Nhiệm vụ chuyển từ bình luận của ${comment.authorName} trong tài liệu "${documentTitle}":\n"${comment.text}"${comment.selectedText ? `\n\nĐoạn văn trích dẫn:\n"${comment.selectedText}"` : ''}`,
        column: 'todo' as const,
        priority: 'high' as const,
        assigneeId: currentUser.id,
        assigneeName: currentUser.name,
        assigneeColor: currentUser.color,
        startDate: new Date().toISOString().slice(0, 10),
        dueDate: deadline,
        labels: ['Tài liệu', 'Review'],
        checklist: [
          { id: 'c1', text: 'Xem lại vị trí bình luận trong tài liệu', completed: false },
          { id: 'c2', text: 'Thực hiện chỉnh sửa và giải quyết bình luận', completed: false },
        ],
        sourceDocId: documentId,
        source_ref: {
          type: 'comment' as const,
          id: comment.id,
          title: documentTitle,
          url: `/doc/${documentId}#c=${comment.id}`,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      tasks.push(newTask);
      localStorage.setItem('collab_kanban_external_tasks', JSON.stringify(tasks));
      window.dispatchEvent(new CustomEvent('collab_task_created'));

      // Update comment
      const updated = comments.map((c) =>
        c.id === comment.id
          ? {
              ...c,
              isTask: true,
              assignedToId: currentUser.id,
              assignedToName: currentUser.name,
              taskDeadline: '3 ngày tới',
            }
          : c
      );
      saveComments(updated);

      setToastMessage(`Đã chuyển thành nhiệm vụ ${taskKey} giao cho @${currentUser.name}!`);
      setTimeout(() => setToastMessage(null), 3500);

      // Record to audit logs
      try {
        const storedLogs = localStorage.getItem('collab_audit_logs');
        const logs = storedLogs ? JSON.parse(storedLogs) : [];
        logs.unshift({
          id: 'aud_' + Date.now(),
          action: `Chuyển bình luận tài liệu "${documentTitle}" thành thẻ việc ${taskKey}`,
          userName: currentUser.name,
          userRole: 'Editor',
          module: 'Soạn thảo & Tài liệu (M1)',
          timestamp: Date.now(),
          status: 'success',
        });
        localStorage.setItem('collab_audit_logs', JSON.stringify(logs.slice(0, 50)));
      } catch {}
    } catch (err) {
      console.warn('Failed to convert comment to task', err);
    }
  };

  const filteredMentions = mentionOptions.filter((m) =>
    mentionFilter ? m.label.toLowerCase().includes(mentionFilter) || m.tag.toLowerCase().includes(mentionFilter) : true
  );

  if (!isOpen) return null;

  return (
    <aside className="fixed inset-y-0 right-0 w-84 sm:w-[420px] bg-white shadow-2xl border-l border-zinc-200/80 z-40 flex flex-col font-sans animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="h-14 px-4 border-b border-zinc-200/80 flex items-center justify-between bg-zinc-50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
              Bình luận &amp; Gợi ý sửa
            </h3>
            <p className="text-[11px] text-zinc-500">Gắn thẻ @mention • Chế độ Suggesting Mode</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-zinc-200/60 text-zinc-500 hover:text-zinc-800 transition-colors"
          title="Đóng (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="mx-4 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* New Comment / Suggestion Input Card */}
      <div className="p-4 border-b border-zinc-200 bg-white shrink-0 space-y-3">
        {/* Mode Selector Tabs: Bình luận vs Gợi ý sửa */}
        <div className="flex items-center p-0.5 bg-zinc-100 rounded-xl border border-zinc-200 text-xs">
          <button
            type="button"
            onClick={() => setMode('comment')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-semibold transition-all ${
              mode === 'comment'
                ? 'bg-white text-zinc-900 shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
            <span>Bình luận</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('suggest')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-semibold transition-all ${
              mode === 'suggest'
                ? 'bg-white text-zinc-900 shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>Gợi ý sửa đổi</span>
          </button>
        </div>

        {/* Selected Snippet Display */}
        {selectedText ? (
          <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs">
            <div className="flex items-center justify-between text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">
              <span>Đoạn văn bản được chọn:</span>
              <button
                type="button"
                onClick={onClearSelectedText}
                className="text-zinc-400 hover:text-zinc-700"
                title="Bỏ chọn"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <p className="text-zinc-800 italic line-clamp-2 bg-white/70 p-1.5 rounded border border-amber-100">
              "{selectedText}"
            </p>
          </div>
        ) : (
          <div className="text-[11px] text-zinc-400 italic">
            Mẹo: Bôi đen một đoạn văn trong tài liệu để bình luận đúng vị trí đó.
          </div>
        )}

        {/* Auto Permission Prompt Warning */}
        {mentionWarningUser && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-2 animate-in fade-in">
            <div className="flex items-start gap-2 text-amber-900 font-semibold">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                {mentionWarningUser} hiện chưa có quyền truy cập tài liệu này. Bạn có muốn tự động cấp quyền không?
              </span>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setMentionWarningUser(null)}
                className="px-2.5 py-1 rounded-lg text-[11px] border border-zinc-200 hover:bg-zinc-100 text-zinc-600"
              >
                Bỏ qua
              </button>
              <button
                type="button"
                onClick={() => handleGrantAccess(mentionWarningUser, 'Người xem')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-zinc-800 hover:bg-black text-white"
              >
                Cấp quyền Xem
              </button>
              <button
                type="button"
                onClick={() => handleGrantAccess(mentionWarningUser, 'Người chỉnh sửa')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              >
                Cấp quyền Sửa
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleAddComment} className="space-y-3">
          {/* Suggestion Mode: Replacement Text Input */}
          {mode === 'suggest' && (
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                Nội dung gợi ý thay thế:
              </label>
              <input
                type="text"
                value={suggestedText}
                onChange={(e) => setSuggestedText(e.target.value)}
                placeholder="Nhập nội dung thay thế cho đoạn đã bôi đen..."
                className="w-full bg-emerald-50/50 border border-emerald-300 rounded-xl p-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          )}

          {/* Main Comment Textarea */}
          <div className="relative">
            <textarea
              rows={mode === 'suggest' ? 2 : 3}
              value={commentText}
              onChange={handleInputChange}
              placeholder={
                mode === 'suggest'
                  ? 'Lý do đề xuất thay đổi (gõ @ để nhắc tên đồng nghiệp)...'
                  : 'Viết bình luận... Gõ @ để gắn thẻ người, nhóm, tài liệu hoặc ngày...'
              }
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />

            {/* @Mention Autocomplete Dropdown Popup */}
            {showMentionMenu && (
              <div className="absolute left-0 bottom-full mb-1 w-full bg-white rounded-2xl shadow-xl border border-zinc-200/90 py-1.5 z-50 max-h-48 overflow-y-auto">
                <div className="px-3 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 flex items-center justify-between">
                  <span>Gợi ý gắn thẻ (@mention)</span>
                  <span className="font-mono">{filteredMentions.length} gợi ý</span>
                </div>
                {filteredMentions.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectMention(opt)}
                    className="w-full text-left px-3 py-1.5 hover:bg-blue-50 flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-blue-700">{opt.tag}</span>
                      <span className="text-[10px] text-zinc-400 ml-1.5">{opt.detail}</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.2 bg-zinc-100 rounded text-zinc-500 font-mono">
                      {opt.type}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Voice note indicator */}
          {hasVoiceAttached && (
            <div className="p-2 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <Mic className="w-3.5 h-3.5 text-purple-600" />
                <span>Đã đính kèm ghi chú thoại (0:15)</span>
              </span>
              <button
                type="button"
                onClick={() => setHasVoiceAttached(false)}
                className="text-purple-400 hover:text-purple-700 text-xs"
              >
                Gỡ
              </button>
            </div>
          )}

          {/* Assign as Task Toggle */}
          <div className="space-y-2 pt-1 border-t border-zinc-100">
            <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer select-none font-medium">
              <input
                type="checkbox"
                checked={isTask}
                onChange={(e) => setIsTask(e.target.checked)}
                className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              />
              <span className="flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                <span>Giao thành nhiệm vụ trên Kanban (Assign as Task)</span>
              </span>
            </label>

            {isTask && (
              <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-150 p-2.5 bg-blue-50/50 rounded-xl border border-blue-100">
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-zinc-600 mb-1">Người nhận việc:</label>
                  <select
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    className="w-full bg-white border border-blue-200 rounded-lg px-2 py-1 text-xs text-zinc-900 font-semibold focus:outline-none"
                  >
                    <option value="">-- Chọn đồng nghiệp --</option>
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        @{u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-600 mb-1">Hạn chót:</label>
                  <input
                    type="date"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full bg-white border border-blue-200 rounded-lg px-2 py-1 text-xs text-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-600 mb-1">Độ ưu tiên:</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full bg-white border border-blue-200 rounded-lg px-2 py-1 text-xs text-zinc-800"
                  >
                    <option value="low">Thấp</option>
                    <option value="medium">Trung bình</option>
                    <option value="high">Cao</option>
                    <option value="urgent">Khẩn cấp</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleToggleVoiceRecord}
                className={`p-1.5 rounded-lg border text-xs transition-colors flex items-center gap-1 ${
                  isRecordingVoice
                    ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                }`}
                title="Bình luận bằng giọng nói (Voice Note)"
              >
                <Mic className="w-3.5 h-3.5" />
                <span className="text-[10px] hidden sm:inline">
                  {isRecordingVoice ? 'Đang ghi âm...' : 'Thoại'}
                </span>
              </button>
            </div>

            <button
              type="submit"
              disabled={(!commentText.trim() && !suggestedText.trim() && !hasVoiceAttached)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-black disabled:opacity-40 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Send className="w-3 h-3" />
              <span>{mode === 'suggest' ? 'Gửi đề xuất' : 'Gửi bình luận'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/50">
        {comments.length === 0 ? (
          <div className="text-center py-12 text-xs text-zinc-400">
            Chưa có bình luận hoặc đề xuất nào trong tài liệu này. Bôi đen văn bản để bắt đầu thảo luận!
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                comment.resolved
                  ? 'bg-zinc-50 border-zinc-200 opacity-60'
                  : comment.isSuggestion
                  ? 'bg-white border-amber-300/80 shadow-xs'
                  : 'bg-white border-zinc-200 shadow-xs'
              }`}
            >
              {/* Comment Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-xs shrink-0"
                    style={{ backgroundColor: comment.authorColor }}
                  >
                    {comment.authorName.slice(0, 1)}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-900">{comment.authorName}</span>
                    {comment.isSuggestion && (
                      <span className="ml-1.5 text-[9px] font-semibold px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full">
                        Gợi ý sửa đổi
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleResolve(comment.id)}
                    className={`p-1 rounded-lg transition-colors ${
                      comment.resolved
                        ? 'text-emerald-600 bg-emerald-50'
                        : 'text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50'
                    }`}
                    title={comment.resolved ? 'Mở lại bình luận' : 'Đánh dấu đã giải quyết'}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Xóa bình luận"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Selected text snippet tag */}
              {comment.selectedText && (
                <div className="mb-2 p-1.5 bg-zinc-100 rounded-lg text-[11px] text-zinc-600 border-l-2 border-amber-500 font-serif italic">
                  "{comment.selectedText}"
                </div>
              )}

              {/* Suggestion Mode Diff Box */}
              {comment.isSuggestion && comment.suggestedReplacement && (
                <div className="mb-2.5 p-2 bg-amber-50/50 rounded-xl border border-amber-200 text-xs space-y-1.5">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-amber-800 uppercase">
                    <Lightbulb className="w-3 h-3 text-amber-600" />
                    <span>Đề xuất sửa đổi (Track Changes):</span>
                  </div>
                  <div className="space-y-1 font-mono text-[11px]">
                    {comment.selectedText && (
                      <div className="text-rose-600 line-through bg-rose-50/70 p-1 rounded">
                        - {comment.selectedText}
                      </div>
                    )}
                    <div className="text-emerald-700 font-semibold bg-emerald-50/70 p-1 rounded">
                      + {comment.suggestedReplacement}
                    </div>
                  </div>

                  {/* Accept / Reject Buttons for Document Author */}
                  {comment.suggestionStatus === 'pending' && (
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-200/60">
                      <button
                        type="button"
                        onClick={() => handleRejectSuggestion(comment.id)}
                        className="px-2.5 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                      >
                        Từ chối
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAcceptSuggestion(comment)}
                        className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg shadow-2xs transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        <span>Chấp nhận sửa đổi</span>
                      </button>
                    </div>
                  )}

                  {comment.suggestionStatus === 'accepted' && (
                    <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 pt-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Đã chấp nhận và áp dụng vào tài liệu</span>
                    </div>
                  )}

                  {comment.suggestionStatus === 'rejected' && (
                    <div className="text-[10px] text-zinc-400 italic pt-1">
                      Đề xuất này đã bị từ chối
                    </div>
                  )}
                </div>
              )}

              {/* Comment text */}
              {comment.text && (
                <p
                  className={`text-xs text-zinc-800 leading-relaxed mb-2 whitespace-pre-wrap ${
                    comment.resolved ? 'line-through text-zinc-400' : ''
                  }`}
                >
                  {comment.text}
                </p>
              )}

              {/* Voice note audio player */}
              {comment.voiceNote && (
                <div className="mb-2 p-2 bg-purple-50 rounded-xl border border-purple-200 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPlayingVoiceId(playingVoiceId === comment.id ? null : comment.id)
                    }
                    className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 hover:bg-purple-700"
                  >
                    {playingVoiceId === comment.id ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5 ml-0.5" />
                    )}
                  </button>
                  <div className="flex-1">
                    <div className="h-1.5 bg-purple-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-purple-600 rounded-full ${
                          playingVoiceId === comment.id ? 'w-3/4 animate-pulse' : 'w-0'
                        }`}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-purple-700 font-bold">
                    {comment.voiceNote.duration}
                  </span>
                </div>
              )}

              {/* Task Tag */}
              {comment.isTask && comment.assignedToName ? (
                <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-xl text-[10px] text-blue-900 flex items-center justify-between shadow-2xs">
                  <span className="flex items-center gap-1.5 font-bold">
                    <CheckSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Nhiệm vụ: @{comment.assignedToName}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    {comment.taskDeadline && (
                      <span className="font-mono text-zinc-500">Hạn: {comment.taskDeadline}</span>
                    )}
                    <Link
                      href="/tasks"
                      className="px-2 py-0.5 rounded bg-blue-600 text-white font-semibold text-[10px] hover:bg-blue-700 transition-colors"
                    >
                      Mở Kanban ↗
                    </Link>
                  </div>
                </div>
              ) : null}

              {/* Emoji Reactions & Thread Reply Buttons */}
              <div className="flex items-center justify-between pt-1 border-t border-zinc-100 text-[11px]">
                <div className="flex items-center gap-1">
                  {['👍', '❤️', '💡', '👏'].map((em) => {
                    const reaction = (comment.reactions || []).find((r) => r.emoji === em);
                    const isMy = reaction?.users.includes(currentUser.id);
                    return (
                      <button
                        key={em}
                        type="button"
                        onClick={() => handleReaction(comment.id, em)}
                        className={`px-1.5 py-0.5 rounded-lg border text-[11px] transition-colors flex items-center gap-0.5 ${
                          isMy
                            ? 'bg-blue-50 border-blue-300 text-blue-800 font-bold'
                            : 'bg-zinc-50 border-zinc-200/70 hover:bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        <span>{em}</span>
                        {reaction && reaction.count > 0 && (
                          <span className="text-[10px] font-mono">{reaction.count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  {!comment.isTask && (
                    <button
                      type="button"
                      onClick={() => handleConvertCommentToTask(comment)}
                      className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 hover:text-emerald-800 hover:underline"
                      title="Chuyển bình luận này thành thẻ nhiệm vụ trên Kanban"
                    >
                      <CheckSquare className="w-3 h-3" />
                      <span>Giao Task</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setReplyInputCommentId(
                        replyInputCommentId === comment.id ? null : comment.id
                      )
                    }
                    className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800"
                  >
                    <Reply className="w-3 h-3" />
                    <span>
                      Trả lời {comment.replies && comment.replies.length > 0 ? `(${comment.replies.length})` : ''}
                    </span>
                  </button>
                </div>
              </div>

              {/* Thread Replies List */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-zinc-100 space-y-2 pl-3 border-l-2 border-blue-200">
                  {comment.replies.map((rep) => (
                    <div key={rep.id} className="text-xs space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-zinc-900 text-[11px]">{rep.authorName}</span>
                        <span className="text-[9px] text-zinc-400 font-mono">
                          {new Date(rep.timestamp).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-zinc-700 text-[11px] leading-relaxed">{rep.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Inline Reply Input Box */}
              {replyInputCommentId === comment.id && (
                <div className="mt-2 pt-2 border-t border-zinc-100 flex gap-1.5">
                  <input
                    type="text"
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddReply(comment.id);
                      }
                    }}
                    placeholder="Viết câu trả lời..."
                    className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddReply(comment.id)}
                    className="px-2.5 py-1 bg-zinc-900 text-white rounded-lg text-xs font-semibold hover:bg-black"
                  >
                    Gửi
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
