export interface AuthenticatedUser {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

export interface WorkspaceContext {
  orgId: string;
  orgName: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
  status: 'active' | 'suspended';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface WorkspaceSummary {
  orgId: string;
  orgName: string;
  slug: string;
  role: string;
}

export interface AuthResponse {
  user: AuthenticatedUser;
  tokens: TokenPair;
  workspaces: WorkspaceSummary[];
}
