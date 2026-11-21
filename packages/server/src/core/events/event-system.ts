import { EventBus } from './EventBus.js';
import { OutboxRelay, PrismaOutboxStorage } from './OutboxRelay.js';
import { DomainEventEnvelope } from './types.js';
import { getPrismaClient } from '../../storage/db.js';
import crypto from 'node:crypto';

let eventBusInstance: EventBus | null = null;
let outboxRelayInstance: OutboxRelay | null = null;

export function getEventBus(): EventBus {
  if (!eventBusInstance) {
    eventBusInstance = new EventBus();
  }
  return eventBusInstance;
}

export function getOutboxRelay(): OutboxRelay {
  if (!outboxRelayInstance) {
    const prisma = getPrismaClient();
    const storage = new PrismaOutboxStorage(prisma);
    const bus = getEventBus();
    outboxRelayInstance = new OutboxRelay(storage, bus, 1000);
  }
  return outboxRelayInstance;
}

export async function publishDomainEvent<T = Record<string, unknown>>(
  eventData: {
    type: string;
    orgId: string;
    actor: { type: 'user' | 'bot' | 'system' | 'automation'; id: string; name?: string };
    resource: { type: string; id: string; [key: string]: any };
    data: T;
    origin?: { automationId?: string | null; chainDepth: number };
  }
): Promise<DomainEventEnvelope<T>> {
  const envelope: DomainEventEnvelope<T> = {
    id: `evt_${crypto.randomUUID()}`,
    type: eventData.type,
    version: 1,
    orgId: eventData.orgId,
    actor: eventData.actor,
    occurredAt: new Date().toISOString(),
    resource: eventData.resource,
    data: eventData.data,
    origin: eventData.origin || { chainDepth: 0 },
  };

  const relay = getOutboxRelay();
  // Stage durably in PostgreSQL Outbox table
  const record = await relay.stageEvent(envelope as any);
  // Dispatch immediately via EventBus for low-latency realtime consumers
  await getEventBus().dispatch(envelope as any);
  // Mark as processed in outbox so background pollers do not duplicate the delivery
  await relay.markProcessed(record.id);

  return envelope;
}

/**
 * Stage an event into the Outbox table within an existing Prisma transaction client (tx).
 * Ensures that business mutation and outbox event commit/rollback atomically!
 */
export async function stageOutboxEventInTransaction<T = Record<string, unknown>>(
  tx: any,
  eventData: {
    type: string;
    orgId: string;
    actor: { type: 'user' | 'bot' | 'system' | 'automation'; id: string; name?: string };
    resource: { type: string; id: string; [key: string]: any };
    data: T;
    origin?: { automationId?: string | null; chainDepth: number };
  }
): Promise<DomainEventEnvelope<T>> {
  const envelope: DomainEventEnvelope<T> = {
    id: `evt_${crypto.randomUUID()}`,
    type: eventData.type,
    version: 1,
    orgId: eventData.orgId,
    actor: eventData.actor,
    occurredAt: new Date().toISOString(),
    resource: eventData.resource,
    data: eventData.data,
    origin: eventData.origin || { chainDepth: 0 },
  };

  await tx.outboxEvent.create({
    data: {
      id: envelope.id,
      type: envelope.type,
      orgId: envelope.orgId,
      payload: JSON.stringify(envelope),
      occurredAt: new Date(envelope.occurredAt),
      processedAt: null,
      attempts: 0,
    },
  });

  return envelope;
}

/**
 * Notify EventBus after transaction commits and mark processed in Outbox
 */
export async function dispatchCommittedOutboxEvent(envelope: DomainEventEnvelope<any>): Promise<void> {
  try {
    await getEventBus().dispatch(envelope as any);
    await getOutboxRelay().markProcessed(envelope.id);
  } catch (err) {
    console.warn(`[Outbox] Post-commit dispatch deferred to OutboxRelay poller:`, err);
  }
}

