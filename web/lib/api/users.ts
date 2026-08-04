// Client-side API for /api/v1/users/* (api-contract.md "User Profile") — a distinct resource
// from auth.ts's /auth/* routes. Reuses auth.ts's authFetch/readCsrfToken/AuthApiError rather
// than duplicating the envelope-parsing/error-throwing logic.
import { publicEnv } from "../env";
import { authFetch, readCsrfToken, type AccountType, type Role } from "./auth";

// Superset of auth.ts's AuthUser, kept as its own type (not `AuthUser & {...}`) — the two
// routes' shapes are deliberately separate resources that happen to overlap, not one extending
// the other.
export interface UserProfile {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  role: Role;
  accountType: AccountType | null;
  isEmailVerified: boolean;
  /** Server-derived from the last resolved `placeId` via the Geocoding API — never client-writable, see docs/api-contract.md "User Profile" §2. */
  formattedAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  /** The last Google Place ID resolved into the address fields above. */
  placeId: string | null;
  /** Root-relative when uploaded via POST /users/me/avatar — see `resolveAvatarUrl`. */
  avatarUrl: string | null;
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** GET /api/v1/users/me — docs/api-contract.md "User Profile" §1. */
export function getMyProfile(): Promise<{ user: UserProfile }> {
  return authFetch<{ user: UserProfile }>("/users/me", { method: "GET" });
}

/**
 * All fields optional — send only what changed. `email`/`role`/`accountType`/`avatarUrl`/
 * `formattedAddress`/`latitude`/`longitude` are deliberately not part of this type since the
 * backend rejects them outright (400 VALIDATION_ERROR) rather than silently dropping them.
 * Address updates go through `placeId` (picked via Places Autocomplete client-side) — the
 * server resolves it into formattedAddress/latitude/longitude itself.
 */
export interface UpdateProfileInput {
  fullName?: string;
  phone?: string;
  placeId?: string;
  emailNotificationsEnabled?: boolean;
  smsNotificationsEnabled?: boolean;
}

/** PATCH /api/v1/users/me — docs/api-contract.md "User Profile" §2. */
export function updateMyProfile(input: UpdateProfileInput): Promise<{ user: UserProfile }> {
  return authFetch<{ user: UserProfile }>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(input),
    headers: { "x-csrf-token": readCsrfToken() },
  });
}

/**
 * POST /api/v1/users/me/avatar — docs/api-contract.md "User Profile" §3.
 * `multipart/form-data` with the file under the `avatar` field name; relies
 * on `authFetch` to omit the JSON Content-Type header for FormData bodies so
 * the browser can set its own `multipart/form-data; boundary=...` value.
 */
export function uploadMyAvatar(file: File): Promise<{ user: UserProfile }> {
  const formData = new FormData();
  formData.append("avatar", file);
  return authFetch<{ user: UserProfile }>("/users/me/avatar", {
    method: "POST",
    body: formData,
    headers: { "x-csrf-token": readCsrfToken() },
  });
}

/**
 * The backend's own *origin* (scheme + host + port), derived from
 * `NEXT_PUBLIC_API_URL` — which already has the `/api/v1` suffix baked in, so
 * it can't be used directly. Root-relative paths the API returns (currently
 * only `avatarUrl`, e.g. "/uploads/avatars/abc123.jpg") must be joined
 * against this origin instead — see docs/api-contract.md "User Profile" §3
 * ("Storage approach") for why.
 */
export function getApiOrigin(): string {
  return new URL(publicEnv.NEXT_PUBLIC_API_URL).origin;
}

/** Joins a root-relative `avatarUrl` (or passes through null) against the backend's origin. */
export function resolveAvatarUrl(avatarUrl: string | null): string | null {
  if (!avatarUrl) return null;
  return `${getApiOrigin()}${avatarUrl}`;
}
