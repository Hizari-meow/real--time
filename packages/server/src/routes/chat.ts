import { Router, Request, Response } from 'express';
import { authenticate, requireWorkspace } from '../core/auth/AuthMiddleware.js';
import { ChatService } from '../core/chat/ChatService.js';
import { ChatSocketManager } from '../core/chat/ChatSocketManager.js';

export const chatRouter = Router();

// Enforce authentication & workspace membership on all chat endpoints
chatRouter.use(authenticate, requireWorkspace());

/**
 * GET /api/chat/channels
 * List accessible channels for user in active workspace
 */
chatRouter.get('/channels', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const orgId = req.workspace!.orgId;

    const channels = await ChatService.getInstance().listChannels(userId, orgId);

    res.json({
      success: true,
      data: channels,
    });
  } catch (err: any) {
    console.error('[ChatRouter] GET /channels error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Lỗi máy chủ khi lấy danh sách kênh',
    });
  }
});

/**
 * POST /api/chat/channels
 * Create a new channel (public, private, dm, group_dm)
 */
chatRouter.post('/channels', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const orgId = req.workspace!.orgId;
    const { name, type, topic, spaceId, memberIds } = req.body;

    if (!name || typeof name !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Tên kênh là bắt buộc',
      });
      return;
    }

    const created = await ChatService.getInstance().createChannel(userId, orgId, {
      name,
      type,
      topic,
      spaceId,
      memberIds,
    });

    res.status(201).json({
      success: true,
      data: created,
    });
  } catch (err: any) {
    console.error('[ChatRouter] POST /channels error:', err);
    res.status(400).json({
      success: false,
      error: err.message || 'Lỗi khi tạo kênh',
    });
  }
});

/**
 * POST /api/chat/dm
 * Get or create a 1:1 Direct Message channel
 */
chatRouter.post('/dm', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const orgId = req.workspace!.orgId;
    const { targetUserId } = req.body;

    if (!targetUserId || typeof targetUserId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'targetUserId là bắt buộc',
      });
      return;
    }

    const dmChannel = await ChatService.getInstance().getOrCreateDMChannel(userId, orgId, targetUserId);

    res.json({
      success: true,
      data: dmChannel,
    });
  } catch (err: any) {
    console.error('[ChatRouter] POST /dm error:', err);
    res.status(400).json({
      success: false,
      error: err.message || 'Lỗi khi tạo hoặc mở kênh DM',
    });
  }
});

/**
 * GET /api/chat/channels/:channelId/messages
 * Get paginated messages in a channel
 */
chatRouter.get('/channels/:channelId/messages', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const orgId = req.workspace!.orgId;
    const { channelId } = req.params;

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const beforeSeq = req.query.beforeSeq ? parseInt(req.query.beforeSeq as string, 10) : undefined;

    const result = await ChatService.getInstance().getMessages(userId, orgId, channelId, {
      limit,
      beforeSeq,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    if (err.message && err.message.includes('Truy cập bị từ chối')) {
      res.status(403).json({
        success: false,
        error: err.message,
      });
      return;
    }
    console.error('[ChatRouter] GET /channels/:channelId/messages error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Lỗi khi tải tin nhắn',
    });
  }
});

/**
 * POST /api/chat/channels/:channelId/messages
 * Send a message to a channel (REST fallback / webhook)
 */
chatRouter.post('/channels/:channelId/messages', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const orgId = req.workspace!.orgId;
    const { channelId } = req.params;
    const { content, type, senderName, senderColor, senderRole } = req.body;

    if (!content || typeof content !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Nội dung tin nhắn là bắt buộc',
      });
      return;
    }

    const created = await ChatService.getInstance().sendMessage(userId, orgId, channelId, {
      content,
      type,
      senderName,
      senderColor,
      senderRole,
    });

    // Broadcast over WebSocket to active channel subscribers
    ChatSocketManager.getInstance().broadcastToChannel(channelId, {
      type: 'chat:message_received',
      channelId,
      data: created,
    });

    res.status(201).json({
      success: true,
      data: created,
    });
  } catch (err: any) {
    if (err.message && err.message.includes('Truy cập bị từ chối')) {
      res.status(403).json({
        success: false,
        error: err.message,
      });
      return;
    }
    console.error('[ChatRouter] POST /channels/:channelId/messages error:', err);
    res.status(400).json({
      success: false,
      error: err.message || 'Lỗi khi gửi tin nhắn',
    });
  }
});

