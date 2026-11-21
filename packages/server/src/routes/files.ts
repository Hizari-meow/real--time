import { Router, Request, Response } from 'express';
import busboy from 'busboy';
import { authenticate, optionalAuthenticate, requireWorkspace, requireRole } from '../core/auth/AuthMiddleware.js';
import { FileService } from '../core/files/FileService.js';
import { FileStreamService } from '../core/files/FileStreamService.js';
import { StorageQuotaService } from '../core/files/StorageQuotaService.js';
import { OrphanStorageReaper } from '../core/files/OrphanStorageReaper.js';
import { DocumentCommentService } from '../core/document/DocumentCommentService.js';

export const filesRouter = Router();
const fileService = FileService.getInstance();

// Public share link endpoints (must be defined before /:id routes)
filesRouter.get('/shared/:token', optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const password = req.query.password as string | undefined;
    const context = {
      userId: req.user?.userId,
      orgId: (req.headers['x-workspace-id'] as string) || req.workspace?.orgId,
    };
    const result = await fileService.getSharedFile(req.params.token, password, context);
    if (result.requiresPassword) {
      return res.status(401).json({
        success: false,
        requiresPassword: true,
        fileName: result.fileName,
        category: result.category,
      });
    }
    res.json({ success: true, data: result.file });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

filesRouter.post('/shared/:token', optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const { password } = req.body || {};
    const context = {
      userId: req.user?.userId,
      orgId: (req.headers['x-workspace-id'] as string) || req.workspace?.orgId,
    };
    const result = await fileService.getSharedFile(req.params.token, password, context);
    if (result.requiresPassword) {
      return res.status(401).json({
        success: false,
        requiresPassword: true,
        fileName: result.fileName,
        category: result.category,
      });
    }
    res.json({ success: true, data: result.file });
  } catch (err: any) {
    res.status(401).json({ success: false, error: err.message });
  }
});

filesRouter.get('/shared/:token/download', optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const password = req.query.password as string | undefined;
    const context = {
      userId: req.user?.userId,
      orgId: req.workspace?.orgId,
    };
    const result = await fileService.getSharedFile(req.params.token, password, context);

    if (result.requiresPassword) {
      return res.status(403).json({ success: false, error: 'Yêu cầu mật khẩu để tải tệp' });
    }
    if (!result.allowDownload) {
      return res.status(403).json({ success: false, error: 'Người chia sẻ đã vô hiệu hóa quyền tải xuống' });
    }

    const download = await fileService.downloadFile(result.rawFileId, result.rawOrgId);
    res.setHeader('Content-Type', download.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(download.name)}"`);
    res.send(download.data);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

filesRouter.patch('/shared/:token', optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const password = req.query.password as string || req.body?.password as string;
    const context = {
      userId: req.user?.userId,
      orgId: (req.headers['x-workspace-id'] as string) || req.workspace?.orgId,
    };
    const result = await fileService.getSharedFile(req.params.token, password, context);

    if (result.requiresPassword || !result.rawFileId || !result.rawOrgId) {
      return res.status(401).json({ success: false, error: 'Yêu cầu mật khẩu để cập nhật tệp' });
    }

    // Granular permission check: only 'editor' can modify shared file metadata
    if (result.permission !== 'editor') {
      return res.status(403).json({
        success: false,
        error: `Bạn chỉ có quyền xem (${result.permission}). Không được phép chỉnh sửa tệp này.`,
      });
    }

    const { name, folderId, isStarred } = req.body;
    if (name) await fileService.renameFile(result.rawFileId, result.rawOrgId, name);
    if (folderId) await fileService.moveFile(result.rawFileId, result.rawOrgId, folderId);
    if (isStarred !== undefined) await fileService.toggleStar(result.rawFileId, result.rawOrgId, Boolean(isStarred));

    const updated = await fileService.getFile(result.rawFileId, result.rawOrgId);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/files/shared/:token/comments - View threaded comments for shared file
filesRouter.get('/shared/:token/comments', optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const password = (req.query.password as string) || (req.headers['x-share-password'] as string);
    const context = {
      userId: req.user?.userId,
      orgId: (req.headers['x-workspace-id'] as string) || req.workspace?.orgId,
    };
    const result = await fileService.getSharedFile(req.params.token, password, context);

    if (result.requiresPassword || !result.rawFileId || !result.rawOrgId) {
      return res.status(401).json({ success: false, error: 'Yêu cầu mật khẩu để xem bình luận tệp' });
    }

    const comments = await DocumentCommentService.getInstance().listComments(result.rawFileId, result.rawOrgId);
    res.json({ success: true, count: comments.length, data: comments });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/files/shared/:token/comments - Post comment to shared file (enforces commenter or editor permission)
filesRouter.post('/shared/:token/comments', optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const password = (req.query.password as string) || (req.body?.password as string) || (req.headers['x-share-password'] as string);
    const context = {
      userId: req.user?.userId,
      orgId: (req.headers['x-workspace-id'] as string) || req.workspace?.orgId,
    };
    const result = await fileService.getSharedFile(req.params.token, password, context);

    if (result.requiresPassword || !result.rawFileId || !result.rawOrgId) {
      return res.status(401).json({ success: false, error: 'Yêu cầu mật khẩu để gửi bình luận tệp' });
    }

    // Role enforcement: viewer cannot post comments! Only commenter and editor can comment.
    if (result.permission !== 'commenter' && result.permission !== 'editor') {
      return res.status(403).json({
        success: false,
        error: `Bạn chỉ có quyền xem (${result.permission}). Không được phép bình luận tệp này.`,
      });
    }

    const { content, parentId, authorName } = req.body || {};
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Nội dung bình luận không được để trống' });
    }

    // Controlled identity: workspace member if authenticated; controlled guest identity otherwise
    let finalAuthorId: string;
    let finalAuthorName: string;

    if (req.user?.userId) {
      finalAuthorId = req.user.userId;
      finalAuthorName = req.user.name || 'Thành viên';
    } else {
      const cleanGuestName = (authorName && typeof authorName === 'string' ? authorName.trim().slice(0, 50) : '') || 'Khách truy cập';
      finalAuthorId = `guest_${req.params.token.slice(0, 8)}`;
      finalAuthorName = `${cleanGuestName} (${req.params.token.slice(0, 6)})`;
    }

    const comment = await DocumentCommentService.getInstance().createComment({
      orgId: result.rawOrgId,
      documentId: result.rawFileId,
      authorId: finalAuthorId,
      authorName: finalAuthorName,
      content: content.trim(),
      parentId: parentId || null,
    });

    res.status(201).json({ success: true, data: comment });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});


// Authenticated endpoints below
filesRouter.use(authenticate);
filesRouter.use(requireWorkspace());

// GET /api/files - List files in workspace
filesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const { folderId, category, isStarred, isDeleted, search, sortBy } = req.query;

    const files = await fileService.listFiles(orgId, {
      folderId: folderId as string,
      category: category as string,
      isStarred: isStarred !== undefined ? isStarred === 'true' : undefined,
      isDeleted: isDeleted !== undefined ? isDeleted === 'true' : undefined,
      search: search as string,
      sortBy: sortBy as any,
    });

    res.json({ success: true, count: files.length, data: files });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/files/upload/:uploadId/heartbeat - Renew reservation lease during active upload
filesRouter.post('/upload/:uploadId/heartbeat', requireRole(['owner', 'admin', 'member']), async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const uploadId = req.params.uploadId;
    const newExpiresAt = await StorageQuotaService.getInstance().heartbeatReservation(uploadId, orgId);
    res.json({ success: true, uploadId, expiresAt: newExpiresAt.toISOString() });
  } catch (err: any) {
    const isNotFound = err.message && (err.message.includes('Không tìm thấy') || err.message.includes('sai tổ chức'));
    res.status(isNotFound ? 404 : 400).json({ success: false, error: err.message });
  }
});

