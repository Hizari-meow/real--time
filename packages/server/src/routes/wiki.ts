import { Router, Request, Response } from 'express';
import { authenticate, requireWorkspace, requireRole } from '../core/auth/AuthMiddleware.js';
import { WikiService } from '../core/wiki/WikiService.js';

export const wikiRouter = Router();
const wikiService = WikiService.getInstance();

wikiRouter.use(authenticate);
wikiRouter.use(requireWorkspace());

// GET /api/wiki - List pages with optional filters
wikiRouter.get('/', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const { areaId, type, status, tag, search, isArchived } = req.query;

    const pages = await wikiService.listPages(orgId, {
      areaId: areaId as string,
      type: type as string,
      status: status as string,
      tag: tag as string,
      search: search as string,
      isArchived: isArchived !== undefined ? isArchived === 'true' : undefined,
    });

    res.json({ success: true, count: pages.length, data: pages });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/wiki/tree - Get hierarchical tree for navigation
wikiRouter.get('/tree', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const tree = await wikiService.getTree(orgId);
    res.json({ success: true, data: tree });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/wiki/tags - Get tag cloud with usage counts
wikiRouter.get('/tags', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const tags = await wikiService.listTags(orgId);
    res.json({ success: true, data: tags });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/wiki - Create new wiki page
wikiRouter.post('/', requireRole(['owner', 'admin', 'member']), async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const { title, areaId, topic, type, status, tags, summary, content, icon, parentId, linkedDocId } = req.body;

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ success: false, error: 'Tiêu đề trang không được để trống' });
    }

    const page = await wikiService.createPage({
      orgId,
      title,
      areaId,
      topic,
      type,
      owner: req.user!.name,
      status,
      tags,
      summary,
      content: content || '',
      icon,
      parentId,
      linkedDocId,
    });

    res.status(201).json({ success: true, data: page });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/wiki/:id - Get page details
wikiRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const page = await wikiService.getPage(req.params.id, orgId);

    if (!page) {
      return res.status(404).json({ success: false, error: 'Trang không tồn tại' });
    }

    res.json({ success: true, data: page });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/wiki/:id - Update page
wikiRouter.put('/:id', requireRole(['owner', 'admin', 'member']), async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const updated = await wikiService.updatePage(req.params.id, orgId, req.body);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PATCH /api/wiki/:id/status - Update approval status (SOP workflow)
wikiRouter.patch('/:id/status', requireRole(['owner', 'admin', 'member']), async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const { status } = req.body;

    if (!['draft', 'pending_approval', 'approved'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Trạng thái không hợp lệ' });
    }

    // Approving SOP workflows requires Owner or Admin role
    if (status === 'approved' && !['owner', 'admin'].includes(req.workspace!.role)) {
      return res.status(403).json({ success: false, error: 'Chỉ Quản trị viên mới có quyền phê duyệt quy trình SOP' });
    }

    const updated = await wikiService.updateStatus(req.params.id, orgId, status, req.user!.name);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PATCH /api/wiki/:id/move - Move page in hierarchy
wikiRouter.patch('/:id/move', requireRole(['owner', 'admin', 'member']), async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const { parentId } = req.body;
    const updated = await wikiService.movePage(req.params.id, orgId, parentId || null);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/wiki/:id/backlinks - Get pages linking to this page
wikiRouter.get('/:id/backlinks', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const backlinks = await wikiService.getBacklinks(req.params.id, orgId);
    res.json({ success: true, data: backlinks });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/wiki/:id/archive - Archive / Unarchive page
wikiRouter.post('/:id/archive', requireRole(['owner', 'admin', 'member']), async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const { isArchived = true } = req.body;
    const updated = await wikiService.archivePage(req.params.id, orgId, isArchived);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/wiki/:id - Delete page
wikiRouter.delete('/:id', requireRole(['owner', 'admin']), async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    await wikiService.deletePage(req.params.id, orgId);
    res.json({ success: true, message: 'Đã xóa trang thành công' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
