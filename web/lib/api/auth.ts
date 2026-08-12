import { publicEnv } from "../env";

export type Role = "USER" | "COLLECTOR" | "RECYCLING_COMPANY" | "ADMIN";

export type SelectableRole = Extract<Role, "USER" | "COLLECTOR" | "RECYCLING_COMPANY">;

export type AccountType = "HOUSEHOLD" | "BUSINESS";

export type MembershipLevel = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
export type PlatinumGift = "TREE_SAPLING" | "ECO_TOTE_BAG" | "REUSABLE_WATER_BOTTLE";

export interface AuthUser {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  role: Role;
  accountType: AccountType | null;
  isEmailVerified: boolean;
  avatarUrl: string | null;
  membershipLevel: MembershipLevel;
  membershipBadge: string;
  totalGreenPoints: number;
  giftClaimed: boolean;
  selectedGift: PlatinumGift | null;
  nextGiftEligibleDate: string | null;
  discountCouponClaimed: boolean;
  nextDiscountEligibleDate: string | null;
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

const API_BASE_URL = publicEnv.NEXT_PUBLIC_API_URL;

const SKIP_REFRESH_RETRY_PATHS = new Set(["/auth/refresh", "/auth/login", "/auth/register"]);

export async function authFetch<T>(
  path: string,
  init: RequestInit & { skipCsrf?: boolean } = {},
  _isRetryAfterRefresh = false,
): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
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
  }

  if (!res.ok || !body || body.error) {
    const canAttemptRefresh =
      res.status === 401 && !_isRetryAfterRefresh && !SKIP_REFRESH_RETRY_PATHS.has(path);

    if (canAttemptRefresh) {
      const refreshed = await refreshSession();
      if (refreshed) {
        const retryInit = hasCsrfHeader(init.headers)
          ? { ...init, headers: { ...init.headers, "x-csrf-token": readCsrfToken() } }
          : init;
        return authFetch<T>(path, retryInit, true);
      }
    }
    if (res.status !== 401) {
      console.error("AuthApiError Debug:", { status: res.status, body });
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
  accountType?: AccountType;
  referralCode?: string;
}

export function signup(input: SignupInput): Promise<{ user: AuthUser }> {
  return authFetch<{ user: AuthUser }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export interface LoginInput {
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

let inFlightRefresh: Promise<boolean> | null = null;

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

export function getGoogleOAuthUrl(): string {
  return `${API_BASE_URL}/auth/google`;
}

export function getFacebookOAuthUrl(): string {
  return `${API_BASE_URL}/auth/facebook`;
}
