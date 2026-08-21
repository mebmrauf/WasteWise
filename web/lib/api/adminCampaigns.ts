import { authFetch, readCsrfToken } from "./auth";
import type { Campaign, CampaignRegistration, CampaignVideo } from "./campaigns";

export function createCampaign(input: {
  title: string;
  description?: string;
  location?: string;
  eventDate: string;
  volunteersNeeded?: number;
  coverImageUrl?: string;
}): Promise<{ campaign: Campaign }> {
  return authFetch<{ campaign: Campaign }>("/campaigns", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { "x-csrf-token": readCsrfToken() },
  });
}

export function updateCampaign(
  id: string,
  input: Partial<{
    title: string;
    description: string;
    location: string;
    eventDate: string;
    volunteersNeeded: number;
    coverImageUrl: string;
  }>,
): Promise<{ campaign: Campaign }> {
  return authFetch<{ campaign: Campaign }>(`/campaigns/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
    headers: { "x-csrf-token": readCsrfToken() },
  });
}

export function deleteCampaign(id: string): Promise<{ success: boolean }> {
  return authFetch<{ success: boolean }>(`/campaigns/${id}`, {
    method: "DELETE",
    headers: { "x-csrf-token": readCsrfToken() },
  });
}

export function getCampaignRegistrations(
  id: string,
): Promise<{ registrations: (CampaignRegistration & { user: { id: string; fullName: string; email: string; phone: string | null } })[] }> {
  return authFetch(`/campaigns/${id}/registrations`);
}

export function createCampaignVideo(input: {
  campaignId?: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
}): Promise<{ video: CampaignVideo }> {
  return authFetch<{ video: CampaignVideo }>("/campaigns/videos", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { "x-csrf-token": readCsrfToken() },
  });
}