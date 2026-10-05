import { Router, Request, Response } from 'express';
import { authenticate, requireWorkspace } from '../core/auth/AuthMiddleware.js';
import { NotificationService } from '../core/notification/NotificationService.js';

export const notificationsRouter = Router();

// Enforce authentication & workspace membership on all notification endpoints
notificationsRouter.use(authenticate, requireWorkspace());

/**
 * GET /api/notifications
 * Get paginated list of notifications for current user in active workspace
 */
notificationsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const orgId = req.workspace!.orgId;

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    const type = req.query.type as string | undefined;
    const unreadOnly = req.query.unreadOnly === 'true';

    const notificationService = NotificationService.getInstance();
    const result = await notificationService.getNotifications(userId, orgId, {
      limit,
      offset,
      type,
      unreadOnly,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error('[NotificationsRouter] GET / error:', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi máy chủ khi lấy danh sách thông báo',
    });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get real-time unread notification count
 */
notificationsRouter.get('/unread-count', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const orgId = req.workspace!.orgId;

    const count = await NotificationService.getInstance().getUnreadCount(userId, orgId);

    res.json({
      success: true,
      data: {
        unreadCount: count,
      },
    });
  } catch (err: any) {
    console.error('[NotificationsRouter] GET /unread-count error:', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi máy chủ khi lấy số lượng thông báo chưa đọc',
    });
  }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications in the workspace as read
 * NOTE: Defined before `/:id/read` to prevent route collision
 */
notificationsRouter.patch('/read-all', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const orgId = req.workspace!.orgId;

    const count = await NotificationService.getInstance().markAllAsRead(userId, orgId);

    res.json({
      success: true,
      data: {
        markedCount: count,
      },
    });
  } catch (err: any) {
    console.error('[NotificationsRouter] PATCH /read-all error:', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi máy chủ khi đánh dấu đã đọc tất cả',
    });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read
 */
notificationsRouter.patch('/:id/read', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const orgId = req.workspace!.orgId;
    const notificationId = req.params.id;

    const updated = await NotificationService.getInstance().markAsRead(notificationId, userId, orgId);

    if (!updated) {
      res.status(404).json({
        success: false,
        error: 'Thông báo không tồn tại hoặc bạn không có quyền truy cập',
      });
      return;
    }

    res.json({
      success: true,
      data: updated,
    });
  } catch (err: any) {
    console.error(`[NotificationsRouter] PATCH /:id/read error:`, err);
    res.status(500).json({
      success: false,
      error: 'Lỗi máy chủ khi cập nhật trạng thái thông báo',
    });
  }
});
