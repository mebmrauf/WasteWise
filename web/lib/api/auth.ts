// Client-side API for /api/v1/auth/*. Talks to the Express backend over httpOnly cookies
// (api-contract.md "Authentication") — never stores a token in JS-reachable storage. Pages
// should build forms against these functions rather than calling fetch() directly.
import { publicEnv } from "../env";

// Mirrors the Prisma `Role` enum (server/prisma/schema.prisma). ADMIN is
// listed because a logged-in admin's `user.role` can legitimately be
// "ADMIN" — it's simply never offered as a selectable option on signup.
export type Role = "USER" | "COLLECTOR" | "RECYCLING_COMPANY" | "ADMIN";

// Only the Collector/Recycling Company roles are actually selectable at
// signup — USER is the default and ADMIN is never self-service.
export type SelectableRole = Extract<Role, "USER" | "COLLECTOR" | "RECYCLING_COMPANY">;

// Mirrors the Prisma `AccountType` enum (server/prisma/schema.prisma) — only
// meaningful when `role` is "USER"; null for Collector/Recycling
// Company/Admin accounts. See docs/api-contract.md §4 for the validation
// rule.
export type AccountType = "HOUSEHOLD" | "BUSINESS";

export interface AuthUser {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  role: Role;
  accountType: AccountType | null;
  isEmailVerified: boolean;
  createdAt: string;
}

export interface ApiError {
  code: string;
  message: string;
}

export class AuthApiError extends Error {
  code: string;
  status: number;

  constructor(status: number, error: ApiError) {
    super(error.message);
    this.name = "AuthApiError";
    this.code = error.code;
    this.status = status;
  }
}

// Exported so sibling API client modules (e.g. lib/api/users.ts) can talk to
// the same backend without duplicating the origin/env-parsing logic.
export const API_BASE_URL = publicEnv.NEXT_PUBLIC_API_URL;

// Routes where a 401 means "these credentials/this token were rejected on
// purpose" rather than "the access token expired mid-session" — attempting a
// silent refresh-and-retry against these would be pointless (there's no
// valid session to extend) or would risk recursing into `/auth/refresh`
// itself. Kept as a Set of the exact paths this module's own functions call
// with; callers outside this module always hit resource routes (e.g.
// `/users/me`) that legitimately want the retry.
const SKIP_REFRESH_RETRY_PATHS = new Set(["/auth/refresh", "/auth/login", "/auth/register"]);

/**
 * Shared fetch helper for every `/api/v1/*` client module — not just auth.ts.
 * Exported (alongside `readCsrfToken` below) so e.g. `lib/api/users.ts` reuses
 * the exact same envelope-parsing/error-throwing/credentials behavior instead
 * of a silently-duplicated copy.
 *
 * 401 handling: if an authenticated request comes back 401 (the short-lived
 * access token expired or was otherwise rejected), this transparently
 * attempts one silent token refresh (`POST /auth/refresh`, which rotates both
 * the access/refresh cookies per docs/api-contract.md "Authentication" §2)
 * and, if that succeeds, retries the original request exactly once with the
 * new session. If the refresh itself fails (refresh token missing/expired/
 * revoked/reused), the original 401 is thrown as before — no infinite loop,
 * no more than one retry. See `trySilentRefresh` in `lib/auth/AuthContext.tsx`
 * for the same underlying mechanism exposed for callers outside this module.
 */
export async function authFetch<T>(
  path: string,
  init: RequestInit & { skipCsrf?: boolean } = {},
  _isRetryAfterRefresh = false,
): Promise<T> {
  // FormData bodies (e.g. the avatar upload) must NOT get an explicit
  // "Content-Type": the browser sets its own `multipart/form-data;
  // boundary=...` value only when the header is left unset entirely.
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    // Required so the browser sends/receives the httpOnly auth cookies —
    // the backend's CORS config (credentials: true) is set up to match.
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...init.headers,
    },
  });

  let body: { data?: T; error?: ApiError } | undefined;
  try {
    body = await res.json();
  } catch {
    // Non-JSON response (shouldn't normally happen against this API).
  }

  if (!res.ok || !body || body.error) {
    const canAttemptRefresh =
      res.status === 401 && !_isRetryAfterRefresh && !SKIP_REFRESH_RETRY_PATHS.has(path);

    if (canAttemptRefresh) {
      const refreshed = await refreshSession();
      if (refreshed) {
        // `/auth/refresh` rotates the csrf_token cookie too (new random
        // value per request) — if the original call carried an
        // `x-csrf-token` header (any mutating request), that value is now
        // stale and would fail `requireCsrf` on retry. Re-read the header
        // fresh from the (now-rotated) cookie rather than reusing whatever
        // was baked into `init.headers` before the refresh happened.
        const retryInit = hasCsrfHeader(init.headers)
          ? { ...init, headers: { ...init.headers, "x-csrf-token": readCsrfToken() } }
          : init;
        return authFetch<T>(path, retryInit, true);
      }
    }

    throw new AuthApiError(
      res.status,
      body?.error ?? { code: "UNKNOWN_ERROR", message: "Something went wrong. Please try again." },
    );
  }

  return body.data as T;
}

