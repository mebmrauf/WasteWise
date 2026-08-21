// Client-side API for /api/v1/campaigns/* — Community Recycling Campaigns.
// Browsing and registering are available to any logged-in user; creating
// campaigns and uploading videos are admin-only (handled in a separate
// admin-facing file). Reuses auth.ts's authFetch/readCsrfToken, same
// pattern as lib/api/sustainability.ts and lib/api/wasteRecognition.ts.
import { authFetch, readCsrfToken } from "./auth";

export type CampaignRegistrationType = "ATTENDEE" | "VOLUNTEER";

export interface Campaign {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  eventDate: string;
  volunteersNeeded: number | null;
  coverImageUrl: string | null;
  createdByAdminId: string;
  createdAt: string;
  updatedAt: string;
  attendeeCount: number;
  volunteerCount: number;
}

export interface CampaignRegistration {
  id: string;
  campaignId: string;
  userId: string;
  type: CampaignRegistrationType;
  registeredAt: string;
  campaign?: Campaign;
}

export interface CampaignVideo {
  id: string;
  campaignId: string | null;
  title: string;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  uploadedByAdminId: string;
  createdAt: string;
}

/** POST /api/v1/campaigns/join-community — join the campaign community, shown as a signup prompt. */
export function joinCampaignCommunity(): Promise<{ hasJoinedCampaignCommunity: boolean; campaignCommunityJoinedAt: string }> {
  return authFetch("/campaigns/join-community", {
    method: "POST",
    headers: { "x-csrf-token": readCsrfToken() },
  });
}

/** GET /api/v1/campaigns — browse all campaigns. */
export function getCampaigns(): Promise<{ campaigns: Campaign[] }> {
  return authFetch("/campaigns", { method: "GET" });
}

/** GET /api/v1/campaigns/:id — a single campaign's details. */
export function getCampaign(id: string): Promise<{ campaign: Campaign & { videos: CampaignVideo[] } }> {
  return authFetch(`/campaigns/${id}`, { method: "GET" });
}

/** POST /api/v1/campaigns/:id/register — register to attend or volunteer. */
export function registerForCampaign(
  id: string,
  type: CampaignRegistrationType,
): Promise<{ registration: CampaignRegistration }> {
  return authFetch(`/campaigns/${id}/register`, {
    method: "POST",
    body: JSON.stringify({ type }),
    headers: { "x-csrf-token": readCsrfToken() },
  });
}

/** DELETE /api/v1/campaigns/:id/register — cancel a registration. */
export function unregisterFromCampaign(
  id: string,
  type: CampaignRegistrationType,
): Promise<{ success: boolean }> {
  return authFetch(`/campaigns/${id}/register`, {
    method: "DELETE",
    body: JSON.stringify({ type }),
    headers: { "x-csrf-token": readCsrfToken() },
  });
}

/** GET /api/v1/campaigns/me/registrations — the current user's own registrations, across all campaigns. */
export function getMyCampaignRegistrations(): Promise<{ registrations: CampaignRegistration[] }> {
  return authFetch("/campaigns/me/registrations", { method: "GET" });
}

/** GET /api/v1/campaigns/videos — past campaign highlight videos. */
export function getCampaignVideos(): Promise<{ videos: CampaignVideo[] }> {
  return authFetch("/campaigns/videos", { method: "GET" });
}