// POST /api/files/admin/reconcile-orphans - Reconcile MinIO S3 orphans against PostgreSQL
filesRouter.post('/admin/reconcile-orphans', requireRole(['owner', 'admin']), async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const { minAgeMinutes, dryRun } = req.body || {};
    const metrics = await OrphanStorageReaper.getInstance().reconcileOrphans({
      orgId,
      minAgeMinutes: minAgeMinutes !== undefined ? parseInt(minAgeMinutes, 10) : undefined,
      dryRun: Boolean(dryRun),
    });
    res.json({ success: true, data: metrics });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/files/upload - Upload file to MinIO S3 & save record (Supports multipart stream & JSON fallback)
filesRouter.post('/upload', requireRole(['owner', 'admin', 'member']), async (req: Request, res: Response) => {
  const orgId = req.workspace!.orgId;

  // 1. Streaming Multipart Binary Upload
  if (req.is('multipart/form-data')) {
    const bb = busboy({ headers: req.headers, limits: { fileSize: 50 * 1024 * 1024 } });
    const fields: Record<string, string> = {};
    let uploadPromise: Promise<any> | null = null;
    let fileFound = false;

    const contentLength = req.headers['content-length'] ? parseInt(req.headers['content-length'] as string, 10) : undefined;

    bb.on('field', (name, val) => {
      fields[name] = val;
    });

    bb.on('file', (fieldname, fileStream, info) => {
      fileFound = true;
      const fileName = fields.name || info.filename || 'uploaded_file';
      const mimeType = info.mimeType || 'application/octet-stream';

      uploadPromise = FileStreamService.getInstance().uploadStream({
        orgId,
        name: fileName,
        fileStream,
        mimeType,
        category: fields.category || 'other',
        folderId: fields.folderId || null,
        ownerId: req.user!.userId,
        ownerName: req.user!.name,
        estimatedBytes: contentLength,
      });
    });

    bb.on('close', async () => {
      try {
        if (!fileFound || !uploadPromise) {
          return res.status(400).json({ success: false, error: 'Không tìm thấy tệp tải lên trong form multipart' });
        }
        const file = await uploadPromise;
        res.status(201).json({ success: true, data: file });
      } catch (err: any) {
        const isQuota = err.statusCode === 413 || (err.message && (err.message.includes('vượt quá giới hạn') || err.message.toLowerCase().includes('quota')));
        res.status(isQuota ? 413 : 500).json({ success: false, error: err.message });
      }
    });

    bb.on('error', (err: any) => {
      res.status(400).json({ success: false, error: `Lỗi xử lý multipart stream: ${err.message}` });
    });

    return req.pipe(bb);
  }

  // 2. JSON Base64 fallback (for backwards compatibility)
  try {
    const { name, contentBase64, mimeType, category, folderId } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ success: false, error: 'Tên tệp không được để trống' });
    }

    const file = await fileService.uploadFile({
      orgId,
      name,
      contentBase64,
      mimeType,
      category,
      folderId,
      ownerId: req.user!.userId,
      ownerName: req.user!.name,
    });

    res.status(201).json({ success: true, data: file });
  } catch (err: any) {
    const isQuota = err.statusCode === 413 || (err.message && (err.message.includes('vượt quá giới hạn') || err.message.toLowerCase().includes('quota')));
    res.status(isQuota ? 413 : 500).json({ success: false, error: err.message });
  }
});

