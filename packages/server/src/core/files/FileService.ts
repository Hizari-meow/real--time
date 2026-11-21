import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getPrismaClient } from '../../storage/db.js';
import { S3StorageService } from '../../storage/s3-client.js';
import { StorageQuotaService } from './StorageQuotaService.js';
import {
  publishDomainEvent,
  stageOutboxEventInTransaction,
  dispatchCommittedOutboxEvent,
} from '../events/index.js';

export interface UploadFileInput {
  orgId: string;
  folderId?: string | null;
  name: string;
  contentBase64?: string;
  buffer?: Buffer;
  mimeType?: string;
  category?: string;
  ownerId?: string | null;
  ownerName?: string;
}

export interface ShareSettingsInput {
  linkAccess: 'anyone' | 'organization' | 'restricted';
  permission?: 'viewer' | 'commenter' | 'editor';
  allowDownload: boolean;
  password?: string;
  expiresAt?: string;
}

export class FileService {
  private static instance: FileService | null = null;

  public static getInstance(): FileService {
    if (!FileService.instance) {
      FileService.instance = new FileService();
    }
    return FileService.instance;
  }

  /**
   * Upload file to MinIO S3 and persist FileRecord in PostgreSQL with atomic quota check and reservation
   */
  public async uploadFile(input: UploadFileInput) {
    const prisma = getPrismaClient();
    const s3 = S3StorageService.getInstance();
    const quotaService = StorageQuotaService.getInstance();

    const buffer = input.buffer || (input.contentBase64 ? Buffer.from(input.contentBase64, 'base64') : Buffer.from(''));
    const byteSize = buffer.length;
    const mimeType = input.mimeType || 'application/octet-stream';
    const cleanName = input.name.trim();

    // Generate unique S3 Key with org isolation
    const fileId = crypto.randomUUID();
    const s3Key = `orgs/${input.orgId}/files/${fileId}/${cleanName}`;

    // Atomically reserve quota before uploading
    await quotaService.reserveQuota(fileId, input.orgId, byteSize);

    // Upload binary stream to MinIO
    try {
      await s3.uploadFile(s3Key, buffer, mimeType);
    } catch (uploadErr) {
      quotaService.releaseReservation(fileId);
      throw uploadErr;
    }

    // Compute SHA-256 integrity hash
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

    // Initial version entry
    const initialVersion = {
      version: 1,
      s3Key,
      size: byteSize,
      sha256,
      updatedAt: new Date().toISOString(),
      updatedBy: input.ownerName || 'System',
      changeSummary: 'Phiên bản ban đầu tải lên từ máy tính',
    };

    let record: any;
    try {
      record = await prisma.fileRecord.create({
        data: {
          id: fileId,
          orgId: input.orgId,
          folderId: input.folderId || null,
          ownerId: input.ownerId || null,
          name: cleanName,
          s3Key,
          byteSize,
          mimeType,
          category: input.category || 'other',
          ownerName: input.ownerName || 'System',
          isStarred: false,
          isDeleted: false,
          versionsJson: JSON.stringify([initialVersion]),
          shareSettingsJson: JSON.stringify({
            linkAccess: 'organization',
            permission: 'viewer',
            allowDownload: true,
          }),
        },
      });

      // Commit reservation upon successful database insertion
      await quotaService.commitReservation(fileId);
    } catch (dbErr: any) {
      // Rollback reservation and S3 object on DB insertion failure
      await quotaService.releaseReservation(fileId);
      console.warn(`[FileService] DB insert failed for file ${fileId}. Rolling back S3 object ${s3Key}:`, dbErr.message);
      try {
        await s3.deleteObject(s3Key);
        console.log(`[FileService] Successfully rolled back orphaned S3 object ${s3Key}`);
      } catch (cleanupErr: any) {
        console.error(`[FileService] CRITICAL: Failed to clean up orphaned S3 object ${s3Key}:`, cleanupErr);
      }
      throw dbErr;
    }

    // Emit transactional domain event
    await publishDomainEvent({
      type: 'file.uploaded',
      orgId: input.orgId,
      actor: { type: 'user', id: input.ownerId || 'system', name: input.ownerName },
      resource: { type: 'file', id: record.id, name: record.name },
      data: {
        fileId: record.id,
        name: record.name,
        size: record.byteSize,
        category: record.category,
      },
    });

    return this.mapRecord(record);
  }