function hasCsrfHeader(headers: RequestInit["headers"]): boolean {
  if (!headers) return false;
  if (headers instanceof Headers) return headers.has("x-csrf-token");
  if (Array.isArray(headers)) return headers.some(([key]) => key.toLowerCase() === "x-csrf-token");
  return Object.keys(headers).some((key) => key.toLowerCase() === "x-csrf-token");
}

/** Reads the (non-httpOnly) csrf_token cookie set by the backend. Returns "" if absent. */
export function readCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export interface SignupInput {
  email: string;
  phone?: string;
  password: string;
  fullName: string;
  role?: SelectableRole;
  // Required (HOUSEHOLD or BUSINESS) when role is "USER" (including when
  // role is omitted, since USER is the default); must be omitted for
  // COLLECTOR/RECYCLING_COMPANY — see docs/api-contract.md §4.
  accountType?: AccountType;
}

export function signup(input: SignupInput): Promise<{ user: AuthUser }> {
  return authFetch<{ user: AuthUser }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export interface LoginInput {
  /** Email or phone — the backend looks up both columns with one field. */
  identifier: string;
  password: string;
}

export function login(input: LoginInput): Promise<{ user: AuthUser }> {
  return authFetch<{ user: AuthUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function logout(): Promise<{ success: boolean }> {
  return authFetch<{ success: boolean }>("/auth/logout", {
    method: "POST",
    headers: { "x-csrf-token": readCsrfToken() },
  });
}

/** Returns the current user from the access_token cookie, or null if unauthenticated. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { user } = await authFetch<{ user: AuthUser }>("/auth/me", { method: "GET" });
    return user;
  } catch (err) {
    if (err instanceof AuthApiError && err.status === 401) {
      return null;
    }
    throw err;
  }
}

// Server-side refresh-token rotation is strictly single-use: redeeming a refresh-token cookie
// rotates+revokes it, and any other request that races in with that now-revoked value trips
// reuse detection, defensively revoking every active refresh token for the user — including
// the one the winning request just received. Two authFetch calls hitting a 401 around the same
// time (e.g. two tabs, or session-restore racing a page's own fetch) would otherwise both call
// refreshSession() and reproduce exactly that. This in-flight promise makes concurrent callers
// share the same POST /auth/refresh call, and resets in `finally` so a later, non-concurrent
// 401 still triggers a fresh attempt.
let inFlightRefresh: Promise<boolean> | null = null;

/** Rotates the current session's tokens. Resolves false (does not throw) if there was no valid session. */
export function refreshSession(): Promise<boolean> {
  if (!inFlightRefresh) {
    inFlightRefresh = performRefresh().finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}

async function performRefresh(): Promise<boolean> {
  try {
    await authFetch<{ success: boolean }>("/auth/refresh", { method: "POST" });
    return true;
  } catch (err) {
    if (err instanceof AuthApiError && err.status === 401) {
      return false;
    }
    throw err;
  }
}

/**
 * These are full-page-navigation URLs, not fetch() targets — the caller
 * should do `window.location.href = getGoogleOAuthUrl()` to hand control to
 * the provider's consent screen. The backend's callback route redirects the
 * browser back to the frontend once auth cookies are set.
 */
export function getGoogleOAuthUrl(): string {
  return `${API_BASE_URL}/auth/google`;
}

export function getFacebookOAuthUrl(): string {
  return `${API_BASE_URL}/auth/facebook`;
}