// GET /api/files/:id - Get file details
filesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const file = await fileService.getFile(req.params.id, orgId);

    if (!file) {
      return res.status(404).json({ success: false, error: 'Tệp không tồn tại' });
    }

    res.json({ success: true, data: file });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/files/:id/preview - Get file preview
filesRouter.get('/:id/preview', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const preview = await fileService.getPreview(req.params.id, orgId);
    res.json({ success: true, data: preview });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// GET /api/files/:id/download - Stream binary download
filesRouter.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const download = await fileService.downloadFile(req.params.id, orgId);

    res.setHeader('Content-Type', download.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(download.name)}"`);
    res.send(download.data);
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// PATCH /api/files/:id - Rename, move or star file
filesRouter.patch('/:id', requireRole(['owner', 'admin', 'member']), async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const fileId = req.params.id;
    const { name, folderId, isStarred } = req.body;

    if (name !== undefined) {
      await fileService.renameFile(fileId, orgId, name);
    }
    if (folderId !== undefined) {
      await fileService.moveFile(fileId, orgId, folderId);
    }
    if (isStarred !== undefined) {
      await fileService.toggleStar(fileId, orgId, Boolean(isStarred));
    }

    const updated = await fileService.getFile(fileId, orgId);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/files/:id/trash - Move file to trash
filesRouter.post('/:id/trash', requireRole(['owner', 'admin', 'member']), async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    await fileService.moveToTrash(req.params.id, orgId);
    res.json({ success: true, message: 'Đã chuyển tệp vào thùng rác' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/files/:id/restore - Restore file from trash
filesRouter.post('/:id/restore', requireRole(['owner', 'admin', 'member']), async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const restored = await fileService.restoreFromTrash(req.params.id, orgId);
    res.json({ success: true, data: restored });
  } catch (err: any) {
    const isQuota = err.statusCode === 413 || (err.message && (err.message.includes('vượt quá') || err.message.toLowerCase().includes('quota')));
    res.status(isQuota ? 413 : 500).json({ success: false, error: err.message });
  }
});

// DELETE /api/files/:id/purge - Permanent delete
filesRouter.delete('/:id/purge', requireRole(['owner', 'admin']), async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    await fileService.permanentDelete(req.params.id, orgId);
    res.json({ success: true, message: 'Đã xóa vĩnh viễn tệp' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/files/:id/versions - Upload new version
filesRouter.post('/:id/versions', requireRole(['owner', 'admin', 'member']), async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const { contentBase64, mimeType = 'application/octet-stream', changeSummary } = req.body;

    if (!contentBase64) {
      return res.status(400).json({ success: false, error: 'Dữ liệu nội dung phiên bản không được để trống' });
    }

    const buffer = Buffer.from(contentBase64, 'base64');
    const updated = await fileService.addFileVersion(
      req.params.id,
      orgId,
      buffer,
      mimeType,
      req.user!.name,
      changeSummary
    );

    res.status(201).json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/files/:id/versions/:version/revert - Revert to past version
filesRouter.post('/:id/versions/:version/revert', requireRole(['owner', 'admin', 'member']), async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const ver = parseInt(req.params.version, 10);
    const updated = await fileService.revertFileVersion(req.params.id, orgId, ver);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/files/:id/share - Update share settings
filesRouter.post('/:id/share', requireRole(['owner', 'admin', 'member']), async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const { linkAccess, permission, allowDownload, password, expiresAt } = req.body;

    const share = await fileService.updateShareSettings(req.params.id, orgId, {
      linkAccess: linkAccess || 'organization',
      permission: permission || 'viewer',
      allowDownload: allowDownload !== false,
      password,
      expiresAt,
    });

    res.json({ success: true, data: share });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
