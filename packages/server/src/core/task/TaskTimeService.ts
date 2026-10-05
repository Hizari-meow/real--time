import { getPrismaClient } from '../../storage/db.js';
import { TaskSocketManager } from './TaskSocketManager.js';

export class TaskTimeService {
  private static instance: TaskTimeService | null = null;
  private prisma = getPrismaClient();

  public static getInstance(): TaskTimeService {
    if (!TaskTimeService.instance) {
      TaskTimeService.instance = new TaskTimeService();
    }
    return TaskTimeService.instance;
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
