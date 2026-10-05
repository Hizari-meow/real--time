import { getPrismaClient } from '../../storage/db.js';
import { ProjectService } from './ProjectService.js';
import { TaskSocketManager } from './TaskSocketManager.js';

export interface CreateSprintDTO {
  name: string;
  goal?: string;
  startDate: string | Date;
  endDate: string | Date;
}

export class SprintService {
  private static instance: SprintService | null = null;
  private prisma = getPrismaClient();

  public static getInstance(): SprintService {
    if (!SprintService.instance) {
      SprintService.instance = new SprintService();
    }
    return SprintService.instance;
  }

  /**
   * Create a new sprint in a project
   */
  public async createSprint(orgId: string, userId: string, projectId: string, data: CreateSprintDTO) {
    await ProjectService.getInstance().requirePermission(orgId, userId, projectId, 'member');

    const sprint = await this.prisma.sprint.create({
      data: {
        projectId,
        orgId,
        name: data.name.trim(),
        goal: data.goal?.trim() || '',
        status: 'planning',
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
    });

    TaskSocketManager.getInstance().broadcastToOrg(orgId, {
      type: 'sprint:created',
      orgId,
      projectId,
      data: sprint,
      timestamp: new Date().toISOString(),
    });

    return sprint;
  }

  /**
   * Start a sprint (transition to 'active')
   */
  public async startSprint(orgId: string, userId: string, sprintId: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
    });

    if (!sprint || sprint.orgId !== orgId) {
      throw new Error('SPRINT_NOT_FOUND');
    }

    await ProjectService.getInstance().requirePermission(orgId, userId, sprint.projectId, 'admin');

    const updated = await this.prisma.sprint.update({
      where: { id: sprintId },
      data: { status: 'active' },
    });

    TaskSocketManager.getInstance().broadcastToOrg(orgId, {
      type: 'sprint:started',
      orgId,
      projectId: sprint.projectId,
      data: updated,
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  /**
   * Complete a sprint (transition to 'completed')
   */
  public async completeSprint(orgId: string, userId: string, sprintId: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
    });

    if (!sprint || sprint.orgId !== orgId) {
      throw new Error('SPRINT_NOT_FOUND');
    }

    await ProjectService.getInstance().requirePermission(orgId, userId, sprint.projectId, 'admin');

    const updated = await this.prisma.sprint.update({
      where: { id: sprintId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    TaskSocketManager.getInstance().broadcastToOrg(orgId, {
      type: 'sprint:completed',
      orgId,
      projectId: sprint.projectId,
      data: updated,
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  /**
   * Assign tasks to a sprint
   */
  public async assignTasksToSprint(orgId: string, userId: string, sprintId: string | null, taskIds: string[]) {
    if (sprintId) {
      const sprint = await this.prisma.sprint.findUnique({ where: { id: sprintId } });
      if (!sprint || sprint.orgId !== orgId) {
        throw new Error('SPRINT_NOT_FOUND');
      }
    }

    await this.prisma.task.updateMany({
      where: {
        id: { in: taskIds },
        orgId,
      },
      data: {
        sprintId,
      },
    });

    return { success: true, count: taskIds.length };
  }

  /**
   * Calculate Real Burndown Chart data based on actual Story Points and completion timestamps
   */
  public async getBurndownData(orgId: string, sprintId: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        tasks: true,
      },
    });

    if (!sprint || sprint.orgId !== orgId) {
      throw new Error('SPRINT_NOT_FOUND');
    }

    // 1. Calculate total story points in sprint
    const totalStoryPoints = sprint.tasks.reduce((sum, task) => {
      return sum + (task.storyPoints && task.storyPoints > 0 ? task.storyPoints : 1);
    }, 0);

    // 2. Generate daily calendar intervals from startDate to endDate using UTC
    const start = new Date(sprint.startDate);
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(sprint.endDate);
    end.setUTCHours(23, 59, 59, 999);

    const oneDayMs = 24 * 60 * 60 * 1000;
    const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / oneDayMs));

    const days: string[] = [];
    const idealLine: number[] = [];
    const actualLine: (number | null)[] = [];

    for (let i = 0; i <= totalDays; i++) {
      const currentDay = new Date(start.getTime() + i * oneDayMs);
      const dayStr = currentDay.toISOString().slice(0, 10);
      days.push(dayStr);

      // Ideal: Linear progression from total points down to 0
      const idealRemaining = Math.max(0, Math.round((totalStoryPoints * (1 - i / totalDays)) * 10) / 10);
      idealLine.push(idealRemaining);

      // Actual: Calculate remaining points completed on or before currentDay's end
      const dayEnd = new Date(currentDay);
      dayEnd.setUTCHours(23, 59, 59, 999);

      const completedPoints = sprint.tasks.reduce((sum, task) => {
        if (task.column === 'done' && task.completedAt && new Date(task.completedAt) <= dayEnd) {
          return sum + (task.storyPoints && task.storyPoints > 0 ? task.storyPoints : 1);
        }
        return sum;
      }, 0);

      const actualRemaining = Math.max(0, totalStoryPoints - completedPoints);
      actualLine.push(actualRemaining);
    }

    return {
      sprintId: sprint.id,
      name: sprint.name,
      status: sprint.status,
      startDate: sprint.startDate.toISOString(),
      endDate: sprint.endDate.toISOString(),
      completedAt: sprint.completedAt?.toISOString() || null,
      totalStoryPoints,
      totalTasks: sprint.tasks.length,
      days,
      idealLine,
      actualLine,
    };
  }
}
