'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

export interface WorkspaceSummary {
  orgId: string;
  orgName: string;
  slug: string;
  role: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  workspace: WorkspaceSummary | null;
  workspaces: WorkspaceSummary[];
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    email: string,
    password: string,
    name: string,
    orgName?: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchWorkspace: (orgId: string) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8080/api` : 'http://localhost:8080/api');

// Singleton in-flight promise to prevent concurrent duplicate refresh requests (e.g. from React Strict Mode)
let activeRefreshPromise: Promise<boolean> | null = null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = () => {
    localStorage.removeItem('collab_access_token');
    localStorage.removeItem('collab_active_org_id');
    localStorage.removeItem('collab_has_session');
    setToken(null);
    setUser(null);
    setWorkspace(null);
    setWorkspaces([]);
  };

  const attemptRefreshToken = async (): Promise<boolean> => {
    if (activeRefreshPromise) {
      return activeRefreshPromise;
    }

    activeRefreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (!res.ok) {
          return false;
        }

        const body = await res.json();
        if (body.success && body.data?.accessToken) {
          setToken(body.data.accessToken);
          localStorage.setItem('collab_access_token', body.data.accessToken);
          localStorage.setItem('collab_has_session', 'true');

          // Fetch /me
          const meRes = await fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${body.data.accessToken}` },
            credentials: 'include',
          });
          if (meRes.ok) {
            const meBody = await meRes.json();
            setUser(meBody.data.user);
            setWorkspaces(meBody.data.workspaces || []);
            setWorkspace(meBody.data.workspaces?.[0] || null);
            return true;
          }
        }
        return false;
      } catch {
        return false;
      } finally {
        activeRefreshPromise = null;
      }
    })();

    return activeRefreshPromise;
  };

  // Load session on startup
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const storedToken = localStorage.getItem('collab_access_token');
        const hasSession = localStorage.getItem('collab_has_session') === 'true';

        // Case 1: Fresh visitor without session - skip probe, show auth modal directly
        if (!storedToken && !hasSession) {
          if (isMounted) {
            setIsLoading(false);
          }
          return;
        }

        // Case 2: Has active access token - verify with /me
        if (storedToken) {
          setToken(storedToken);
          const res = await fetch(`${API_BASE}/auth/me`, {
            headers: {
              Authorization: `Bearer ${storedToken}`,
            },
            credentials: 'include',
          });

          if (res.ok) {
            const body = await res.json();
            if (body.success && body.data && isMounted) {
              setUser(body.data.user);
              setWorkspaces(body.data.workspaces || []);

              const savedOrgId = localStorage.getItem('collab_active_org_id');
              const matchedOrg = (body.data.workspaces || []).find(
                (w: WorkspaceSummary) => w.orgId === savedOrgId
              );
              setWorkspace(matchedOrg || body.data.workspaces?.[0] || null);
              setIsLoading(false);
              return;
            }
          }
        }

        // Case 3: Access token missing or expired, but hasSession flag is true - attempt refresh
        const refreshSuccess = await attemptRefreshToken();
        if (!refreshSuccess && isMounted) {
          clearSession();
        }
      } catch {
        if (isMounted) {
          clearSession();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        return { success: false, error: body.error || 'Email hoặc mật khẩu không chính xác' };
      }

      const { user: authedUser, tokens, workspaces: userWorkspaces } = body.data;
      setToken(tokens.accessToken);
      localStorage.setItem('collab_access_token', tokens.accessToken);
      localStorage.setItem('collab_has_session', 'true');
      setUser(authedUser);
      setWorkspaces(userWorkspaces || []);

      const initialOrg = userWorkspaces?.[0] || null;
      setWorkspace(initialOrg);
      if (initialOrg) {
        localStorage.setItem('collab_active_org_id', initialOrg.orgId);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi kết nối tới máy chủ xác thực' };
    }
  };

  const register = async (email: string, password: string, name: string, orgName?: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, name, orgName }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        return { success: false, error: body.error || 'Đăng ký tài khoản thất bại' };
      }

      const { user: authedUser, tokens, workspaces: userWorkspaces } = body.data;
      setToken(tokens.accessToken);
      localStorage.setItem('collab_access_token', tokens.accessToken);
      localStorage.setItem('collab_has_session', 'true');
      setUser(authedUser);
      setWorkspaces(userWorkspaces || []);

      const initialOrg = userWorkspaces?.[0] || null;
      setWorkspace(initialOrg);
      if (initialOrg) {
        localStorage.setItem('collab_active_org_id', initialOrg.orgId);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi kết nối tới máy chủ xác thực' };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      clearSession();
    }
  };

  const switchWorkspace = (orgId: string) => {
    const matched = workspaces.find((w) => w.orgId === orgId);
    if (matched) {
      setWorkspace(matched);
      localStorage.setItem('collab_active_org_id', matched.orgId);
    }
  };

  const refreshProfile = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.data) {
          setUser(body.data.user);
          setWorkspaces(body.data.workspaces || []);
        }
      }
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        workspace,
        workspaces,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        logout,
        switchWorkspace,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
