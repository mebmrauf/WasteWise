import { z } from "zod";
import { CampaignRegistrationType } from "@prisma/client";

export const createCampaignSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(200).optional(),
  eventDate: z.coerce.date(),
  volunteersNeeded: z.number().int().positive().optional(),
  coverImageUrl: z.string().url().optional(),
});

export const updateCampaignSchema = createCampaignSchema.partial();

export const registerForCampaignSchema = z.object({
  type: z.nativeEnum(CampaignRegistrationType),
});

export const createCampaignVideoSchema = z.object({
  campaignId: z.string().optional(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
  videoUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
});