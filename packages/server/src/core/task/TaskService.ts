import { getPrismaClient } from '../../storage/db.js';
import { ProjectService } from './ProjectService.js';
import { TaskSocketManager } from './TaskSocketManager.js';
import { MentionService } from '../mention/MentionService.js';
import { NotificationService } from '../notification/NotificationService.js';
import { publishDomainEvent } from '../events/event-system.js';

export interface AssigneeDTO {
  userId: string;
  name: string;
  email?: string;
  avatarColor?: string;
}

export interface CreateTaskDTO {
  projectId?: string;
  sprintId?: string;
  parentTaskId?: string;
  title: string;
  description?: string;
  column?: string; // todo, in_progress, review, done, blocked
  priority?: string; // urgent, high, normal, low
  storyPoints?: number;
  estimatedMinutes?: number;
  dueDate?: string | Date;
  labels?: string[];
  checklist?: any[];
  assignees?: AssigneeDTO[];
  assigneeId?: string;
  assigneeName?: string;
  sourceMessageId?: string;
}

export interface UpdateTaskDTO {
  projectId?: string;
  sprintId?: string | null;
  parentTaskId?: string | null;
  title?: string;
  description?: string;
  column?: string;
  priority?: string;
  storyPoints?: number;
  estimatedMinutes?: number;
  dueDate?: string | Date | null;
  labels?: string[];
  checklist?: any[];
  assignees?: AssigneeDTO[];
  assigneeId?: string | null;
  assigneeName?: string | null;
  position?: number;
}

export class TaskService {
  private static instance: TaskService | null = null;
  private prisma = getPrismaClient();

  public static getInstance(): TaskService {
    if (!TaskService.instance) {
      TaskService.instance = new TaskService();
    }
    return TaskService.instance;
  }

