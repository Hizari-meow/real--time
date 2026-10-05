import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { config } from '../../config.js';
import { getPrismaClient } from '../../storage/db.js';
import {
  AuthenticatedUser,
  AuthResponse,
  TokenPair,
  WorkspaceSummary,
} from './types.js';

export interface RegisterDTO {
  email: string;
  password: string;
  name: string;
  orgName?: string;
  ip?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
  ip?: string;
}

export class AuthService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || getPrismaClient();
  }

  /**
   * Helper: Generate access & refresh tokens and persist refresh token in PostgreSQL
   */
  private async issueTokens(user: { id: string; email: string; name: string }): Promise<TokenPair> {
    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as any,
    });

    const refreshToken = jwt.sign(
      { userId: user.id, jti: crypto.randomUUID() },
      config.jwt.refreshSecret,
      {
        expiresIn: config.jwt.refreshExpiresIn as any,
      }
    );

    // 7 days expiration for refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
        revoked: false,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: config.jwt.expiresIn,
    };
  }

  /**
   * Helper: Fetch workspaces/memberships for a user
   */
  private async getUserWorkspaces(userId: string): Promise<WorkspaceSummary[]> {
    const memberships = await this.prisma.member.findMany({
      where: {
        userId,
        status: 'active',
      },
      include: {
        org: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => ({
      orgId: m.orgId,
      orgName: m.org.name,
      slug: m.org.slug,
      role: m.role,
    }));
  }

  /**
   * Register a new user with real PostgreSQL persistence and password hashing
   */
  async register(data: RegisterDTO): Promise<AuthResponse> {
    const email = data.email.trim().toLowerCase();
    const name = data.name.trim();

    if (!email || !data.password || !name) {
      throw { status: 400, message: 'Vui lòng cung cấp đầy đủ email, mật khẩu và họ tên' };
    }

    if (data.password.length < 8) {
      throw { status: 400, message: 'Mật khẩu phải có độ dài tối thiểu 8 ký tự' };
    }

    // Check duplicate email
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw { status: 409, message: 'Email đã được đăng ký trên hệ thống' };
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create user in DB
    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
      },
    });

    // Determine or create Workspace
    let targetOrgId: string;
    let assignedRole = 'member';

    if (data.orgName && data.orgName.trim().length > 0) {
      // User creates their own workspace as Owner
      const slugBase = data.orgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      const uniqueSlug = `${slugBase || 'org'}-${Date.now().toString(36)}`;

      const newOrg = await this.prisma.organization.create({
        data: {
          name: data.orgName.trim(),
          slug: uniqueSlug,
          plan: 'standard',
        },
      });
      targetOrgId = newOrg.id;
      assignedRole = 'owner';
    } else {
      // Join default organization or create if not exists
      let defaultOrg = await this.prisma.organization.findUnique({
        where: { slug: 'acme-corp' },
      });

      if (!defaultOrg) {
        defaultOrg = await this.prisma.organization.create({
          data: {
            id: 'org_main',
            name: 'Acme Corporation',
            slug: 'acme-corp',
            plan: 'enterprise',
          },
        });
        assignedRole = 'owner';
      } else {
        assignedRole = 'member';
      }
      targetOrgId = defaultOrg.id;
    }

    // Create Member record
    await this.prisma.member.create({
      data: {
        orgId: targetOrgId,
        userId: user.id,
        name: user.name,
        email: user.email,
        role: assignedRole,
        status: 'active',
        department: 'Chung',
      },
    });

    // Audit Log for registration
    await this.prisma.auditLog.create({
      data: {
        orgId: targetOrgId,
        action: 'REGISTER',
        actor: user.email,
        target: `User:${user.id}`,
        ip: data.ip || '127.0.0.1',
        status: 'SUCCESS',
        details: JSON.stringify({ role: assignedRole, orgId: targetOrgId }),
      },
    });

    const tokens = await this.issueTokens(user);
    const workspaces = await this.getUserWorkspaces(user.id);

    return {
      user: {
        userId: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      tokens,
      workspaces,
    };
  }

  /**
   * Login with email and password
   */
  async login(data: LoginDTO): Promise<AuthResponse> {
    const email = data.email.trim().toLowerCase();
    const clientIp = data.ip || '127.0.0.1';

    if (!email || !data.password) {
      throw { status: 400, message: 'Vui lòng nhập email và mật khẩu' };
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      // Record failed login audit
      await this.prisma.auditLog.create({
        data: {
          action: 'LOGIN_FAILED',
          actor: email,
          target: 'AuthService',
          ip: clientIp,
          status: 'ERROR',
          details: 'Tài khoản không tồn tại hoặc chưa cài đặt mật khẩu',
        },
      });
      throw { status: 401, message: 'Email hoặc mật khẩu không chính xác' };
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      await this.prisma.auditLog.create({
        data: {
          action: 'LOGIN_FAILED',
          actor: email,
          target: `User:${user.id}`,
          ip: clientIp,
          status: 'ERROR',
          details: 'Mật khẩu không khớp',
        },
      });
      throw { status: 401, message: 'Email hoặc mật khẩu không chính xác' };
    }

    // Success audit log
    await this.prisma.auditLog.create({
      data: {
        action: 'LOGIN',
        actor: user.email,
        target: `User:${user.id}`,
        ip: clientIp,
        status: 'SUCCESS',
      },
    });

    const tokens = await this.issueTokens(user);
    const workspaces = await this.getUserWorkspaces(user.id);

    return {
      user: {
        userId: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      tokens,
      workspaces,
    };
  }

  /**
   * Refresh token rotation
   */
  async refresh(refreshTokenStr: string, ip?: string): Promise<TokenPair> {
    if (!refreshTokenStr) {
      throw { status: 401, message: 'Thiếu Refresh Token' };
    }

    // 1. Verify token in database
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshTokenStr },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw { status: 401, message: 'Refresh Token không hợp lệ' };
    }

    if (tokenRecord.revoked) {
      // Possible token reuse attack! Revoke all tokens for this user
      await this.prisma.refreshToken.updateMany({
        where: { userId: tokenRecord.userId },
        data: { revoked: true },
      });
      await this.prisma.auditLog.create({
        data: {
          action: 'REVOKED_TOKEN_REUSE_DETECTED',
          actor: tokenRecord.user.email,
          target: `User:${tokenRecord.userId}`,
          ip: ip || '127.0.0.1',
          status: 'ERROR',
        },
      });
      throw { status: 401, message: 'Phiên làm việc đã bị thu hồi do phát hiện tái sử dụng token' };
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw { status: 401, message: 'Refresh Token đã hết hạn' };
    }

    // 2. Verify JWT signature
    try {
      jwt.verify(refreshTokenStr, config.jwt.refreshSecret);
    } catch {
      throw { status: 401, message: 'Refresh Token có chữ ký không hợp lệ' };
    }

    // 3. Token Rotation: revoke old token
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revoked: true },
    });

    // 4. Issue new token pair
    return await this.issueTokens(tokenRecord.user);
  }

  /**
   * Logout user by revoking all refresh tokens for that session / user
   */
  async logout(refreshTokenStr?: string, userId?: string, ip?: string): Promise<void> {
    if (refreshTokenStr) {
      const record = await this.prisma.refreshToken.findUnique({
        where: { token: refreshTokenStr },
      });
      if (record) {
        await this.prisma.refreshToken.updateMany({
          where: { userId: record.userId },
          data: { revoked: true },
        });
      }
    }

    if (userId) {
      await this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { revoked: true },
      });

      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      await this.prisma.auditLog.create({
        data: {
          action: 'LOGOUT',
          actor: user?.email || userId,
          target: `User:${userId}`,
          ip: ip || '127.0.0.1',
          status: 'SUCCESS',
        },
      });
    }
  }

  /**
   * Get user profile and workspace memberships
   */
  async getMe(userId: string): Promise<{ user: AuthenticatedUser; workspaces: WorkspaceSummary[] }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw { status: 404, message: 'Người dùng không tồn tại' };
    }

    const workspaces = await this.getUserWorkspaces(userId);

    return {
      user: {
        userId: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      workspaces,
    };
  }
}
