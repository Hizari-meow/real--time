import * as crypto from 'crypto';
import { AuditRecord, AuditRecordInput } from './types';

export interface AuditStorage {
  getLastRecord(orgId: string): Promise<AuditRecord | null>;
  append(record: AuditRecord): Promise<void>;
  list(orgId: string, limit?: number): Promise<AuditRecord[]>;
}

export class InMemoryAuditStorage implements AuditStorage {
  private recordsByOrg = new Map<string, AuditRecord[]>();

  async getLastRecord(orgId: string): Promise<AuditRecord | null> {
    const list = this.recordsByOrg.get(orgId);
    if (!list || list.length === 0) return null;
    return list[list.length - 1];
  }

  async append(record: AuditRecord): Promise<void> {
    if (!this.recordsByOrg.has(record.orgId)) {
      this.recordsByOrg.set(record.orgId, []);
    }
    this.recordsByOrg.get(record.orgId)!.push(record);
  }

  async list(orgId: string, limit: number = 100): Promise<AuditRecord[]> {
    const list = this.recordsByOrg.get(orgId) || [];
    return list.slice(-limit);
  }

  clear(): void {
    this.recordsByOrg.clear();
  }
}

export class AuditService {
  constructor(private storage: AuditStorage) {}

  /**
   * Calculate SHA-256 hash for an audit record given the previous hash
   */
  static computeHash(prevHash: string, data: Omit<AuditRecord, 'hash'>): string {
    const contentToHash = JSON.stringify({
      prevHash,
      id: data.id,
      orgId: data.orgId,
      actorId: data.actorId,
      actorType: data.actorType,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      ip: data.ip,
      userAgent: data.userAgent,
      metadata: data.metadata,
      createdAt: data.createdAt,
    });
    return crypto.createHash('sha256').update(contentToHash).digest('hex');
  }

  /**
   * Record a new audit log entry with cryptographic chaining
   */
  async record(input: AuditRecordInput): Promise<AuditRecord> {
    const lastRecord = await this.storage.getLastRecord(input.orgId);
    const prevHash = lastRecord ? lastRecord.hash : 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';

    const id = `aud_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const createdAt = new Date().toISOString();

    const recordData: Omit<AuditRecord, 'hash'> = {
      ...input,
      id,
      prevHash,
      createdAt,
    };

    const hash = AuditService.computeHash(prevHash, recordData);
    const record: AuditRecord = {
      ...recordData,
      hash,
    };

    await this.storage.append(record);
    return record;
  }

  /**
   * List audit logs for an organization
   */
  async list(orgId: string, limit?: number): Promise<AuditRecord[]> {
    return this.storage.list(orgId, limit);
  }

  /**
   * Cryptographically verify the integrity of the audit log chain
   * Returns valid: true if intact, or valid: false with the offending record id
   */
  static verifyChain(records: AuditRecord[]): { valid: boolean; brokenAtRecordId?: string; reason?: string } {
    let expectedPrevHash = 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';

    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      if (rec.prevHash !== expectedPrevHash) {
        return {
          valid: false,
          brokenAtRecordId: rec.id,
          reason: `Previous hash mismatch at index ${i}: expected ${expectedPrevHash}, got ${rec.prevHash}`,
        };
      }

      const computedHash = AuditService.computeHash(rec.prevHash, rec);
      if (computedHash !== rec.hash) {
        return {
          valid: false,
          brokenAtRecordId: rec.id,
          reason: `Content hash tampering detected at index ${i}: computed ${computedHash}, got ${rec.hash}`,
        };
      }

      expectedPrevHash = rec.hash;
    }

    return { valid: true };
  }
}