  /**
   * Helper to format task for API responses
   */
  private formatTask(task: any) {
    const subtasks = task.subtasks || [];
    const totalSubtasks = subtasks.length;
    const completedSubtasks = subtasks.filter((s: any) => s.column === 'done').length;
    const subtaskProgress =
      totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

    let checklist: any[] = [];
    try {
      checklist = JSON.parse(task.checklistJson || '[]');
    } catch {
      checklist = [];
    }

    return {
      id: task.id,
      orgId: task.orgId,
      projectId: task.projectId || undefined,
      sprintId: task.sprintId || undefined,
      parentTaskId: task.parentTaskId || undefined,
      title: task.title,
      description: task.description,
      column: task.column,
      priority: task.priority,
      storyPoints: task.storyPoints ?? 0,
      estimatedMinutes: task.estimatedMinutes ?? 0,
      position: task.position ?? 0,
      assigneeId: task.assigneeId || undefined,
      assigneeName: task.assigneeName || undefined,
      dueDate: task.dueDate?.toISOString().slice(0, 10),
      completedAt: task.completedAt?.toISOString(),
      sourceMessageId: task.sourceMessageId || undefined,
      labels: task.labels || [],
      checklist,
      assignees: (task.assignees || []).map((a: any) => ({
        id: a.id,
        userId: a.userId,
        name: a.name,
        email: a.email,
        avatarColor: a.avatarColor,
      })),
      dependencies: (task.dependencies || []).map((d: any) => ({
        id: d.id,
        dependsOnId: d.dependsOnId,
        type: d.type,
        dependsOnTitle: d.dependsOn?.title,
        dependsOnColumn: d.dependsOn?.column,
      })),
      subtaskCount: totalSubtasks,
      completedSubtasks,
      subtaskProgress,
      commentsCount: task.comments?.length || 0,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }

  /**
   * List tasks for a workspace with optional filters
   */
  public async listTasks(
    orgId: string,
    userId: string,
    filters: {
      projectId?: string;
      sprintId?: string;
      parentTaskId?: string;
      column?: string;
      priority?: string;
      assigneeId?: string;
    } = {}
  ) {
    const where: any = { orgId };

    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.sprintId) where.sprintId = filters.sprintId;
    if (filters.parentTaskId !== undefined) where.parentTaskId = filters.parentTaskId;
    if (filters.column) where.column = filters.column;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assigneeId) {
      where.OR = [
        { assigneeId: filters.assigneeId },
        { assignees: { some: { userId: filters.assigneeId } } },
      ];
    }

    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        assignees: true,
        dependencies: {
          include: { dependsOn: { select: { id: true, title: true, column: true } } },
        },
        subtasks: { select: { id: true, column: true } },
        comments: { select: { id: true } },
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    });

    return tasks.map((t) => this.formatTask(t));
  }

  /**
   * Get single task with workspace isolation and full relations
   */
  public async getTask(orgId: string, userId: string, taskId: string) {
    const taskAnywhere = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignees: true,
        dependencies: {
          include: { dependsOn: { select: { id: true, title: true, column: true } } },
        },
        dependents: {
          include: { task: { select: { id: true, title: true, column: true } } },
        },
        subtasks: {
          select: {
            id: true,
            title: true,
            column: true,
            priority: true,
            assigneeName: true,
            dueDate: true,
          },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        timeLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!taskAnywhere) {
      throw new Error('TASK_NOT_FOUND');
    }

    if (taskAnywhere.orgId !== orgId) {
      throw new Error('WORKSPACE_ISOLATION_ERROR');
    }

    const formatted = this.formatTask(taskAnywhere);
    return {
      ...formatted,
      comments: taskAnywhere.comments.map((c) => ({
        id: c.id,
        authorId: c.authorId,
        authorName: c.authorName,
        authorColor: c.authorColor,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
      })),
      activities: taskAnywhere.activities.map((a) => ({
        id: a.id,
        actorId: a.actorId,
        actorName: a.actorName,
        action: a.action,
        details: a.details,
        createdAt: a.createdAt.toISOString(),
      })),
      timeLogs: taskAnywhere.timeLogs.map((tl) => ({
        id: tl.id,
        userId: tl.userId,
        userName: tl.userName,
        startTime: tl.startTime.toISOString(),
        endTime: tl.endTime?.toISOString(),
        durationSeconds: tl.durationSeconds,
        note: tl.note,
        createdAt: tl.createdAt.toISOString(),
      })),
      subtasks: taskAnywhere.subtasks.map((s) => ({
        id: s.id,
        title: s.title,
        column: s.column,
        priority: s.priority,
        assigneeName: s.assigneeName,
        dueDate: s.dueDate?.toISOString().slice(0, 10),
      })),
    };
  }

  /**
   * Create task with enterprise relations and notifications
   */
  public async createTask(
    orgId: string,
    actor: { userId: string; name: string; email: string },
    data: CreateTaskDTO
  ) {
    if (!data.title || !data.title.trim()) {
      throw new Error('TASK_TITLE_REQUIRED');
    }

    // Check project permission if projectId is provided
    if (data.projectId) {
      await ProjectService.getInstance().requirePermission(orgId, actor.userId, data.projectId, 'member');
    }

    const targetAssigneeId = data.assigneeId || (data.assignees && data.assignees[0]?.userId) || actor.userId;
    const targetAssigneeName = data.assigneeName || (data.assignees && data.assignees[0]?.name) || actor.name;

    const newTask = await this.prisma.task.create({
      data: {
        orgId,
        projectId: data.projectId || null,
        sprintId: data.sprintId || null,
        parentTaskId: data.parentTaskId || null,
        title: data.title.trim(),
        description: data.description?.trim() || '',
        column: data.column || 'todo',
        priority: data.priority || 'normal',
        storyPoints: data.storyPoints ?? 0,
        estimatedMinutes: data.estimatedMinutes ?? 0,
        assigneeId: targetAssigneeId,
        assigneeName: targetAssigneeName,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        completedAt: data.column === 'done' ? new Date() : null,
        sourceMessageId: data.sourceMessageId || null,
        labels: Array.isArray(data.labels) ? data.labels : [],
        checklistJson: JSON.stringify(Array.isArray(data.checklist) ? data.checklist : []),
        activities: {
          create: {
            orgId,
            actorId: actor.userId,
            actorName: actor.name,
            action: 'task_created',
            details: `Công việc được tạo bởi ${actor.name}`,
          },
        },
      },
      include: {
        assignees: true,
        dependencies: true,
        subtasks: true,
      },
    });

    // Handle multiple assignees
    const assigneesToAdd: AssigneeDTO[] = Array.isArray(data.assignees) && data.assignees.length > 0
      ? data.assignees
      : [{ userId: targetAssigneeId, name: targetAssigneeName }];

    for (const a of assigneesToAdd) {
      await this.prisma.taskAssignee.upsert({
        where: { taskId_userId: { taskId: newTask.id, userId: a.userId } },
        create: {
          taskId: newTask.id,
          userId: a.userId,
          name: a.name,
          email: a.email || '',
          avatarColor: a.avatarColor || '#3b82f6',
        },
        update: {},
      });
    }

    // Emit domain event to EventBus & Transactional Outbox
    await publishDomainEvent({
      type: 'task.created',
      orgId,
      actor: { type: 'user', id: actor.userId, name: actor.name },
      resource: { type: 'task', id: newTask.id },
      data: {
        id: newTask.id,
        projectId: newTask.projectId,
        title: newTask.title,
        column: newTask.column,
        priority: newTask.priority,
        assigneeId: newTask.assigneeId,
        assigneeName: newTask.assigneeName,
      },
    });

    // If assigned to someone else, trigger task.assigned event
    if (targetAssigneeId && targetAssigneeId !== actor.userId) {
      await publishDomainEvent({
        type: 'task.assigned',
        orgId,
        actor: { type: 'user', id: actor.userId, name: actor.name },
        resource: { type: 'task', id: newTask.id },
        data: {
          id: newTask.id,
          title: newTask.title,
          column: newTask.column,
          priority: newTask.priority,
          assigneeId: targetAssigneeId,
          assigneeName: targetAssigneeName,
        },
      });
    }

    // Broadcast realtime event
    TaskSocketManager.getInstance().broadcastToOrg(orgId, {
      type: 'task:created',
      orgId,
      projectId: newTask.projectId || undefined,
      taskId: newTask.id,
      data: this.formatTask(newTask),
      timestamp: new Date().toISOString(),
    });

    return this.getTask(orgId, actor.userId, newTask.id);
  }

  /**
   * Update task
   */
  public async updateTask(
    orgId: string,
    actor: { userId: string; name: string; email: string },
    taskId: string,
    data: UpdateTaskDTO
  ) {
    const taskAnywhere = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { assignees: true },
    });

    if (!taskAnywhere) {
      throw new Error('TASK_NOT_FOUND');
    }

    if (taskAnywhere.orgId !== orgId) {
      throw new Error('WORKSPACE_ISOLATION_ERROR');
    }

    if (taskAnywhere.projectId) {
      await ProjectService.getInstance().requirePermission(orgId, actor.userId, taskAnywhere.projectId, 'member');
    }

    const updateData: any = {};
    const activitiesToCreate: any[] = [];

    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.description !== undefined) updateData.description = data.description.trim();
    if (data.priority !== undefined && data.priority !== taskAnywhere.priority) {
      updateData.priority = data.priority;
      activitiesToCreate.push({
        orgId,
        actorId: actor.userId,
        actorName: actor.name,
        action: 'priority_changed',
        details: `Đổi độ ưu tiên từ ${taskAnywhere.priority} sang ${data.priority}`,
      });
    }
    if (data.storyPoints !== undefined) updateData.storyPoints = data.storyPoints;
    if (data.estimatedMinutes !== undefined) updateData.estimatedMinutes = data.estimatedMinutes;
    if (data.position !== undefined) updateData.position = data.position;
    if (data.sprintId !== undefined) updateData.sprintId = data.sprintId;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (Array.isArray(data.labels)) updateData.labels = data.labels;
    if (Array.isArray(data.checklist)) updateData.checklistJson = JSON.stringify(data.checklist);

    // Status / Column transition
    let isColumnChanged = false;
    if (data.column !== undefined && data.column !== taskAnywhere.column) {
      isColumnChanged = true;
      updateData.column = data.column;

      if (data.column === 'done' && taskAnywhere.column !== 'done') {
        updateData.completedAt = new Date();
      } else if (data.column !== 'done' && taskAnywhere.column === 'done') {
        updateData.completedAt = null;
      }

      activitiesToCreate.push({
        orgId,
        actorId: actor.userId,
        actorName: actor.name,
        action: 'status_changed',
        details: `Chuyển trạng thái từ ${taskAnywhere.column} sang ${data.column}`,
      });
    }

    // Assignee update
    if (data.assigneeId !== undefined) {
      updateData.assigneeId = data.assigneeId;
      updateData.assigneeName = data.assigneeName || null;
      if (data.assigneeId && data.assigneeId !== taskAnywhere.assigneeId) {
        activitiesToCreate.push({
          orgId,
          actorId: actor.userId,
          actorName: actor.name,
          action: 'assignee_changed',
          details: `Giao việc cho ${data.assigneeName || data.assigneeId}`,
        });
      }
    }

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...updateData,
        activities: {
          create: activitiesToCreate,
        },
      },
    });

    // Sync multiple assignees if provided
    if (Array.isArray(data.assignees)) {
      await this.prisma.taskAssignee.deleteMany({ where: { taskId } });
      for (const a of data.assignees) {
        await this.prisma.taskAssignee.create({
          data: {
            taskId,
            userId: a.userId,
            name: a.name,
            email: a.email || '',
            avatarColor: a.avatarColor || '#3b82f6',
          },
        });
      }
    }

    // Emit domain events
    if (isColumnChanged && updated.column === 'done') {
      await publishDomainEvent({
        type: 'task.completed',
        orgId,
        actor: { type: 'user', id: actor.userId, name: actor.name },
        resource: { type: 'task', id: updated.id },
        data: {
          id: updated.id,
          title: updated.title,
          column: updated.column,
          priority: updated.priority,
          assigneeId: updated.assigneeId,
          creatorId: taskAnywhere.assigneeId,
        },
      });
    }

    if (data.assigneeId && data.assigneeId !== taskAnywhere.assigneeId && data.assigneeId !== actor.userId) {
      await publishDomainEvent({
        type: 'task.assigned',
        orgId,
        actor: { type: 'user', id: actor.userId, name: actor.name },
        resource: { type: 'task', id: updated.id },
        data: {
          id: updated.id,
          title: updated.title,
          column: updated.column,
          priority: updated.priority,
          assigneeId: updated.assigneeId,
          assigneeName: updated.assigneeName,
        },
      });
    }

    // Broadcast realtime event
    const fullUpdated = await this.getTask(orgId, actor.userId, taskId);

    TaskSocketManager.getInstance().broadcastToOrg(orgId, {
      type: isColumnChanged ? 'task:status_changed' : 'task:updated',
      orgId,
      projectId: updated.projectId || undefined,
      taskId: updated.id,
      data: fullUpdated,
      timestamp: new Date().toISOString(),
    });

    return fullUpdated;
  }

  /**
   * Delete task
   */
  public async deleteTask(
    orgId: string,
    actor: { userId: string; name: string; email: string },
    taskId: string
  ) {
    const taskAnywhere = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!taskAnywhere) {
      throw new Error('TASK_NOT_FOUND');
    }

    if (taskAnywhere.orgId !== orgId) {
      throw new Error('WORKSPACE_ISOLATION_ERROR');
    }

    if (taskAnywhere.projectId) {
      await ProjectService.getInstance().requirePermission(orgId, actor.userId, taskAnywhere.projectId, 'member');
    }

    await this.prisma.task.delete({
      where: { id: taskId },
    });

    TaskSocketManager.getInstance().broadcastToOrg(orgId, {
      type: 'task:deleted',
      orgId,
      projectId: taskAnywhere.projectId || undefined,
      taskId,
      data: { id: taskId },
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }

  /**
   * Add Task Dependency with Graph Cycle Detection
   */
  public async addDependency(
    orgId: string,
    actor: { userId: string; name: string },
    taskId: string,
    dependsOnId: string,
    type: string = 'finish_to_start'
  ) {
    // 1. Cannot depend on self
    if (taskId === dependsOnId) {
      throw new Error('DEPENDENCY_SELF_REFERENCE');
    }

    // 2. Both tasks must exist and belong to the same org
    const [task, target] = await Promise.all([
      this.prisma.task.findUnique({ where: { id: taskId } }),
      this.prisma.task.findUnique({ where: { id: dependsOnId } }),
    ]);

    if (!task || task.orgId !== orgId || !target || target.orgId !== orgId) {
      throw new Error('TASK_NOT_FOUND');
    }

    // 3. CYCLE DETECTION ALGORITHM:
    // Check if there is already a path from dependsOnId to taskId
    const hasCycle = await this.checkDependencyCycle(orgId, taskId, dependsOnId);
    if (hasCycle) {
      throw new Error('DEPENDENCY_CYCLE_DETECTED');
    }

    // 4. Create dependency
    const dependency = await this.prisma.taskDependency.upsert({
      where: { taskId_dependsOnId: { taskId, dependsOnId } },
      create: { taskId, dependsOnId, type },
      update: { type },
      include: { dependsOn: { select: { id: true, title: true, column: true } } },
    });

    // Record activity
    await this.prisma.taskActivity.create({
      data: {
        orgId,
        taskId,
        actorId: actor.userId,
        actorName: actor.name,
        action: 'dependency_added',
        details: `Thêm phụ thuộc vào công việc "${target.title}"`,
      },
    });

    TaskSocketManager.getInstance().broadcastToOrg(orgId, {
      type: 'dependency:added',
      orgId,
      taskId,
      data: dependency,
      timestamp: new Date().toISOString(),
    });

    return dependency;
  }

  /**
   * Remove dependency
   */
  public async removeDependency(orgId: string, taskId: string, dependsOnId: string) {
    await this.prisma.taskDependency.deleteMany({
      where: { taskId, dependsOnId },
    });

    TaskSocketManager.getInstance().broadcastToOrg(orgId, {
      type: 'dependency:removed',
      orgId,
      taskId,
      data: { taskId, dependsOnId },
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }

  /**
   * Check if adding (taskId -> dependsOnId) introduces a cycle.
   * BFS search: Does dependsOnId already have a dependency path reaching taskId?
   */
  private async checkDependencyCycle(orgId: string, taskId: string, dependsOnId: string): Promise<boolean> {
    // Fetch all dependencies in the org
    const allDependencies = await this.prisma.taskDependency.findMany({
      where: {
        task: { orgId },
      },
      select: {
        taskId: true,
        dependsOnId: true,
      },
    });

    // Build adjacency list: node -> outgoing edges (what node depends on)
    const adjList = new Map<string, string[]>();
    for (const d of allDependencies) {
      if (!adjList.has(d.taskId)) {
        adjList.set(d.taskId, []);
      }
      adjList.get(d.taskId)!.push(d.dependsOnId);
    }

    // Breadth-First Search starting from dependsOnId
    const visited = new Set<string>();
    const queue = [dependsOnId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === taskId) {
        return true; // Cycle detected!
      }

      if (!visited.has(current)) {
        visited.add(current);
        const neighbors = adjList.get(current) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            queue.push(neighbor);
          }
        }
      }
    }

    return false;
  }

  /**
   * Add comment to task and trigger @mention notifications
   */
  public async addComment(
    orgId: string,
    author: { userId: string; name: string; color?: string },
    taskId: string,
    content: string
  ) {
    if (!content || !content.trim()) {
      throw new Error('COMMENT_CONTENT_REQUIRED');
    }

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task || task.orgId !== orgId) {
      throw new Error('TASK_NOT_FOUND');
    }

    const comment = await this.prisma.taskComment.create({
      data: {
        taskId,
        orgId,
        authorId: author.userId,
        authorName: author.name,
        authorColor: author.color || '#3b82f6',
        content: content.trim(),
      },
    });

    // Record activity
    await this.prisma.taskActivity.create({
      data: {
        orgId,
        taskId,
        actorId: author.userId,
        actorName: author.name,
        action: 'comment_added',
        details: `${author.name} đã thêm bình luận`,
      },
    });

    // Extract @mentions and deliver notifications via Phase 1 NotificationService
    const tokens = MentionService.getInstance().extractMentionTokens(content);
    if (tokens.length > 0) {
      const resolvedUsers = await MentionService.getInstance().resolveMentionedUsers(
        orgId,
        tokens,
        author.userId
      );

      for (const u of resolvedUsers) {
        await NotificationService.getInstance().createNotification({
          orgId,
          userId: u.userId,
          actorId: author.userId,
          type: 'mention',
          title: `${author.name} đã nhắc đến bạn trong công việc`,
          body: `"${content.slice(0, 100)}${content.length > 100 ? '...' : ''}"`,
          senderName: author.name,
          senderColor: author.color || '#3b82f6',
          targetUrl: `/tasks?taskId=${taskId}`,
          targetLabel: task.title,
          isPriority: true,
        });
      }
    }

    TaskSocketManager.getInstance().broadcastToOrg(orgId, {
      type: 'comment:added',
      orgId,
      taskId,
      data: {
        id: comment.id,
        taskId: comment.taskId,
        authorId: comment.authorId,
        authorName: comment.authorName,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
      },
      timestamp: new Date().toISOString(),
    });

    return comment;
  }

  /**
   * Add work log (time tracking)
   */
  public async addTimeLog(
    orgId: string,
    user: { userId: string; name: string },
    taskId: string,
    data: { durationSeconds: number; note?: string; startTime?: string | Date; endTime?: string | Date }
  ) {
    if (!data.durationSeconds || data.durationSeconds <= 0) {
      throw new Error('INVALID_DURATION');
    }

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task || task.orgId !== orgId) {
      throw new Error('TASK_NOT_FOUND');
    }

    const timeLog = await this.prisma.taskTimeLog.create({
      data: {
        taskId,
        orgId,
        userId: user.userId,
        userName: user.name,
        durationSeconds: data.durationSeconds,
        note: data.note?.trim() || '',
        startTime: data.startTime ? new Date(data.startTime) : new Date(),
        endTime: data.endTime ? new Date(data.endTime) : null,
      },
    });

    // Record activity
    const durationMinutes = Math.round(data.durationSeconds / 60);
    await this.prisma.taskActivity.create({
      data: {
        orgId,
        taskId,
        actorId: user.userId,
        actorName: user.name,
        action: 'time_logged',
        details: `${user.name} ghi nhận ${durationMinutes} phút làm việc${data.note ? `: ${data.note}` : ''}`,
      },
    });

    TaskSocketManager.getInstance().broadcastToOrg(orgId, {
      type: 'timelog:added',
      orgId,
      taskId,
      data: timeLog,
      timestamp: new Date().toISOString(),
    });

    return timeLog;
  }

  /**
   * List time logs for a task
   */
  public async listTimeLogs(orgId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.orgId !== orgId) {
      throw new Error('TASK_NOT_FOUND');
    }

    const logs = await this.prisma.taskTimeLog.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });

    const totalSeconds = logs.reduce((sum, l) => sum + l.durationSeconds, 0);
    const totalHours = Math.round((totalSeconds / 3600) * 10) / 10;

    return {
      taskId,
      totalSeconds,
      totalHours,
      logs: logs.map((l) => ({
        id: l.id,
        userId: l.userId,
        userName: l.userName,
        durationSeconds: l.durationSeconds,
        durationMinutes: Math.round(l.durationSeconds / 60),
        note: l.note,
        startTime: l.startTime.toISOString(),
        endTime: l.endTime?.toISOString() || null,
        createdAt: l.createdAt.toISOString(),
      })),
    };
  }
}
