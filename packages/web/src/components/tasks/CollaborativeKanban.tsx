'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import {
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  CheckSquare,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Edit2,
  Calendar,
  Tag,
  User as UserIcon,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  Layers,
  LayoutGrid,
  ListFilter,
  BarChart3,
  Zap,
  Download,
  FileSpreadsheet,
  Link2,
  ShieldAlert,
  Users,
  TrendingUp,
  Check,
  Info,
  Palette,
  BookOpen,
} from 'lucide-react';
import {
  KanbanTask,
  TaskColumn,
  TaskPriority,
  COLUMNS,
  Project,
  Sprint,
  BurndownPoint,
} from './types';
import { ResilientWebSocketProvider } from '../../lib/yjs-provider';
import { emitDomainEvent } from '../../lib/domain-event-bus';
import { useAuth } from '../../context/AuthContext';
import { ProjectModal } from './ProjectModal';
import { SprintModal } from './SprintModal';
import { BurndownChartModal } from './BurndownChartModal';
import { TaskDetailModal } from './TaskDetailModal';

interface CollaborativeKanbanProps {
  currentUser?: { id: string; name: string; color: string };
}

const ALL_COLUMNS: TaskColumn[] = ['todo', 'in_progress', 'blocked', 'review', 'done'];

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8080/api`
    : 'http://localhost:8080/api');

export function CollaborativeKanban({
  currentUser,
}: CollaborativeKanbanProps) {
  const { user: authUser, workspace, token } = useAuth();
  const effectiveUser = useMemo(() => {
    if (authUser) {
      return { id: authUser.userId, name: authUser.name, color: '#3b82f6' };
    }
    if (currentUser && currentUser.id) {
      return currentUser;
    }
    return { id: '', name: 'Guest', color: '#94a3b8' };
  }, [authUser, currentUser]);

  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<{ id: string; name: string; email: string; role?: string }[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [selectedBurndownSprint, setSelectedBurndownSprint] = useState<Sprint | null>(null);
  const [selectedDetailTask, setSelectedDetailTask] = useState<KanbanTask | null>(null);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [createTaskError, setCreateTaskError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [automationToast, setAutomationToast] = useState<{ id: string; title: string } | null>(null);
  const [exportToast, setExportToast] = useState<boolean>(false);
  const [calendarDate, setCalendarDate] = useState<Date>(() => new Date());

  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterColumn, setFilterColumn] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'board' | 'list' | 'calendar' | 'gantt' | 'metrics'>('board');
  const [autoNotifyDone, setAutoNotifyDone] = useState<boolean>(true);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formColumn, setFormColumn] = useState<TaskColumn>('todo');
  const [formPriority, setFormPriority] = useState<TaskPriority>('normal');
  const [formStoryPoints, setFormStoryPoints] = useState<number>(0);
  const [formAssigneeId, setFormAssigneeId] = useState(effectiveUser.id);
  const [formProjectId, setFormProjectId] = useState<string>('');
  const [formSprintId, setFormSprintId] = useState<string>('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formDependsOnTaskId, setFormDependsOnTaskId] = useState('');
  const [formBlockedReason, setFormBlockedReason] = useState('');
  const [formEstimatedHours, setFormEstimatedHours] = useState<number>(8);
  const [formLoggedHours, setFormLoggedHours] = useState<number>(0);
  const [formLabels, setFormLabels] = useState('Frontend, UI/UX');
  const [formChecklist, setFormChecklist] = useState('');

  // Active online members on this board
  const [onlineUsers, setOnlineUsers] = useState<{ id: string; name: string; color: string }[]>([]);

  // Yjs CRDT refs (for awareness / presence)
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<ResilientWebSocketProvider | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Fetch real workspace members
  useEffect(() => {
    if (!token || !workspace) return;
    const fetchMembers = async () => {
      try {
        const res = await fetch(`${API_BASE}/members`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-workspace-id': workspace.orgId,
          },
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setWorkspaceMembers(json.data);
        }
      } catch (err) {
        console.warn('Failed to load members', err);
      }
    };
    fetchMembers();
  }, [token, workspace]);

  // Fetch real projects
  useEffect(() => {
    if (!token || !workspace) return;
    const fetchProjects = async () => {
      try {
        const res = await fetch(`${API_BASE}/projects`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-workspace-id': workspace.orgId,
          },
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setProjects(json.data);
        }
      } catch (err) {
        console.warn('Failed to load projects', err);
      }
    };
    fetchProjects();
  }, [token, workspace]);

  // Fetch real sprints
  useEffect(() => {
    if (!token || !workspace) return;
    const fetchSprints = async () => {
      try {
        const url = selectedProjectId
          ? `${API_BASE}/sprints?projectId=${selectedProjectId}`
          : `${API_BASE}/sprints`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-workspace-id': workspace.orgId,
          },
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setSprints(json.data);
        }
      } catch (err) {
        console.warn('Failed to load sprints', err);
      }
    };
    fetchSprints();
  }, [token, workspace, selectedProjectId]);

  // Fetch real tasks from server with filters
  useEffect(() => {
    const fetchTasks = async () => {
      if (!token || !workspace) return;
      try {
        setLoadingTasks(true);
        let url = `${API_BASE}/tasks`;
        const params = new URLSearchParams();
        if (selectedProjectId) params.append('projectId', selectedProjectId);
        if (selectedSprintId) params.append('sprintId', selectedSprintId);
        if (params.toString()) url += `?${params.toString()}`;

        const res = await fetch(url, {
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${token}`,
            'x-workspace-id': workspace.orgId,
          },
        });
        if (res.ok) {
          const body = await res.json();
          if (body.success && Array.isArray(body.data)) {
            const mapped: KanbanTask[] = body.data.map((t: any) => ({
              id: t.id,
              key: t.key,
              projectId: t.projectId,
              sprintId: t.sprintId,
              parentTaskId: t.parentTaskId,
              title: t.title,
              description: t.description || '',
              column: t.column,
              priority: t.priority,
              storyPoints: t.storyPoints ?? 0,
              assigneeId: t.assigneeId,
              assigneeName: t.assigneeName,
              assignees: t.assignees || [],
              dependencies: t.dependencies || [],
              subtasks: t.subtasks || [],
              subtaskCount: t.subtaskCount ?? 0,
              completedSubtasks: t.completedSubtasks ?? 0,
              subtaskProgress: t.subtaskProgress ?? 0,
              commentsCount: t.commentsCount ?? 0,
              dueDate: t.dueDate,
              completedAt: t.completedAt,
              labels: t.labels || [],
              checklist: t.checklist || [],
              estimatedHours: Math.round((t.estimatedMinutes || 480) / 60),
              estimatedMinutes: t.estimatedMinutes ?? 480,
              loggedHours: Math.round((t.loggedMinutes || 0) / 60),
              loggedMinutes: t.loggedMinutes ?? 0,
              createdAt: new Date(t.createdAt).getTime(),
              updatedAt: new Date(t.updatedAt).getTime(),
            }));
            setTasks(mapped);
          }
        }
      } catch (err) {
        console.warn('Failed to load tasks', err);
      } finally {
        setLoadingTasks(false);
      }
    };

    fetchTasks();
  }, [token, workspace, selectedProjectId, selectedSprintId]);

  // Realtime Server WebSocket synchronization
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.hostname}:8080/ws?token=${token || ''}&orgId=${workspace?.orgId || 'org_main'}`;

    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(wsUrl);
      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'task:created' && msg.data) {
            const t = msg.data;
            setTasks((prev) => {
              if (prev.some((x) => x.id === t.id)) return prev;
              return [
                {
                  id: t.id,
                  key: t.key,
                  projectId: t.projectId,
                  sprintId: t.sprintId,
                  parentTaskId: t.parentTaskId,
                  title: t.title,
                  description: t.description || '',
                  column: t.column,
                  priority: t.priority,
                  storyPoints: t.storyPoints ?? 0,
                  assigneeId: t.assigneeId,
                  assigneeName: t.assigneeName,
                  assignees: t.assignees || [],
                  dependencies: t.dependencies || [],
                  subtasks: t.subtasks || [],
                  subtaskCount: t.subtaskCount ?? 0,
                  completedSubtasks: t.completedSubtasks ?? 0,
                  subtaskProgress: t.subtaskProgress ?? 0,
                  commentsCount: t.commentsCount ?? 0,
                  dueDate: t.dueDate,
                  completedAt: t.completedAt,
                  labels: t.labels || [],
                  checklist: t.checklist || [],
                  estimatedHours: Math.round((t.estimatedMinutes || 480) / 60),
                  estimatedMinutes: t.estimatedMinutes ?? 480,
                  loggedHours: Math.round((t.loggedMinutes || 0) / 60),
                  loggedMinutes: t.loggedMinutes ?? 0,
                  createdAt: new Date(t.createdAt).getTime(),
                  updatedAt: new Date(t.updatedAt).getTime(),
                },
                ...prev,
              ];
            });
          } else if (msg.type === 'task:status_changed' && msg.taskId) {
            setTasks((prev) =>
              prev.map((x) =>
                x.id === msg.taskId
                  ? {
                      ...x,
                      column: msg.data?.column || x.column,
                      completedAt: msg.data?.completedAt,
                      updatedAt: Date.now(),
                    }
                  : x
              )
            );
          } else if (msg.type === 'task:updated' && msg.taskId) {
            setTasks((prev) =>
              prev.map((x) =>
                x.id === msg.taskId
                  ? {
                      ...x,
                      title: msg.data.title || x.title,
                      description: msg.data.description ?? x.description,
                      column: msg.data.column || x.column,
                      priority: msg.data.priority || x.priority,
                      storyPoints: msg.data.storyPoints ?? x.storyPoints,
                      dueDate: msg.data.dueDate || x.dueDate,
                      assigneeName: msg.data.assigneeName || x.assigneeName,
                      updatedAt: Date.now(),
                    }
                  : x
              )
            );
          } else if (msg.type === 'task:deleted' && msg.taskId) {
            setTasks((prev) => prev.filter((x) => x.id !== msg.taskId));
          }
        } catch {
          // ignore
        }
      };
    } catch {
      // ignore
    }

    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [token, workspace]);

  const availableUsers = useMemo(() => {
    return workspaceMembers.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: (m.role || 'member') as any,
      color: '#3b82f6',
      isOnline: true,
      hasAccess: true,
    }));
  }, [workspaceMembers]);

  // Connect to Yjs room for awareness / presence only
  useEffect(() => {
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.hostname}:8080/ws`;
    const docId = `kanban_presence_${workspace?.orgId || 'main'}`;

    const awareness = new awarenessProtocol.Awareness(ydoc);
    awareness.setLocalState({
      user: {
        id: effectiveUser.id,
        name: effectiveUser.name,
        color: effectiveUser.color,
      },
    });

    const provider = new ResilientWebSocketProvider({
      url: wsUrl,
      docId,
      doc: ydoc,
      awareness,
      userId: effectiveUser.id,
      name: effectiveUser.name,
      color: effectiveUser.color,
    });
    providerRef.current = provider;

    // Awareness online users (deduplicated by user.id)
    const handleAwareness = () => {
      const states = provider.awareness.getStates();
      const usersMap = new Map<string, { id: string; name: string; color: string }>();
      states.forEach((s: any) => {
        if (s.user && s.user.id) {
          usersMap.set(s.user.id, {
            id: s.user.id,
            name: s.user.name || 'Anonymous',
            color: s.user.color || '#3b82f6',
          });
        }
      });
      setOnlineUsers(Array.from(usersMap.values()));
    };

    provider.awareness.on('change', handleAwareness);

    return () => {
      provider.awareness.off('change', handleAwareness);
      provider.destroy();
      ydoc.destroy();
    };
  }, [effectiveUser.id, effectiveUser.name, effectiveUser.color, workspace?.orgId]);

  // Statistics
  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.column === 'done').length;
    const inProgress = tasks.filter((t) => t.column === 'in_progress').length;
    const blocked = tasks.filter((t) => t.column === 'blocked').length;
    const review = tasks.filter((t) => t.column === 'review').length;
    const todo = tasks.filter((t) => t.column === 'todo').length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    const overdueCount = tasks.filter(
      (t) => t.dueDate && t.dueDate < todayStr && t.column !== 'done'
    ).length;

    const totalEstimated = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const totalLogged = tasks.reduce((sum, t) => sum + (t.loggedHours || 0), 0);

    return {
      total,
      done,
      inProgress,
      blocked,
      review,
      todo,
      percent,
      overdueCount,
      totalEstimated,
      totalLogged,
    };
  }, [tasks, todayStr]);

  const currentSprintForBurndown = useMemo(() => {
    if (selectedSprintId) {
      return sprints.find((s) => s.id === selectedSprintId) || null;
    }
    return sprints.find((s) => s.status === 'active') || (sprints.length > 0 ? sprints[0] : null);
  }, [sprints, selectedSprintId]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.labels && task.labels.some((l) => l.toLowerCase().includes(searchQuery.toLowerCase())));
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      const matchesAssignee = filterAssignee === 'all' || task.assigneeId === filterAssignee;
      const matchesColumn = filterColumn === 'all' || task.column === filterColumn;
      return matchesSearch && matchesPriority && matchesAssignee && matchesColumn;
    });
  }, [tasks, searchQuery, filterPriority, filterAssignee, filterColumn]);

  // Helper to resolve dependency task
  const getDependencyTask = (depId?: string) => {
    if (!depId) return null;
    return tasks.find((t) => t.id === depId);
  };

  // Move task to another column
  const handleMoveColumn = async (taskId: string, targetCol: TaskColumn) => {
    let completedTask: KanbanTask | null = null;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const updated = { ...t, column: targetCol, updatedAt: Date.now() };
          if (targetCol === 'done') completedTask = updated;
          return updated;
        }
        return t;
      })
    );

    // Persist to server REST API
    try {
      await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(workspace ? { 'x-workspace-id': workspace.orgId } : {}),
        },
        body: JSON.stringify({ column: targetCol }),
      });
    } catch (err) {
      console.warn('Failed to update task column on server:', err);
    }

    // Trigger Task Completion Automation across Modules (Flow A)
    if (targetCol === 'done' && autoNotifyDone && completedTask) {
      const taskObj: KanbanTask = completedTask;
      setAutomationToast({ id: taskId, title: taskObj.title });
      setTimeout(() => setAutomationToast(null), 4500);

      try {
        emitDomainEvent('task.completed', {
          task: taskObj,
          userName: effectiveUser.name,
          userColor: effectiveUser.color,
        });
      } catch (err) {
        console.warn('Failed to emit task.completed event:', err);
      }
    }
  };

  // Trigger Scan Overdue Tasks across Modules (Flow SLA / Automation)
  const handleTriggerScanOverdue = (isManual = false) => {
    const overdueList = tasks.filter(
      (t) => t.dueDate && t.dueDate < todayStr && t.column !== 'done'
    );
    if (overdueList.length === 0) {
      if (isManual) {
        setAutomationToast({
          id: 'scan_ok',
          title: 'Tiến độ hoàn hảo! Hiện không có công việc nào bị quá hạn SLA.',
        });
        setTimeout(() => setAutomationToast(null), 3500);
      }
      return;
    }

    let emittedCount = 0;
    overdueList.forEach((task) => {
      const overdueDays = Math.max(
        1,
        Math.floor((Date.now() - new Date(task.dueDate!).getTime()) / 86400000)
      );
      try {
        emitDomainEvent('task.overdue', {
          task,
          status: task.column,
          priority: task.priority,
          overdueDays,
        });
        emittedCount++;
      } catch (err) {
        console.warn('Failed to emit task.overdue', err);
      }
    });

    if (emittedCount > 0) {
      setAutomationToast({
        id: 'scan_alert',
        title: `Đã tự động kích hoạt cảnh báo SLA và thông báo cho ${emittedCount} nhiệm vụ quá hạn!`,
      });
      setTimeout(() => setAutomationToast(null), 4500);
    }
  };

  // Periodic Overdue Task Scanner (M3 & M7 Autonomous Engine)
  useEffect(() => {
    const timer = setTimeout(() => {
      handleTriggerScanOverdue(false);
    }, 2000);

    const interval = setInterval(() => {
      handleTriggerScanOverdue(false);
    }, 60000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [tasks, todayStr]);

  // Toggle checklist item
  const handleToggleChecklist = (taskId: string, checkId: string) => {
    let updatedChecklist: any[] = [];
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const list = (t.checklist || []).map((item) =>
          item.id === checkId ? { ...item, completed: !item.completed } : item
        );
        updatedChecklist = list;
        return { ...t, checklist: list, updatedAt: Date.now() };
      })
    );

    fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(workspace ? { 'x-workspace-id': workspace.orgId } : {}),
      },
      body: JSON.stringify({ checklist: updatedChecklist }),
    }).catch(() => {});
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Bạn có chắc muốn xóa công việc này?')) return;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(workspace ? { 'x-workspace-id': workspace.orgId } : {}),
        },
      });
    } catch (err) {
      console.warn('Failed to delete task on server:', err);
    }
  };

  // Open Create Modal
  const openCreateModal = (defaultCol: TaskColumn = 'todo', prefillDate?: string) => {
    setEditingTask(null);
    setCreateTaskError(null);
    setFormTitle('');
    setFormDescription('');
    setFormColumn(defaultCol);
    setFormPriority('normal');
    setFormStoryPoints(0);
    setFormAssigneeId(effectiveUser.id);
    setFormProjectId(selectedProjectId || (projects[0]?.id || ''));
    setFormSprintId(selectedSprintId || '');
    setFormStartDate(todayStr);
    setFormDueDate(prefillDate || '');
    setFormDependsOnTaskId('');
    setFormBlockedReason('');
    setFormEstimatedHours(8);
    setFormLoggedHours(0);
    setFormLabels('Frontend, UI/UX');
    setFormChecklist('');
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (task: KanbanTask) => {
    setEditingTask(task);
    setCreateTaskError(null);
    setFormTitle(task.title);
    setFormDescription(task.description || '');
    setFormColumn(task.column);
    setFormPriority(task.priority);
    setFormStoryPoints(task.storyPoints || 0);
    setFormAssigneeId(task.assigneeId || effectiveUser.id);
    setFormProjectId(task.projectId || '');
    setFormSprintId(task.sprintId || '');
    setFormStartDate(task.startDate || '');
    setFormDueDate(task.dueDate || '');
    setFormDependsOnTaskId(task.dependsOnTaskId || '');
    setFormBlockedReason(task.blockedReason || '');
    setFormEstimatedHours(task.estimatedHours || 8);
    setFormLoggedHours(task.loggedHours || 0);
    setFormLabels(task.labels?.join(', ') || '');
    setFormChecklist(task.checklist?.map((c) => c.text).join('\n') || '');
    setIsCreateModalOpen(true);
  };

  // Save Task (Create or Edit)
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    setCreateTaskError(null);

    const assignee = availableUsers.find((u) => u.id === formAssigneeId) || {
      id: effectiveUser.id,
      name: effectiveUser.name,
      color: effectiveUser.color,
    };

    const labels = formLabels
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const checklistItems = formChecklist
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text, idx) => ({
        id: 'chk_' + idx + '_' + Math.random().toString(36).substring(2, 6),
        text,
        completed: false,
      }));

    const serverPayload = {
      title: formTitle.trim(),
      description: formDescription.trim(),
      column: formColumn,
      priority: formPriority,
      storyPoints: Number(formStoryPoints) || 0,
      projectId: formProjectId || undefined,
      sprintId: formSprintId || undefined,
      assigneeId: assignee.id || undefined,
      assigneeName: assignee.name || undefined,
      dueDate: formDueDate || undefined,
      labels,
      checklist: checklistItems,
      estimatedMinutes: (Number(formEstimatedHours) || 8) * 60,
    };

    try {
      if (editingTask) {
        const res = await fetch(`${API_BASE}/tasks/${editingTask.id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(workspace ? { 'x-workspace-id': workspace.orgId } : {}),
          },
          body: JSON.stringify(serverPayload),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || 'Failed to update task');
        }
        if (json.success && json.data) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === editingTask.id
                ? {
                    ...t,
                    title: formTitle.trim(),
                    description: formDescription.trim(),
                    column: formColumn,
                    priority: formPriority,
                    storyPoints: Number(formStoryPoints) || 0,
                    assigneeId: assignee.id,
                    assigneeName: assignee.name,
                    dueDate: formDueDate || undefined,
                    labels,
                    checklist: checklistItems.length > 0 ? checklistItems : t.checklist,
                    estimatedHours: Number(formEstimatedHours) || 0,
                    loggedHours: Number(formLoggedHours) || 0,
                    updatedAt: Date.now(),
                  }
                : t
            )
          );
        }
      } else {
        const res = await fetch(`${API_BASE}/tasks`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(workspace ? { 'x-workspace-id': workspace.orgId } : {}),
          },
          body: JSON.stringify(serverPayload),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || 'Failed to create task');
        }
        if (json.success && json.data) {
          const t = json.data;
          const mapped: KanbanTask = {
            id: t.id,
            key: t.key,
            projectId: t.projectId,
            sprintId: t.sprintId,
            parentTaskId: t.parentTaskId,
            title: t.title,
            description: t.description || '',
            column: t.column,
            priority: t.priority,
            storyPoints: t.storyPoints ?? 0,
            assigneeId: t.assigneeId,
            assigneeName: t.assigneeName,
            assignees: t.assignees || [],
            dependencies: t.dependencies || [],
            subtasks: t.subtasks || [],
            subtaskCount: t.subtaskCount ?? 0,
            completedSubtasks: t.completedSubtasks ?? 0,
            subtaskProgress: t.subtaskProgress ?? 0,
            commentsCount: t.commentsCount ?? 0,
            dueDate: t.dueDate,
            completedAt: t.completedAt,
            labels: t.labels || [],
            checklist: t.checklist || [],
            estimatedHours: Math.round((t.estimatedMinutes || 480) / 60),
            estimatedMinutes: t.estimatedMinutes ?? 480,
            loggedHours: Math.round((t.loggedMinutes || 0) / 60),
            loggedMinutes: t.loggedMinutes ?? 0,
            createdAt: new Date(t.createdAt).getTime(),
            updatedAt: new Date(t.updatedAt).getTime(),
          };
          setTasks((prev) => (prev.some((x) => x.id === mapped.id) ? prev : [mapped, ...prev]));

          try {
            emitDomainEvent('task.created', { task: mapped, userName: effectiveUser.name });
          } catch (err) {
            console.warn('Failed to emit task.created', err);
          }
        }
      }
      setIsCreateModalOpen(false);
    } catch (err: any) {
      setCreateTaskError(err.message || 'Operation failed');
    }
  };

  // Export CSV report
  const handleExportCSV = () => {
    const headers = [
      'Mã công việc',
      'Tiêu đề',
      'Mô tả',
      'Giai đoạn',
      'Mức ưu tiên',
      'Người phụ trách',
      'Ngày bắt đầu',
      'Hạn hoàn thành',
      'Phụ thuộc công việc',
      'Lý do bị chặn',
      'Giờ dự kiến (h)',
      'Giờ đã làm (h)',
      'Tiến độ checklist (%)',
      'Nhãn',
      'Ngày tạo',
    ];

    const rows = tasks.map((t) => {
      const checklistTotal = t.checklist?.length || 0;
      const checklistDone = t.checklist?.filter((c) => c.completed).length || 0;
      const progressPct = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;
      const depTask = tasks.find((d) => d.id === t.dependsOnTaskId);

      return [
        `"${t.id}"`,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        `"${COLUMNS.find((c) => c.id === t.column)?.label || t.column}"`,
        `"${t.priority}"`,
        `"${t.assigneeName || ''}"`,
        `"${t.startDate || ''}"`,
        `"${t.dueDate || ''}"`,
        `"${depTask ? depTask.title.replace(/"/g, '""') : t.dependsOnTaskId || ''}"`,
        `"${(t.blockedReason || '').replace(/"/g, '""')}"`,
        `"${t.estimatedHours || 0}"`,
        `"${t.loggedHours || 0}"`,
        `"${progressPct}%"`,
        `"${(t.labels || []).join(', ')}"`,
        `"${new Date(t.createdAt).toLocaleDateString('vi-VN')}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bao-cao-cong-viec-${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportToast(true);
    setTimeout(() => setExportToast(false), 3000);
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            Khẩn cấp
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Ưu tiên cao
          </span>
        );
      case 'normal':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Bình thường
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-100 text-zinc-600">
            Thấp
          </span>
        );
    }
  };

  // Calendar Helpers
  const { calendarDays, monthLabel } = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Monday as first day of week: offset calculation
    const offset = (firstDay + 6) % 7;

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean; isToday: boolean }[] = [];

    // Prev month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = offset - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, d);
      days.push({
        dateStr: prevDate.toISOString().slice(0, 10),
        dayNum: d,
        isCurrentMonth: false,
        isToday: prevDate.toISOString().slice(0, 10) === todayStr,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const currDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr: currDateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: currDateStr === todayStr,
      });
    }

    // Trailing next month padding to reach multiple of 7 (up to 35 or 42)
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const nextDate = new Date(year, month + 1, d);
        days.push({
          dateStr: nextDate.toISOString().slice(0, 10),
          dayNum: d,
          isCurrentMonth: false,
          isToday: nextDate.toISOString().slice(0, 10) === todayStr,
        });
      }
    }

    const monthLabel = `Tháng ${month + 1}, ${year}`;
    return { calendarDays: days, monthLabel };
  }, [calendarDate, todayStr]);

  // Gantt Timeline Range Calculation
  const ganttDays = useMemo(() => {
    const allDates: string[] = [];
    tasks.forEach((t) => {
      if (t.startDate) allDates.push(t.startDate);
      if (t.dueDate) allDates.push(t.dueDate);
    });
    allDates.push(todayStr);
    allDates.sort();

    const minDate = new Date(allDates[0]);
    minDate.setDate(minDate.getDate() - 2);
    const maxDate = new Date(allDates[allDates.length - 1]);
    maxDate.setDate(maxDate.getDate() + 4);

    const days: { dateStr: string; label: string; isToday: boolean; dayName: string }[] = [];
    const curr = new Date(minDate);
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    while (curr <= maxDate) {
      const dStr = curr.toISOString().slice(0, 10);
      days.push({
        dateStr: dStr,
        label: `${curr.getDate()}/${curr.getMonth() + 1}`,
        isToday: dStr === todayStr,
        dayName: dayNames[curr.getDay()],
      });
      curr.setDate(curr.getDate() + 1);
    }
    return days;
  }, [tasks, todayStr]);

  return (
    <div className="flex-1 flex flex-col bg-zinc-50 min-h-screen font-sans text-zinc-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Top Header */}
      <header className="h-16 px-6 bg-white border-b border-zinc-200/80 flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition-all shadow-xs active:scale-95 border border-zinc-200"
            title="Thoát và quay lại Không gian làm việc"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-700" />
            <span className="hidden sm:inline">Thoát / Về Trang Chủ</span>
          </Link>
          <div>
            <h1 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <span>Quản Lý Công Việc & Dự Án (Project Management)</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                CRDT Yjs Live
              </span>
            </h1>
            <p className="text-[11px] text-zinc-500">
              Kanban • Danh sách • Lịch hạn chót • Gantt Timeline • Báo cáo & Cân bằng tải
            </p>
          </div>
        </div>

        {/* Presence & Actions */}
        <div className="flex items-center gap-3">
          {/* Active Collaborators */}
          <div className="flex items-center -space-x-1.5 mr-2">
            {onlineUsers.slice(0, 4).map((u, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-white shadow-xs"
                style={{ backgroundColor: u.color }}
                title={`${u.name} (Đang trực tuyến)`}
              >
                {u.name.slice(0, 1).toUpperCase()}
              </div>
            ))}
            {onlineUsers.length > 4 && (
              <div className="w-7 h-7 rounded-full bg-zinc-200 text-zinc-600 flex items-center justify-center text-[10px] font-bold border-2 border-white">
                +{onlineUsers.length - 4}
              </div>
            )}
          </div>

          {/* Project & Sprint Controls */}
          <div className="hidden xl:flex items-center gap-2 mr-2">
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setSelectedSprintId('');
              }}
              className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 text-xs font-semibold rounded-xl focus:outline-none cursor-pointer"
            >
              <option value="">📁 Tất cả dự án</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.key}] {p.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-300 text-xs font-semibold rounded-xl"
              title="Quản lý dự án"
            >
              + Dự án
            </button>

            <select
              value={selectedSprintId}
              onChange={(e) => setSelectedSprintId(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 text-xs font-semibold rounded-xl focus:outline-none cursor-pointer"
            >
              <option value="">🏃 Tất cả Sprint</option>
              {sprints
                .filter((s) => !selectedProjectId || s.projectId === selectedProjectId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.status === 'active' ? 'Đang chạy' : s.status === 'completed' ? 'Đã xong' : 'Kế hoạch'})
                  </option>
                ))}
            </select>
            <button
              onClick={() => setIsSprintModalOpen(true)}
              className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-300 text-xs font-semibold rounded-xl"
              title="Lập kế hoạch Sprint"
            >
              + Sprint
            </button>

            {currentSprintForBurndown && (
              <button
                onClick={() => setSelectedBurndownSprint(currentSprintForBurndown)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-xl shadow-xs"
                title="Xem biểu đồ Burndown Sprint"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Burndown</span>
              </button>
            )}
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-300/80 text-xs font-semibold rounded-xl transition-colors shadow-xs active:scale-95"
            title="Xuất danh sách công việc sang file CSV / Excel"
          >
            <Download className="w-3.5 h-3.5 text-zinc-600" />
            <span className="hidden md:inline">Xuất CSV</span>
          </button>

          <Link
            href="/chat"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold rounded-xl transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mở Chat Zalo</span>
          </Link>

          <button
            onClick={() => openCreateModal('todo')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo công việc mới</span>
          </button>
        </div>
      </header>

      {/* Overview Metric Banner */}
      <section className="px-6 py-3.5 bg-white border-b border-zinc-200/80">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Progress stats */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div>
              <p className="text-[11px] text-zinc-500 font-medium">Tổng việc</p>
              <p className="text-xl font-bold text-zinc-900">{stats.total}</p>
            </div>
            <div className="w-px h-7 bg-zinc-200 hidden sm:block" />
            <div>
              <p className="text-[11px] text-zinc-500 font-medium">Đang xử lý</p>
              <p className="text-xl font-bold text-blue-600">{stats.inProgress}</p>
            </div>
            <div className="w-px h-7 bg-zinc-200 hidden sm:block" />
            <div>
              <p className="text-[11px] text-zinc-500 font-medium">Bị chặn (Blocked)</p>
              <p className={`text-xl font-bold ${stats.blocked > 0 ? 'text-rose-600' : 'text-zinc-400'}`}>
                {stats.blocked}
              </p>
            </div>
            <div className="w-px h-7 bg-zinc-200 hidden sm:block" />
            <div>
              <p className="text-[11px] text-zinc-500 font-medium">Đã xong</p>
              <p className="text-xl font-bold text-emerald-600">{stats.done}</p>
            </div>
            <div className="w-px h-7 bg-zinc-200 hidden sm:block" />
            <div>
              <p className="text-[11px] text-zinc-500 font-medium">Quá hạn</p>
              <p className={`text-xl font-bold ${stats.overdueCount > 0 ? 'text-rose-600' : 'text-zinc-400'}`}>
                {stats.overdueCount}
              </p>
            </div>
            <div className="w-px h-7 bg-zinc-200 hidden sm:block" />
            <div className="min-w-[130px]">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-zinc-700 truncate max-w-[110px]" title={currentSprintForBurndown ? `Sprint: ${currentSprintForBurndown.name}` : 'Tiến độ'}>
                  {currentSprintForBurndown ? currentSprintForBurndown.name : 'Tiến độ Sprint'}
                </span>
                <span className="font-bold text-blue-600">
                  {currentSprintForBurndown?.progress !== undefined ? currentSprintForBurndown.progress : stats.percent}%
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/60">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{
                    width: `${currentSprintForBurndown?.progress !== undefined ? currentSprintForBurndown.progress : stats.percent}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Tìm việc, nhãn, mô tả..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 focus:bg-white w-44 sm:w-52 transition-all"
              />
            </div>

            <select
              value={filterColumn}
              onChange={(e) => setFilterColumn(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-700 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Mọi giai đoạn</option>
              {COLUMNS.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.label}
                </option>
              ))}
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-700 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Mọi mức ưu tiên</option>
              <option value="urgent">Khẩn cấp</option>
              <option value="high">Ưu tiên cao</option>
              <option value="normal">Bình thường</option>
              <option value="low">Thấp</option>
            </select>

            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-700 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Tất cả nhân sự</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} {(u as any).department ? `(${(u as any).department})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* View Switcher & Automation Bar */}
      <section className="px-6 py-2.5 bg-zinc-50/80 border-b border-zinc-200/80 flex flex-wrap items-center justify-between gap-3">
        {/* 5 View Switcher Tabs */}
        <div className="flex items-center bg-zinc-200/70 p-1 rounded-xl gap-0.5 overflow-x-auto">
          <button
            onClick={() => setViewMode('board')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              viewMode === 'board'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Bảng Kanban</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              viewMode === 'list'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Danh sách việc (List)</span>
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              viewMode === 'calendar'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Lịch hạn chót (Calendar)</span>
          </button>
          <button
            onClick={() => setViewMode('gantt')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              viewMode === 'gantt'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Biểu đồ Gantt (Timeline)</span>
          </button>
          <button
            onClick={() => setViewMode('metrics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              viewMode === 'metrics'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Báo cáo & Dashboard</span>
          </button>
        </div>

        {/* Automation Status Badge & Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleTriggerScanOverdue(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors shadow-xs active:scale-95"
            title="Kích hoạt động cơ tự động hóa M7 quét toàn bộ công việc quá hạn chót và phát cảnh báo SLA tức thì"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>Quét &amp; Báo Động Quá Hạn SLA ({stats.overdueCount})</span>
          </button>

          <button
            onClick={() => setAutoNotifyDone(!autoNotifyDone)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              autoNotifyDone
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-zinc-100 border-zinc-300 text-zinc-500'
            }`}
            title="Quy tắc tự động hóa: Khi task chuyển sang Hoàn thành, tự động thông báo Chat nhóm và ghi Audit Log"
          >
            <Zap className={`w-3.5 h-3.5 ${autoNotifyDone ? 'text-emerald-600' : 'text-zinc-400'}`} />
            <span>
              Tự động hóa hoàn tất: <strong>{autoNotifyDone ? 'ĐANG BẬT' : 'ĐÃ TẮT'}</strong>
            </span>
          </button>
        </div>
      </section>

      {/* Floating Automation Triggered Toast */}
      {automationToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-300">Tự động hóa kích hoạt thành công!</p>
            <p className="text-[11px] text-zinc-300">
              Đã ghi nhận Audit Log và bắn thông báo hoàn tất "{automationToast.title}" đến kênh Chat nhóm.
            </p>
          </div>
        </div>
      )}

      {/* Floating Export CSV Toast */}
      {exportToast && (
        <div className="fixed bottom-6 left-6 z-50 bg-zinc-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-blue-500/50 flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-blue-300">Đã xuất báo cáo CSV thành công!</p>
            <p className="text-[11px] text-zinc-300">File đã được tải xuống máy tính của bạn.</p>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 overflow-x-auto">
        {/* VIEW 1: KANBAN BOARD */}
        {viewMode === 'board' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 min-w-[1250px] items-start">
            {COLUMNS.map((column) => {
              const columnTasks = filteredTasks.filter((t) => t.column === column.id);
              const isOverWIP = column.id === 'in_progress' && columnTasks.length > 4;

              return (
                <div
                  key={column.id}
                  className={`bg-zinc-100/70 border rounded-2xl p-3 flex flex-col min-h-[550px] ${
                    column.id === 'blocked' ? 'border-rose-200/80 bg-rose-50/20' : 'border-zinc-200/80'
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-2 py-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${column.color}`}>{column.label}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${column.badgeBg}`}>
                        {columnTasks.length}
                      </span>
                    </div>
                    <button
                      onClick={() => openCreateModal(column.id)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors"
                      title={`Thêm công việc vào ${column.label}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* WIP Limit warning */}
                  {isOverWIP && (
                    <div className="mb-2 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-800 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Cảnh báo WIP: Nên giới hạn ≤ 4 thẻ đang làm để tập trung hoàn thiện!</span>
                    </div>
                  )}

                  {/* Task Cards List */}
                  <div className="flex-1 space-y-3">
                    {columnTasks.map((task) => {
                      const checklistTotal = task.checklist?.length || 0;
                      const checklistDone = task.checklist?.filter((c) => c.completed).length || 0;
                      const checklistPercent =
                        checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;
                      const depTask = getDependencyTask(task.dependsOnTaskId);
                      const isOverdue =
                        task.dueDate && task.dueDate < todayStr && task.column !== 'done';

                      return (
                        <div
                          key={task.id}
                          onClick={() => setSelectedDetailTask(task)}
                          className={`bg-white border rounded-xl p-3.5 shadow-xs hover:shadow-md transition-all group cursor-pointer ${
                            task.column === 'blocked'
                              ? 'border-rose-300 ring-1 ring-rose-200'
                              : 'border-zinc-200 hover:border-zinc-300'
                          }`}
                        >
                          {/* Header: Priority + Task Key + Story Points + Labels */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {task.key && (
                                <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[9px] bg-blue-100 text-blue-800">
                                  {task.key}
                                </span>
                              )}
                              {task.storyPoints !== undefined && task.storyPoints > 0 && (
                                <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[9px] bg-amber-100 text-amber-800">
                                  {task.storyPoints} pts
                                </span>
                              )}
                              {getPriorityBadge(task.priority)}
                              {task.labels?.map((label, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.5 rounded text-[9px] font-mono text-zinc-600 bg-zinc-100"
                                >
                                  #{label}
                                </span>
                              ))}
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(task);
                                }}
                                className="p-1 text-zinc-400 hover:text-blue-600 rounded transition-colors"
                                title="Chỉnh sửa task"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTask(task.id);
                                }}
                                className="p-1 text-zinc-400 hover:text-rose-600 rounded transition-colors"
                                title="Xóa task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Blocked Reason Alert */}
                          {task.column === 'blocked' && (
                            <div className="mb-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-[10px] text-rose-800 flex items-start gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold">Đang bị chặn:</span>{' '}
                                {task.blockedReason || 'Chưa cập nhật lý do vướng mắc'}
                              </div>
                            </div>
                          )}

                          {/* Dependency link */}
                          {depTask && (
                            <div className="mb-2 px-2 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-[10px] text-zinc-600 flex items-center gap-1.5 truncate">
                              <Link2 className="w-3 h-3 text-blue-500 shrink-0" />
                              <span className="font-semibold text-zinc-700">Phụ thuộc:</span>
                              <span className="truncate text-blue-600 font-medium" title={depTask.title}>
                                {depTask.title}
                              </span>
                            </div>
                          )}

                          {/* 2-Way Source Reference Badge (Flow 14.1 / Cross-Module Linkage) */}
                          {task.source_ref && (
                            <Link
                              href={task.source_ref.url || '#'}
                              onClick={(e) => e.stopPropagation()}
                              className="mb-2 px-2 py-1 bg-indigo-50/80 hover:bg-indigo-100/90 border border-indigo-200/80 rounded-lg text-[10px] text-indigo-900 flex items-center justify-between gap-1.5 transition-colors group/link"
                              title={`Nhấp để mở nguồn gốc từ: ${task.source_ref.title || task.source_ref.type}`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                {task.source_ref.type === 'comment' ? (
                                  <MessageSquare className="w-3 h-3 text-purple-600 shrink-0" />
                                ) : task.source_ref.type === 'whiteboard' ? (
                                  <Palette className="w-3 h-3 text-amber-600 shrink-0" />
                                ) : task.source_ref.type === 'figma' ? (
                                  <Sparkles className="w-3 h-3 text-indigo-600 shrink-0" />
                                ) : task.source_ref.type === 'sop' ? (
                                  <BookOpen className="w-3 h-3 text-emerald-600 shrink-0" />
                                ) : task.source_ref.type === 'sheet' ? (
                                  <FileSpreadsheet className="w-3 h-3 text-emerald-600 shrink-0" />
                                ) : (
                                  <Link2 className="w-3 h-3 text-blue-600 shrink-0" />
                                )}
                                <span className="font-semibold text-indigo-950">
                                  {task.source_ref.type === 'sop'
                                    ? 'Quy trình SOP:'
                                    : task.source_ref.type === 'whiteboard'
                                    ? 'Bảng trắng:'
                                    : task.source_ref.type === 'comment'
                                    ? 'Bình luận:'
                                    : task.source_ref.type === 'figma'
                                    ? 'Bản vẽ:'
                                    : 'Nguồn:'}
                                </span>
                                <span className="truncate text-indigo-700 font-medium">
                                  {task.source_ref.title || 'Mở chi tiết'}
                                </span>
                              </div>
                              <span className="text-indigo-500 group-hover/link:translate-x-0.5 transition-transform shrink-0">↗</span>
                            </Link>
                          )}

                          {/* Title & Description */}
                          <h4 className="text-xs font-bold text-zinc-900 leading-snug mb-1">
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-[11px] text-zinc-500 line-clamp-2 mb-2.5">
                              {task.description}
                            </p>
                          )}

                          {/* Checklist Interactive Snippet */}
                          {checklistTotal > 0 && (
                            <div className="mb-2.5 p-2 bg-zinc-50 rounded-lg border border-zinc-100">
                              <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1.5 font-medium">
                                <span className="flex items-center gap-1">
                                  <CheckSquare className="w-3 h-3 text-zinc-400" />
                                  Việc con ({checklistPercent}%)
                                </span>
                                <span>
                                  {checklistDone}/{checklistTotal}
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden mb-2">
                                <div
                                  className="h-full bg-blue-600 rounded-full transition-all"
                                  style={{ width: `${checklistPercent}%` }}
                                />
                              </div>
                              <div className="space-y-1">
                                {task.checklist.slice(0, 3).map((item) => (
                                  <label
                                    key={item.id}
                                    className="flex items-center gap-2 text-[11px] cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={item.completed}
                                      onChange={() => handleToggleChecklist(task.id, item.id)}
                                      className="rounded text-blue-600 focus:ring-blue-500 w-3 h-3 cursor-pointer"
                                    />
                                    <span
                                      className={
                                        item.completed
                                          ? 'line-through text-zinc-400'
                                          : 'text-zinc-700'
                                      }
                                    >
                                      {item.text}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Dates & Time Tracking Badge */}
                          <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-2 pt-1 border-t border-zinc-100">
                            {task.dueDate ? (
                              <span
                                className={`flex items-center gap-1 font-medium ${
                                  isOverdue ? 'text-rose-600 font-bold' : 'text-zinc-600'
                                }`}
                              >
                                <Calendar className="w-3 h-3" />
                                {task.dueDate} {isOverdue && '(Quá hạn!)'}
                              </span>
                            ) : (
                              <span className="text-zinc-400">Không có hạn</span>
                            )}

                            {(task.estimatedHours || task.loggedHours) && (
                              <span className="flex items-center gap-1 text-zinc-600 font-medium">
                                <Clock className="w-3 h-3 text-zinc-400" />
                                {task.loggedHours || 0}h / {task.estimatedHours || 0}h
                              </span>
                            )}
                          </div>

                          {/* Subtask & Comment Indicators */}
                          <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-2">
                            <div className="flex items-center gap-3">
                              {(task.subtaskCount || 0) > 0 && (
                                <span className="flex items-center gap-1 font-medium text-zinc-600" title="Tiến độ công việc con">
                                  <CheckSquare className="w-3 h-3 text-blue-500" />
                                  <span>{task.completedSubtasks || 0}/{task.subtaskCount} ({task.subtaskProgress || 0}%)</span>
                                </span>
                              )}
                              {(task.commentsCount || 0) > 0 && (
                                <span className="flex items-center gap-1 font-medium text-zinc-600" title="Bình luận trao đổi">
                                  <MessageSquare className="w-3 h-3 text-indigo-500" />
                                  <span>{task.commentsCount}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Footer: Assignee & Stage Switchers */}
                          <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-xs text-zinc-500">
                            {/* Assignee (Single or Multiple) */}
                            {task.assignees && task.assignees.length > 1 ? (
                              <div className="flex items-center -space-x-1.5" title={`Phụ trách: ${task.assignees.map((a) => a.name).join(', ')}`}>
                                {task.assignees.slice(0, 3).map((a, idx) => (
                                  <div
                                    key={idx}
                                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold border border-white"
                                    style={{ backgroundColor: a.avatarColor || '#3b82f6' }}
                                  >
                                    {a.name.slice(0, 1).toUpperCase()}
                                  </div>
                                ))}
                                {task.assignees.length > 3 && (
                                  <span className="text-[9px] text-zinc-500 ml-1">+{task.assignees.length - 3}</span>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <div
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                                  style={{ backgroundColor: task.assigneeColor || '#3b82f6' }}
                                  title={`Người thực hiện: ${task.assigneeName}`}
                                >
                                  {task.assigneeName ? task.assigneeName.slice(0, 1).toUpperCase() : 'U'}
                                </div>
                                <span className="text-[10px] text-zinc-600 font-medium truncate max-w-[80px]">
                                  {task.assigneeName}
                                </span>
                              </div>
                            )}

                            {/* Quick stage transition buttons */}
                            <div className="flex items-center gap-1">
                              {column.id !== 'todo' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const prevIdx = ALL_COLUMNS.indexOf(column.id) - 1;
                                    if (prevIdx >= 0) handleMoveColumn(task.id, ALL_COLUMNS[prevIdx]);
                                  }}
                                  className="p-1 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded"
                                  title="Chuyển về giai đoạn trước"
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {column.id !== 'done' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const nextIdx = ALL_COLUMNS.indexOf(column.id) + 1;
                                    if (nextIdx < ALL_COLUMNS.length)
                                      handleMoveColumn(task.id, ALL_COLUMNS[nextIdx]);
                                  }}
                                  className="p-1 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                  title="Chuyển sang giai đoạn tiếp theo"
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {columnTasks.length === 0 && (
                      <div className="h-32 border border-dashed border-zinc-300 rounded-xl flex flex-col items-center justify-center text-zinc-400 text-xs">
                        <p>Chưa có việc nào</p>
                        <button
                          onClick={() => openCreateModal(column.id)}
                          className="text-[11px] text-blue-600 hover:underline mt-1 font-semibold"
                        >
                          + Thêm ngay
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW 2: LIST VIEW */}
        {viewMode === 'list' && (
          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-700">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-5 py-3.5">Tiêu đề công việc</th>
                    <th className="px-4 py-3.5">Giai đoạn</th>
                    <th className="px-4 py-3.5">Độ ưu tiên</th>
                    <th className="px-4 py-3.5">Người phụ trách</th>
                    <th className="px-4 py-3.5">Tiến độ việc con</th>
                    <th className="px-4 py-3.5">Phụ thuộc / Bị chặn</th>
                    <th className="px-4 py-3.5">Hạn hoàn thành</th>
                    <th className="px-4 py-3.5">Giờ làm việc</th>
                    <th className="px-4 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredTasks.map((task) => {
                    const checklistTotal = task.checklist?.length || 0;
                    const checklistDone = task.checklist?.filter((c) => c.completed).length || 0;
                    const progressPct =
                      checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;
                    const depTask = getDependencyTask(task.dependsOnTaskId);
                    const isOverdue =
                      task.dueDate && task.dueDate < todayStr && task.column !== 'done';

                    return (
                      <tr key={task.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="px-5 py-3 min-w-[240px]">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            {task.key && (
                              <span className="px-1.5 py-0.2 rounded font-mono font-bold text-[9px] bg-blue-100 text-blue-800">
                                {task.key}
                              </span>
                            )}
                            <p className="font-semibold text-zinc-900">{task.title}</p>
                          </div>
                          {task.source_ref && (
                            <Link
                              href={task.source_ref.url || '#'}
                              className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1 font-medium mb-1"
                            >
                              <span>🔗 Nguồn: {task.source_ref.title || task.source_ref.type} ↗</span>
                            </Link>
                          )}
                          {task.description && (
                            <p className="text-[11px] text-zinc-400 line-clamp-1">{task.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <select
                            value={task.column}
                            onChange={(e) => handleMoveColumn(task.id, e.target.value as TaskColumn)}
                            className="px-2.5 py-1 bg-zinc-100 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-800 cursor-pointer focus:outline-none"
                          >
                            <option value="todo">📋 Cần làm (To do)</option>
                            <option value="in_progress">⏳ Đang xử lý (In Progress)</option>
                            <option value="blocked">⛔ Bị chặn (Blocked)</option>
                            <option value="review">🔍 Đang duyệt (Review)</option>
                            <option value="done">✅ Hoàn thành (Done)</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{getPriorityBadge(task.priority)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                              style={{ backgroundColor: task.assigneeColor || '#3b82f6' }}
                            >
                              {(task.assigneeName || 'U').slice(0, 1)}
                            </div>
                            <span className="font-medium text-zinc-800">
                              {task.assigneeName || 'Chưa gán'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 min-w-[120px]">
                          {checklistTotal > 0 ? (
                            <div>
                              <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                                <span>
                                  {checklistDone}/{checklistTotal}
                                </span>
                                <span>{progressPct}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-600 rounded-full"
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-[160px]">
                          {task.column === 'blocked' ? (
                            <span
                              className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 block truncate"
                              title={task.blockedReason}
                            >
                              ⛔ {task.blockedReason || 'Bị chặn'}
                            </span>
                          ) : depTask ? (
                            <span
                              className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 block truncate"
                              title={`Chờ việc: ${depTask.title}`}
                            >
                              🔗 Chờ #{depTask.title}
                            </span>
                          ) : (
                            <span className="text-[11px] text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {task.dueDate ? (
                            <span
                              className={`flex items-center gap-1 text-[11px] ${
                                isOverdue ? 'text-rose-600 font-bold' : 'text-zinc-600'
                              }`}
                            >
                              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                              {task.dueDate}
                            </span>
                          ) : (
                            <span className="text-[11px] text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-zinc-600 text-[11px]">
                          {task.loggedHours || 0}h / {task.estimatedHours || 0}h
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(task)}
                              className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Chỉnh sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Xóa công việc"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 3: CALENDAR VIEW */}
        {viewMode === 'calendar' && (
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs">
            {/* Calendar Controls */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-bold text-zinc-900">{monthLabel}</h3>
                <span className="text-xs text-zinc-500 font-medium hidden sm:inline">
                  (Bấm vào ô ngày để tạo công việc với hạn chót tương ứng)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))
                  }
                  className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                  title="Tháng trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCalendarDate(new Date(2026, 9, 1))}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                >
                  Tháng này
                </button>
                <button
                  onClick={() =>
                    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))
                  }
                  className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                  title="Tháng sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday Header */}
            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-zinc-500 uppercase">
              <div>Thứ 2</div>
              <div>Thứ 3</div>
              <div>Thứ 4</div>
              <div>Thứ 5</div>
              <div>Thứ 6</div>
              <div>Thứ 7</div>
              <div>Chủ Nhật</div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, idx) => {
                const dayTasks = tasks.filter((t) => t.dueDate === day.dateStr);

                return (
                  <div
                    key={idx}
                    onClick={() => openCreateModal('todo', day.dateStr)}
                    className={`min-h-[110px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                      day.isToday
                        ? 'border-blue-500 bg-blue-50/20 shadow-xs'
                        : day.isCurrentMonth
                        ? 'border-zinc-200 bg-white hover:border-blue-300 hover:bg-zinc-50/50'
                        : 'border-zinc-100 bg-zinc-50/50 opacity-40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-bold ${
                          day.isToday
                            ? 'w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center'
                            : day.isCurrentMonth
                            ? 'text-zinc-800'
                            : 'text-zinc-400'
                        }`}
                      >
                        {day.dayNum}
                      </span>
                      <span className="text-[10px] text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        + Thêm
                      </span>
                    </div>

                    <div className="space-y-1 flex-1 overflow-y-auto max-h-[80px]">
                      {dayTasks.map((t) => {
                        const isDone = t.column === 'done';
                        const isBlocked = t.column === 'blocked';
                        return (
                          <div
                            key={t.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(t);
                            }}
                            className={`p-1.5 rounded-lg text-[10px] font-medium border flex items-center justify-between gap-1 transition-transform hover:scale-[1.02] ${
                              isDone
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 line-through opacity-75'
                                : isBlocked
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : t.priority === 'urgent'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                            title={`${t.title} - ${t.assigneeName}`}
                          >
                            <span className="truncate flex-1 font-semibold">{t.title}</span>
                            <div
                              className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-white text-[8px] shrink-0"
                              style={{ backgroundColor: t.assigneeColor || '#3b82f6' }}
                            >
                              {(t.assigneeName || 'U').slice(0, 1)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 4: GANTT CHART (TIMELINE) */}
        {viewMode === 'gantt' && (
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <span>Biểu đồ Gantt & Tiến độ Timeline</span>
                  <span className="text-xs text-zinc-500 font-normal">
                    (Mỗi thanh ngang thể hiện thời lượng từ ngày bắt đầu đến hạn chót)
                  </span>
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Đã hoàn thành
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-blue-500 inline-block" /> Đang làm
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-rose-500 inline-block" /> Bị chặn
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[1200px]">
                {/* Gantt Header */}
                <div className="flex border-b border-zinc-200 bg-zinc-100/70 font-semibold text-[11px] text-zinc-700">
                  <div className="w-72 shrink-0 p-3 border-r border-zinc-200">Nhiệm vụ & Người phụ trách</div>
                  <div className="flex-1 flex">
                    {ganttDays.map((day) => (
                      <div
                        key={day.dateStr}
                        className={`w-12 shrink-0 p-2 text-center border-r border-zinc-200/60 ${
                          day.isToday ? 'bg-blue-50 text-blue-700 font-bold' : ''
                        }`}
                      >
                        <div className="text-[10px] text-zinc-400 uppercase">{day.dayName}</div>
                        <div>{day.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gantt Rows */}
                <div className="divide-y divide-zinc-100">
                  {filteredTasks.map((task) => {
                    const checklistTotal = task.checklist?.length || 0;
                    const checklistDone = task.checklist?.filter((c) => c.completed).length || 0;
                    const progressPct =
                      checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;
                    const depTask = getDependencyTask(task.dependsOnTaskId);

                    const startIdx = ganttDays.findIndex((d) => d.dateStr === task.startDate);
                    const dueIdx = ganttDays.findIndex((d) => d.dateStr === task.dueDate);

                    const effectiveStart = startIdx >= 0 ? startIdx : 0;
                    const effectiveEnd = dueIdx >= 0 ? dueIdx : Math.min(effectiveStart + 3, ganttDays.length - 1);
                    const span = Math.max(1, effectiveEnd - effectiveStart + 1);

                    const leftOffset = effectiveStart * 48; // 48px per day column
                    const barWidth = span * 48;

                    return (
                      <div key={task.id} className="flex hover:bg-zinc-50/60 transition-colors group">
                        {/* Task Label on the left */}
                        <div className="w-72 shrink-0 p-3 border-r border-zinc-200 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p
                              onClick={() => openEditModal(task)}
                              className="text-xs font-bold text-zinc-900 truncate hover:text-blue-600 cursor-pointer"
                              title={task.title}
                            >
                              {task.title}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-0.5">
                              <span
                                className="w-2 h-2 rounded-full inline-block"
                                style={{ backgroundColor: task.assigneeColor || '#3b82f6' }}
                              />
                              <span className="truncate">{task.assigneeName}</span>
                              <span>•</span>
                              <span>{task.loggedHours || 0}h/{task.estimatedHours || 0}h</span>
                            </div>
                          </div>
                          <button
                            onClick={() => openEditModal(task)}
                            className="p-1 text-zinc-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Timeline Bar Area */}
                        <div className="flex-1 relative flex items-center h-14">
                          {/* Grid background lines */}
                          <div className="absolute inset-0 flex pointer-events-none">
                            {ganttDays.map((d) => (
                              <div
                                key={d.dateStr}
                                className={`w-12 shrink-0 border-r border-zinc-100 ${
                                  d.isToday ? 'bg-blue-50/30' : ''
                                }`}
                              />
                            ))}
                          </div>

                          {/* Gantt Bar */}
                          <div
                            onClick={() => openEditModal(task)}
                            className={`absolute h-8 rounded-lg shadow-xs flex items-center px-2 cursor-pointer transition-all hover:brightness-105 overflow-hidden ${
                              task.column === 'done'
                                ? 'bg-emerald-500 text-white'
                                : task.column === 'blocked'
                                ? 'bg-rose-500 text-white ring-2 ring-rose-300'
                                : task.column === 'review'
                                ? 'bg-amber-500 text-white'
                                : task.column === 'in_progress'
                                ? 'bg-blue-600 text-white'
                                : 'bg-zinc-400 text-white'
                            }`}
                            style={{
                              left: `${leftOffset}px`,
                              width: `${Math.max(barWidth, 60)}px`,
                            }}
                            title={`${task.title} (${task.startDate || '—'} đến ${task.dueDate || '—'})`}
                          >
                            {/* Inner progress overlay */}
                            {progressPct > 0 && task.column !== 'done' && (
                              <div
                                className="absolute left-0 top-0 bottom-0 bg-black/20"
                                style={{ width: `${progressPct}%` }}
                              />
                            )}

                            <span className="relative z-10 text-[10px] font-bold truncate flex items-center gap-1">
                              {task.column === 'blocked' && <AlertCircle className="w-3 h-3 shrink-0" />}
                              {task.title} ({progressPct}%)
                            </span>
                          </div>

                          {/* Dependency Arrow Badge */}
                          {depTask && (
                            <div
                              className="absolute top-1 text-[9px] font-medium text-zinc-500 bg-white border border-zinc-200 px-1.5 py-0.5 rounded shadow-xs"
                              style={{ left: `${Math.max(0, leftOffset - 50)}px` }}
                              title={`Chờ việc: ${depTask.title}`}
                            >
                              ↳ Chờ #{depTask.title.slice(0, 10)}...
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 5: METRICS & PROGRESS DASHBOARD */}
        {viewMode === 'metrics' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-xs">
                <p className="text-xs font-semibold text-zinc-500 uppercase">Tổng số công việc</p>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-extrabold text-zinc-900">{stats.total}</span>
                  <span className="text-xs font-medium text-zinc-400">100% Sprint</span>
                </div>
              </div>

              <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-xs">
                <p className="text-xs font-semibold text-blue-600 uppercase">Đang thực hiện</p>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-extrabold text-blue-600">{stats.inProgress}</span>
                  <span className="text-xs font-medium text-blue-600">
                    {stats.total > 0 ? Math.round((stats.inProgress / stats.total) * 100) : 0}%
                  </span>
                </div>
              </div>

              <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-xs">
                <p className="text-xs font-semibold text-rose-600 uppercase">Bị chặn (Blocked)</p>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-extrabold text-rose-600">{stats.blocked}</span>
                  <span className="text-xs font-medium text-rose-600">Cần xử lý ngay</span>
                </div>
              </div>

              <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-xs">
                <p className="text-xs font-semibold text-emerald-600 uppercase">Đã hoàn thành</p>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-extrabold text-emerald-600">{stats.done}</span>
                  <span className="text-xs font-medium text-emerald-600">{stats.percent}% đạt</span>
                </div>
              </div>
            </div>

            {/* Time Tracking & Overdue Alert Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase">Tổng thời gian ghi nhận</p>
                  <p className="text-2xl font-bold text-zinc-900 mt-1">
                    {stats.totalLogged}h <span className="text-sm font-normal text-zinc-500">/ {stats.totalEstimated}h dự kiến</span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
              </div>

              <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase">Trạng thái hạn chót</p>
                  <p className={`text-2xl font-bold mt-1 ${stats.overdueCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {stats.overdueCount > 0 ? `${stats.overdueCount} việc quá hạn!` : 'Tất cả đúng tiến độ'}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stats.overdueCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {stats.overdueCount > 0 ? <AlertCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                </div>
              </div>
            </div>

            {/* Charts & Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* By Status */}
              <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-xs">
                <h3 className="text-sm font-bold text-zinc-900 mb-4 flex items-center justify-between">
                  <span>Phân bổ theo giai đoạn</span>
                  <span className="text-xs font-normal text-zinc-500">5 Cột Kanban</span>
                </h3>
                <div className="space-y-3">
                  {COLUMNS.map((col) => {
                    const count = tasks.filter((t) => t.column === col.id).length;
                    const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                    return (
                      <div key={col.id}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-zinc-700">{col.label}</span>
                          <span className="font-mono text-zinc-500">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              col.id === 'done'
                                ? 'bg-emerald-500'
                                : col.id === 'review'
                                ? 'bg-amber-500'
                                : col.id === 'blocked'
                                ? 'bg-rose-500'
                                : col.id === 'in_progress'
                                ? 'bg-blue-500'
                                : 'bg-zinc-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* By Priority */}
              <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-xs">
                <h3 className="text-sm font-bold text-zinc-900 mb-4 flex items-center justify-between">
                  <span>Phân bổ theo mức độ ưu tiên</span>
                  <span className="text-xs font-normal text-zinc-500">SLA & Khẩn cấp</span>
                </h3>
                <div className="space-y-3">
                  {[
                    { key: 'urgent', label: 'Khẩn cấp (Urgent)', color: 'bg-rose-500' },
                    { key: 'high', label: 'Ưu tiên cao (High)', color: 'bg-amber-500' },
                    { key: 'normal', label: 'Bình thường (Normal)', color: 'bg-blue-500' },
                    { key: 'low', label: 'Thấp (Low)', color: 'bg-zinc-400' },
                  ].map((item) => {
                    const count = tasks.filter((t) => t.priority === item.key).length;
                    const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                    return (
                      <div key={item.key}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-zinc-700">{item.label}</span>
                          <span className="font-mono text-zinc-500">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Team Workload Balance */}
            <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-xs">
              <h3 className="text-sm font-bold text-zinc-900 mb-4 flex items-center justify-between">
                <span>Khối lượng công việc theo nhân sự (Team Workload Balance)</span>
                <span className="text-xs font-normal text-zinc-500">Phát hiện quá tải & phân bổ lại</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                {availableUsers.map((user) => {
                  const userTasks = tasks.filter((t) => t.assigneeId === user.id);
                  const activeTasks = userTasks.filter(
                    (t) => t.column === 'in_progress' || t.column === 'review' || t.column === 'blocked'
                  );
                  const doneCount = userTasks.filter((t) => t.column === 'done').length;
                  const userLogged = userTasks.reduce((acc, t) => acc + (t.loggedHours || 0), 0);
                  const userEst = userTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);

                  let statusText = '🟢 Sẵn sàng nhận việc';
                  let statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                  if (activeTasks.length >= 3) {
                    statusText = '⚠️ Quá tải';
                    statusColor = 'text-rose-700 bg-rose-50 border-rose-200';
                  } else if (activeTasks.length >= 1) {
                    statusText = '✅ Cân đối';
                    statusColor = 'text-blue-700 bg-blue-50 border-blue-200';
                  }

                  return (
                    <div key={user.id} className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-center flex flex-col justify-between">
                      <div>
                        <div
                          className="w-10 h-10 rounded-full mx-auto flex items-center justify-center text-white text-xs font-bold mb-2 shadow-xs"
                          style={{ backgroundColor: user.color }}
                        >
                          {user.name.slice(0, 1)}
                        </div>
                        <p className="text-xs font-bold text-zinc-900 truncate">{user.name}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          {activeTasks.length} đang làm • {doneCount} xong
                        </p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          {userLogged}h / {userEst}h
                        </p>
                      </div>
                      <div className={`mt-3 py-1 px-2 rounded-lg text-[10px] font-bold border ${statusColor}`}>
                        {statusText}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Blocked Tasks Deep Dive */}
            {stats.blocked > 0 && (
              <div className="p-5 bg-rose-50/50 border border-rose-200 rounded-2xl">
                <h4 className="text-xs font-bold text-rose-900 mb-3 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Danh sách công việc đang bị chặn (Cần tháo gỡ)</span>
                </h4>
                <div className="space-y-2">
                  {tasks
                    .filter((t) => t.column === 'blocked')
                    .map((t) => (
                      <div
                        key={t.id}
                        className="p-3 bg-white border border-rose-200 rounded-xl flex items-center justify-between gap-4"
                      >
                        <div>
                          <p className="text-xs font-bold text-zinc-900">{t.title}</p>
                          <p className="text-[11px] text-rose-700 mt-0.5 font-medium">
                            ⚠️ Lý do: {t.blockedReason || 'Chưa cung cấp lý do'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-500">Phụ trách: {t.assigneeName}</span>
                          <button
                            onClick={() => openEditModal(t)}
                            className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 text-[11px] font-semibold rounded-lg transition-colors"
                          >
                            Tháo gỡ / Cập nhật
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal Create / Edit Task */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
            <div className="h-14 px-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50 shrink-0">
              <h3 className="text-sm font-bold text-zinc-900">
                {editingTask ? 'Chỉnh sửa công việc' : 'Tạo công việc mới'}
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="p-6 space-y-4 overflow-y-auto">
              {createTaskError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{createTaskError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Dự án (Project)</label>
                  <select
                    value={formProjectId}
                    onChange={(e) => setFormProjectId(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-800 focus:bg-white focus:outline-none"
                  >
                    <option value="">-- Mặc định (Workspace) --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.key}] {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Sprint</label>
                  <select
                    value={formSprintId}
                    onChange={(e) => setFormSprintId(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-800 focus:bg-white focus:outline-none"
                  >
                    <option value="">-- Không có Sprint --</option>
                    {sprints
                      .filter((s) => !formProjectId || s.projectId === formProjectId)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.status})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Tiêu đề công việc *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Triển khai kiểm thử tải Redis cluster..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Mô tả chi tiết</label>
                <textarea
                  rows={2}
                  placeholder="Nêu rõ mục tiêu, yêu cầu và tiêu chí nghiệm thu..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Giai đoạn</label>
                  <select
                    value={formColumn}
                    onChange={(e) => setFormColumn(e.target.value as TaskColumn)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-800 focus:bg-white focus:outline-none"
                  >
                    <option value="todo">📋 Cần làm</option>
                    <option value="in_progress">⏳ Đang xử lý</option>
                    <option value="blocked">⛔ Bị chặn</option>
                    <option value="review">🔍 Đang duyệt</option>
                    <option value="done">✅ Hoàn thành</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Mức ưu tiên</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as TaskPriority)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-800 focus:bg-white focus:outline-none"
                  >
                    <option value="urgent">Khẩn cấp</option>
                    <option value="high">Ưu tiên cao</option>
                    <option value="normal">Bình thường</option>
                    <option value="low">Thấp</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Story Points</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formStoryPoints}
                    onChange={(e) => setFormStoryPoints(Number(e.target.value) || 0)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-800 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Blocked reason input if column is blocked */}
              {formColumn === 'blocked' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <label className="block text-xs font-bold text-rose-800 mb-1">
                    Lý do bị chặn (vướng mắc cần giải quyết) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Chờ phê duyệt từ đối tác ngân hàng..."
                    value={formBlockedReason}
                    onChange={(e) => setFormBlockedReason(e.target.value)}
                    className="w-full bg-white border border-rose-300 rounded-lg px-3 py-1.5 text-xs text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Người phụ trách</label>
                  <select
                    value={formAssigneeId}
                    onChange={(e) => setFormAssigneeId(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-800 focus:bg-white focus:outline-none"
                  >
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} {(u as any).department ? `(${(u as any).department})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Phụ thuộc nhiệm vụ</label>
                  <select
                    value={formDependsOnTaskId}
                    onChange={(e) => setFormDependsOnTaskId(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-800 focus:bg-white focus:outline-none"
                  >
                    <option value="">Không phụ thuộc việc nào</option>
                    {tasks
                      .filter((t) => !editingTask || t.id !== editingTask.id)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          #{t.title.slice(0, 30)}...
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-800 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Hạn hoàn thành</label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-800 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Giờ dự kiến (h)</label>
                  <input
                    type="number"
                    min="0"
                    value={formEstimatedHours}
                    onChange={(e) => setFormEstimatedHours(Number(e.target.value))}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-800 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Giờ đã làm (h)</label>
                  <input
                    type="number"
                    min="0"
                    value={formLoggedHours}
                    onChange={(e) => setFormLoggedHours(Number(e.target.value))}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-800 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Nhãn / Tags (cách nhau bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  placeholder="Backend, Security, Docker"
                  value={formLabels}
                  onChange={(e) => setFormLabels(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Danh mục việc con (Mỗi dòng một mục)
                </label>
                <textarea
                  rows={2}
                  placeholder={`Cài đặt môi trường\nChạy unit test\nĐánh giá code`}
                  value={formChecklist}
                  onChange={(e) => setFormChecklist(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none resize-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
                >
                  Lưu công việc
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedDetailTask && (
        <TaskDetailModal
          task={selectedDetailTask}
          allTasks={tasks}
          projects={projects}
          sprints={sprints}
          workspaceMembers={workspaceMembers}
          apiBase={API_BASE}
          token={token}
          orgId={workspace?.orgId || 'org_main'}
          currentUserId={effectiveUser.id}
          currentUserName={effectiveUser.name}
          onClose={() => setSelectedDetailTask(null)}
          onTaskUpdated={(updatedTask) => {
            setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
            setSelectedDetailTask(updatedTask);
          }}
          onTaskDeleted={(taskId) => {
            setTasks((prev) => prev.filter((t) => t.id !== taskId));
            setSelectedDetailTask(null);
          }}
        />
      )}

      {/* Project Management Modal */}
      {isProjectModalOpen && (
        <ProjectModal
          apiBase={API_BASE}
          token={token}
          orgId={workspace?.orgId || 'org_main'}
          currentUserRole={workspace?.role}
          projects={projects}
          onProjectCreated={(newProj) => {
            setProjects((prev) => [newProj, ...prev]);
            setSelectedProjectId(newProj.id);
          }}
          onProjectUpdated={(updatedProj) => {
            setProjects((prev) => prev.map((p) => (p.id === updatedProj.id ? updatedProj : p)));
          }}
          onClose={() => setIsProjectModalOpen(false)}
        />
      )}

      {/* Sprint Planning Modal */}
      {isSprintModalOpen && (
        <SprintModal
          apiBase={API_BASE}
          token={token}
          orgId={workspace?.orgId || 'org_main'}
          projects={projects}
          activeProjectId={selectedProjectId}
          sprints={sprints}
          onSprintCreated={(newSprint) => {
            setSprints((prev) => [newSprint, ...prev]);
            setSelectedSprintId(newSprint.id);
          }}
          onSprintUpdated={(updatedSprint) => {
            setSprints((prev) => prev.map((s) => (s.id === updatedSprint.id ? updatedSprint : s)));
          }}
          onViewBurndown={(sprint) => {
            setIsSprintModalOpen(false);
            setSelectedBurndownSprint(sprint);
          }}
          onClose={() => setIsSprintModalOpen(false)}
        />
      )}

      {/* Burndown Chart Modal */}
      {selectedBurndownSprint && (
        <BurndownChartModal
          sprint={selectedBurndownSprint}
          apiBase={API_BASE}
          token={token}
          orgId={workspace?.orgId || 'org_main'}
          onClose={() => setSelectedBurndownSprint(null)}
        />
      )}
    </div>
  );
}
