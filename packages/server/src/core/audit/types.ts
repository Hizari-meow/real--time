/**
 * Core Audit Types
 * Based on SPECIFICATION.md - Section 4.9 & 12.4
 */

export interface AuditRecordInput {
  orgId: string;
  actorId: string;
  actorType: 'user' | 'bot' | 'system' | 'automation';
  action: string;
  resourceType: string;
  resourceId: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditRecord extends AuditRecordInput {
  id: string;
  prevHash: string;
  hash: string;
  createdAt: string;
}
