import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config.js';
import { getPrismaClient } from '../../storage/db.js';
import { AuthenticatedUser, WorkspaceContext } from './types.js';

// Extend Express Request interface with real authenticated user & workspace context
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      workspace?: WorkspaceContext;
    }
  }
}

const prisma = getPrismaClient();

/**
 * Middleware: Verify JWT Access Token from Header or HttpOnly Cookie
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    // 1. Check Authorization Bearer header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    // 2. Check cookie if available
    if (!token && req.cookies && req.cookies.collab_access_token) {
      token = req.cookies.collab_access_token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Yêu cầu xác thực: Vui lòng đăng nhập để tiếp tục',
      });
    }

    const decoded = jwt.verify(token, config.jwt.secret) as {
      userId: string;
      email: string;
      name: string;
    };

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
    };

    return next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Phiên làm việc đã hết hạn. Vui lòng làm mới token hoặc đăng nhập lại',
        code: 'TOKEN_EXPIRED',
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Token xác thực không hợp lệ',
      code: 'INVALID_TOKEN',
    });
  }
}

/**
 * Middleware: Optional authenticate (does not block if no token, but populates req.user if valid)
 */
export async function optionalAuthenticate(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.cookies && req.cookies.collab_access_token) {
      token = req.cookies.collab_access_token;
    }

    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret) as {
        userId: string;
        email: string;
        name: string;
      };
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        name: decoded.name,
      };
    }
  } catch {
    // Ignore invalid token in optional auth
  }
  return next();
}

/**
 * Middleware: Enforce Workspace Isolation
 * Guarantees that the authenticated user actually belongs to the target workspace!
 * If user A is in Workspace A, they CANNOT read or manipulate Workspace B data.
 */
export function requireWorkspace(targetOrgParam?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Yêu cầu xác thực trước khi kiểm tra không gian làm việc',
      });
    }

    // Resolve target workspace ID
    let requestedOrgId: string | undefined =
      (targetOrgParam && req.params[targetOrgParam]) ||
      (req.headers['x-workspace-id'] as string) ||
      (req.headers['x-org-id'] as string) ||
      (req.query.workspaceId as string) ||
      (req.query.orgId as string) ||
      req.body?.workspaceId ||
      req.body?.orgId;

    if (!requestedOrgId) {
      // Default to the first active workspace membership of this user
      const defaultMember = await prisma.member.findFirst({
        where: { userId: req.user.userId, status: 'active' },
        include: { org: true },
        orderBy: { createdAt: 'asc' },
      });

      if (!defaultMember) {
        return res.status(403).json({
          success: false,
          error: 'Tài khoản chưa được thêm vào bất kỳ không gian làm việc nào',
        });
      }

      req.workspace = {
        orgId: defaultMember.orgId,
        orgName: defaultMember.org.name,
        role: defaultMember.role as any,
        status: defaultMember.status as any,
      };
      return next();
    }

    // Validate that the authenticated user is an ACTIVE member of this requested workspace!
    const member = await prisma.member.findUnique({
      where: {
        orgId_userId: {
          orgId: requestedOrgId,
          userId: req.user.userId,
        },
      },
      include: {
        org: true,
      },
    });

    if (!member || member.status !== 'active') {
      // Security audit log for access denial
      await prisma.auditLog.create({
        data: {
          orgId: requestedOrgId,
          action: 'WORKSPACE_ACCESS_DENIED',
          actor: req.user.email,
          target: `Workspace:${requestedOrgId}`,
          ip: req.ip || '127.0.0.1',
          status: 'ERROR',
          details: `User ${req.user.userId} attempted unauthorized access to workspace ${requestedOrgId}`,
        },
      });

      return res.status(403).json({
        success: false,
        error: 'Truy cập bị từ chối: Bạn không phải thành viên của không gian làm việc này',
      });
    }

    // Check guest expiration
    if (member.role === 'guest' && member.guestExpiresAt && member.guestExpiresAt < new Date()) {
      return res.status(403).json({
        success: false,
        error: 'Tài khoản khách đã hết hạn truy cập vào không gian làm việc này',
      });
    }

    req.workspace = {
      orgId: member.orgId,
      orgName: member.org.name,
      role: member.role as any,
      status: member.status as any,
    };

    return next();
  };
}

/**
 * Middleware: Enforce Role-Based Access Control (RBAC)
 */
export function requireRole(allowedRoles: ('owner' | 'admin' | 'member' | 'guest')[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.workspace) {
      return res.status(500).json({
        success: false,
        error: 'Lỗi cấu hình middleware: requireRole phải chạy sau requireWorkspace',
      });
    }

    if (!allowedRoles.includes(req.workspace.role)) {
      await prisma.auditLog.create({
        data: {
          orgId: req.workspace.orgId,
          action: 'ROLE_PERMISSION_DENIED',
          actor: req.user?.email || 'Unknown',
          target: `Role:${req.workspace.role}`,
          ip: req.ip || '127.0.0.1',
          status: 'ERROR',
          details: `Hành động yêu cầu quyền [${allowedRoles.join(', ')}], vai trò hiện tại là '${req.workspace.role}'`,
        },
      });

      return res.status(403).json({
        success: false,
        error: `Truy cập bị từ chối: Thao tác này yêu cầu quyền [${allowedRoles.join(', ')}]`,
      });
    }

    return next();
  };
}
