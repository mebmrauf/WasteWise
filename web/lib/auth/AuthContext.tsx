"use client";

// Client-side auth state, built on top of web/lib/api/auth.ts. Wrap the app in <AuthProvider>
// once, then any page/component can call useAuth() for { user, isLoading, ... }.
// useRequireAuth/useRequireRole below are plain hooks (no visual output) meant to be called
// inside a protected page component.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  signup as apiSignup,
  refreshSession,
  type AuthUser,
  type LoginInput,
  type SignupInput,
  type Role,
} from "../api/auth";

interface AuthContextValue {
  user: AuthUser | null;
  /** True until the initial session-restore (`GET /auth/me`) call resolves. */
  isLoading: boolean;
  login: (input: LoginInput) => Promise<AuthUser>;
  signup: (input: SignupInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  /** Re-fetches the current user from the server (e.g. after a profile edit). */
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    try {
      const current = await getCurrentUser();
      setUser(current);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const login = useCallback(async (input: LoginInput) => {
    const { user: loggedInUser } = await apiLogin(input);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const signup = useCallback(async (input: SignupInput) => {
    const { user: newUser } = await apiSignup(input);
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      // Clear local state even if the server call failed (expired CSRF
      // cookie, network blip, etc.) — the user clicked "log out" and the UI
      // should reflect that regardless of whether the server-side revoke
      // succeeded, rather than leaving the nav stuck showing them as logged in.
      setUser(null);
    }
  }, []);

  const refetchUser = useCallback(async () => {
    const current = await getCurrentUser();
    setUser(current);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, login, signup, logout, refetchUser }),
    [user, isLoading, login, signup, logout, refetchUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth() must be called within an <AuthProvider>");
  }
  return ctx;
}

/**
 * Redirects to `redirectTo` (default "/login") once loading finishes and no
 * user is present. Returns the same shape as useAuth() so callers can still
 * branch on `isLoading` while the redirect is in flight. Pure hook — no JSX.
 */
export function useRequireAuth(redirectTo = "/login"): AuthContextValue {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isLoading && !auth.user) {
      router.replace(redirectTo);
    }
  }, [auth.isLoading, auth.user, redirectTo, router]);

  return auth;
}

/**
 * Like useRequireAuth, but also redirects (to `forbiddenRedirectTo`) if the
 * signed-in user's role isn't in `allowedRoles` — e.g. an admin-only page.
 */
export function useRequireRole(
  allowedRoles: Role[],
  options?: { loginRedirectTo?: string; forbiddenRedirectTo?: string },
): AuthContextValue {
  const auth = useRequireAuth(options?.loginRedirectTo ?? "/login");
  const router = useRouter();
  const forbiddenRedirectTo = options?.forbiddenRedirectTo ?? "/";

  useEffect(() => {
    if (!auth.isLoading && auth.user && !allowedRoles.includes(auth.user.role)) {
      router.replace(forbiddenRedirectTo);
    }
    // allowedRoles is expected to be a stable/inline literal per call site —
    // intentionally not deep-compared here to keep this hook dependency-cheap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isLoading, auth.user, forbiddenRedirectTo, router]);

  return auth;
}

/**
 * Attempts a one-time silent refresh of the access token. Does not throw.
 *
 * `authFetch` (web/lib/api/auth.ts) now calls this same underlying
 * `refreshSession()` automatically whenever any authenticated request comes
 * back 401 — including the `GET /auth/me` call `restoreSession` above runs
 * on initial app load, so a page reload after the (short-lived) access token
 * has expired but the refresh token is still valid already restores the
 * session transparently with no extra wiring needed here. This export is
 * kept as a manual escape hatch for call sites that want to force/pre-empt a
 * refresh outside the request/retry flow (e.g. before a long-running
 * operation) without duplicating the refresh call.
 */
export async function trySilentRefresh(): Promise<boolean> {
  return refreshSession();
}
