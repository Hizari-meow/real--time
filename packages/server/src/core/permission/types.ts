/**
 * Core Permission Types
 * Based on SPECIFICATION.md - Section 3.1, 3.2, 4.1 & 12.1
 */

export type OrgRole = 'owner' | 'admin' | 'member' | 'guest';

export type SpaceRole = 'space_admin' | 'member' | 'viewer';

export type ResourceRole = 'viewer' | 'commenter' | 'editor' | 'manager';

export type PrincipalType = 'user' | 'group' | 'space' | 'org';

export type ResourceType =
  | 'document'
  | 'sheet'
  | 'slide'
  | 'whiteboard'
  | 'wiki_page'
  | 'file'
  | 'folder'
  | 'channel'
  | 'project'
  | 'collection';

export interface UserContext {
  id: string;
  orgId: string;
  orgRole: OrgRole;
  groupIds?: string[];
  status: 'active' | 'suspended' | 'deleted';
  guestExpiresAt?: string | null;
}

export interface ResourceContext {
  id: string;
  type: ResourceType;
  orgId: string;
  spaceId?: string | null;
  folderId?: string | null;
  parentResourceId?: string | null;
  ownerId?: string | null;
  inheritAcl?: boolean;
}

export interface ResourceAclEntry {
  id: string;
  orgId: string;
  resourceType: ResourceType;
  resourceId: string;
  principalType: PrincipalType;
  principalId: string;
  role: ResourceRole;
  expiresAt?: string | null;
  createdBy: string;
}

export interface ShareLinkContext {
  id: string;
  orgId: string;
  resourceType: ResourceType;
  resourceId: string;
  token: string;
  role: ResourceRole;
  scope: 'anyone' | 'org';
  passwordHash?: string | null;
  expiresAt?: string | null;
  allowDownload?: boolean;
  revokedAt?: string | null;
}

export type ActionType =
  | 'view'
  | 'download'
  | 'comment'
  | 'suggest'
  | 'edit'
  | 'create'
  | 'delete'
  | 'manage'
  | 'share';
