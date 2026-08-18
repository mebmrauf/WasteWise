import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../lib/rbac";
import { requireCsrf } from "../lib/csrf";
import { sendData, sendError } from "../lib/apiResponse";
import { VerificationStatus } from "@prisma/client";
import { createNotification } from "../lib/notifications";
import { toPublicCollectorProfile, toPublicRecyclingProfile, toPublicBusinessProfile } from "./users";
import { updateComplaintStatusSchema } from "./complaints.schemas";

export const adminRouter = Router();

const verifySchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  rejectionReason: z.string().optional(),
});

adminRouter.get(
  "/collectors",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (_req: Request, res: Response) => {
    const collectors = await prisma.collectorProfile.findMany({
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const publicCollectors = collectors.map((c) => ({
      ...toPublicCollectorProfile(c),
      user: {
        id: c.user.id,
        email: c.user.email,
        phone: c.user.phone,
        fullName: c.user.fullName,
      },
    }));

    sendData(res, 200, { collectors: publicCollectors });
  }),
);

adminRouter.patch(
  "/collectors/:id/verify",
  requireAuth,
  requireRole("ADMIN"),
  requireCsrf,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    const { action, rejectionReason } = parsed.data;
    const { id } = req.params;

    const collector = await prisma.collectorProfile.findUnique({
      where: { userId: id },
    });

    if (!collector) {
      sendError(res, 404, "NOT_FOUND", "Collector not found.");
      return;
    }

    const updated = await prisma.collectorProfile.update({
      where: { userId: id },
      data: {
        verificationStatus: action === "APPROVE" ? VerificationStatus.APPROVED : VerificationStatus.REJECTED,
        verificationRejectionReason: action === "REJECT" ? rejectionReason : null,
        verificationReviewedAt: new Date(),
        verificationReviewedByAdminId: req.user!.id,
      },
      include: {
        user: true,
      }
    });

    const publicCollector = {
      ...toPublicCollectorProfile(updated),
      user: {
        id: updated.user.id,
        email: updated.user.email,
        phone: updated.user.phone,
        fullName: updated.user.fullName,
      }
    };

    void createNotification({
      userId: id,
      type: "VERIFICATION_UPDATE",
      title: action === "APPROVE" ? "Collector Account Verified" : "Collector Verification Rejected",
      message:
        action === "APPROVE"
          ? "You're verified! You can now view and bid on open pickup requests."
          : `Your collector verification was rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : " Please review your submitted documents and try again."}`,
    });

    sendData(res, 200, { collector: publicCollector });
  }),
);

adminRouter.get(
  "/recycling-companies",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (_req: Request, res: Response) => {
    const companies = await prisma.recyclingCompanyProfile.findMany({
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const publicCompanies = companies.map((c) => ({
      ...toPublicRecyclingProfile(c),
      userId: c.userId,
      user: {
        id: c.user.id,
        email: c.user.email,
        phone: c.user.phone,
        fullName: c.user.fullName,
      },
    }));

    sendData(res, 200, { recyclingCompanies: publicCompanies });
  }),
);

adminRouter.patch(
  "/recycling-companies/:id/verify",
  requireAuth,
  requireRole("ADMIN"),
  requireCsrf,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    const { action, rejectionReason } = parsed.data;
    const { id } = req.params;

    const company = await prisma.recyclingCompanyProfile.findUnique({
      where: { userId: id },
    });

    if (!company) {
      sendError(res, 404, "NOT_FOUND", "Recycling company not found.");
      return;
    }

    const updated = await prisma.recyclingCompanyProfile.update({
      where: { userId: id },
      data: {
        verificationStatus: action === "APPROVE" ? VerificationStatus.APPROVED : VerificationStatus.REJECTED,
        verificationRejectionReason: action === "REJECT" ? rejectionReason : null,
        verificationReviewedAt: new Date(),
        verificationReviewedByAdminId: req.user!.id,
      },
      include: {
        user: true,
      },
    });

    const publicCompany = {
      ...toPublicRecyclingProfile(updated),
      userId: updated.userId,
      user: {
        id: updated.user.id,
        email: updated.user.email,
        phone: updated.user.phone,
        fullName: updated.user.fullName,
      },
    };

    sendData(res, 200, { recyclingCompany: publicCompany });
  }),
);

