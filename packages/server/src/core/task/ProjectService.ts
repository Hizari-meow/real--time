import { getPrismaClient } from '../../storage/db.js';
import { TaskSocketManager } from './TaskSocketManager.js';

export type ProjectRole = 'admin' | 'member' | 'viewer';

export interface CreateProjectDTO {
  name: string;
  key: string;
  description?: string;
  spaceId?: string;
  status?: string;
}

export interface UpdateProjectDTO {
  name?: string;
  description?: string;
  spaceId?: string | null;
  status?: string;
  isArchived?: boolean;
}

export class ProjectService {
  private static instance: ProjectService | null = null;
  private prisma = getPrismaClient();

  public static getInstance(): ProjectService {
    if (!ProjectService.instance) {
      ProjectService.instance = new ProjectService();
    }
    return ProjectService.instance;
  }

  /**
   * Check user role on a project. Returns role or throws 403 / 404
   */
  public async getEffectiveProjectRole(
    orgId: string,
    userId: string,
    projectId: string
  ): Promise<{ role: ProjectRole; isOrgAdmin: boolean }> {
    // 1. Check project existence and orgId match
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });

    if (!project) {
      throw new Error('PROJECT_NOT_FOUND');
    }

    if (project.orgId !== orgId) {
      throw new Error('WORKSPACE_ISOLATION_ERROR');
    }

    // 2. Check if user is Workspace Owner or Admin
    const orgMember = await this.prisma.member.findUnique({
      where: { orgId_userId: { orgId, userId } },
    });

    const isOrgAdmin = orgMember?.role === 'owner' || orgMember?.role === 'admin';
    if (isOrgAdmin) {
      return { role: 'admin', isOrgAdmin: true };
    }

    // 3. Check project member entry
    const projMember = project.members.find((m) => m.userId === userId);
    if (!projMember) {
      // Default to viewer if member of org, or throw if not assigned
      return { role: 'viewer', isOrgAdmin: false };
    }

    return { role: projMember.role as ProjectRole, isOrgAdmin: false };
  }

  /**
   * Enforce minimum project permission
   */
  public async requirePermission(
    orgId: string,
    userId: string,
    projectId: string,
    minRole: ProjectRole
  ): Promise<void> {
    const { role } = await this.getEffectiveProjectRole(orgId, userId, projectId);

    const levels: Record<ProjectRole, number> = {
      viewer: 1,
      member: 2,
      admin: 3,
    };

    if (levels[role] < levels[minRole]) {
      throw new Error('PROJECT_PERMISSION_DENIED');
    }
  }

  /**
   * List projects in current workspace
   */
  public async listProjects(orgId: string, userId: string, includeArchived = false) {
    const where: any = { orgId };
    if (!includeArchived) {
      where.isArchived = false;
    }

    const projects = await this.prisma.project.findMany({
      where,
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        _count: {
          select: { tasks: true, sprints: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((p) => ({
      id: p.id,
      orgId: p.orgId,
      spaceId: p.spaceId,
      name: p.name,
      key: p.key,
      description: p.description,
      status: p.status,
      isArchived: p.isArchived,
      ownerId: p.ownerId,
      tasksCount: p._count.tasks,
      sprintsCount: p._count.sprints,
      members: p.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
      })),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  /**
   * Get single project detail
   */
  public async getProject(orgId: string, userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        sprints: {
          orderBy: { startDate: 'asc' },
        },
        _count: {
          select: { tasks: true, sprints: true },
        },
      },
    });

    if (!project) {
      throw new Error('PROJECT_NOT_FOUND');
    }

    if (project.orgId !== orgId) {
      throw new Error('WORKSPACE_ISOLATION_ERROR');
    }

    const { role } = await this.getEffectiveProjectRole(orgId, userId, projectId);

    return {
      id: project.id,
      orgId: project.orgId,
      spaceId: project.spaceId,
      name: project.name,
      key: project.key,
      description: project.description,
      status: project.status,
      isArchived: project.isArchived,
      ownerId: project.ownerId,
      userRole: role,
      tasksCount: project._count.tasks,
      sprintsCount: project._count.sprints,
      members: project.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
      })),
      sprints: project.sprints.map((s) => ({
        id: s.id,
        name: s.name,
        goal: s.goal,
        status: s.status,
        startDate: s.startDate.toISOString(),
        endDate: s.endDate.toISOString(),
        completedAt: s.completedAt?.toISOString(),
      })),
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }

  /**
   * Create a new project
   */
  public async createProject(orgId: string, userId: string, data: CreateProjectDTO) {
    const key = data.key.trim().toUpperCase();

    // Check key uniqueness in org
    const existing = await this.prisma.project.findUnique({
      where: { orgId_key: { orgId, key } },
    });

    if (existing) {
      throw new Error('PROJECT_KEY_ALREADY_EXISTS');
    }

    const project = await this.prisma.project.create({
      data: {
        orgId,
        name: data.name.trim(),
        key,
        description: data.description?.trim() || '',
        spaceId: data.spaceId || null,
        status: data.status || 'planning',
        ownerId: userId,
        members: {
          create: {
            userId,
            role: 'admin',
          },
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    // Record audit log
    await this.prisma.auditLog.create({
      data: {
        orgId,
        action: 'PROJECT_CREATED',
        actor: userId,
        target: `Project:${project.id}`,
        details: JSON.stringify({ key: project.key, name: project.name }),
      },
    });

    // Broadcast realtime event
    TaskSocketManager.getInstance().broadcastToOrg(orgId, {
      type: 'project:created',
      orgId,
      projectId: project.id,
      data: { id: project.id, key: project.key, name: project.name },
      timestamp: new Date().toISOString(),
    });

    return project;
  }

  /**
   * Update an existing project
   */
  public async updateProject(orgId: string, userId: string, projectId: string, data: UpdateProjectDTO) {
    await this.requirePermission(orgId, userId, projectId, 'admin');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description.trim();
    if (data.spaceId !== undefined) updateData.spaceId = data.spaceId;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.isArchived !== undefined) updateData.isArchived = data.isArchived;

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: updateData,
    });

    TaskSocketManager.getInstance().broadcastToOrg(orgId, {
      type: 'project:updated',
      orgId,
      projectId: updated.id,
      data: updated,
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  /**
   * Archive / Unarchive project
   */
  public async archiveProject(orgId: string, userId: string, projectId: string, isArchived = true) {
    await this.requirePermission(orgId, userId, projectId, 'admin');

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: { isArchived, status: isArchived ? 'archived' : 'active' },
    });

    TaskSocketManager.getInstance().broadcastToOrg(orgId, {
      type: 'project:archived',
      orgId,
      projectId: updated.id,
      data: { id: updated.id, isArchived: updated.isArchived },
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  /**
   * Delete project
   */
  public async deleteProject(orgId: string, userId: string, projectId: string) {
    await this.requirePermission(orgId, userId, projectId, 'admin');

    await this.prisma.project.delete({
      where: { id: projectId },
    });

    TaskSocketManager.getInstance().broadcastToOrg(orgId, {
      type: 'project:deleted',
      orgId,
      projectId,
      data: { id: projectId },
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }

  /**
   * Add member to project
   */
  public async addMember(orgId: string, actorUserId: string, projectId: string, targetUserId: string, role: ProjectRole = 'member') {
    await this.requirePermission(orgId, actorUserId, projectId, 'admin');

    // Ensure target user is member of current workspace
    const orgMember = await this.prisma.member.findUnique({
      where: { orgId_userId: { orgId, userId: targetUserId } },
    });

    if (!orgMember) {
      throw new Error('USER_NOT_IN_WORKSPACE');
    }

    const member = await this.prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: targetUserId } },
      create: { projectId, userId: targetUserId, role },
      update: { role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return member;
  }

  /**
   * Remove member from project
   */
  public async removeMember(orgId: string, actorUserId: string, projectId: string, targetUserId: string) {
    await this.requirePermission(orgId, actorUserId, projectId, 'admin');

    await this.prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });

    return { success: true };
  }
}
