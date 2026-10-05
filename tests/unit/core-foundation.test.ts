import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import {
  PermissionService,
  UserContext,
  ResourceContext,
  ResourceAclEntry,
  ShareLinkContext,
} from '../../packages/server/src/core/permission';
import {
  EventBus,
  OutboxRelay,
  InMemoryOutboxStorage,
  DomainEventEnvelope,
} from '../../packages/server/src/core/events';
import {
  AuditService,
  InMemoryAuditStorage,
} from '../../packages/server/src/core/audit';

describe('PHASE 0: Core Foundation Test Suite', () => {
  describe('1. PermissionService Evaluation Hierarchy', () => {
    const permService = new PermissionService();

    const sampleResource: ResourceContext = {
      id: 'doc_123',
      type: 'document',
      orgId: 'org_main',
      spaceId: 'space_engineering',
    };

    test('Org Owner has full manager capabilities on any org resource', async () => {
      const owner: UserContext = {
        id: 'usr_owner',
        orgId: 'org_main',
        orgRole: 'owner',
        status: 'active',
      };

      const canView = await permService.can(owner, 'view', sampleResource);
      const canEdit = await permService.can(owner, 'edit', sampleResource);
      const canDelete = await permService.can(owner, 'delete', sampleResource);
      const canShare = await permService.can(owner, 'share', sampleResource);

      assert.strictEqual(canView, true);
      assert.strictEqual(canEdit, true);
      assert.strictEqual(canDelete, true);
      assert.strictEqual(canShare, true);
    });

    test('Viewer ACL allows viewing/downloading but denies editing and deleting', async () => {
      const viewer: UserContext = {
        id: 'usr_viewer',
        orgId: 'org_main',
        orgRole: 'member',
        status: 'active',
      };

      const viewerAcl: ResourceAclEntry[] = [
        {
          id: 'acl_1',
          orgId: 'org_main',
          resourceType: 'document',
          resourceId: 'doc_123',
          principalType: 'user',
          principalId: 'usr_viewer',
          role: 'viewer',
          createdBy: 'usr_owner',
        },
      ];

      const canView = await permService.can(viewer, 'view', sampleResource, null, viewerAcl);
      const canEdit = await permService.can(viewer, 'edit', sampleResource, null, viewerAcl);
      const canDelete = await permService.can(viewer, 'delete', sampleResource, null, viewerAcl);

      assert.strictEqual(canView, true);
      assert.strictEqual(canEdit, false);
      assert.strictEqual(canDelete, false);
    });

    test('Editor ACL allows editing and commenting but denies deleting', async () => {
      const editor: UserContext = {
        id: 'usr_editor',
        orgId: 'org_main',
        orgRole: 'member',
        status: 'active',
      };

      const editorAcl: ResourceAclEntry[] = [
        {
          id: 'acl_2',
          orgId: 'org_main',
          resourceType: 'document',
          resourceId: 'doc_123',
          principalType: 'user',
          principalId: 'usr_editor',
          role: 'editor',
          createdBy: 'usr_owner',
        },
      ];

      const canView = await permService.can(editor, 'view', sampleResource, null, editorAcl);
      const canComment = await permService.can(editor, 'comment', sampleResource, null, editorAcl);
      const canEdit = await permService.can(editor, 'edit', sampleResource, null, editorAcl);
      const canDelete = await permService.can(editor, 'delete', sampleResource, null, editorAcl);

      assert.strictEqual(canView, true);
      assert.strictEqual(canComment, true);
      assert.strictEqual(canEdit, true);
      assert.strictEqual(canDelete, false);
    });

    test('Group ACL matches user groups', async () => {
      const engineer: UserContext = {
        id: 'usr_eng_1',
        orgId: 'org_main',
        orgRole: 'member',
        groupIds: ['grp_devs'],
        status: 'active',
      };

      const groupAcl: ResourceAclEntry[] = [
        {
          id: 'acl_3',
          orgId: 'org_main',
          resourceType: 'document',
          resourceId: 'doc_123',
          principalType: 'group',
          principalId: 'grp_devs',
          role: 'editor',
          createdBy: 'usr_owner',
        },
      ];

      const canEdit = await permService.can(engineer, 'edit', sampleResource, null, groupAcl);
      assert.strictEqual(canEdit, true);
    });

    test('Expired ACL is ignored and defaults to deny', async () => {
      const user: UserContext = {
        id: 'usr_temp',
        orgId: 'org_main',
        orgRole: 'member',
        status: 'active',
      };

      const expiredAcl: ResourceAclEntry[] = [
        {
          id: 'acl_4',
          orgId: 'org_main',
          resourceType: 'document',
          resourceId: 'doc_123',
          principalType: 'user',
          principalId: 'usr_temp',
          role: 'editor',
          expiresAt: '2020-01-01T00:00:00Z',
          createdBy: 'usr_owner',
        },
      ];

      const canEdit = await permService.can(user, 'edit', sampleResource, null, expiredAcl);
      assert.strictEqual(canEdit, false);
    });

    test('Valid share link allows access even without user login (scope: anyone)', async () => {
      const shareLink: ShareLinkContext = {
        id: 'lnk_1',
        orgId: 'org_main',
        resourceType: 'document',
        resourceId: 'doc_123',
        token: 'secret_token_123',
        role: 'commenter',
        scope: 'anyone',
      };

      const canView = await permService.can(null, 'view', sampleResource, shareLink);
      const canComment = await permService.can(null, 'comment', sampleResource, shareLink);
      const canEdit = await permService.can(null, 'edit', sampleResource, shareLink);

      assert.strictEqual(canView, true);
      assert.strictEqual(canComment, true);
      assert.strictEqual(canEdit, false);
    });
  });

  describe('2. EventBus & Transactional Outbox Pattern', () => {
    test('OutboxRelay stages events, processes batch and dispatches through EventBus', async () => {
      const outboxStorage = new InMemoryOutboxStorage();
      const eventBus = new EventBus();
      const relay = new OutboxRelay(outboxStorage, eventBus);

      const receivedEvents: DomainEventEnvelope[] = [];
      eventBus.subscribe('task.*', async (event) => {
        receivedEvents.push(event);
      });

      const sampleEvent: DomainEventEnvelope = {
        id: 'evt_001',
        type: 'task.completed',
        version: 1,
        orgId: 'org_main',
        actor: { type: 'user', id: 'usr_1', name: 'Minh' },
        occurredAt: new Date().toISOString(),
        resource: { type: 'task', id: 'tsk_101', projectId: 'prj_web' },
        data: { title: 'Thiết kế giao diện', previousStatus: 'doing', newStatus: 'done' },
        origin: { automationId: null, chainDepth: 0 },
      };

      // Stage into outbox
      await relay.stageEvent(sampleEvent);
      assert.strictEqual(outboxStorage.getAll().length, 1);
      assert.strictEqual(outboxStorage.getAll()[0].processedAt, undefined);

      // Process batch
      const count = await relay.processBatch();
      assert.strictEqual(count, 1);
      assert.strictEqual(receivedEvents.length, 1);
      assert.strictEqual(receivedEvents[0].id, 'evt_001');

      // Check marked processed
      const updated = outboxStorage.getAll()[0];
      assert.ok(updated.processedAt !== undefined);
      assert.strictEqual(updated.attempts, 1);
    });

    test('Loop prevention stops events with chainDepth >= 5', async () => {
      const eventBus = new EventBus();
      let wasCalled = false;
      eventBus.subscribe('*', async () => {
        wasCalled = true;
      });

      const loopingEvent: DomainEventEnvelope = {
        id: 'evt_loop',
        type: 'task.updated',
        version: 1,
        orgId: 'org_main',
        actor: { type: 'automation', id: 'auto_1' },
        occurredAt: new Date().toISOString(),
        resource: { type: 'task', id: 'tsk_loop' },
        data: {},
        origin: { automationId: 'auto_1', chainDepth: 5 },
      };

      const result = await eventBus.dispatch(loopingEvent);
      assert.strictEqual(result, false);
      assert.strictEqual(wasCalled, false);
    });
  });

  describe('3. AuditService SHA-256 Hash Chaining', () => {
    test('Consecutive audit logs form a valid cryptographic SHA-256 hash chain', async () => {
      const storage = new InMemoryAuditStorage();
      const audit = new AuditService(storage);

      const r1 = await audit.record({
        orgId: 'org_main',
        actorId: 'usr_admin',
        actorType: 'user',
        action: 'user.invited',
        resourceType: 'user',
        resourceId: 'usr_new',
        metadata: { email: 'an@congty.com', role: 'member' },
      });

      const r2 = await audit.record({
        orgId: 'org_main',
        actorId: 'usr_admin',
        actorType: 'user',
        action: 'permission.granted',
        resourceType: 'space',
        resourceId: 'space_sales',
        metadata: { targetUser: 'usr_new', role: 'member' },
      });

      const r3 = await audit.record({
        orgId: 'org_main',
        actorId: 'usr_new',
        actorType: 'user',
        action: 'document.created',
        resourceType: 'document',
        resourceId: 'doc_rfc_01',
      });

      const logs = await audit.list('org_main');
      assert.strictEqual(logs.length, 3);

      // Verify chaining
      assert.strictEqual(r2.prevHash, r1.hash);
      assert.strictEqual(r3.prevHash, r2.hash);

      const verification = AuditService.verifyChain(logs);
      assert.strictEqual(verification.valid, true);
    });

    test('Audit verification detects if record content or hash has been tampered with', async () => {
      const storage = new InMemoryAuditStorage();
      const audit = new AuditService(storage);

      await audit.record({
        orgId: 'org_test',
        actorId: 'usr_1',
        actorType: 'user',
        action: 'auth.login',
        resourceType: 'session',
        resourceId: 'ses_1',
      });

      await audit.record({
        orgId: 'org_test',
        actorId: 'usr_1',
        actorType: 'user',
        action: 'policy.changed',
        resourceType: 'org',
        resourceId: 'org_test',
        metadata: { allowedDomains: ['congty.com'] },
      });

      const logs = await audit.list('org_test');
      assert.strictEqual(AuditService.verifyChain(logs).valid, true);

      // Tamper with second record's action
      logs[1].action = 'tampered.action';

      const verification = AuditService.verifyChain(logs);
      assert.strictEqual(verification.valid, false);
      assert.ok(verification.reason?.includes('Content hash tampering detected'));
    });
  });
});
