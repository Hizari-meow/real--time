import { getPrismaClient } from '../../storage/db.js';
import { S3StorageService } from '../../storage/s3-client.js';

export interface ReconcileOrphansOptions {
  orgId?: string;
  minAgeMinutes?: number;
  dryRun?: boolean;
}

export interface ReconcileMetrics {
  scannedCount: number;
  validCount: number;
  activeInFlightCount: number;
  orphanedCount: number;
  deletedCount: number;
  reclaimedBytes: number;
  durationMs: number;
  dryRun: boolean;
  errors: string[];
}

/**
 * Service to reconcile MinIO S3 binary objects against PostgreSQL file_records and storage_reservations.
 * Detects and reclaims orphaned objects created when an API process experiences a hard crash (SIGKILL/OOM)
 * after writing to S3 but before PostgreSQL persistence succeeds.
 */
export class OrphanStorageReaper {
  private static instance: OrphanStorageReaper | null = null;
  public static readonly DEFAULT_MIN_AGE_MINUTES = 15; // 15 mins (exceeds 10-min reservation TTL)

  public static getInstance(): OrphanStorageReaper {
    if (!OrphanStorageReaper.instance) {
      OrphanStorageReaper.instance = new OrphanStorageReaper();
    }
    return OrphanStorageReaper.instance;
  }

  /**
   * Reconcile MinIO objects and prune orphans safely with age and reservation checks.
   */
  public async reconcileOrphans(options: ReconcileOrphansOptions = {}): Promise<ReconcileMetrics> {
    const startTime = Date.now();
    const s3 = S3StorageService.getInstance();
    const prisma = getPrismaClient();

    const minAgeMinutes = options.minAgeMinutes ?? OrphanStorageReaper.DEFAULT_MIN_AGE_MINUTES;
    const minAgeMs = minAgeMinutes * 60 * 1000;
    const isDryRun = options.dryRun === true;

    const prefix = options.orgId ? `orgs/${options.orgId}/files/` : 'orgs/';
    const objects = await s3.listFiles(prefix);

    const metrics: ReconcileMetrics = {
      scannedCount: 0,
      validCount: 0,
      activeInFlightCount: 0,
      orphanedCount: 0,
      deletedCount: 0,
      reclaimedBytes: 0,
      durationMs: 0,
      dryRun: isDryRun,
      errors: [],
    };

    const fileKeyRegex = /^orgs\/([^/]+)\/files\/([^/]+)\/(.+)$/;

    for (const obj of objects) {
      if (!obj.key) continue;
      const match = obj.key.match(fileKeyRegex);
      if (!match) {
        // Skip non-file keys (such as snapshots/ or temporary roots)
        continue;
      }

      metrics.scannedCount++;
      const [_, orgId, fileId, fileName] = match;

      // 1. Age Threshold Check: Never delete objects newer than minAgeMs
      const lastModifiedTime = obj.lastModified ? obj.lastModified.getTime() : startTime;
      const ageMs = startTime - lastModifiedTime;

      if (ageMs < minAgeMs) {
        // Safe grace period: file could be currently in-flight
        metrics.activeInFlightCount++;
        continue;
      }

      // 2. Check PostgreSQL FileRecord persistence
      const fileRecord = await prisma.fileRecord.findFirst({
        where: {
          orgId,
          OR: [
            { id: fileId },
            { s3Key: obj.key },
            { versionsJson: { contains: obj.key } },
          ],
        },
      });

      if (fileRecord) {
        metrics.validCount++;
        continue;
      }

      // 3. Check active pending reservations (in case of an upload held active via heartbeat)
      const activeReservation = await prisma.storageReservation.findFirst({
        where: {
          id: fileId,
          orgId,
          status: 'pending',
          expiresAt: { gt: new Date() },
        },
      });

      if (activeReservation) {
        metrics.activeInFlightCount++;
        continue;
      }

      // 4. Object is confirmed ORPHAN (no DB record, no active lease, older than safe grace threshold)
      metrics.orphanedCount++;
      metrics.reclaimedBytes += obj.size;

      if (!isDryRun) {
        try {
          await s3.deleteObject(obj.key);
          metrics.deletedCount++;
          console.log(`[OrphanStorageReaper] Successfully reclaimed orphaned S3 object: ${obj.key} (${obj.size} bytes)`);
        } catch (delErr: any) {
          const errMsg = `Failed to delete orphan ${obj.key}: ${delErr.message}`;
          metrics.errors.push(errMsg);
          console.error(`[OrphanStorageReaper] ${errMsg}`);
        }
      }
    }

    metrics.durationMs = Date.now() - startTime;
    console.log(
      `[OrphanStorageReaper] Completed reconciliation: scanned=${metrics.scannedCount}, valid=${metrics.validCount}, ` +
      `inFlight=${metrics.activeInFlightCount}, orphans=${metrics.orphanedCount}, deleted=${metrics.deletedCount}, ` +
      `reclaimedBytes=${metrics.reclaimedBytes}, dryRun=${metrics.dryRun}, durationMs=${metrics.durationMs}`
    );

    return metrics;
  }
}
