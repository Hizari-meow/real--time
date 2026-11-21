import { Router, Request, Response } from 'express';
import { authenticate, requireWorkspace, requireRole } from '../core/auth/AuthMiddleware.js';
import { DocumentCommentService } from '../core/document/DocumentCommentService.js';

export const commentsRouter = Router();
const commentService = DocumentCommentService.getInstance();

commentsRouter.use(authenticate);
commentsRouter.use(requireWorkspace());

// GET /api/documents/:id/comments - List comments for document
commentsRouter.get('/:id/comments', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const documentId = req.params.id;
    const comments = await commentService.listComments(documentId, orgId);
    res.json({ success: true, count: comments.length, data: comments });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/documents/:id/comments - Create comment or reply
commentsRouter.post('/:id/comments', requireRole(['owner', 'admin', 'member']), async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const documentId = req.params.id;
    const { content, anchorJson, parentId } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ success: false, error: 'Nội dung bình luận không được để trống' });
    }

    const comment = await commentService.createComment({
      orgId,
      documentId,
      authorId: req.user!.userId,
      authorName: req.user!.name,
      content,
      anchorJson,
      parentId,
    });

    res.status(201).json({ success: true, data: comment });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/documents/comments/:commentId/resolve - Resolve or reopen comment
const handleResolve = async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const { resolved = true } = req.body;
    const updated = await commentService.resolveComment(req.params.commentId, orgId, Boolean(resolved));
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};
commentsRouter.patch('/comments/:commentId/resolve', requireRole(['owner', 'admin', 'member']), handleResolve);
commentsRouter.patch('/:id/comments/:commentId/resolve', requireRole(['owner', 'admin', 'member']), handleResolve);

// DELETE /api/documents/comments/:commentId - Delete comment
const handleDelete = async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    await commentService.deleteComment(req.params.commentId, orgId);
    res.json({ success: true, message: 'Đã xóa bình luận' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
commentsRouter.delete('/comments/:commentId', requireRole(['owner', 'admin', 'member']), handleDelete);
commentsRouter.delete('/:id/comments/:commentId', requireRole(['owner', 'admin', 'member']), handleDelete);
