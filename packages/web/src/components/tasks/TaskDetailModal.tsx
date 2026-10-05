'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  MessageSquare,
  GitCommit,
  CheckCircle2,
  AlertTriangle,
  Send,
  Plus,
  Trash2,
  Calendar,
  Layers,
  Users,
  Award,
  Link as LinkIcon,
  Play,
  CheckSquare,
} from 'lucide-react';
import {
  KanbanTask,
  TaskColumn,
  TaskPriority,
  COLUMNS,
  SubtaskItem,
  TaskDependencyItem,
  TaskCommentItem,
  TaskTimeLogItem,
  TaskAssigneeItem,
  Project,
  Sprint,
} from './types';

interface TaskDetailModalProps {
  task: KanbanTask;
  allTasks: KanbanTask[];
  projects: Project[];
  sprints: Sprint[];
  workspaceMembers: { id: string; name: string; email: string; role?: string }[];
  apiBase: string;
  token: string | null;
  orgId: string;
  currentUserId: string;
  currentUserName: string;
  onTaskUpdated: (updated: KanbanTask) => void;
  onTaskDeleted: (taskId: string) => void;
  onClose: () => void;
}

export function TaskDetailModal({
  task,
  allTasks,
  projects,
  sprints,
  workspaceMembers,
  apiBase,
  token,
  orgId,
  currentUserId,
  currentUserName,
  onTaskUpdated,
  onTaskDeleted,
  onClose,
}: TaskDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'subtasks' | 'dependencies' | 'time' | 'comments'>('details');

  // Task details state
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [column, setColumn] = useState<TaskColumn>(task.column);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [storyPoints, setStoryPoints] = useState<number>(task.storyPoints ?? 0);
  const [dueDate, setDueDate] = useState<string>(task.dueDate || '');
  const [projectId, setProjectId] = useState<string>(task.projectId || '');
  const [sprintId, setSprintId] = useState<string>(task.sprintId || '');
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>(
    task.assignees?.map((a) => a.userId) || (task.assigneeId ? [task.assigneeId] : [])
  );

  // Full task details fetched from server (including comments, timeLogs, subtasks, dependencies)
  const [fullTask, setFullTask] = useState<KanbanTask>(task);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Subtask form
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  // Dependency form
  const [newDepTargetId, setNewDepTargetId] = useState('');
  const [newDepType, setNewDepType] = useState('finish_to_start');
  // Time log form
  const [spentMinutes, setSpentMinutes] = useState(60);
  const [timeLogNote, setTimeLogNote] = useState('');
  // Comment form
  const [commentText, setCommentText] = useState('');
  const [showMentionMenu, setShowMentionMenu] = useState(false);

  // Fetch single task with full relations
  const fetchTaskDetails = async () => {
    try {
      const res = await fetch(`${apiBase}/tasks/${task.id}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-workspace-id': orgId,
        },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setFullTask(json.data);
      }
    } catch {
      // keep current
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [task.id]);

  // Save main task details
  const handleSaveDetails = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const assigneesPayload = selectedAssigneeIds
        .map((uid) => {
          const m = workspaceMembers.find((mem) => mem.id === uid);
          return m ? { userId: m.id, name: m.name, email: m.email } : null;
        })
        .filter(Boolean);

      const res = await fetch(`${apiBase}/tasks/${task.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-workspace-id': orgId,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          column,
          priority,
          storyPoints: Number(storyPoints) || 0,
          dueDate: dueDate || undefined,
          projectId: projectId || undefined,
          sprintId: sprintId || undefined,
          assignees: assigneesPayload,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Lỗi khi cập nhật công việc');
      }

      setFullTask(json.data);
      onTaskUpdated(json.data);
      setSuccess('Đã lưu thay đổi vào PostgreSQL!');
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  // Subtask: Create
  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiBase}/tasks/${task.id}/subtasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-workspace-id': orgId,
        },
        body: JSON.stringify({
          title: newSubtaskTitle.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Lỗi khi tạo việc con');
      }
      setNewSubtaskTitle('');
      await fetchTaskDetails();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Subtask: Toggle status
  const handleToggleSubtask = async (subtaskId: string, currentCol: TaskColumn) => {
    try {
      const nextCol = currentCol === 'done' ? 'todo' : 'done';
      await fetch(`${apiBase}/tasks/${subtaskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-workspace-id': orgId,
        },
        body: JSON.stringify({ column: nextCol }),
      });
      await fetchTaskDetails();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Dependency: Add with Cycle Detection Warning
  const handleAddDependency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepTargetId) return;

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiBase}/tasks/${task.id}/dependencies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-workspace-id': orgId,
        },
        body: JSON.stringify({
          dependsOnId: newDepTargetId,
          type: newDepType,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Lỗi khi thêm phụ thuộc');
      }

      setNewDepTargetId('');
      await fetchTaskDetails();
      setSuccess('Đã thêm ràng buộc phụ thuộc!');
    } catch (err: any) {
      // Prominently display cycle detection error
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Dependency: Remove
  const handleRemoveDependency = async (depId: string) => {
    try {
      setLoading(true);
      setError(null);
      await fetch(`${apiBase}/tasks/${task.id}/dependencies/${depId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-workspace-id': orgId,
        },
      });
      await fetchTaskDetails();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Time Tracking: Log Work
  const handleLogWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (spentMinutes <= 0) return;

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiBase}/tasks/${task.id}/time-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-workspace-id': orgId,
        },
        body: JSON.stringify({
          spentSeconds: spentMinutes * 60,
          note: timeLogNote.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Lỗi khi ghi nhận giờ làm');
      }
      setTimeLogNote('');
      await fetchTaskDetails();
      setSuccess(`Đã ghi nhận ${spentMinutes} phút làm việc!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Comment: Submit with @mention
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiBase}/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-workspace-id': orgId,
        },
        body: JSON.stringify({
          content: commentText.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Lỗi khi gửi bình luận');
      }
      setCommentText('');
      setShowMentionMenu(false);
      await fetchTaskDetails();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!confirm('Bạn có chắc muốn xóa công việc này khỏi hệ thống?')) return;
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/tasks/${task.id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-workspace-id': orgId,
        },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Lỗi khi xóa công việc');
      }
      onTaskDeleted(task.id);
      onClose();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Calculate total logged hours
  const totalLoggedMinutes =
    fullTask.timeLogs?.reduce((sum, tl) => sum + Math.round(tl.spentSeconds / 60), 0) ??
    (task.loggedHours ? task.loggedHours * 60 : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded border border-blue-200/60">
              {task.key || `TASK-${task.id.slice(0, 4)}`}
            </span>
            <h3 className="font-bold text-zinc-900 text-base truncate max-w-md">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteTask}
              disabled={loading}
              title="Xóa công việc"
              className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-100 px-6 pt-2 bg-zinc-50/30 gap-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Chi tiết
          </button>
          <button
            onClick={() => setActiveTab('subtasks')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'subtasks'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Việc con
            {fullTask.subtaskCount ? (
              <span className="px-1.5 py-0.2 bg-zinc-100 rounded-full text-[10px]">
                {fullTask.completedSubtasks || 0}/{fullTask.subtaskCount}
              </span>
            ) : null}
          </button>
          <button
            onClick={() => setActiveTab('dependencies')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'dependencies'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Phụ thuộc
            {fullTask.dependencies?.length ? (
              <span className="px-1.5 py-0.2 bg-zinc-100 rounded-full text-[10px]">
                {fullTask.dependencies.length}
              </span>
            ) : null}
          </button>
          <button
            onClick={() => setActiveTab('time')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'time'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Chấm công ({(totalLoggedMinutes / 60).toFixed(1)}h)
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'comments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Thảo luận ({fullTask.comments?.length || fullTask.commentsCount || 0})
          </button>
        </div>

        {/* Banners */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'details' && (
            <form onSubmit={handleSaveDetails} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Tiêu đề công việc</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Mô tả công việc</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Chi tiết công việc..."
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Cột trạng thái</label>
                  <select
                    value={column}
                    onChange={(e) => setColumn(e.target.value as TaskColumn)}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-blue-500"
                  >
                    {COLUMNS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Độ ưu tiên</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="urgent">🔴 Khẩn cấp (Urgent)</option>
                    <option value="high">🟠 Cao (High)</option>
                    <option value="normal">🔵 Bình thường</option>
                    <option value="low">⚪ Thấp (Low)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Story Points</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={storyPoints}
                    onChange={(e) => setStoryPoints(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Hạn chót</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Dự án trực thuộc</label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">(Không gắn dự án)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.key}] {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Kỳ Sprint</label>
                  <select
                    value={sprintId}
                    onChange={(e) => setSprintId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">(Không gắn sprint / Backlog)</option>
                    {sprints.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Multiple Assignees Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Người thực hiện (Multiple Assignees)
                </label>
                <div className="flex flex-wrap gap-2 p-2 bg-zinc-50 border border-zinc-200 rounded-xl min-h-[44px]">
                  {workspaceMembers.map((m) => {
                    const isSelected = selectedAssigneeIds.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedAssigneeIds((prev) =>
                            isSelected ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                          );
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white text-zinc-600 border border-zinc-200/80 hover:bg-zinc-100'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`}
                        />
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          )}

          {/* Subtasks Tab */}
          {activeTab === 'subtasks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <div>
                  <div className="text-xs font-bold text-zinc-900">
                    Tiến độ hoàn thành việc con:{' '}
                    <span className="text-blue-600">{fullTask.subtaskProgress || 0}%</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Đã xong {fullTask.completedSubtasks || 0} trên {fullTask.subtaskCount || 0} công việc con
                  </p>
                </div>
                <div className="w-36 h-2 bg-zinc-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${fullTask.subtaskProgress || 0}%` }}
                  />
                </div>
              </div>

              {/* Form add subtask */}
              <form onSubmit={handleAddSubtask} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Thêm công việc con mới..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  className="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={loading || !newSubtaskTitle.trim()}
                  className="px-3 py-2 bg-zinc-800 hover:bg-zinc-900 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm
                </button>
              </form>

              {/* Subtasks List */}
              <div className="space-y-2">
                {(!fullTask.subtasks || fullTask.subtasks.length === 0) ? (
                  <div className="text-center py-6 text-zinc-400 text-xs">Chưa có công việc con nào.</div>
                ) : (
                  fullTask.subtasks.map((st) => (
                    <div
                      key={st.id}
                      className="p-2.5 bg-white border border-zinc-200 rounded-xl flex items-center justify-between"
                    >
                      <label className="flex items-center gap-2.5 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={st.column === 'done'}
                          onChange={() => handleToggleSubtask(st.id, st.column)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                        />
                        <span className={st.column === 'done' ? 'line-through text-zinc-400' : 'text-zinc-800'}>
                          {st.title}
                        </span>
                      </label>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          st.column === 'done'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {st.column === 'done' ? 'Hoàn thành' : 'Đang xử lý'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Dependencies Tab */}
          {activeTab === 'dependencies' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50/60 border border-blue-200/60 rounded-xl text-xs text-blue-800">
                <span className="font-bold">Hệ thống kiểm tra vòng lặp tự động (Cycle Detection):</span>
                <p className="text-[11px] text-blue-700/90 mt-0.5">
                  Máy chủ tự động duyệt BFS toàn bộ đồ thị phụ thuộc đa cấp. Bất kỳ quan hệ nào tạo thành chu trình kín
                  (ví dụ: A → B → C → A) sẽ bị máy chủ từ chối với mã 400 Bad Request.
                </p>
              </div>

              {/* Add Dependency Form */}
              <form onSubmit={handleAddDependency} className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-zinc-800">Thêm quan hệ phụ thuộc</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <select
                      value={newDepTargetId}
                      onChange={(e) => setNewDepTargetId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Chọn công việc liên quan...</option>
                      {allTasks
                        .filter((t) => t.id !== task.id)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            [{t.key || t.id.slice(0, 4)}] {t.title} ({t.column})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <select
                      value={newDepType}
                      onChange={(e) => setNewDepType(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-blue-500"
                    >
                      <option value="finish_to_start">Finish to Start (FS)</option>
                      <option value="start_to_start">Start to Start (SS)</option>
                      <option value="finish_to_finish">Finish to Finish (FF)</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading || !newDepTargetId}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                  >
                    Thêm ràng buộc
                  </button>
                </div>
              </form>

              {/* Dependencies List */}
              <div className="space-y-2">
                {(!fullTask.dependencies || fullTask.dependencies.length === 0) ? (
                  <div className="text-center py-6 text-zinc-400 text-xs">Chưa có quan hệ phụ thuộc nào.</div>
                ) : (
                  fullTask.dependencies.map((d) => (
                    <div
                      key={d.id}
                      className="p-3 bg-white border border-zinc-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <LinkIcon className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="font-semibold text-zinc-800">
                          {d.dependsOnTitle || `Task:${d.dependsOnId.slice(0, 6)}`}
                        </span>
                        <span className="font-mono text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded">
                          {d.type}
                        </span>
                        {d.dependsOnColumn && (
                          <span className="text-[10px] text-zinc-400 font-medium">({d.dependsOnColumn})</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveDependency(d.dependsOnId)}
                        className="p-1 text-zinc-400 hover:text-rose-600 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Time Tracking Tab */}
          {activeTab === 'time' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                  <div className="text-[11px] text-zinc-500 uppercase font-semibold">Thời gian đã ghi nhận</div>
                  <div className="text-lg font-bold text-zinc-900 mt-0.5">
                    {(totalLoggedMinutes / 60).toFixed(2)} giờ ({totalLoggedMinutes} phút)
                  </div>
                </div>
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                  <div className="text-[11px] text-zinc-500 uppercase font-semibold">Ước tính ban đầu</div>
                  <div className="text-lg font-bold text-zinc-700 mt-0.5">
                    {Math.round((fullTask.estimatedMinutes || (fullTask.estimatedHours ? fullTask.estimatedHours * 60 : 480)) / 60)} giờ
                  </div>
                </div>
              </div>

              {/* Log Work Form */}
              <form onSubmit={handleLogWork} className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-zinc-800">Ghi nhận giờ làm việc (Log Work)</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-zinc-600 mb-1">Số phút làm</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={spentMinutes}
                      onChange={(e) => setSpentMinutes(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] text-zinc-600 mb-1">Ghi chú công việc</label>
                    <input
                      type="text"
                      placeholder="Nội dung đã hoàn thành trong phiên..."
                      value={timeLogNote}
                      onChange={(e) => setTimeLogNote(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading || spentMinutes <= 0}
                    className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-900 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                  >
                    Lưu vào CSDL
                  </button>
                </div>
              </form>

              {/* Time Logs History */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-700">Lịch sử chấm công</h4>
                {(!fullTask.timeLogs || fullTask.timeLogs.length === 0) ? (
                  <div className="text-center py-4 text-zinc-400 text-xs">Chưa có lịch sử chấm công nào.</div>
                ) : (
                  fullTask.timeLogs.map((tl) => (
                    <div
                      key={tl.id}
                      className="p-2.5 bg-white border border-zinc-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-zinc-800">
                          {tl.userName} —{' '}
                          <span className="text-blue-600 font-bold">{Math.round(tl.spentSeconds / 60)} phút</span>
                        </div>
                        {tl.note && <p className="text-[11px] text-zinc-500 mt-0.5">{tl.note}</p>}
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {new Date(tl.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Comments & @mention Tab */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-600">
                <span className="font-bold text-zinc-800">Hỗ trợ nhắc tên đồng nghiệp (@mention):</span>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Gõ ký tự <code className="bg-zinc-200 px-1 rounded text-zinc-800 font-mono">@</code> để đề cập đồng nghiệp.
                  Hệ thống tự động phân giải trong workspace và gửi thông báo đẩy thời gian thực qua Hub Thông báo (Phase 1).
                </p>
              </div>

              {/* Add Comment */}
              <form onSubmit={handleAddComment} className="space-y-2">
                <div className="relative">
                  <textarea
                    rows={3}
                    placeholder="Viết trao đổi thảo luận... Nhập @ để nhắc tên đồng nghiệp"
                    value={commentText}
                    onChange={(e) => {
                      setCommentText(e.target.value);
                      if (e.target.value.endsWith('@')) {
                        setShowMentionMenu(true);
                      }
                    }}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-blue-500 focus:bg-white resize-none"
                  />

                  {/* Mention Suggestion Dropdown */}
                  {showMentionMenu && (
                    <div className="absolute left-2 bottom-12 z-20 bg-white border border-zinc-200 rounded-xl shadow-lg p-1.5 w-52 max-h-40 overflow-y-auto">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase px-2 py-1">Đồng nghiệp</div>
                      {workspaceMembers.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setCommentText((prev) => prev.slice(0, -1) + `@${m.name} `);
                            setShowMentionMenu(false);
                          }}
                          className="w-full text-left px-2 py-1.5 text-xs text-zinc-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="truncate">{m.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setShowMentionMenu(!showMentionMenu)}
                    className="text-xs text-zinc-500 hover:text-blue-600 font-semibold flex items-center gap-1"
                  >
                    <span>@ Nhắc tên</span>
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !commentText.trim()}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Gửi
                  </button>
                </div>
              </form>

              {/* Comments List */}
              <div className="space-y-3 pt-2">
                {(!fullTask.comments || fullTask.comments.length === 0) ? (
                  <div className="text-center py-6 text-zinc-400 text-xs">Chưa có bình luận nào trên công việc này.</div>
                ) : (
                  fullTask.comments.map((c) => (
                    <div key={c.id} className="p-3 bg-zinc-50/70 border border-zinc-200/80 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-900">{c.authorName}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-700 whitespace-pre-wrap">{c.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-100 bg-zinc-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 text-xs font-semibold rounded-xl transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