/**
 * GET /api/chat/messages/:messageId/thread
 * Get replies for a thread
 */
chatRouter.get('/messages/:messageId/thread', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const orgId = req.workspace!.orgId;
    const { messageId } = req.params;

    const replies = await ChatService.getInstance().getThreadReplies(userId, orgId, messageId);

    res.json({
      success: true,
      data: replies,
    });
  } catch (err: any) {
    if (err.message && err.message.includes('Truy cập bị từ chối')) {
      res.status(403).json({
        success: false,
        error: err.message,
      });
      return;
    }
    console.error('[ChatRouter] GET /messages/:messageId/thread error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Lỗi khi tải phản hồi chủ đề',
    });
  }
});

/**
 * POST /api/chat/messages/:messageId/thread
 * Reply to a thread (REST fallback)
 */
chatRouter.post('/messages/:messageId/thread', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const orgId = req.workspace!.orgId;
    const { messageId } = req.params;
    const { content, type, channelId } = req.body;

    if (!content || typeof content !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Nội dung phản hồi là bắt buộc',
      });
      return;
    }

    if (!channelId || typeof channelId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'channelId là bắt buộc',
      });
      return;
    }

    const created = await ChatService.getInstance().sendMessage(userId, orgId, channelId, {
      content,
      type,
      parentId: messageId,
    });

    ChatSocketManager.getInstance().broadcastToChannel(channelId, {
      type: 'chat:thread_reply_received',
      channelId,
      parentMessageId: messageId,
      data: created,
    });

    res.status(201).json({
      success: true,
      data: created,
    });
  } catch (err: any) {
    if (err.message && err.message.includes('Truy cập bị từ chối')) {
      res.status(403).json({
        success: false,
        error: err.message,
      });
      return;
    }
    console.error('[ChatRouter] POST /messages/:messageId/thread error:', err);
    res.status(400).json({
      success: false,
      error: err.message || 'Lỗi khi gửi phản hồi chủ đề',
    });
  }
});

/**
 * POST /api/chat/messages/:messageId/reactions
 * Toggle emoji reaction on a message
 */
chatRouter.post('/messages/:messageId/reactions', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const orgId = req.workspace!.orgId;
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji || typeof emoji !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Emoji là bắt buộc',
      });
      return;
    }

    const result = await ChatService.getInstance().toggleReaction(userId, orgId, messageId, emoji);

    ChatSocketManager.getInstance().broadcastToChannel(result.channelId, {
      type: 'chat:reaction_updated',
      channelId: result.channelId,
      messageId,
      data: { reactions: result.reactions },
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    if (err.message && err.message.includes('Truy cập bị từ chối')) {
      res.status(403).json({
        success: false,
        error: err.message,
      });
      return;
    }
    console.error('[ChatRouter] POST /messages/:messageId/reactions error:', err);
    res.status(400).json({
      success: false,
      error: err.message || 'Lỗi khi cập nhật biểu cảm',
    });
  }
});

/**
 * GET /api/chat/presence
 * Get online user IDs in workspace
 */
chatRouter.get('/presence', async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.workspace!.orgId;
    const onlineUserIds = ChatSocketManager.getInstance().getOnlineUserIds(orgId);

    res.json({
      success: true,
      data: {
        onlineUserIds,
      },
    });
  } catch (err: any) {
    console.error('[ChatRouter] GET /presence error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Lỗi khi lấy thông tin trạng thái trực tuyến',
    });
  }
});
