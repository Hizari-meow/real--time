import { Router, Request, Response } from 'express';
import { getPrismaClient } from '../storage/db.js';
import { authenticate, requireWorkspace } from '../core/auth/AuthMiddleware.js';

export const auditRouter = Router();
const prisma = getPrismaClient();

// Protected audit route
auditRouter.use(authenticate, requireWorkspace());

/**
 * GET /api/audit - List audit logs for current authenticated workspace
 */
auditRouter.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const orgId = req.workspace!.orgId;

    const logs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { orgId },
          { orgId: null }, // Global system logs
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const formatted = logs.map((l) => ({
      id: l.id,
      action: l.action,
      actor: l.actor,
      target: l.target,
      ip: l.ip,
      status: l.status,
      timestamp: l.createdAt.toISOString(),
      details: l.details ? safeParseJSON(l.details) : undefined,
    }));

    return res.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Lỗi khi đọc nhật ký kiểm toán' });
  }
});

/**
 * POST /api/audit - Record security audit log entry
 */
auditRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { action, target = 'System', status = 'SUCCESS', details, ip } = req.body;
    if (!action) {
      return res.status(400).json({ success: false, error: 'Tên hành động (action) là bắt buộc' });
    }

    const orgId = req.workspace!.orgId;
    const clientIp = ip || req.ip || req.socket.remoteAddress || '127.0.0.1';
    const actor = req.user!.email;

    const newLog = await prisma.auditLog.create({
      data: {
        orgId,
        action,
        actor,
        target,
        ip: String(clientIp),
        status,
        details: typeof details === 'object' ? JSON.stringify(details) : details,
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        id: newLog.id,
        action: newLog.action,
        actor: newLog.actor,
        target: newLog.target,
        ip: newLog.ip,
        status: newLog.status,
        timestamp: newLog.createdAt.toISOString(),
        details,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Lỗi khi ghi nhật ký kiểm toán' });
  }
});

function safeParseJSON(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}
