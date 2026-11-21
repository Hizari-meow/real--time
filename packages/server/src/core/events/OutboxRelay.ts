import { DomainEventEnvelope, OutboxRecord } from './types';
import { EventBus } from './EventBus';

export interface OutboxStorage {
  insert(record: OutboxRecord): Promise<void>;
  fetchPending(limit: number, orgId?: string): Promise<OutboxRecord[]>;
  markProcessed(id: string): Promise<void>;
  incrementAttempts(id: string): Promise<void>;
}

export class InMemoryOutboxStorage implements OutboxStorage {
  private records = new Map<string, OutboxRecord>();

  async insert(record: OutboxRecord): Promise<void> {
    this.records.set(record.id, { ...record });
  }

  async fetchPending(limit: number, orgId?: string): Promise<OutboxRecord[]> {
    const pending: OutboxRecord[] = [];
    for (const rec of this.records.values()) {
      if (!rec.processedAt && (!orgId || rec.orgId === orgId)) {
        pending.push({ ...rec });
        if (pending.length >= limit) break;
      }
    }
    return pending;
  }

  async markProcessed(id: string): Promise<void> {
    const rec = this.records.get(id);
    if (rec) {
      rec.processedAt = new Date().toISOString();
    }
  }

  async incrementAttempts(id: string): Promise<void> {
    const rec = this.records.get(id);
    if (rec) {
      rec.attempts += 1;
    }
  }

  getAll(): OutboxRecord[] {
    return Array.from(this.records.values());
  }

  clear(): void {
    this.records.clear();
  }
}

export class PrismaOutboxStorage implements OutboxStorage {
  constructor(private prisma: any) {}

  async insert(record: OutboxRecord): Promise<void> {
    await this.prisma.outboxEvent.create({
      data: {
        id: record.id,
        type: record.type,
        orgId: record.orgId,
        payload: JSON.stringify(record.payload),
        occurredAt: new Date(record.occurredAt),
        attempts: record.attempts,
        processedAt: record.processedAt ? new Date(record.processedAt) : null,
      },
    });
  }

  async fetchPending(limit: number, orgId?: string): Promise<OutboxRecord[]> {
    const where: any = { processedAt: null };
    if (orgId) {
      where.orgId = orgId;
    }

    const rows = await this.prisma.outboxEvent.findMany({
      where,
      orderBy: { occurredAt: 'asc' },
      take: limit,
    });

    return rows.map((r: any) => ({
      id: r.id,
      type: r.type,
      orgId: r.orgId || '',
      payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
      occurredAt: r.occurredAt.toISOString(),
      processedAt: r.processedAt ? r.processedAt.toISOString() : null,
      attempts: r.attempts,
    }));
  }

  async markProcessed(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: { processedAt: new Date() },
    });
  }

  async incrementAttempts(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }
}

export class OutboxRelay {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    private storage: OutboxStorage,
    private eventBus: EventBus,
    private pollIntervalMs: number = 500
  ) {}

  /**
   * Stage an event into the transactional outbox
   */
  async stageEvent(event: DomainEventEnvelope): Promise<OutboxRecord> {
    const record: OutboxRecord = {
      id: event.id,
      type: event.type,
      orgId: event.orgId,
      payload: event,
      occurredAt: event.occurredAt || new Date().toISOString(),
      attempts: 0,
    };
    await this.storage.insert(record);
    return record;
  }

  /**
   * Mark a staged record as processed
   */
  async markProcessed(id: string): Promise<void> {
    await this.storage.markProcessed(id);
  }

  /**
   * Process a batch of pending outbox events
   */
  async processBatch(limit: number = 50, orgId?: string): Promise<number> {
    if (this.isProcessing) return 0;
    this.isProcessing = true;

    try {
      const pending = await this.storage.fetchPending(limit, orgId);
      for (const record of pending) {
        try {
          await this.storage.incrementAttempts(record.id);
          const success = await this.eventBus.dispatch(record.payload);
          if (success) {
            await this.storage.markProcessed(record.id);
          }
        } catch (err) {
          console.error(`[OutboxRelay] Failed to relay event ${record.id}:`, err);
        }
      }
      return pending.length;
    } finally {
      this.isProcessing = false;
    }
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.processBatch().catch((err) => {
        console.error('[OutboxRelay] Background processBatch error:', err);
      });
    }, this.pollIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