adminRouter.get(
  "/businesses",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (_req: Request, res: Response) => {
    const businesses = await prisma.businessProfile.findMany({
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const publicBusinesses = businesses.map((b) => ({
      ...toPublicBusinessProfile(b),
      userId: b.userId,
      user: {
        id: b.user.id,
        email: b.user.email,
        phone: b.user.phone,
        fullName: b.user.fullName,
      },
    }));

    sendData(res, 200, { businesses: publicBusinesses });
  }),
);

adminRouter.patch(
  "/businesses/:id/verify",
  requireAuth,
  requireRole("ADMIN"),
  requireCsrf,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    const { action, rejectionReason } = parsed.data;
    const { id } = req.params;

    const business = await prisma.businessProfile.findUnique({
      where: { userId: id },
    });

    if (!business) {
      sendError(res, 404, "NOT_FOUND", "Business not found.");
      return;
    }

    const updated = await prisma.businessProfile.update({
      where: { userId: id },
      data: {
        verificationStatus: action === "APPROVE" ? VerificationStatus.APPROVED : VerificationStatus.REJECTED,
        verificationRejectionReason: action === "REJECT" ? rejectionReason : null,
        verificationReviewedAt: new Date(),
        verificationReviewedByAdminId: req.user!.id,
      },
      include: {
        user: true,
      },
    });

    const publicBusiness = {
      ...toPublicBusinessProfile(updated),
      userId: updated.userId,
      user: {
        id: updated.user.id,
        email: updated.user.email,
        phone: updated.user.phone,
        fullName: updated.user.fullName,
      },
    };

    sendData(res, 200, { business: publicBusiness });
  }),
);

adminRouter.get(
  "/complaints",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (_req: Request, res: Response) => {
    const complaints = await prisma.complaint.findMany({
      include: {
        complainant: { select: { id: true, fullName: true, email: true, role: true } },
        againstUser: { select: { id: true, fullName: true, email: true, role: true } },
        pickupRequest: { select: { id: true, status: true } },
        bulkRequest: { select: { id: true, status: true } },
        resolvedByAdmin: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    sendData(res, 200, { complaints });
  }),
);

adminRouter.patch(
  "/complaints/:id/status",
  requireAuth,
  requireRole("ADMIN"),
  requireCsrf,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = updateComplaintStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    const { status, resolutionNotes } = parsed.data;
    const { id } = req.params;

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: { complainant: true },
    });

    if (!complaint) {
      sendError(res, 404, "NOT_FOUND", "Complaint not found.");
      return;
    }

    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        status,
        resolutionNotes,
        resolvedAt: status === "RESOLVED" || status === "DISMISSED" ? new Date() : null,
        resolvedByAdminId: req.user!.id,
      },
      include: {
        complainant: { select: { id: true, fullName: true, email: true, role: true } },
        againstUser: { select: { id: true, fullName: true, email: true, role: true } },
        pickupRequest: { select: { id: true, status: true } },
        resolvedByAdmin: { select: { id: true, fullName: true } },
      },
    });

    if (complaint.status !== status) {
      void createNotification({
        userId: complaint.complainant.id,
        type: "COMPLAINT_UPDATE",
        title: "Complaint Status Updated",
        message: `Your complaint (ID: ${complaint.id.slice(-6)}) status has been updated to ${status}.${resolutionNotes ? ` Admin Notes: ${resolutionNotes}` : ""}`,
      });
    }

    sendData(res, 200, { complaint: updated });
  }),
);


const wasteAnalysisReportInclude = {
  requester: { select: { id: true, fullName: true, email: true, accountType: true, role: true } },
  pickupRequest: { select: { id: true, status: true, pickupDate: true, pickupFormattedAddress: true } },
  bulkRequest: { select: { id: true, status: true, pickupAddress: true } },
  reviewedByAdmin: { select: { id: true, fullName: true } },
} as const;

