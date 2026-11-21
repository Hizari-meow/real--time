import crypto from 'node:crypto';
import { getPrismaClient } from '../../storage/db.js';

export interface CreateFolderInput {
  orgId: string;
  name: string;
  category?: 'team' | 'project' | 'personal';
  color?: string;
  ownerId?: string | null;
  ownerName?: string;
  parentId?: string | null;
}

export class FolderService {
  private static instance: FolderService | null = null;

  public static getInstance(): FolderService {
    if (!FolderService.instance) {
      FolderService.instance = new FolderService();
    }
    return FolderService.instance;
  }

  /**
   * Create new folder in workspace
   */
  public async createFolder(input: CreateFolderInput) {
    const prisma = getPrismaClient();
    const cleanName = input.name.trim();
    if (!cleanName) throw new Error('Tên thư mục không được để trống');

    const folderId = `fld-${crypto.randomUUID().slice(0, 8)}`;
    const folder = await prisma.folder.create({
      data: {
        id: folderId,
        orgId: input.orgId,
        name: cleanName,
        category: input.category || 'team',
        color: input.color || '#3b82f6',
        ownerId: input.ownerId || null,
        ownerName: input.ownerName || 'System',
        parentId: input.parentId || null,
      },
    });

    return {
      ...folder,
      fileCount: 0,
      totalSize: 0,
      createdAt: folder.createdAt.toISOString(),
      updatedAt: folder.updatedAt.toISOString(),
    };
  }

  /**
   * List folders in workspace with file counts and total byte sizes
   */
  public async listFolders(orgId: string) {
    const prisma = getPrismaClient();

    const folders = await prisma.folder.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });

    // Compute aggregated file counts and byte sizes for each folder
    const fileStats = await prisma.fileRecord.groupBy({
      by: ['folderId'],
      where: { orgId, isDeleted: false, folderId: { not: null } },
      _count: { id: true },
      _sum: { byteSize: true },
    });

    const statsMap = new Map<string, { count: number; size: number }>();
    for (const stat of fileStats) {
      if (stat.folderId) {
        statsMap.set(stat.folderId, {
          count: stat._count.id,
          size: stat._sum.byteSize || 0,
        });
      }
    }

    return folders.map((f) => {
      const stats = statsMap.get(f.id) || { count: 0, size: 0 };
      return {
        id: f.id,
        orgId: f.orgId,
        name: f.name,
        category: f.category as 'team' | 'project' | 'personal',
        color: f.color,
        ownerId: f.ownerId || undefined,
        ownerName: f.ownerName,
        parentId: f.parentId || undefined,
        fileCount: stats.count,
        totalSize: stats.size,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      };
    });
  }

  /**
   * Rename folder
   */
  public async renameFolder(folderId: string, orgId: string, name: string, color?: string) {
    const prisma = getPrismaClient();
    const cleanName = name.trim();
    if (!cleanName) throw new Error('Tên thư mục không được để trống');

    const data: any = { name: cleanName, updatedAt: new Date() };
    if (color) data.color = color;

    const updated = await prisma.folder.updateMany({
      where: { id: folderId, orgId },
      data,
    });

    if (updated.count === 0) throw new Error('Thư mục không tồn tại');
    return prisma.folder.findFirst({ where: { id: folderId, orgId } });
  }

  /**
   * Delete folder: move nested files to root folder, then delete folder record
   */
  public async deleteFolder(folderId: string, orgId: string) {
    const prisma = getPrismaClient();

    // Detach files from this folder to root
    await prisma.fileRecord.updateMany({
      where: { orgId, folderId },
      data: { folderId: null, updatedAt: new Date() },
    });

    // Delete folder
    await prisma.folder.deleteMany({
      where: { id: folderId, orgId },
    });

    return true;
  }

  /**
   * Get workspace storage and folder statistics
   */
  public async getWorkspaceStats(orgId: string) {
    const prisma = getPrismaClient();

    const fileAgg = await prisma.fileRecord.aggregate({
      where: { orgId, isDeleted: false },
      _sum: { byteSize: true },
      _count: { id: true },
    });

    const folderCount = await prisma.folder.count({
      where: { orgId },
    });

    const totalStorageUsed = fileAgg._sum.byteSize || 0;
    const totalFiles = fileAgg._count.id || 0;
    const { StorageQuotaService } = await import('./StorageQuotaService.js');
    const quotaBytes = await StorageQuotaService.getInstance().getEffectiveQuota(orgId);

    return {
      totalStorageUsed,
      totalFiles,
      totalFolders: folderCount,
      quotaBytes,
      usagePercentage: quotaBytes > 0 ? Number(((totalStorageUsed / quotaBytes) * 100).toFixed(2)) : 0,
    };
  }
}
