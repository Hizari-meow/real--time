import { Router, Request, Response } from 'express';
import { authenticate, requireWorkspace, requireRole } from '../core/auth/AuthMiddleware.js';
import { FolderService } from '../core/files/FolderService.js';

export const foldersRouter = Router();
const folderService = FolderService.getInstance();

foldersRouter.use(authenticate);
foldersRouter.use(requireWorkspace());

// GET /api/folders/stats - Storage quota and workspace statistics
foldersRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const stats = await folderService.getWorkspaceStats(orgId);
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/folders - List folders in workspace
foldersRouter.get('/', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const folders = await folderService.listFolders(orgId);
    res.json({ success: true, count: folders.length, data: folders });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/folders - Create folder
foldersRouter.post('/', requireRole(['owner', 'admin', 'member']), async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const { name, category, color, parentId } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ success: false, error: 'Tên thư mục không được để trống' });
    }

    const folder = await folderService.createFolder({
      orgId,
      name,
      category,
      color,
      parentId,
      ownerId: req.user!.userId,
      ownerName: req.user!.name,
    });

    res.status(201).json({ success: true, data: folder });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/folders/:id - Rename folder or update color
foldersRouter.patch('/:id', requireRole(['owner', 'admin', 'member']), async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const { name, color } = req.body;

    if (!name && !color) {
      return res.status(400).json({ success: false, error: 'Cần cung cấp tên hoặc màu mới' });
    }

    const updated = await folderService.renameFolder(req.params.id, orgId, name || '', color);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/folders/:id - Delete folder
foldersRouter.delete('/:id', requireRole(['owner', 'admin', 'member']), async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    await folderService.deleteFolder(req.params.id, orgId);
    res.json({ success: true, message: 'Đã xóa thư mục' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
