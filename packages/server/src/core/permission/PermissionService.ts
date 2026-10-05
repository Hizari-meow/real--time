import {
  UserContext,
  ResourceContext,
  ResourceRole,
  ActionType,
  ResourceAclEntry,
  ShareLinkContext,
  SpaceRole,
} from './types';

const ROLE_RANK: Record<ResourceRole, number> = {
  viewer: 1,
  commenter: 2,
  editor: 3,
  manager: 4,
};

const ACTION_MIN_ROLE: Record<ActionType, ResourceRole> = {
  view: 'viewer',
  download: 'viewer',
  comment: 'commenter',
  suggest: 'commenter',
  edit: 'editor',
  create: 'editor',
  delete: 'manager',
  manage: 'manager',
  share: 'manager',
};

export interface PermissionProvider {
  getAcls(resourceId: string): Promise<ResourceAclEntry[]>;
  getParentResource?(resourceId: string): Promise<ResourceContext | null>;
  getSpaceMemberRole?(spaceId: string, userId: string): Promise<SpaceRole | null>;
}

export class PermissionService {
  constructor(private provider?: PermissionProvider) {}

  /**
   * Main permission check: can(user, action, resource, shareLink?)
   * Implements Section 4.1 hierarchy:
   * 1. Validate active user membership in Org (or valid share link)
   * 2. Org owner / admin rights
   * 3. Space-level role
   * 4. Direct resource_acl (user -> group -> space -> org)
   * 5. Inheritance (inherit_acl)
   * 6. Share links
   * 7. Expiry checks
   * 8. Default deny
   */
  async can(
    user: UserContext | null,
    action: ActionType,
    resource: ResourceContext,
    shareLink?: ShareLinkContext | null,
    injectedAcls?: ResourceAclEntry[]
  ): Promise<boolean> {
    const requiredRole = ACTION_MIN_ROLE[action];
    const requiredRank = ROLE_RANK[requiredRole];

    const now = new Date().toISOString();

    // 1. Share link evaluation (can allow access even if user is not in org, if scope is 'anyone')
    if (shareLink) {
      if (
        shareLink.resourceId === resource.id &&
        !shareLink.revokedAt &&
        (!shareLink.expiresAt || shareLink.expiresAt > now)
      ) {
        if (shareLink.scope === 'anyone' || (user && user.orgId === shareLink.orgId)) {
          if (action === 'download' && shareLink.allowDownload === false) {
            return false;
          }
          if (ROLE_RANK[shareLink.role] >= requiredRank) {
            return true;
          }
        }
      }
    }

    // If no user context, cannot proceed without share link
    if (!user) {
      return false;
    }

    // 2. Validate user belongs to the same org and is active
    if (user.orgId !== resource.orgId || user.status !== 'active') {
      return false;
    }

    // Guest expiry check
    if (user.orgRole === 'guest' && user.guestExpiresAt && user.guestExpiresAt <= now) {
      return false;
    }

    // 3. Org Owner has full manager capabilities on all resources in the org
    if (user.orgRole === 'owner') {
      return true;
    }

    // 4. Resource direct owner
    if (resource.ownerId && resource.ownerId === user.id) {
      return true;
    }

    // 5. Check direct ACL entries on the resource
    let effectiveRole: ResourceRole | null = null;
    const acls = injectedAcls || (this.provider ? await this.provider.getAcls(resource.id) : []);

    for (const acl of acls) {
      // Check expiry
      if (acl.expiresAt && acl.expiresAt <= now) {
        continue;
      }

      let matches = false;
      if (acl.principalType === 'user' && acl.principalId === user.id) {
        matches = true;
      } else if (
        acl.principalType === 'group' &&
        user.groupIds &&
        user.groupIds.includes(acl.principalId)
      ) {
        matches = true;
      } else if (
        acl.principalType === 'space' &&
        resource.spaceId &&
        acl.principalId === resource.spaceId
      ) {
        matches = true;
      } else if (acl.principalType === 'org' && acl.principalId === user.orgId) {
        matches = true;
      }

      if (matches) {
        if (!effectiveRole || ROLE_RANK[acl.role] > ROLE_RANK[effectiveRole]) {
          effectiveRole = acl.role;
        }
      }
    }

    // 6. Check Space Role if resource belongs to a space
    if (resource.spaceId && this.provider?.getSpaceMemberRole) {
      const spaceRole = await this.provider.getSpaceMemberRole(resource.spaceId, user.id);
      if (spaceRole === 'space_admin') {
        const spaceResourceRole: ResourceRole = 'manager';
        if (!effectiveRole || ROLE_RANK[spaceResourceRole] > ROLE_RANK[effectiveRole]) {
          effectiveRole = spaceResourceRole;
        }
      } else if (spaceRole === 'member') {
        const spaceResourceRole: ResourceRole = 'editor';
        if (!effectiveRole || ROLE_RANK[spaceResourceRole] > ROLE_RANK[effectiveRole]) {
          effectiveRole = spaceResourceRole;
        }
      } else if (spaceRole === 'viewer') {
        const spaceResourceRole: ResourceRole = 'viewer';
        if (!effectiveRole || ROLE_RANK[spaceResourceRole] > ROLE_RANK[effectiveRole]) {
          effectiveRole = spaceResourceRole;
        }
      }
    }

    // 7. Check Inherited ACL from parent resource if inheritAcl is true
    if (resource.inheritAcl && resource.parentResourceId && this.provider?.getParentResource) {
      const parent = await this.provider.getParentResource(resource.parentResourceId);
      if (parent) {
        const parentCan = await this.can(user, action, parent, null);
        if (parentCan) {
          return true;
        }
      }
    }

    // 8. If effectiveRole was found, verify against required rank
    if (effectiveRole && ROLE_RANK[effectiveRole] >= requiredRank) {
      return true;
    }

    // 9. Org Admin defaults to editor on public resources (except private spaces / break-glass)
    if (user.orgRole === 'admin' && !resource.parentResourceId) {
      if (ROLE_RANK['editor'] >= requiredRank) {
        return true;
      }
    }

    // 10. Default Deny
    return false;
  }
}
