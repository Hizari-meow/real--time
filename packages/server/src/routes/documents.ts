import { Router, Request, Response } from 'express';
import { getPrismaClient } from '../storage/db.js';

export const documentsRouter = Router();
const prisma = getPrismaClient();

// List documents
documentsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const rawDocs = await prisma.document.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { snapshots: true, history: true },
        },
      },
    });

    // Exclude internal chat and kanban sync rooms from documents listing
    const filtered = rawDocs.filter((d: any) => 
      !d.id.startsWith('zalo_room_') && 
      !d.id.startsWith('workspace_kanban_')
    );

    // Friendly title resolution map
    const TITLE_MAP: Record<string, string> = {
      'doc_rfc_consensus': 'Báo Cáo Kiến Trúc Đồng Thuận Phân Tán CRDT v4',
      'doc_sop_01': 'Quy Trình Vận Hành Tiêu Chuẩn Hệ Thống (SOP-01)',
      'doc_roadmap_2026': 'Lộ Trình Phát Triển Tính Năng & Kiến Trúc 2026',
      'sheet_fin_q4': 'Bảng Tính Dự Báo Tài Chính & Doanh Thu Q4-2026',
      'sheet_budget_2027': 'Bảng Kế Hoạch Ngân Sách Dự Án Năm 2027',
      'sheet_kpi_metrics': 'Bảng Theo Dõi KPI & Hiệu Suất Kỹ Thuật Cluster',
      'mockup_ui_canvas': 'Bản Vẽ Thiết Kế UI Workspace & Slide Trang Chủ',
      'workspace_whiteboard_mockup_ui_canvas': 'Bản Vẽ Thiết Kế UI Workspace & Slide Trang Chủ',
      'workspace_whiteboard_canvas_v3': 'Bảng Trắng Brainstorm Sơ Đồ Hệ Thống',
      'open_brainstorm': 'Bảng Trắng Brainstorm Sơ Đồ Hệ Thống',
      'wireframe': 'Khung Giao Diện Web & Mobile App (Wireframe)',
    };

    const docs = filtered.map((d: any) => ({
      ...d,
      title: TITLE_MAP[d.id] || (d.title.startsWith('Document ') ? (TITLE_MAP[d.id] || d.title) : d.title),
    }));

    res.json({ success: true, data: docs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create new document
documentsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { title = 'Untitled Document', userId } = req.body;

    let ownerId = userId;
    if (!ownerId) {
      const defaultUser = await prisma.user.upsert({
        where: { email: 'author@collab.local' },
        update: {},
        create: {
          email: 'author@collab.local',
          name: 'Demo Author',
        },
      });
      ownerId = defaultUser.id;
    }

    const newDoc = await prisma.document.create({
      data: {
        title,
        ownerId,
        currentVersion: 1,
      },
    });

    res.status(201).json({ success: true, data: newDoc });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get document details
documentsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    res.json({ success: true, data: doc });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get document version history
documentsRouter.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const history = await prisma.documentHistory.findMany({
      where: { documentId: req.params.id },
      orderBy: { version: 'desc' },
      include: {
        author: { select: { id: true, name: true, email: true } },
        snapshot: {
          select: {
            id: true,
            s3Key: true,
            byteSize: true,
            checksum: true,
            mutationCount: true,
            createdAt: true,
          },
        },
      },
    });

    res.json({ success: true, data: history });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update document title
documentsRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ success: false, error: 'Title string is required' });
    }

    const updated = await prisma.document.update({
      where: { id: req.params.id },
      data: { title: title.trim(), updatedAt: new Date() },
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete document
documentsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.document.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