adminRouter.get(
  "/waste-analysis-reports",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (_req: Request, res: Response) => {
    const reports = await prisma.wasteAnalysisReport.findMany({
      where: { needsAdminReview: true },
      include: wasteAnalysisReportInclude,
      orderBy: { createdAt: "desc" },
    });

    sendData(res, 200, { reports });
  }),
);

function bucketOf(accountType: string | null): "HOUSEHOLD" | "BUSINESS" {
  return accountType === "BUSINESS" ? "BUSINESS" : "HOUSEHOLD";
}

function bump(counts: Record<string, number>, key: string | null) {
  if (!key) return;
  counts[key] = (counts[key] ?? 0) + 1;
}

const TOP_CLASSIFIED_PER_CATEGORY = 20;

adminRouter.get(
  "/waste-analysis-summary",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (_req: Request, res: Response) => {
    const classified = await prisma.wasteAnalysisReport.findMany({
      where: { needsAdminReview: false },
      include: wasteAnalysisReportInclude,
      orderBy: { confidence: "desc" },
    });

    type Bucket = { byCategory: Record<string, number>; byCondition: Record<string, number>; byUsagePeriod: Record<string, number> };
    const emptyBucket = (): Bucket => ({ byCategory: {}, byCondition: {}, byUsagePeriod: {} });
    const summary: Record<"HOUSEHOLD" | "BUSINESS", Bucket> = {
      HOUSEHOLD: emptyBucket(),
      BUSINESS: emptyBucket(),
    };

    // Top N highest-confidence examples per category, per bucket — only ones
    // with a photo, since the point is letting admins visually spot-check
    // real results rather than trust a bare count.
    const topClassified: Record<"HOUSEHOLD" | "BUSINESS", Record<string, typeof classified>> = {
      HOUSEHOLD: {},
      BUSINESS: {},
    };

    for (const item of classified) {
      const bucketKey = bucketOf(item.requester.accountType);
      const bucket = summary[bucketKey];
      bump(bucket.byCategory, item.suggestedCategory);
      bump(bucket.byCondition, item.detectedCondition);
      bump(bucket.byUsagePeriod, item.estimatedUsagePeriod);

      if (!item.suggestedCategory || item.photoUrls.length === 0) continue;
      const perCategory = topClassified[bucketKey];
      const existing = perCategory[item.suggestedCategory] ?? [];
      if (existing.length < TOP_CLASSIFIED_PER_CATEGORY) {
        perCategory[item.suggestedCategory] = [...existing, item];
      }
    }

    sendData(res, 200, { summary, topClassified });
  }),
);

const updateWasteAnalysisReviewSchema = z.object({
  status: z.enum(["REVIEWED", "DISMISSED"]),
  reviewNotes: z.string().trim().max(1000).optional(),
});

const deleteWasteAnalysisReportsSchema = z.object({
  ids: z.array(z.string()),
});

adminRouter.patch(
  "/waste-analysis-reports/:id/review",
  requireAuth,
  requireRole("ADMIN"),
  requireCsrf,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = updateWasteAnalysisReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    const { id } = req.params;
    const report = await prisma.wasteAnalysisReport.findUnique({ where: { id } });
    if (!report) {
      sendError(res, 404, "NOT_FOUND", "Waste analysis report not found.");
      return;
    }

    if (parsed.data.status === "DISMISSED") {
      await prisma.wasteAnalysisReport.delete({ where: { id } });
      sendData(res, 200, { deleted: true, id });
      return;
    }

    const updated = await prisma.wasteAnalysisReport.update({
      where: { id },
      data: {
        reviewStatus: parsed.data.status,
        reviewNotes: parsed.data.reviewNotes,
        reviewedAt: new Date(),
        reviewedByAdminId: req.user!.id,
      },
      include: wasteAnalysisReportInclude,
    });

    sendData(res, 200, { deleted: false, report: updated });
  }),
);

adminRouter.delete(
  "/waste-analysis-reports",
  requireAuth,
  requireRole("ADMIN"),
  requireCsrf,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = deleteWasteAnalysisReportsSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    const { count } = await prisma.wasteAnalysisReport.deleteMany({
      where: {
        id: { in: parsed.data.ids },
      },
    });

    sendData(res, 200, { deletedCount: count });
  }),
);
