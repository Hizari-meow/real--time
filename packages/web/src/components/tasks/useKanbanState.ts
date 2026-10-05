'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import {
  KanbanTask,
  TaskColumn,
  TaskPriority,
  Project,
  Sprint,
  COLUMNS,
} from './types';
import { ResilientWebSocketProvider } from '../../lib/yjs-provider';
import { emitDomainEvent } from '../../lib/domain-event-bus';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8080/api`
    : 'http://localhost:8080/api');

interface UseKanbanStateParams {
  effectiveUser: { id: string; name: string; color: string };
  workspace: any;
  token: string | null;
}

export function useKanbanState({
  effectiveUser,
  workspace,
  token,
}: UseKanbanStateParams) {
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
        console.warn('Failed to load tasks from server:', err);
      } finally {
        setLoadingTasks(false);
      }
    };
    fetchTasks();
  }, [token, workspace, selectedProjectId, selectedSprintId]);

  // Merge available users
  const availableUsers = useMemo(() => {
    const list: { id: string; name: string; color: string; department?: string }[] = [];
    workspaceMembers.forEach((m, idx) => {
      const colors = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#db2777'];
      list.push({
        id: m.id,
        name: m.name,
        color: colors[idx % colors.length],
        department: m.role || 'Member',
      });
    });
    if (!list.some((u) => u.id === effectiveUser.id) && effectiveUser.id) {
      list.unshift({
        id: effectiveUser.id,
        name: effectiveUser.name,
        color: effectiveUser.color,
        department: 'Bản thân',
      });
    }
    return list;
  }, [workspaceMembers, effectiveUser]);

  // Real-time synchronization via WebSocket for Tasks
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    let socket: WebSocket | null = null;
    let isMounted = true;

    try {
      socket = new WebSocket(wsUrl);
      socket.onopen = () => {
        if (workspace?.orgId && socket?.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              type: 'subscribe',
              channel: `workspace:${workspace.orgId}:tasks`,
            })
          );
        }
      };

      socket.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'TASK_CREATED' && msg.task) {
            setTasks((prev) => {
              if (prev.some((t) => t.id === msg.task.id)) return prev;
              return [msg.task, ...prev];
            });
          } else if (msg.type === 'TASK_UPDATED' && msg.task) {
            setTasks((prev) =>
              prev.map((t) => (t.id === msg.task.id ? { ...t, ...msg.task } : t))
            );
          } else if (msg.type === 'TASK_DELETED' && msg.taskId) {
            setTasks((prev) => prev.filter((t) => t.id !== msg.taskId));
          }
        } catch (e) {
          // ignore non-json ws frames
        }
      };
    } catch (e) {
      console.warn('Tasks WebSocket connection fallback:', e);
    }

    return () => {
      isMounted = false;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [workspace?.orgId]);

  // Yjs Awareness Presence
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;
    const docId = `workspace:${workspace?.orgId || 'default'}:tasks`;

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

    const handleAwareness = () => {
      const states = provider.awareness.getStates();
      const usersMap = new Map<string, { id: string; name: string; color: string }>();
      states.forEach((s: any) => {
        if (s.user && s.user.id) {
          usersMap.set(s.user.id, s.user);
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
    if (!depId) return undefined;
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

  return {
    tasks,
    setTasks,
    workspaceMembers,
    projects,
    setProjects,
    sprints,
    setSprints,
    selectedProjectId,
    setSelectedProjectId,
    selectedSprintId,
    setSelectedSprintId,
    isProjectModalOpen,
    setIsProjectModalOpen,
    isSprintModalOpen,
    setIsSprintModalOpen,
    selectedBurndownSprint,
    setSelectedBurndownSprint,
    selectedDetailTask,
    setSelectedDetailTask,
    loadingTasks,
    createTaskError,
    editingTask,
    isCreateModalOpen,
    setIsCreateModalOpen,
    automationToast,
    exportToast,
    calendarDate,
    setCalendarDate,
    searchQuery,
    setSearchQuery,
    filterPriority,
    setFilterPriority,
    filterAssignee,
    setFilterAssignee,
    filterColumn,
    setFilterColumn,
    viewMode,
    setViewMode,
    autoNotifyDone,
    setAutoNotifyDone,
    formTitle,
    setFormTitle,
    formDescription,
    setFormDescription,
    formColumn,
    setFormColumn,
    formPriority,
    setFormPriority,
    formStoryPoints,
    setFormStoryPoints,
    formAssigneeId,
    setFormAssigneeId,
    formProjectId,
    setFormProjectId,
    formSprintId,
    setFormSprintId,
    formStartDate,
    setFormStartDate,
    formDueDate,
    setFormDueDate,
    formDependsOnTaskId,
    setFormDependsOnTaskId,
    formBlockedReason,
    setFormBlockedReason,
    formEstimatedHours,
    setFormEstimatedHours,
    formLoggedHours,
    setFormLoggedHours,
    formLabels,
    setFormLabels,
    formChecklist,
    setFormChecklist,
    onlineUsers,
    todayStr,
    availableUsers,
    stats,
    currentSprintForBurndown,
    filteredTasks,
    calendarDays,
    monthLabel,
    ganttDays,
    handleMoveColumn,
    handleTriggerScanOverdue,
    handleToggleChecklist,
    handleDeleteTask,
    openCreateModal,
    openEditModal,
    handleSaveTask,
    handleExportCSV,
    getDependencyTask,
  };
}
