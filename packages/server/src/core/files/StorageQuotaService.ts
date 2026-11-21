import { getPrismaClient } from '../../storage/db.js';

export interface StorageReservationRecord {
  id: string;
  orgId: string;
  bytes: number;
  status: 'pending' | 'committed' | 'released' | 'expired';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class QuotaExceededError extends Error {
  public readonly statusCode: number = 413;
  constructor(message = 'Dung lượng lưu trữ của workspace đã vượt quá giới hạn cho phép (10 GB)') {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

/**
 * PostgreSQL-Backed Atomic Storage Quota & Reservation Service.
 * Ensures consistent multi-process storage quota enforcement using row-level locking
 * (SELECT ... FOR UPDATE) and atomic database transactions.
 */
export class StorageQuotaService {
  private static instance: StorageQuotaService | null = null;
  public static readonly DEFAULT_QUOTA_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB
  public static readonly DEFAULT_RESERVATION_TTL_MS = 10 * 60 * 1000; // 10 minutes lease

  public static getInstance(): StorageQuotaService {
    if (!StorageQuotaService.instance) {
      StorageQuotaService.instance = new StorageQuotaService();
    }
    return StorageQuotaService.instance;
  }

  /**
   * Set custom workspace quota in PostgreSQL (visible across all API processes).
   */
  public async setCustomQuota(orgId: string, quotaBytes: number): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.storageQuota.upsert({
      where: { orgId },
      create: {
        orgId,
        quotaBytes: BigInt(quotaBytes),
      },
      update: {
        quotaBytes: BigInt(quotaBytes),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Reset custom workspace quota in PostgreSQL, reverting to DEFAULT_QUOTA_BYTES.
   */
  public async resetCustomQuota(orgId: string): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.storageQuota.deleteMany({
      where: { orgId },
    });
  }

  /**
   * Retrieve effective workspace quota from PostgreSQL.
   */
  public async getEffectiveQuota(orgId: string): Promise<number> {
    const prisma = getPrismaClient();
    const quotaRow = await prisma.storageQuota.findUnique({
      where: { orgId },
      select: { quotaBytes: true },
    });
    return quotaRow ? Number(quotaRow.quotaBytes) : StorageQuotaService.DEFAULT_QUOTA_BYTES;
  }

  /**
   * Get the sum of all actively reserved bytes for an organization in PostgreSQL.
   * Only includes reservations with status='pending' and expiresAt > NOW().
   */
  public async getActiveReservedBytes(orgId: string): Promise<number> {
    const prisma = getPrismaClient();
    const agg = await prisma.storageReservation.aggregate({
      where: {
        orgId,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      _sum: { bytes: true },
    });
    return Number(agg._sum.bytes || 0n);
  }

  /**
   * Atomically verify storage capacity and reserve space in PostgreSQL before accepting an upload.
   * Uses row-level lock on storage_quotas (orgId) to eliminate concurrent upload race conditions
   * across multiple independent API processes.
   */
  public async reserveQuota(uploadId: string, orgId: string, bytesToReserve: number): Promise<void> {
    const prisma = getPrismaClient();
    const leaseMs = StorageQuotaService.DEFAULT_RESERVATION_TTL_MS;
    const expiresAt = new Date(Date.now() + leaseMs);

    await prisma.$transaction(async (tx) => {
      // 1. Ensure storage_quotas row exists for this orgId
      await tx.storageQuota.upsert({
        where: { orgId },
        create: {
          orgId,
          quotaBytes: BigInt(StorageQuotaService.DEFAULT_QUOTA_BYTES),
        },
        update: {},
      });

      // 2. Lock the storage_quotas row for this orgId exclusively (Row-level Lock FOR UPDATE)
      const lockedRows: any[] = await tx.$queryRaw`
        SELECT "quotaBytes" FROM storage_quotas WHERE "orgId" = ${orgId} FOR UPDATE;
      `;
      const effectiveQuota = lockedRows.length > 0
        ? Number(lockedRows[0].quotaBytes)
        : StorageQuotaService.DEFAULT_QUOTA_BYTES;

      // 3. Mark expired pending reservations as 'expired' for this org
      await tx.storageReservation.updateMany({
        where: {
          orgId,
          status: 'pending',
          expiresAt: { lte: new Date() },
        },
        data: {
          status: 'expired',
          updatedAt: new Date(),
        },
      });

      // 4. Calculate total committed bytes from file_records
      const fileAgg = await tx.fileRecord.aggregate({
        where: { orgId, isDeleted: false },
        _sum: { byteSize: true },
      });
      const committedBytes = fileAgg._sum.byteSize || 0;

      // 5. Calculate active reserved bytes (pending & not expired, excluding this uploadId if retrying)
      const resAgg = await tx.storageReservation.aggregate({
        where: {
          orgId,
          status: 'pending',
          expiresAt: { gt: new Date() },
          id: { not: uploadId },
        },
        _sum: { bytes: true },
      });
      const activeReserved = Number(resAgg._sum.bytes || 0n);

      // 6. Quota verification
      if (committedBytes + activeReserved + bytesToReserve > effectiveQuota) {
        const availableBytes = Math.max(0, effectiveQuota - committedBytes - activeReserved);
        throw new QuotaExceededError(
          `Dung lượng lưu trữ của workspace đã vượt quá giới hạn (còn trống ${Math.round(
            availableBytes / 1024
          )} KB, yêu cầu ${Math.round(bytesToReserve / 1024)} KB)`
        );
      }

      // 7. Upsert the reservation into PostgreSQL (idempotent for retry)
      await tx.storageReservation.upsert({
        where: { id: uploadId },
        create: {
          id: uploadId,
          orgId,
          bytes: BigInt(bytesToReserve),
          status: 'pending',
          expiresAt,
        },
        update: {
          bytes: BigInt(bytesToReserve),
          status: 'pending',
          expiresAt,
          updatedAt: new Date(),
        },
      });
    });
  }

  /**
   * Atomically expand reservation if actual stream chunks exceed initial reservation.
   * Locks the reservation row exclusively to eliminate concurrent chunk race conditions,
   * then verifies workspace quota and updates bytes atomically.
   */
  public async expandReservation(
    uploadId: string,
    orgIdOrBytes: string | number,
    additionalBytesParam?: number
  ): Promise<void> {
    const prisma = getPrismaClient();
    const leaseMs = StorageQuotaService.DEFAULT_RESERVATION_TTL_MS;
    const newExpiresAt = new Date(Date.now() + leaseMs);

    const expectedOrgId = typeof orgIdOrBytes === 'string' ? orgIdOrBytes : undefined;
    const additionalBytes = typeof orgIdOrBytes === 'number' ? orgIdOrBytes : (additionalBytesParam || 0);

    await prisma.$transaction(async (tx) => {
      // 1. Lock storage_reservations row for uploadId exclusively (Pessimistic Row Lock FOR UPDATE)
      const resRows: any[] = await tx.$queryRaw`
        SELECT "id", "orgId", "bytes", "status"
        FROM storage_reservations
        WHERE "id" = ${uploadId}
        FOR UPDATE;
      `;

      if (!resRows || resRows.length === 0 || resRows[0].status !== 'pending') {
        return;
      }

      const currentRes = resRows[0];
      const orgId = currentRes.orgId;

      // Enforce workspace tenant verification if expectedOrgId provided
      if (expectedOrgId && orgId !== expectedOrgId) {
        throw new Error('Không thể mở rộng giữ chỗ: Sai thông tin workspace');
      }

      // 2. Lock storage_quotas row for this org exclusively
      await tx.storageQuota.upsert({
        where: { orgId },
        create: {
          orgId,
          quotaBytes: BigInt(StorageQuotaService.DEFAULT_QUOTA_BYTES),
        },
        update: {},
      });

      const lockedRows: any[] = await tx.$queryRaw`
        SELECT "quotaBytes" FROM storage_quotas WHERE "orgId" = ${orgId} FOR UPDATE;
      `;
      const effectiveQuota = lockedRows.length > 0
        ? Number(lockedRows[0].quotaBytes)
        : StorageQuotaService.DEFAULT_QUOTA_BYTES;

      // 3. Mark expired other pending reservations
      await tx.storageReservation.updateMany({
        where: {
          orgId,
          status: 'pending',
          expiresAt: { lte: new Date() },
          id: { not: uploadId },
        },
        data: {
          status: 'expired',
          updatedAt: new Date(),
        },
      });

      // 4. Committed bytes
      const fileAgg = await tx.fileRecord.aggregate({
        where: { orgId, isDeleted: false },
        _sum: { byteSize: true },
      });
      const committedBytes = fileAgg._sum.byteSize || 0;

      // 5. Active reserved bytes (excluding this reservation)
      const resAgg = await tx.storageReservation.aggregate({
        where: {
          orgId,
          status: 'pending',
          expiresAt: { gt: new Date() },
          id: { not: uploadId },
        },
        _sum: { bytes: true },
      });
      const otherReserved = Number(resAgg._sum.bytes || 0n);
      const newTotalBytes = Number(currentRes.bytes) + additionalBytes;

      if (committedBytes + otherReserved + newTotalBytes > effectiveQuota) {
        throw new QuotaExceededError(`Dung lượng stream vượt quá hạn mức còn lại của workspace`);
      }

      // 6. Update reservation atomically
      await tx.storageReservation.update({
        where: { id: uploadId },
        data: {
          bytes: BigInt(newTotalBytes),
          expiresAt: newExpiresAt,
          updatedAt: new Date(),
        },
      });
    });
  }

  /**
   * Heartbeat to keep reservation active during long-running streaming uploads.
   * Extends reservation lease without changing byte count.
   * Validates uploadId and workspace orgId.
   */
  public async heartbeatReservation(uploadId: string, expectedOrgId?: string): Promise<Date> {
    const prisma = getPrismaClient();
    const newExpiresAt = new Date(Date.now() + StorageQuotaService.DEFAULT_RESERVATION_TTL_MS);

    const whereClause: any = {
      id: uploadId,
      status: 'pending',
    };
    if (expectedOrgId) {
      whereClause.orgId = expectedOrgId;
    }

    const result = await prisma.storageReservation.updateMany({
      where: whereClause,
      data: {
        expiresAt: newExpiresAt,
        updatedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new Error('Không tìm thấy bản ghi giữ chỗ đang chờ xử lý hoặc sai tổ chức');
    }

    return newExpiresAt;
  }

  /**
   * Atomically verify and lock workspace quota when restoring a soft-deleted file.
   * Ensures that concurrent restores or uploads cannot overflow workspace quota.
   */
  public async restoreFileWithQuotaCheck(fileId: string, orgId: string): Promise<any> {
    const prisma = getPrismaClient();

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch file record to restore
      const file = await tx.fileRecord.findFirst({
        where: { id: fileId, orgId, isDeleted: true },
      });
      if (!file) {
        throw new Error('Tệp không tồn tại trong thùng rác hoặc không thuộc tổ chức này');
      }

      // 2. Lock storage_quotas row for this org exclusively
      await tx.storageQuota.upsert({
        where: { orgId },
        create: {
          orgId,
          quotaBytes: BigInt(StorageQuotaService.DEFAULT_QUOTA_BYTES),
        },
        update: {},
      });

      const lockedRows: any[] = await tx.$queryRaw`
        SELECT "quotaBytes" FROM storage_quotas WHERE "orgId" = ${orgId} FOR UPDATE;
      `;
      const effectiveQuota = lockedRows.length > 0
        ? Number(lockedRows[0].quotaBytes)
        : StorageQuotaService.DEFAULT_QUOTA_BYTES;

      // 3. Calculate committed bytes (currently active isDeleted: false)
      const fileAgg = await tx.fileRecord.aggregate({
        where: { orgId, isDeleted: false },
        _sum: { byteSize: true },
      });
      const committedBytes = fileAgg._sum.byteSize || 0;

      // 4. Calculate active reserved bytes
      const resAgg = await tx.storageReservation.aggregate({
        where: {
          orgId,
          status: 'pending',
          expiresAt: { gt: new Date() },
        },
        _sum: { bytes: true },
      });
      const activeReserved = Number(resAgg._sum.bytes || 0n);

      // 5. Check if restoring this file would exceed quota
      if (committedBytes + activeReserved + file.byteSize > effectiveQuota) {
        const availableBytes = Math.max(0, effectiveQuota - committedBytes - activeReserved);
        throw new QuotaExceededError(
          `Không thể khôi phục tệp: Dung lượng workspace không đủ (còn trống ${Math.round(
            availableBytes / 1024
          )} KB, tệp yêu cầu ${Math.round(file.byteSize / 1024)} KB)`
        );
      }

      // 6. Restore file
      const updated = await tx.fileRecord.update({
        where: { id: fileId },
        data: {
          isDeleted: false,
          deletedAt: null,
          updatedAt: new Date(),
        },
      });

      return updated;
    });
  }

  /**
   * Release reservation when upload fails, stream is aborted, or DB persistence fails.
   */
  public async releaseReservation(uploadId: string): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.storageReservation.updateMany({
      where: { id: uploadId, status: 'pending' },
      data: {
        status: 'released',
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Commit reservation once fileRecord is successfully persisted in PostgreSQL.
   * Can be executed inside an existing Prisma transaction client (tx) for atomic consistency.
   */
  public async commitReservation(uploadId: string, tx?: any): Promise<void> {
    const client = tx || getPrismaClient();
    await client.storageReservation.updateMany({
      where: { id: uploadId, status: 'pending' },
      data: {
        status: 'committed',
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Prune stale expired reservations from PostgreSQL.
   */
  public async pruneStaleReservations(orgId?: string): Promise<number> {
    const prisma = getPrismaClient();
    const whereClause: any = {
      status: 'pending',
      expiresAt: { lte: new Date() },
    };
    if (orgId) whereClause.orgId = orgId;

    const result = await prisma.storageReservation.updateMany({
      where: whereClause,
      data: {
        status: 'expired',
        updatedAt: new Date(),
      },
    });
    return result.count;
  }

  /**
   * Get workspace storage statistics.
   */
  public async getWorkspaceUsage(orgId: string): Promise<{ usedBytes: number; quotaBytes: number; reservedBytes: number }> {
    const prisma = getPrismaClient();
    const [fileAgg, reservedBytes, quotaBytes] = await Promise.all([
      prisma.fileRecord.aggregate({
        where: { orgId, isDeleted: false },
        _sum: { byteSize: true },
      }),
      this.getActiveReservedBytes(orgId),
      this.getEffectiveQuota(orgId),
    ]);
    const usedBytes = fileAgg._sum.byteSize || 0;
    return { usedBytes, quotaBytes, reservedBytes };
  }
}
