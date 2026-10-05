import { Router, Request, Response } from 'express';
import { getPrismaClient } from '../storage/db.js';
import { authenticate, requireWorkspace, requireRole } from '../core/auth/AuthMiddleware.js';
import { publishDomainEvent } from '../core/events/event-system.js';

export const membersRouter = Router();
const prisma = getPrismaClient();

// All member endpoints require authentication and active workspace context
membersRouter.use(authenticate, requireWorkspace());

/**
 * GET /api/members - List members in current authenticated workspace
 */
membersRouter.get('/', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;

    const members = await prisma.member.findMany({
      where: { orgId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const formatted = members.map((m) => ({
      id: m.userId,
      memberId: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      status: m.status,
      twoFaEnabled: m.twofaEnabled,
      department: m.department,
      lastActive: m.lastActive,
      guestExpiresAt: m.guestExpiresAt?.toISOString(),
      createdAt: m.createdAt.toISOString(),
    }));

    return res.json({ success: true, data: formatted });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Lỗi khi tải danh sách thành viên' });
  }
});

/**
 * POST /api/members - Add/Invite member into current workspace (Owner/Admin only)
 */
membersRouter.post('/', requireRole(['owner', 'admin']), async (req: Request, res: Response) => {
  try {
    const { name, email, role = 'member', department = 'Chung' } = req.body;
    const orgId = req.workspace!.orgId;

    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Tên và email là bắt buộc' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // Check if member already in this workspace
    const existingMember = await prisma.member.findUnique({
      where: {
        orgId_email: {
          orgId,
          email: cleanEmail,
        },
      },
    });

    if (existingMember) {
      return res.status(409).json({ success: false, error: 'Thành viên đã tồn tại trong tổ chức' });
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          name: cleanName,
        },
      });
    }

    const newMember = await prisma.member.create({
      data: {
        orgId,
        userId: user.id,
        name: cleanName,
        email: cleanEmail,
        role,
        status: 'active',
        twofaEnabled: false,
        department,
        lastActive: 'Vừa được thêm',
        guestExpiresAt: role === 'guest' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        orgId,
        action: 'MEMBER_ADDED',
        actor: req.user!.email,
        target: `Member:${newMember.id}`,
        ip: req.ip || '127.0.0.1',
        status: 'SUCCESS',
        details: JSON.stringify({ email: cleanEmail, role, department }),
      },
    });

    // Emit domain event to EventBus & Transactional Outbox
    await publishDomainEvent({
      type: 'member.added',
      orgId,
      actor: { type: 'user', id: req.user!.userId, name: req.user!.name },
      resource: { type: 'member', id: newMember.id },
      data: {
        userId: user.id,
        memberId: newMember.id,
        name: cleanName,
        email: cleanEmail,
        role,
        orgName: req.workspace!.orgName,
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        id: user.id,
        memberId: newMember.id,
        name: newMember.name,
        email: newMember.email,
        role: newMember.role,
        status: newMember.status,
        twoFaEnabled: newMember.twofaEnabled,
        department: newMember.department,
        lastActive: newMember.lastActive,
        guestExpiresAt: newMember.guestExpiresAt?.toISOString(),
        createdAt: newMember.createdAt.toISOString(),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Lỗi thêm thành viên' });
  }
});

/**
 * PATCH /api/members/:id/role - Update member role (Owner/Admin only)
 */
membersRouter.patch('/:id/role', requireRole(['owner', 'admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Can be userId or memberId
    const { role } = req.body;
    const orgId = req.workspace!.orgId;

    if (!role || !['owner', 'admin', 'member', 'guest'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Vai trò không hợp lệ' });
    }

    // Find member by userId or memberId within current workspace
    const member = await prisma.member.findFirst({
      where: {
        orgId,
        OR: [{ id }, { userId: id }],
      },
    });

    if (!member) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy thành viên trong tổ chức này' });
    }

    // Prevent non-owners from promoting to owner or demoting owner
    if (member.role === 'owner' && req.workspace!.role !== 'owner') {
      return res.status(403).json({ success: false, error: 'Chỉ chủ sở hữu (Owner) mới có quyền chỉnh sửa tài khoản Owner khác' });
    }

    const updated = await prisma.member.update({
      where: { id: member.id },
      data: { role },
    });

    await prisma.auditLog.create({
      data: {
        orgId,
        action: 'ROLE_CHANGED',
        actor: req.user!.email,
        target: `Member:${member.id}`,
        ip: req.ip || '127.0.0.1',
        status: 'SUCCESS',
        details: JSON.stringify({ oldRole: member.role, newRole: role }),
      },
    });

    return res.json({
      success: true,
      data: {
        id: updated.userId,
        memberId: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        status: updated.status,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Lỗi cập nhật vai trò thành viên' });
  }
});

/**
 * DELETE /api/members/:id - Remove member from workspace (Owner/Admin only)
 */
membersRouter.delete('/:id', requireRole(['owner', 'admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.workspace!.orgId;

    const member = await prisma.member.findFirst({
      where: {
        orgId,
        OR: [{ id }, { userId: id }],
      },
    });

    if (!member) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy thành viên trong tổ chức này' });
    }

    if (member.userId === req.user!.userId) {
      return res.status(400).json({ success: false, error: 'Không thể tự xóa chính mình khỏi tổ chức' });
    }

    if (member.role === 'owner' && req.workspace!.role !== 'owner') {
      return res.status(403).json({ success: false, error: 'Chỉ Owner mới có quyền xóa tài khoản Owner' });
    }

    await prisma.member.delete({
      where: { id: member.id },
    });

    await prisma.auditLog.create({
      data: {
        orgId,
        action: 'MEMBER_REMOVED',
        actor: req.user!.email,
        target: `Member:${member.id}`,
        ip: req.ip || '127.0.0.1',
        status: 'SUCCESS',
        details: JSON.stringify({ email: member.email, role: member.role }),
      },
    });

    return res.json({
      success: true,
      data: {
        id: member.userId,
        memberId: member.id,
        name: member.name,
        email: member.email,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Lỗi khi xóa thành viên' });
  }
});
