import { getPrismaClient } from '../../storage/db.js';
import { NotificationDeliveryManager } from './NotificationDeliveryManager.js';
import { getEventBus } from '../events/event-system.js';
import { DomainEventEnvelope } from '../events/types.js';
import { MentionService } from '../mention/MentionService.js';

export interface CreateNotificationInput {
  orgId: string;
  userId: string;
  actorId?: string;
  type: string; // 'mention' | 'task' | 'comment' | 'meeting' | 'system'
  title: string;
  body: string;
  senderName: string;
  senderColor?: string;
  targetUrl: string;
  targetLabel: string;
  targetDocId?: string;
  isPriority?: boolean;
  metadata?: Record<string, any>;
}

export class NotificationService {
  private static instance: NotificationService | null = null;
  private isSubscribed = false;

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Create and persist a notification in PostgreSQL, then deliver in realtime via WebSocket if online.
   * Enforces workspace isolation: recipient must be a member of `orgId`.
   */
  public async createNotification(input: CreateNotificationInput) {
    const prisma = getPrismaClient();

    // Verify workspace membership for recipient
    const member = await prisma.member.findFirst({
      where: {
        orgId: input.orgId,
        userId: input.userId,
        status: 'active',
      },
    });

    if (!member) {
      console.warn(
        `[NotificationService] Dropping notification for ${input.userId}: Not an active member of ${input.orgId}`
      );
      return null;
    }

    // Consumer idempotency: check if notification for this domain event already exists
    if (input.metadata && (input.metadata as any).eventId) {
      const eventId = (input.metadata as any).eventId;
      const existing = await prisma.notification.findFirst({
        where: {
          orgId: input.orgId,
          userId: input.userId,
          metadata: {
            contains: eventId,
          },
        },
      });
      if (existing) {
        return existing;
      }
    }

    // Persist in PostgreSQL
    const notification = await prisma.notification.create({
      data: {
        orgId: input.orgId,
        userId: input.userId,
        actorId: input.actorId || null,
        type: input.type,
        title: input.title,
        body: input.body,
        senderName: input.senderName || 'Hệ thống',
        senderColor: input.senderColor || '#0068ff',
        targetUrl: input.targetUrl || '',
        targetLabel: input.targetLabel || '',
        targetDocId: input.targetDocId || null,
        isPriority: input.isPriority || false,
        isRead: false,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });

    // Compute updated unread count for this user in this workspace
    const unreadCount = await this.getUnreadCount(input.userId, input.orgId);

    // Push realtime delivery via WebSocket
    const delivery = NotificationDeliveryManager.getInstance();
    delivery.sendToUser(input.userId, {
      type: 'notification:created',
      data: notification,
      unreadCount,
    });

    return notification;
  }

  /**
   * Get paginated notifications for an authenticated user within their active workspace.
   */
  public async getNotifications(
    userId: string,
    orgId: string,
    options: { limit?: number; offset?: number; type?: string; unreadOnly?: boolean } = {}
  ) {
    const prisma = getPrismaClient();
    const limit = Math.min(options.limit || 50, 100);
    const offset = options.offset || 0;

    const where: any = {
      userId,
      orgId,
    };

    if (options.type && options.type !== 'all') {
      where.type = options.type;
    }

    if (options.unreadOnly) {
      where.isRead = false;
    }

    const [items, totalCount, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId, orgId, isRead: false },
      }),
    ]);

    return {
      items,
      totalCount,
      unreadCount,
      hasMore: offset + items.length < totalCount,
    };
  }

  /**
   * Get unread notification count for a user in a workspace.
   */
  public async getUnreadCount(userId: string, orgId: string): Promise<number> {
    const prisma = getPrismaClient();
    return prisma.notification.count({
      where: {
        userId,
        orgId,
        isRead: false,
      },
    });
  }

  /**
   * Mark a single notification as read.
   */
  public async markAsRead(notificationId: string, userId: string, orgId: string) {
    const prisma = getPrismaClient();

    const existing = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
        orgId,
      },
    });

    if (!existing) {
      return null;
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    const unreadCount = await this.getUnreadCount(userId, orgId);

    // Notify user's other open tabs/windows
    NotificationDeliveryManager.getInstance().sendToUser(userId, {
      type: 'notification:read',
      data: { id: notificationId },
      unreadCount,
    });

    return updated;
  }

  /**
   * Mark all unread notifications as read for a user in a workspace.
   */
  public async markAllAsRead(userId: string, orgId: string) {
    const prisma = getPrismaClient();

    const result = await prisma.notification.updateMany({
      where: {
        userId,
        orgId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    NotificationDeliveryManager.getInstance().sendToUser(userId, {
      type: 'notification:read_all',
      data: { count: result.count },
      unreadCount: 0,
    });

    return result.count;
  }

  /**
   * Register event handlers with EventBus to react to server-side domain events.
   */
  public registerEventHandlers(): void {
    if (this.isSubscribed) return;
    this.isSubscribed = true;

    const eventBus = getEventBus();
    const mentionService = MentionService.getInstance();

    // 1. Task Assigned or Created with Assignee
    eventBus.subscribe('task.*', async (event: DomainEventEnvelope) => {
      try {
        const data = event.data as any;
        if (!data) return;

        // When a task is assigned to someone else
        if (data.assigneeId && data.assigneeId !== event.actor.id) {
          if (event.type === 'task.created' || event.type === 'task.assigned') {
            await this.createNotification({
              orgId: event.orgId,
              userId: data.assigneeId,
              actorId: event.actor.id,
              type: 'task',
              title: `Bạn được giao nhiệm vụ mới: "${data.title}"`,
              body: data.description ? data.description.slice(0, 100) : `Ưu tiên: ${data.priority || 'bình thường'}`,
              senderName: event.actor.name || 'Hệ thống',
              targetUrl: `/tasks?taskId=${event.resource.id}`,
              targetLabel: 'Xem nhiệm vụ',
              targetDocId: event.resource.id,
              isPriority: data.priority === 'urgent',
              metadata: { eventId: event.id },
            });
          }
        }

        // When task is completed, notify the creator if distinct
        if (event.type === 'task.completed' && data.creatorId && data.creatorId !== event.actor.id) {
          await this.createNotification({
            orgId: event.orgId,
            userId: data.creatorId,
            actorId: event.actor.id,
            type: 'task',
            title: `Nhiệm vụ đã hoàn thành: "${data.title}"`,
            body: `Hoàn thành bởi ${event.actor.name || 'thành viên'}`,
            senderName: event.actor.name || 'Hệ thống',
            targetUrl: `/tasks?taskId=${event.resource.id}`,
            targetLabel: 'Xem nhiệm vụ',
            targetDocId: event.resource.id,
          });
        }
      } catch (err) {
        console.error('[NotificationService] Error handling task event:', err);
      }
    });

    // 2. Comments and Messages with @Mentions
    eventBus.subscribe('comment.*', async (event: DomainEventEnvelope) => {
      await this.handleMentionEvent(event, 'Bình luận');
    });

    eventBus.subscribe('message.*', async (event: DomainEventEnvelope) => {
      await this.handleMentionEvent(event, 'Tin nhắn');
    });

    // 3. Member added to workspace
    eventBus.subscribe('member.added', async (event: DomainEventEnvelope) => {
      try {
        const data = event.data as any;
        if (data && data.userId) {
          await this.createNotification({
            orgId: event.orgId,
            userId: data.userId,
            actorId: event.actor.id,
            type: 'system',
            title: `Chào mừng bạn gia nhập ${data.orgName || 'Workspace'}`,
            body: `Bạn đã được thêm vào tổ chức bởi ${event.actor.name || 'Quản trị viên'}.`,
            senderName: 'Hệ thống',
            targetUrl: '/',
            targetLabel: 'Bắt đầu làm việc',
            metadata: { eventId: event.id },
          });
        }
      } catch (err) {
        console.error('[NotificationService] Error handling member.added event:', err);
      }
    });
  }

  private async handleMentionEvent(event: DomainEventEnvelope, contextLabel: string) {
    try {
      const data = event.data as any;
      const content = data?.content || data?.text || data?.body || '';
      if (!content) return;

      const mentionService = MentionService.getInstance();
      const tokens = mentionService.extractMentionTokens(content);
      if (!tokens.length) return;

      const mentionedUsers = await mentionService.resolveMentionedUsers(
        event.orgId,
        tokens,
        event.actor.id
      );

      for (const targetUser of mentionedUsers) {
        await this.createNotification({
          orgId: event.orgId,
          userId: targetUser.userId,
          actorId: event.actor.id,
          type: 'mention',
          title: `${event.actor.name || 'Ai đó'} đã nhắc tên bạn trong ${contextLabel.toLowerCase()}`,
          body: content.slice(0, 150),
          senderName: event.actor.name || 'Thành viên',
          targetUrl: data?.targetUrl || (event.resource.type === 'doc' ? `/doc/${event.resource.id}` : `/chat`),
          targetLabel: `Xem ${contextLabel.toLowerCase()}`,
          targetDocId: event.resource.id,
          isPriority: true,
        });
      }
    } catch (err) {
      console.error(`[NotificationService] Error handling mention in ${contextLabel}:`, err);
    }
  }
}