  /**
   * List files for workspace with multi-tenant org isolation and optional filtering
   */
  public async listFiles(
    orgId: string,
    query: {
      folderId?: string | null;
      category?: string;
      isStarred?: boolean;
      isDeleted?: boolean;
      search?: string;
      sortBy?: 'name' | 'size' | 'updatedAt';
    } = {}
  ) {
    const prisma = getPrismaClient();

    const where: any = {
      orgId,
      isDeleted: query.isDeleted === true,
    };

    if (query.folderId !== undefined) {
      where.folderId = query.folderId === 'null' || !query.folderId ? null : query.folderId;
    }

    if (query.category && query.category !== 'all') {
      where.category = query.category;
    }

    if (query.isStarred !== undefined) {
      where.isStarred = query.isStarred;
    }

    if (query.search && query.search.trim()) {
      where.name = {
        contains: query.search.trim(),
        mode: 'insensitive',
      };
    }

    let orderBy: any = { updatedAt: 'desc' };
    if (query.sortBy === 'name') orderBy = { name: 'asc' };
    if (query.sortBy === 'size') orderBy = { byteSize: 'desc' };

    const records = await prisma.fileRecord.findMany({
      where,
      orderBy,
    });

    return records.map(this.mapRecord);
  }

  /**
   * Get single file details
   */
  public async getFile(fileId: string, orgId: string) {
    const prisma = getPrismaClient();
    const record = await prisma.fileRecord.findFirst({
      where: { id: fileId, orgId },
    });
    if (!record) return null;
    return this.mapRecord(record);
  }

  /**
   * Download binary file content from MinIO
   */
  public async downloadFile(fileId: string, orgId: string) {
    const prisma = getPrismaClient();
    const s3 = S3StorageService.getInstance();

    const record = await prisma.fileRecord.findFirst({
      where: { id: fileId, orgId },
    });

    if (!record) {
      throw new Error('Tệp không tồn tại hoặc bạn không có quyền truy cập');
    }

    const data = await s3.getSnapshot(record.s3Key);
    return {
      name: record.name,
      mimeType: record.mimeType,
      size: record.byteSize,
      data: Buffer.from(data),
    };
  }

  /**
   * Rename file
   */
  public async renameFile(fileId: string, orgId: string, newName: string) {
    const prisma = getPrismaClient();
    const cleanName = newName.trim();
    if (!cleanName) throw new Error('Tên tệp không được để trống');

    const updated = await prisma.fileRecord.updateMany({
      where: { id: fileId, orgId },
      data: { name: cleanName, updatedAt: new Date() },
    });

    if (updated.count === 0) throw new Error('Tệp không tồn tại trong không gian làm việc');
    return this.getFile(fileId, orgId);
  }

  /**
   * Move file to another folder
   */
  public async moveFile(fileId: string, orgId: string, folderId: string | null) {
    const prisma = getPrismaClient();
    const updated = await prisma.fileRecord.updateMany({
      where: { id: fileId, orgId },
      data: { folderId: folderId || null, updatedAt: new Date() },
    });

    if (updated.count === 0) throw new Error('Tệp không tồn tại');
    return this.getFile(fileId, orgId);
  }

  /**
   * Toggle star/favorite status
   */
  public async toggleStar(fileId: string, orgId: string, isStarred: boolean) {
    const prisma = getPrismaClient();
    await prisma.fileRecord.updateMany({
      where: { id: fileId, orgId },
      data: { isStarred, updatedAt: new Date() },
    });
    return this.getFile(fileId, orgId);
  }

  /**
   * Soft delete to Trash
   */
  public async moveToTrash(fileId: string, orgId: string) {
    const prisma = getPrismaClient();
    await prisma.fileRecord.updateMany({
      where: { id: fileId, orgId },
      data: { isDeleted: true, deletedAt: new Date(), updatedAt: new Date() },
    });

    await publishDomainEvent({
      type: 'file.trashed',
      orgId,
      actor: { type: 'system', id: 'system' },
      resource: { type: 'file', id: fileId },
      data: { fileId },
    });

    return true;
  }

