import { getPrismaClient } from '../../storage/db.js';
import { ProjectService } from './ProjectService.js';
import { TaskSocketManager } from './TaskSocketManager.js';
import { publishDomainEvent } from '../events/event-system.js';
import { formatTask } from './task-formatter.js';
import { TaskDependencyService } from './TaskDependencyService.js';
import { TaskCommentService } from './TaskCommentService.js';
import { TaskTimeService } from './TaskTimeService.js';

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

export { formatTask, TaskDependencyService, TaskCommentService, TaskTimeService };

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
  public formatTask(task: any) {
    return formatTask(task);
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

    return tasks.map((t) => formatTask(t));
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

    const formatted = formatTask(taskAnywhere);
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
      data: formatTask(newTask),
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
   * Add Task Dependency (delegated to TaskDependencyService)
   */
  public async addDependency(
    orgId: string,
    actor: { userId: string; name: string },
    taskId: string,
    dependsOnId: string,
    type: string = 'finish_to_start'
  ) {
    return TaskDependencyService.getInstance().addDependency(orgId, actor, taskId, dependsOnId, type);
  }

  /**
   * Remove dependency (delegated to TaskDependencyService)
   */
  public async removeDependency(orgId: string, taskId: string, dependsOnId: string) {
    return TaskDependencyService.getInstance().removeDependency(orgId, taskId, dependsOnId);
  }

  /**
   * Add comment to task (delegated to TaskCommentService)
   */
  public async addComment(
    orgId: string,
    author: { userId: string; name: string; color?: string },
    taskId: string,
    content: string
  ) {
    return TaskCommentService.getInstance().addComment(orgId, author, taskId, content);
  }

  /**
   * Add work log (delegated to TaskTimeService)
   */
  public async addTimeLog(
    orgId: string,
    user: { userId: string; name: string },
    taskId: string,
    data: { durationSeconds: number; note?: string; startTime?: string | Date; endTime?: string | Date }
  ) {
    return TaskTimeService.getInstance().addTimeLog(orgId, user, taskId, data);
  }

  /**
   * List time logs for a task (delegated to TaskTimeService)
   */
  public async listTimeLogs(orgId: string, taskId: string) {
    return TaskTimeService.getInstance().listTimeLogs(orgId, taskId);
  }
}
