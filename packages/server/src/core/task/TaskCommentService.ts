import { getPrismaClient } from '../../storage/db.js';
import { TaskSocketManager } from './TaskSocketManager.js';
import { MentionService } from '../mention/MentionService.js';
import { NotificationService } from '../notification/NotificationService.js';

export class TaskCommentService {
  private static instance: TaskCommentService | null = null;
  private prisma = getPrismaClient();

  public static getInstance(): TaskCommentService {
    if (!TaskCommentService.instance) {
      TaskCommentService.instance = new TaskCommentService();
    }
    return TaskCommentService.instance;
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
}