  /**
   * Restore from Trash with atomic quota verification and workspace row-locking
   */
  public async restoreFromTrash(fileId: string, orgId: string) {
    const quotaService = StorageQuotaService.getInstance();
    // Atomically verifies quota, locks workspace, and un-deletes file
    await quotaService.restoreFileWithQuotaCheck(fileId, orgId);

    await publishDomainEvent({
      type: 'file.restored',
      orgId,
      actor: { type: 'system', id: 'system' },
      resource: { type: 'file', id: fileId },
      data: { fileId },
    });

    return this.getFile(fileId, orgId);
  }

  /**
   * Permanent Delete: purge from MinIO storage and PostgreSQL
   */
  public async permanentDelete(fileId: string, orgId: string) {
    const prisma = getPrismaClient();
    const s3 = S3StorageService.getInstance();

    const record = await prisma.fileRecord.findFirst({
      where: { id: fileId, orgId },
    });

    if (!record) return false;

    // Delete current key and all past versions from MinIO
    try {
      await s3.deleteObject(record.s3Key);
      const versions = JSON.parse(record.versionsJson || '[]');
      for (const v of versions) {
        if (v.s3Key && v.s3Key !== record.s3Key) {
          await s3.deleteObject(v.s3Key).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('[FileService] MinIO cleanup warning:', err);
    }

    await prisma.fileRecord.delete({
      where: { id: fileId },
    });

    return true;
  }

  /**
   * Upload new version for existing file
   */
  public async addFileVersion(
    fileId: string,
    orgId: string,
    buffer: Buffer,
    mimeType: string,
    uploadedBy: string,
    changeSummary: string = 'Cập nhật phiên bản mới'
  ) {
    const prisma = getPrismaClient();
    const s3 = S3StorageService.getInstance();

    const record = await prisma.fileRecord.findFirst({
      where: { id: fileId, orgId },
    });

    if (!record) throw new Error('Tệp không tồn tại');

    const versions: any[] = JSON.parse(record.versionsJson || '[]');
    const nextVersionNum = versions.length + 1;
    const newS3Key = `orgs/${orgId}/files/${fileId}/v${nextVersionNum}_${record.name}`;

    // Upload to MinIO
    await s3.uploadFile(newS3Key, buffer, mimeType);

    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

    const newVersionEntry = {
      version: nextVersionNum,
      s3Key: newS3Key,
      size: buffer.length,
      sha256,
      updatedAt: new Date().toISOString(),
      updatedBy: uploadedBy,
      changeSummary,
    };

    versions.unshift(newVersionEntry);

    await prisma.fileRecord.update({
      where: { id: fileId },
      data: {
        s3Key: newS3Key,
        byteSize: buffer.length,
        mimeType,
        versionsJson: JSON.stringify(versions),
        updatedAt: new Date(),
      },
    });

    await publishDomainEvent({
      type: 'file.version_created',
      orgId,
      actor: { type: 'user', id: uploadedBy, name: uploadedBy },
      resource: { type: 'file', id: fileId },
      data: { fileId, version: nextVersionNum, size: buffer.length },
    });

    return this.getFile(fileId, orgId);
  }

  /**
   * Revert file to a past version
   */
  public async revertFileVersion(fileId: string, orgId: string, targetVersion: number) {
    const prisma = getPrismaClient();
    const record = await prisma.fileRecord.findFirst({
      where: { id: fileId, orgId },
    });

    if (!record) throw new Error('Tệp không tồn tại');

    const versions: any[] = JSON.parse(record.versionsJson || '[]');
    const target = versions.find((v) => v.version === targetVersion);

    if (!target) throw new Error(`Không tìm thấy phiên bản ${targetVersion}`);

    await prisma.fileRecord.update({
      where: { id: fileId },
      data: {
        s3Key: target.s3Key,
        byteSize: target.size,
        updatedAt: new Date(),
      },
    });

    return this.getFile(fileId, orgId);
  }

  /**
   * Update share settings and public access token
   */
  public async updateShareSettings(fileId: string, orgId: string, input: ShareSettingsInput) {
    const prisma = getPrismaClient();
    const record = await prisma.fileRecord.findFirst({
      where: { id: fileId, orgId },
    });

    if (!record) throw new Error('Tệp không tồn tại');

    let existingShare: any = {};
    try {
      existingShare = JSON.parse(record.shareSettingsJson || '{}');
    } catch {}

    const shareToken = existingShare.token || crypto.randomBytes(16).toString('hex');
    let passwordHash = existingShare.passwordHash;

    if (input.password && input.password.trim()) {
      passwordHash = await bcrypt.hash(input.password.trim(), 10);
    } else if (input.password === '') {
      passwordHash = null;
    }

    const shareSettings = {
      token: shareToken,
      linkAccess: input.linkAccess,
      permission: input.permission || existingShare.permission || 'viewer',
      allowDownload: input.allowDownload !== false,
      hasPassword: Boolean(passwordHash),
      passwordHash,
      expiresAt: input.expiresAt || null,
    };

    let envelope: any = null;
    await prisma.$transaction(async (tx) => {
      await tx.fileRecord.update({
        where: { id: fileId },
        data: {
          shareSettingsJson: JSON.stringify(shareSettings),
          updatedAt: new Date(),
        },
      });

      envelope = await stageOutboxEventInTransaction(tx, {
        type: 'file.shared',
        orgId,
        actor: { type: 'system', id: 'system' },
        resource: { type: 'file', id: fileId, name: record.name },
        data: {
          fileId,
          linkAccess: shareSettings.linkAccess,
          permission: shareSettings.permission,
          allowDownload: shareSettings.allowDownload,
          hasPassword: shareSettings.hasPassword,
          expiresAt: shareSettings.expiresAt,
        },
      });
    });

    if (envelope) {
      dispatchCommittedOutboxEvent(envelope).catch(() => {});
    }

    return {
      shareToken,
      shareUrl: `/api/files/shared/${shareToken}`,
      ...shareSettings,
    };
  }

  /**
   * Resolve shared file by token with access control and sanitized public response
   */
  public async getSharedFile(
    token: string,
    passwordAttempt?: string,
    context?: { userId?: string; orgId?: string }
  ) {
    const prisma = getPrismaClient();

    // Search file containing this share token
    const records = await prisma.fileRecord.findMany({
      where: {
        isDeleted: false,
        shareSettingsJson: { contains: token },
      },
    });

    const file = records.find((r) => {
      try {
        const s = JSON.parse(r.shareSettingsJson || '{}');
        return s.token === token;
      } catch {
        return false;
      }
    });

    if (!file) {
      throw new Error('Liên kết chia sẻ không hợp lệ hoặc đã bị thu hồi');
    }

    const shareSettings = JSON.parse(file.shareSettingsJson || '{}');

    // Check link access policy
    const linkAccess = shareSettings.linkAccess || 'organization';
    if (linkAccess === 'restricted') {
      throw new Error('Liên kết chia sẻ này bị hạn chế quyền truy cập');
    }
    if (linkAccess === 'organization') {
      let isOrgMember = false;
      if (context?.userId) {
        const memberRecord = await prisma.member.findFirst({
          where: { userId: context.userId, orgId: file.orgId, status: 'active' },
        });
        if (memberRecord) isOrgMember = true;
      }
      if (!isOrgMember) {
        throw new Error('Liên kết này chỉ dành cho thành viên trong tổ chức. Vui lòng đăng nhập.');
      }
    }

    // Check expiration
    if (shareSettings.expiresAt && new Date(shareSettings.expiresAt).getTime() < Date.now()) {
      throw new Error('Liên kết chia sẻ đã hết hạn');
    }

    // Check password if configured
    if (shareSettings.passwordHash) {
      if (!passwordAttempt) {
        return {
          requiresPassword: true,
          fileName: file.name,
          category: file.category,
        };
      }
      const isMatch = await bcrypt.compare(passwordAttempt, shareSettings.passwordHash);
      if (!isMatch) {
        throw new Error('Mật khẩu bảo vệ không chính xác');
      }
    }

    // Sanitize public file representation: OMIT sensitive s3Key and orgId
    const safeFile = {
      id: file.id,
      name: file.name,
      size: file.byteSize,
      mimeType: file.mimeType,
      category: file.category,
      ownerName: file.ownerName,
      permission: shareSettings.permission || 'viewer',
      updatedAt: file.updatedAt.toISOString(),
      url: `/api/files/shared/${token}/download`,
    };

    return {
      requiresPassword: false,
      file: safeFile,
      permission: shareSettings.permission || 'viewer',
      allowDownload: shareSettings.allowDownload !== false,
      rawFileId: file.id,
      rawOrgId: file.orgId,
    };
  }

  /**
   * Get file preview content and metadata
   */
  public async getPreview(fileId: string, orgId: string) {
    const prisma = getPrismaClient();
    const record = await prisma.fileRecord.findFirst({
      where: { id: fileId, orgId, isDeleted: false },
    });

    if (!record) {
      throw new Error('Tệp không tồn tại hoặc đã bị xóa');
    }

    const s3 = S3StorageService.getInstance();
    const mime = (record.mimeType || '').toLowerCase();
    const ext = record.name.includes('.') ? record.name.split('.').pop()!.toLowerCase() : '';

    // 1. Text & Code files
    const isText =
      mime.startsWith('text/') ||
      ['json', 'md', 'ts', 'js', 'html', 'css', 'py', 'sql', 'yaml', 'yml', 'xml', 'log'].includes(ext);

    if (isText && ext !== 'csv') {
      try {
        const buf = await s3.getFile(record.s3Key);
        const textContent = buf.toString('utf-8', 0, 64 * 1024); // Up to 64KB
        return {
          id: record.id,
          name: record.name,
          size: record.byteSize,
          mimeType: record.mimeType,
          category: record.category,
          previewType: 'text',
          content: textContent,
        };
      } catch (err: any) {
        console.warn(`[getPreview] failed reading text file ${record.id}:`, err);
      }
    }

    // 2. CSV Spreadsheets
    if (ext === 'csv' || mime === 'text/csv') {
      try {
        const buf = await s3.getFile(record.s3Key);
        const lines = buf.toString('utf-8', 0, 64 * 1024).split(/\r?\n/).filter(Boolean);
        const rows = lines.slice(0, 50).map((l) => l.split(',').map((c) => c.trim().replace(/^"|"$/g, '')));
        return {
          id: record.id,
          name: record.name,
          size: record.byteSize,
          mimeType: record.mimeType,
          category: 'spreadsheet',
          previewType: 'csv',
          rows,
        };
      } catch (err: any) {
        console.warn(`[getPreview] failed parsing csv file ${record.id}:`, err);
      }
    }

    // 3. Images
    if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
      return {
        id: record.id,
        name: record.name,
        size: record.byteSize,
        mimeType: record.mimeType,
        category: 'image',
        previewType: 'image',
        url: `/api/files/${record.id}/download`,
      };
    }

    // 4. PDF Documents
    if (mime === 'application/pdf' || ext === 'pdf') {
      return {
        id: record.id,
        name: record.name,
        size: record.byteSize,
        mimeType: record.mimeType,
        category: 'document',
        previewType: 'pdf',
        url: `/api/files/${record.id}/download`,
      };
    }

    // 5. Binary Spreadsheets or unsupported files
    return {
      id: record.id,
      name: record.name,
      size: record.byteSize,
      mimeType: record.mimeType,
      category: record.category,
      previewType: 'unsupported',
      message: 'Không hỗ trợ xem trước trực tiếp định dạng tệp này. Vui lòng tải về máy tính để mở.',
      url: `/api/files/${record.id}/download`,
    };
  }

  private mapRecord(r: any) {
    let versions = [];
    let shareSettings = { linkAccess: 'organization', permission: 'viewer', allowDownload: true };

    try {
      versions = JSON.parse(r.versionsJson || '[]');
    } catch {}
    try {
      shareSettings = JSON.parse(r.shareSettingsJson || '{}');
    } catch {}

    return {
      id: r.id,
      orgId: r.orgId,
      name: r.name,
      key: r.s3Key,
      size: r.byteSize,
      mimeType: r.mimeType,
      category: r.category,
      folderId: r.folderId || undefined,
      ownerId: r.ownerId || undefined,
      ownerName: r.ownerName,
      isStarred: r.isStarred,
      isDeleted: r.isDeleted,
      deletedAt: r.deletedAt ? r.deletedAt.toISOString() : undefined,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      url: `/api/files/${r.id}/download`,
      versions,
      shareSettings,
    };
  }
}
