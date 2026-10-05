/**
 * Core Domain Event & Outbox Types
 * Based on SPECIFICATION.md - Section 4.2 & Appendix A
 */

export interface EventActor {
  type: 'user' | 'bot' | 'system' | 'automation';
  id: string;
  name?: string;
}

export interface EventResourceRef {
  type: string;
  id: string;
  projectId?: string;
  channelId?: string;
  spaceId?: string;
}

export interface EventOrigin {
  automationId?: string | null;
  chainDepth: number;
}

export interface DomainEventEnvelope<T = Record<string, unknown>> {
  id: string;
  type: string;
  version: number;
  orgId: string;
  actor: EventActor;
  occurredAt: string;
  resource: EventResourceRef;
  data: T;
  origin: EventOrigin;
}

export interface OutboxRecord {
  id: string;
  type: string;
  orgId: string;
  payload: DomainEventEnvelope;
  occurredAt: string;
  processedAt?: string | null;
  attempts: number;
}

export type EventHandler<T = Record<string, unknown>> = (
  event: DomainEventEnvelope<T>
) => Promise<void>;
