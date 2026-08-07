// Client-side API for /api/v1/waste-recognition/* — a standalone feature
// (see server/src/routes/wasteRecognition.ts): a user uploads a photo, the
// backend classifies it via Google Cloud Vision and returns the result.
// Reuses auth.ts's authFetch/readCsrfToken/AuthApiError, same pattern as
// lib/api/users.ts.
import { authFetch, readCsrfToken } from "./auth";

export type WasteCategory =
  | "PLASTIC"
  | "PAPER"
  | "METAL"
  | "GLASS"
  | "ELECTRONIC"
  | "ORGANIC"
  | "MIXED"
  | "OTHER";

export interface WasteScan {
  id: string;
  userId: string;
  /** Root-relative — join against the backend origin before rendering, same
   * as UserProfile's avatarUrl (see lib/api/users.ts's resolveAvatarUrl). */
  imageUrl: string;
  detectedCategory: WasteCategory;
  isRecyclable: boolean;
  confidence: number;
  rawLabels: Array<{ description: string; score: number }>;
  preparationTip: string | null;
  createdAt: string;
}

/**
 * POST /api/v1/waste-recognition — uploads a photo for classification.
 * `multipart/form-data` with the file under the `photo` field name; relies
 * on `authFetch` to omit the JSON Content-Type header for FormData bodies,
 * same as uploadMyAvatar in lib/api/users.ts.
 */
export function scanWastePhoto(file: File): Promise<{ scan: WasteScan }> {
  const formData = new FormData();
  formData.append("photo", file);
  return authFetch<{ scan: WasteScan }>("/waste-recognition", {
    method: "POST",
    body: formData,
    headers: { "x-csrf-token": readCsrfToken() },
  });
}
/**
 * PATCH /api/v1/waste-recognition/:id/correct — user manually corrects a
 * scan's category when Vision got it wrong (e.g. clear plastic misread as
 * glass). Recomputes isRecyclable/preparationTip server-side from the
 * corrected category.
 */
export function correctWasteScan(
  id: string,
  category: WasteCategory,
): Promise<{ scan: WasteScan }> {
  return authFetch<{ scan: WasteScan }>(`/waste-recognition/${id}/correct`, {
    method: "PATCH",
    body: JSON.stringify({ category }),
    headers: { "x-csrf-token": readCsrfToken() },
  });
}
/** GET /api/v1/waste-recognition — the current user's own scan history. */
export function getMyWasteScans(): Promise<{ scans: WasteScan[] }> {
  return authFetch<{ scans: WasteScan[] }>("/waste-recognition", { method: "GET" });
}