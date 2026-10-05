export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low';
export type TaskColumn = 'todo' | 'in_progress' | 'blocked' | 'review' | 'done';

export interface TaskChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskSourceRef {
  type: 'comment' | 'whiteboard' | 'figma' | 'chat' | 'sop' | 'sheet';
  id?: string;
  title?: string;
  url?: string;
}

export interface TaskAssigneeItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarColor?: string;
  color?: string;
}

export interface TaskDependencyItem {
  id: string;
  dependsOnId: string;
  type: string;
  dependsOnTitle?: string;
  dependsOnColumn?: string;
}

export interface SubtaskItem {
  id: string;
  title: string;
  column: TaskColumn;
  priority: TaskPriority;
  assigneeName?: string;
  dueDate?: string;
}

export interface TaskCommentItem {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface TaskTimeLogItem {
  id: string;
  userId: string;
  userName: string;
  spentSeconds: number;
  spentHours: number;
  note?: string;
  createdAt: string;
}

export interface ProjectMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  key: string;
  description?: string | null;
  status: string;
  isArchived: boolean;
  ownerId: string;
  tasksCount?: number;
  sprintsCount?: number;
  members: ProjectMember[];
  createdAt: string;
}

export interface Sprint {
  id: string;
  orgId: string;
  projectId?: string | null;
  name: string;
  goal?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: 'planned' | 'active' | 'completed';
  totalStoryPoints?: number;
  completedStoryPoints?: number;
  tasksCount?: number;
  progress?: number;
  completedAt?: string | null;
  createdAt: string;
}

export interface BurndownPoint {
  date: string;
  ideal: number;
  actual: number;
  completedCount: number;
}

export interface KanbanTask {
  id: string;
  key?: string;
  projectId?: string;
  sprintId?: string;
  parentTaskId?: string;
  title: string;
  description: string;
  column: TaskColumn;
  priority: TaskPriority;
  storyPoints?: number;
  assigneeId?: string;
  assigneeName?: string;
  assigneeColor?: string;
  assignees?: TaskAssigneeItem[];
  dependencies?: TaskDependencyItem[];
  subtasks?: SubtaskItem[];
  subtaskCount?: number;
  completedSubtasks?: number;
  subtaskProgress?: number;
  comments?: TaskCommentItem[];
  commentsCount?: number;
  timeLogs?: TaskTimeLogItem[];
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  dependsOnTaskId?: string;
  blockedReason?: string;
  estimatedHours?: number;
  estimatedMinutes?: number;
  loggedHours?: number;
  loggedMinutes?: number;
  labels: string[];
  checklist: TaskChecklistItem[];
  sourceMessageId?: string;
  sourceDocId?: string;
  source_ref?: TaskSourceRef;
  createdAt: number;
  updatedAt: number;
}

export const COLUMNS: { id: TaskColumn; label: string; color: string; badgeBg: string }[] = [
  { id: 'todo', label: 'Cần làm', color: 'text-zinc-600', badgeBg: 'bg-zinc-100 text-zinc-700' },
  { id: 'in_progress', label: 'Đang làm', color: 'text-blue-600', badgeBg: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'blocked', label: 'Bị chặn (Blocked)', color: 'text-rose-600', badgeBg: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'review', label: 'Đang duyệt', color: 'text-amber-600', badgeBg: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'done', label: 'Hoàn thành', color: 'text-emerald-600', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

export const INITIAL_TASKS: KanbanTask[] = [];
