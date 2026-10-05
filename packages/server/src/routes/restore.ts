import { Router, Request, Response } from 'express';
import { getPrismaClient } from '../storage/db.js';
import { S3StorageService } from '../storage/s3-client.js';
import { RoomManager } from '../ws/room-manager.js';

export const restoreRouter = Router();
const prisma = getPrismaClient();
const s3 = S3StorageService.getInstance();

restoreRouter.post('/:id/restore/:versionId', async (req: Request, res: Response) => {
  const { id: documentId, versionId } = req.params;

  try {
    // 1. Locate snapshot record by UUID or numeric version
    let snapshot = await prisma.documentSnapshot.findFirst({
      where: {
        documentId,
        OR: [
          { id: versionId },
          { version: isNaN(parseInt(versionId, 10)) ? -1 : parseInt(versionId, 10) },
        ],
      },
    });

    if (!snapshot) {
      return res.status(404).json({
        success: false,
        error: `Snapshot not found for document ${documentId} and version identifier ${versionId}`,
      });
    }

    console.log(
      `[RestoreAPI] Restoring doc ${documentId} to version ${snapshot.version} from ${snapshot.s3Key}`
    );

    // 2. Fetch binary state snapshot from MinIO / S3
    const binaryState = await s3.getSnapshot(snapshot.s3Key);

    // 3. Restore in-memory Y.Doc and broadcast state reset over Redis to all active nodes
    const roomManager = RoomManager.getInstance();
    await roomManager.restoreDocumentState(documentId, binaryState);

    // 4. Record milestone restoration entry in PostgreSQL
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    const newVersion = (doc?.currentVersion || 1) + 1;

    await prisma.$transaction([
      prisma.document.update({
        where: { id: documentId },
        data: {
          currentVersion: newVersion,
          latestS3Key: snapshot.s3Key,
          updatedAt: new Date(),
        },
      }),
      prisma.documentHistory.create({
        data: {
          documentId,
          version: newVersion,
          snapshotId: snapshot.id,
          changeSummary: `Restored state rollback from version ${snapshot.version}`,
        },
      }),
    ]);

    res.json({
      success: true,
      message: `Document state restored to version ${snapshot.version}`,
      data: {
        documentId,
        restoredVersion: snapshot.version,
        newVersion,
      },
    });
  } catch (err: any) {
    console.error(`[RestoreAPI] Error restoring document ${documentId}:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});
