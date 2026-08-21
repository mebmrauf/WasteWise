import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../lib/rbac";
import { requireCsrf } from "../lib/csrf";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData, sendError } from "../lib/apiResponse";
import { createNotification } from "../lib/notifications";
import { Prisma } from "@prisma/client";
import {
  createCampaignSchema,
  updateCampaignSchema,
  registerForCampaignSchema,
  createCampaignVideoSchema,
} from "./campaigns.schemas";

export const campaignsRouter = Router();

const registrationCounts = {
  select: { id: true, type: true },
} as const;

// ---------------------------------------------------------------------------
// Community membership — the "join the campaign page" flag shown as a
// prompt right after signup. Deliberately just a boolean on User, not a
// separate join table, since there's nothing else to store about it.
// ---------------------------------------------------------------------------
campaignsRouter.post(
  "/join-community",
  requireAuth,
  requireCsrf,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        hasJoinedCampaignCommunity: true,
        campaignCommunityJoinedAt: new Date(),
      },
    });
    sendData(res, 200, {
      hasJoinedCampaignCommunity: user.hasJoinedCampaignCommunity,
      campaignCommunityJoinedAt: user.campaignCommunityJoinedAt,
    });
  }),
);

// ---------------------------------------------------------------------------
// Campaigns — admin creates/edits, everyone can browse
// ---------------------------------------------------------------------------
campaignsRouter.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  requireCsrf,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = createCampaignSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    const campaign = await prisma.recyclingCampaign.create({
      data: { ...parsed.data, createdByAdminId: req.user!.id },
    });

    // Notify opted-in community members — fire and forget, same pattern as
    // admin.ts's verification/complaint notifications.
    const subscribers = await prisma.user.findMany({
      where: { hasJoinedCampaignCommunity: true, campaignNotificationsEnabled: true },
      select: { id: true },
    });
    for (const subscriber of subscribers) {
      void createNotification({
        userId: subscriber.id,
        type: "CAMPAIGN_UPDATE",
        title: "New Campaign Announced",
        message: `A new campaign, "${campaign.title}", has been announced. Check it out and register to attend or volunteer!`,
      });
    }

    sendData(res, 201, { campaign });
  }),
);

campaignsRouter.patch(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  requireCsrf,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = updateCampaignSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    const campaign = await prisma.recyclingCampaign
      .update({ where: { id: req.params.id }, data: parsed.data })
      .catch(() => null);
    if (!campaign) {
      sendError(res, 404, "NOT_FOUND", "Campaign not found.");
      return;
    }
    sendData(res, 200, { campaign });
  }),
);

campaignsRouter.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  requireCsrf,
  asyncHandler(async (req: Request, res: Response) => {
    await prisma.recyclingCampaign.delete({ where: { id: req.params.id } }).catch(() => null);
    sendData(res, 200, { success: true });
  }),
);

campaignsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (_req: Request, res: Response) => {
    const campaigns = await prisma.recyclingCampaign.findMany({
      orderBy: { eventDate: "asc" },
      include: { registrations: registrationCounts },
    });
    const withCounts = campaigns.map((c) => {
      const { registrations, ...rest } = c;
      return {
        ...rest,
        attendeeCount: registrations.filter((r) => r.type === "ATTENDEE").length,
        volunteerCount: registrations.filter((r) => r.type === "VOLUNTEER").length,
      };
    });
    sendData(res, 200, { campaigns: withCounts });
  }),
);

campaignsRouter.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const campaign = await prisma.recyclingCampaign.findUnique({
      where: { id: req.params.id },
      include: { registrations: registrationCounts, videos: true },
    });
    if (!campaign) {
      sendError(res, 404, "NOT_FOUND", "Campaign not found.");
      return;
    }
    const { registrations, ...rest } = campaign;
    sendData(res, 200, {
      campaign: {
        ...rest,
        attendeeCount: registrations.filter((r) => r.type === "ATTENDEE").length,
        volunteerCount: registrations.filter((r) => r.type === "VOLUNTEER").length,
      },
    });
  }),
);

campaignsRouter.get(
  "/:id/registrations",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req: Request, res: Response) => {
    const registrations = await prisma.campaignRegistration.findMany({
      where: { campaignId: req.params.id },
      include: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
      orderBy: { registeredAt: "asc" },
    });
    sendData(res, 200, { registrations });
  }),
);

// ---------------------------------------------------------------------------
// Registering to attend or volunteer
// ---------------------------------------------------------------------------
campaignsRouter.post(
  "/:id/register",
  requireAuth,
  requireCsrf,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = registerForCampaignSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    const campaign = await prisma.recyclingCampaign.findUnique({ where: { id: req.params.id } });
    if (!campaign) {
      sendError(res, 404, "NOT_FOUND", "Campaign not found.");
      return;
    }
    try {
      const registration = await prisma.campaignRegistration.create({
        data: { campaignId: req.params.id, userId: req.user!.id, type: parsed.data.type },
      });
      sendData(res, 201, { registration });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        sendError(res, 409, "ALREADY_REGISTERED", "You're already registered for this campaign in that role.");
        return;
      }
      throw err;
    }
  }),
);

campaignsRouter.delete(
  "/:id/register",
  requireAuth,
  requireCsrf,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = registerForCampaignSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    await prisma.campaignRegistration.deleteMany({
      where: { campaignId: req.params.id, userId: req.user!.id, type: parsed.data.type },
    });
    sendData(res, 200, { success: true });
  }),
);

campaignsRouter.get(
  "/me/registrations",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const registrations = await prisma.campaignRegistration.findMany({
      where: { userId: req.user!.id },
      include: { campaign: true },
      orderBy: { registeredAt: "desc" },
    });
    sendData(res, 200, { registrations });
  }),
);

// ---------------------------------------------------------------------------
// Videos of past campaigns
// ---------------------------------------------------------------------------
campaignsRouter.post(
  "/videos",
  requireAuth,
  requireRole("ADMIN"),
  requireCsrf,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = createCampaignVideoSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    const video = await prisma.campaignVideo.create({
      data: { ...parsed.data, uploadedByAdminId: req.user!.id },
    });
    sendData(res, 201, { video });
  }),
);

campaignsRouter.get(
  "/videos",
  requireAuth,
  asyncHandler(async (_req: Request, res: Response) => {
    const videos = await prisma.campaignVideo.findMany({ orderBy: { createdAt: "desc" } });
    sendData(res, 200, { videos });
  }),
);