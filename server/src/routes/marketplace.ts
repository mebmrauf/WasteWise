import { Router, type Request, type Response } from "express";
import multer, { MulterError } from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../lib/rbac";
import { requireCsrf } from "../lib/csrf";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData, sendError } from "../lib/apiResponse";
import { WasteCategory, VehicleType, Prisma, Role } from "@prisma/client";
import { createNotification } from "../lib/notifications";
import { isCloudinaryConfigured, uploadBulkRequestImage } from "../lib/cloudinary";
import { detectImageSignature } from "../lib/imageSignature";
import { logger } from "../lib/logger";

export const marketplaceRouter = Router();

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
      cb(new Error("UNSUPPORTED_FILE_TYPE"));
      return;
    }
    cb(null, true);
  },
});

function runImageUpload(fieldName: string, req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    imageUpload.single(fieldName)(req, res, (err: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Zod schemas
const createRequestSchema = z.object({
  wasteTypes: z.array(z.object({
    category: z.nativeEnum(WasteCategory),
    weightKg: z.number().positive(),
  })).min(1),
  estimatedWeightKg: z.number().min(50),
  pickupAddress: z.string().min(1),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  placeId: z.string().optional(),
  preferredPickupDate: z.string().datetime(),
  images: z.array(z.string()).max(4, "Up to 4 photos are allowed."),
  additionalNotes: z.string().optional(),
});

const createQuotationSchema = z.object({
  purchasePrice: z.number().min(0),
  vehicleType: z.nativeEnum(VehicleType),
  estimatedPickupDate: z.string().datetime(),
  estimatedPickupTime: z.string().optional(),
  additionalNotes: z.string().optional(),
  pricesPerKg: z.record(z.string(), z.number()).optional(),
});

// Create Bulk Request (Business only)
marketplaceRouter.post(
  "/requests",
  requireAuth,
  requireRole(Role.USER),
  asyncHandler(async (req, res) => {
    const dbUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!dbUser || dbUser.accountType !== "BUSINESS") {
      sendError(res, 403, "FORBIDDEN", "Only Business accounts can create Bulk Marketplace Requests.");
      return;
    }

    const businessProfile = await prisma.businessProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (businessProfile?.verificationStatus !== "APPROVED") {
      sendError(res, 403, "FORBIDDEN", "Your business account must be verified to post Bulk Marketplace Requests.");
      return;
    }

    const parsed = createRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message || "Invalid input");
      return;
    }

    const request = await prisma.bulkMarketplaceRequest.create({
      data: {
        businessId: req.user!.id,
        ...parsed.data,
        status: "OPEN_FOR_BIDDING",
      },
    });

    sendData(res, 201, { request });
  })
);

// Upload a photo for a Bulk Request being drafted (Business only)
marketplaceRouter.post(
  "/requests/images",
  requireAuth,
  requireRole(Role.USER),
  requireCsrf,
  asyncHandler(async (req, res) => {
    const dbUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!dbUser || dbUser.accountType !== "BUSINESS") {
      sendError(res, 403, "FORBIDDEN", "Only Business accounts can upload Bulk Marketplace Request photos.");
      return;
    }

    try {
      await runImageUpload("image", req, res);
    } catch (err) {
      if (err instanceof MulterError && err.code === "LIMIT_FILE_SIZE") {
        sendError(res, 400, "FILE_TOO_LARGE", "Image must be 10MB or smaller.");
        return;
      }
      if (err instanceof Error && err.message === "UNSUPPORTED_FILE_TYPE") {
        sendError(res, 400, "UNSUPPORTED_FILE_TYPE", "Image must be a JPEG, PNG, or WebP file.");
        return;
      }
      throw err;
    }

    if (!req.file) {
      sendError(res, 400, "FILE_REQUIRED", "An image file is required (multipart field name: image).");
      return;
    }

    if (!detectImageSignature(req.file.buffer)) {
      sendError(res, 400, "UNSUPPORTED_FILE_TYPE", "Image must be a JPEG, PNG, or WebP file.");
      return;
    }

    if (!isCloudinaryConfigured()) {
      sendError(res, 503, "CLOUDINARY_NOT_CONFIGURED", "Image upload is currently unavailable. Please try again later.");
      return;
    }

    try {
      const { url } = await uploadBulkRequestImage(req.file.buffer, req.user!.id);
      sendData(res, 200, { url });
    } catch (err) {
      logger.error({ err }, "Cloudinary bulk request image upload failed");
      sendError(res, 502, "IMAGE_UPLOAD_FAILED", "Couldn't upload that image. Please try again.");
    }
  })
);

// List Bulk Requests (Business sees their own, Recycling Company sees open ones)
marketplaceRouter.get(
  "/requests",
  requireAuth,
  requireRole(Role.USER, Role.RECYCLING_COMPANY),
  asyncHandler(async (req, res) => {
    const dbUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const isBusiness = dbUser?.role === "USER" && dbUser?.accountType === "BUSINESS";
    const isRecyclingCompany = req.user!.role === "RECYCLING_COMPANY";

    if (!isBusiness && !isRecyclingCompany) {
      sendError(res, 403, "FORBIDDEN", "Unauthorized account type.");
      return;
    }

    let whereClause = {};
    if (isBusiness) {
      whereClause = { businessId: req.user!.id };
    } else if (isRecyclingCompany) {
      // Recycling companies can see OPEN requests, or requests they are assigned to
      whereClause = {
        OR: [
          { status: "OPEN_FOR_BIDDING" },
          { assignedCompanyId: req.user!.id }
        ]
      };
    }

    const requests = await prisma.bulkMarketplaceRequest.findMany({
      where: whereClause,
      include: {
        business: {
          select: { fullName: true, avatarUrl: true },
        },
        _count: {
          select: { quotations: true }
        },
        ...(isBusiness ? {
          assignedCompany: {
            select: { fullName: true }
          },
          quotations: {
            where: { status: "ACCEPTED" }
          },
          rating: {
            select: { score: true }
          }
        } : {}),
        ...(isRecyclingCompany ? {
          quotations: {
            where: { companyId: req.user!.id }
          }
        } : {})
      },
      orderBy: { createdAt: "desc" },
    });

    sendData(res, 200, { requests });
  })
);

// Get single request
marketplaceRouter.get(
  "/requests/:id",
  requireAuth,
  requireRole(Role.USER, Role.RECYCLING_COMPANY),
  asyncHandler(async (req, res) => {
    const request = await prisma.bulkMarketplaceRequest.findUnique({
      where: { id: req.params.id },
      include: {
        business: { select: { fullName: true, avatarUrl: true } },
        assignedCompany: { select: { fullName: true, avatarUrl: true, recyclingCompanyProfile: true } },
        quotations: {
          where: { companyId: req.user!.id }
        },
        rating: true
      }
    });

    if (!request) {
      sendError(res, 404, "NOT_FOUND", "Request not found.");
      return;
    }

    const dbUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const isBusiness = dbUser?.role === "USER" && dbUser?.accountType === "BUSINESS";
    const isRecyclingCompany = req.user!.role === "RECYCLING_COMPANY";

    if (isBusiness) {
      if (request.businessId !== req.user!.id) {
        sendError(res, 403, "FORBIDDEN", "You do not have permission to view this request.");
        return;
      }
    } else if (isRecyclingCompany) {
      const hasAcceptedQuote = request.quotations.some((q: any) => q.status === "ACCEPTED");
      if (request.status !== "OPEN_FOR_BIDDING" && request.assignedCompanyId !== req.user!.id && !hasAcceptedQuote) {
        sendError(res, 403, "FORBIDDEN", "You do not have permission to view this request.");
        return;
      }
    } else {
      sendError(res, 403, "FORBIDDEN", "Unauthorized account type.");
      return;
    }

    sendData(res, 200, { request });
  })
);

// Submit Quotation (Recycling Company only)
marketplaceRouter.post(
  "/requests/:id/quotations",
  requireAuth,
  requireRole(Role.RECYCLING_COMPANY),
  asyncHandler(async (req, res) => {
    const profile = await prisma.recyclingCompanyProfile.findUnique({
      where: { userId: req.user!.id }
    });
    if (profile?.verificationStatus !== "APPROVED") {
      sendError(res, 403, "FORBIDDEN", "Your account must be verified to submit quotations.");
      return;
    }

    const requestId = req.params.id;
    const request = await prisma.bulkMarketplaceRequest.findUnique({ where: { id: requestId } });

    if (!request) {
      sendError(res, 404, "NOT_FOUND", "Request not found.");
      return;
    }

    if (request.status !== "OPEN_FOR_BIDDING") {
      sendError(res, 400, "BAD_REQUEST", "Request is no longer open for bidding.");
      return;
    }

    const existingQuotation = await prisma.marketplaceQuotation.findUnique({
      where: {
        requestId_companyId: { requestId, companyId: req.user!.id }
      }
    });

    if (existingQuotation) {
      sendError(res, 400, "BAD_REQUEST", "You have already submitted a quotation for this request.");
      return;
    }

    const parsed = createQuotationSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message || "Invalid input");
      return;
    }

    // Create quotation
    const quotation = await prisma.marketplaceQuotation.create({
      data: {
        requestId,
        companyId: req.user!.id,
        ...parsed.data,
      }
    });

    sendData(res, 201, { quotation });
  })
);

// List Quotations for a request (Business only)
marketplaceRouter.get(
  "/requests/:id/quotations",
  requireAuth,
  requireRole(Role.USER),
  asyncHandler(async (req, res) => {
    const dbUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!dbUser || dbUser.accountType !== "BUSINESS") {
      sendError(res, 403, "FORBIDDEN", "Only Business accounts can view quotations.");
      return;
    }

    const requestId = req.params.id;
    const request = await prisma.bulkMarketplaceRequest.findUnique({ where: { id: requestId } });

    if (!request || request.businessId !== req.user!.id) {
      sendError(res, 404, "NOT_FOUND", "Request not found.");
      return;
    }

    const quotations = await prisma.marketplaceQuotation.findMany({
      where: { requestId },
      include: {
        company: {
          select: {
            fullName: true,
            avatarUrl: true,
            recyclingCompanyProfile: true,
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    sendData(res, 200, { quotations });
  })
);

// Accept Quotation (Business only)
marketplaceRouter.post(
  "/requests/:id/quotations/:quoteId/accept",
  requireAuth,
  requireRole(Role.USER),
  asyncHandler(async (req, res) => {
    const dbUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!dbUser || dbUser.accountType !== "BUSINESS") {
      sendError(res, 403, "FORBIDDEN", "Only Business accounts can accept quotations.");
      return;
    }

    const { id: requestId, quoteId } = req.params;

    const request = await prisma.bulkMarketplaceRequest.findUnique({ where: { id: requestId } });
    if (!request || request.businessId !== req.user!.id) {
      sendError(res, 404, "NOT_FOUND", "Request not found.");
      return;
    }

    if (request.status !== "OPEN_FOR_BIDDING") {
      sendError(res, 400, "BAD_REQUEST", "Request is not open for bidding.");
      return;
    }

    const quotation = await prisma.marketplaceQuotation.findUnique({ where: { id: quoteId } });
    if (!quotation || quotation.requestId !== requestId) {
      sendError(res, 404, "NOT_FOUND", "Quotation not found.");
      return;
    }

    const otherQuotations = await prisma.marketplaceQuotation.findMany({
      where: { requestId, id: { not: quoteId } },
      select: { companyId: true }
    });

    try {
      await prisma.$transaction(async (tx) => {
        const currentRequest = await tx.bulkMarketplaceRequest.findUnique({ where: { id: requestId } });
        if (currentRequest?.status !== "OPEN_FOR_BIDDING") {
          throw new Error("NOT_OPEN");
        }

        // 1. Mark accepted quotation
        await tx.marketplaceQuotation.update({
          where: { id: quoteId },
          data: { status: "ACCEPTED" }
        });

        // 2. Mark other quotations as rejected
        await tx.marketplaceQuotation.updateMany({
          where: { requestId, id: { not: quoteId } },
          data: { status: "REJECTED" }
        });

        // 3. Update Request status and assigned company
        await tx.bulkMarketplaceRequest.update({
          where: { id: requestId },
          data: {
            status: "RECYCLING_COMPANY_ASSIGNED",
            assignedCompanyId: quotation.companyId,
          }
        });
      });
    } catch (err: any) {
      if (err.message === "NOT_OPEN") {
        sendError(res, 400, "BAD_REQUEST", "Request is no longer open for bidding. Another quotation may have already been accepted.");
        return;
      }
      throw err;
    }

    // Notify Selected Recycling Company
    void createNotification({
      userId: quotation.companyId,
      type: "PICKUP_STATUS_UPDATE",
      title: "Quotation Accepted",
      message: "🎉 Your quotation has been accepted. You have been selected to collect this bulk request.",
      emailPreference: "emailNotificationsEnabled",
    });

    // Notify Rejected Recycling Companies
    for (const other of otherQuotations) {
      void createNotification({
        userId: other.companyId,
        type: "PICKUP_STATUS_UPDATE",
        title: "Quotation Not Selected",
        message: "Your quotation was not selected for this request. The Business has accepted another quotation.",
        emailPreference: "emailNotificationsEnabled",
      });
    }

    sendData(res, 200, { success: true });
  })
);

// List My Quotations (Recycling Company only)
marketplaceRouter.get(
  "/quotations/my",
  requireAuth,
  requireRole(Role.RECYCLING_COMPANY),
  asyncHandler(async (req, res) => {
    const quotations = await prisma.marketplaceQuotation.findMany({
      where: { companyId: req.user!.id },
      include: {
        request: {
          include: {
            business: { select: { fullName: true, avatarUrl: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    sendData(res, 200, { quotations });
  })
);

// Update Request Status (Recycling Company only)
marketplaceRouter.post(
  "/requests/:id/status",
  requireAuth,
  requireRole(Role.RECYCLING_COMPANY),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!["EN_ROUTE", "ARRIVED", "IN_PROGRESS"].includes(status)) {
      sendError(res, 400, "BAD_REQUEST", "Invalid status update.");
      return;
    }

    const request = await prisma.bulkMarketplaceRequest.findUnique({ where: { id } });
    if (!request || request.assignedCompanyId !== req.user!.id) {
      sendError(res, 404, "NOT_FOUND", "Request not found or not assigned to you.");
      return;
    }

    await prisma.bulkMarketplaceRequest.update({
      where: { id },
      data: { status: status as any }
    });

    sendData(res, 200, { success: true });
  })
);

// Submit Proof (Recycling Company only)
marketplaceRouter.post(
  "/requests/:id/submit-proof",
  requireAuth,
  requireRole(Role.RECYCLING_COMPANY),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { verifiedWeights, verifiedTotalWeightKg, collectionPhotos, notes } = req.body;

    const request = await prisma.bulkMarketplaceRequest.findUnique({ where: { id } });
    if (!request || request.assignedCompanyId !== req.user!.id) {
      sendError(res, 404, "NOT_FOUND", "Request not found or not assigned to you.");
      return;
    }

    let updatedNotes = request.additionalNotes;
    if (notes) {
      updatedNotes = updatedNotes ? `${updatedNotes}\n\nCollection Notes: ${notes}` : `Collection Notes: ${notes}`;
    }

    await prisma.bulkMarketplaceRequest.update({
      where: { id },
      data: {
        verifiedWeights,
        verifiedTotalWeightKg,
        collectionPhotos: collectionPhotos || [],
        additionalNotes: updatedNotes,
        status: "VERIFYING_WEIGHTS"
      }
    });

    void createNotification({
      userId: request.businessId,
      type: "PICKUP_STATUS_UPDATE",
      title: "Collection Proof Submitted",
      message: `The Recycling Company has submitted the collection proof. Please review and confirm.`,
      emailPreference: "emailNotificationsEnabled",
    });

    sendData(res, 200, { success: true });
  })
);

// Confirm Bulk Collection (Business only)
marketplaceRouter.post(
  "/requests/:id/confirm",
  requireAuth,
  requireRole(Role.USER),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const request = await prisma.bulkMarketplaceRequest.findUnique({ where: { id } });
    if (!request || request.businessId !== req.user!.id) {
      sendError(res, 404, "NOT_FOUND", "Request not found.");
      return;
    }

    if (request.status !== "VERIFYING_WEIGHTS") {
      sendError(res, 400, "BAD_REQUEST", "Request is not awaiting confirmation.");
      return;
    }

    await prisma.bulkMarketplaceRequest.update({
      where: { id },
      data: { status: "COMPLETED" }
    });
    
    void createNotification({
      userId: request.assignedCompanyId!,
      type: "PICKUP_STATUS_UPDATE",
      title: "Collection Confirmed",
      message: `The business has confirmed the collection at ${request.pickupAddress} (${(request.verifiedTotalWeightKg ?? request.estimatedWeightKg).toFixed(1)} kg).`,
      emailPreference: "emailNotificationsEnabled",
    });
    
    // Also award points to business (simplified here)
    if (request.verifiedTotalWeightKg) {
      const points = Math.floor(request.verifiedTotalWeightKg * 2);
      await prisma.user.update({
        where: { id: req.user!.id },
        data: {
          greenPointsBalance: { increment: points },
          totalGreenPoints: { increment: points }
        }
      });
      await prisma.greenPointsTransaction.create({
        data: {
          userId: req.user!.id,
          points,
          type: "EARNED",
          category: "PICKUP",
          description: "Earned from Bulk Marketplace Collection",
          totalPoints: points,
        }
      });
    }

    sendData(res, 200, { success: true });
  })
);

// Rate Bulk Collection (Business only)
marketplaceRouter.post(
  "/requests/:id/rate",
  requireAuth,
  requireRole(Role.USER),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { rating, review } = req.body;
    
    const request = await prisma.bulkMarketplaceRequest.findUnique({ where: { id } });
    if (!request || request.businessId !== req.user!.id) {
      sendError(res, 404, "NOT_FOUND", "Request not found.");
      return;
    }

    if (request.status !== "COMPLETED") {
      sendError(res, 400, "BAD_REQUEST", "Can only rate completed requests.");
      return;
    }
    
    if (!request.assignedCompanyId) {
      sendError(res, 400, "BAD_REQUEST", "No assigned company to rate.");
      return;
    }

    const ratingRecord = await prisma.rating.create({
      data: {
        bulkRequestId: id,
        raterId: req.user!.id,
        collectorId: request.assignedCompanyId,
        score: rating,
        comment: review
      }
    });

    void createNotification({
      userId: request.assignedCompanyId,
      type: "GENERIC",
      title: "New Rating Received",
      message: `You received a ${rating}-star rating for your bulk collection.`,
      emailPreference: "emailNotificationsEnabled",
    });

    sendData(res, 200, { success: true, rating: ratingRecord });
  })
);

// Recycling Company Dashboard Stats
marketplaceRouter.get(
  "/dashboard/recycling-company",
  requireAuth,
  requireRole(Role.RECYCLING_COMPANY),
  asyncHandler(async (req, res) => {
    const companyId = req.user!.id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Open Marketplace Requests
    const openRequestsCount = await prisma.bulkMarketplaceRequest.count({
      where: { status: "OPEN_FOR_BIDDING" }
    });

    // 2. Active Quotations
    const activeQuotationsCount = await prisma.marketplaceQuotation.count({
      where: { companyId, status: "PENDING" }
    });

    // 3. Today's Scheduled Collections (Assigned to this company, EN_ROUTE or ARRIVED or IN_PROGRESS or VERIFYING_WEIGHTS, or ACCEPTED quotation date is today)
    // For simplicity, we just count non-completed and non-cancelled assigned requests.
    const activePickupsCount = await prisma.bulkMarketplaceRequest.count({
      where: {
        assignedCompanyId: companyId,
        status: { notIn: ["COMPLETED", "CANCELLED", "OPEN_FOR_BIDDING"] }
      }
    });

    // 4. Completed Collections
    const completedPickupsCount = await prisma.bulkMarketplaceRequest.count({
      where: {
        assignedCompanyId: companyId,
        status: "COMPLETED"
      }
    });

    // 5. Average Rating
    const ratings = await prisma.rating.aggregate({
      _avg: { score: true },
      _count: { score: true },
      where: { collectorId: companyId }
    });
    const avgRating = ratings._avg.score || 0;
    const totalReviews = ratings._count.score || 0;

    // 6. Total Purchase Value (This Month)
    // We need to sum up purchasePrice of accepted quotations where the request is completed this month
    const monthlyQuotations = await prisma.marketplaceQuotation.findMany({
      where: {
        companyId,
        status: "ACCEPTED",
        request: {
          status: "COMPLETED",
          updatedAt: { gte: startOfMonth }
        }
      },
      select: { purchasePrice: true }
    });
    const totalPurchaseValue = monthlyQuotations.reduce((sum, q) => sum + q.purchasePrice, 0);

    // 7. Recent Marketplace Requests
    const recentRequests = await prisma.bulkMarketplaceRequest.findMany({
      where: { status: "OPEN_FOR_BIDDING" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        business: { select: { fullName: true } }
      }
    });

    // 8. Upcoming Collections
    const upcomingCollections = await prisma.bulkMarketplaceRequest.findMany({
      where: {
        assignedCompanyId: companyId,
        status: { notIn: ["COMPLETED", "CANCELLED", "OPEN_FOR_BIDDING"] }
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        business: { select: { fullName: true } },
        quotations: { where: { status: "ACCEPTED" }, select: { estimatedPickupDate: true } }
      }
    });

    // 9. Monthly Performance Chart
    // Last 6 months completion counts
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const completedHistory = await prisma.bulkMarketplaceRequest.findMany({
      where: {
        assignedCompanyId: companyId,
        status: "COMPLETED",
        updatedAt: { gte: sixMonthsAgo }
      },
      select: { updatedAt: true }
    });

    const chartMap = new Map<string, number>();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      chartMap.set(d.toLocaleString('default', { month: 'short' }), 0);
    }

    completedHistory.forEach(req => {
      const monthStr = req.updatedAt.toLocaleString('default', { month: 'short' });
      if (chartMap.has(monthStr)) {
        chartMap.set(monthStr, chartMap.get(monthStr)! + 1);
      }
    });

    const performanceChart = Array.from(chartMap.entries()).reverse().map(([month, count]) => ({
      month, count
    }));

    // 10. Collection Success Rate
    const totalAssigned = await prisma.bulkMarketplaceRequest.count({
      where: { assignedCompanyId: companyId }
    });
    const successRate = totalAssigned > 0 ? Math.round((completedPickupsCount / totalAssigned) * 100) : 100;

    sendData(res, 200, {
      stats: {
        openRequests: openRequestsCount,
        activeQuotations: activeQuotationsCount,
        scheduledPickups: activePickupsCount,
        completedPickups: completedPickupsCount,
        avgRating,
        totalReviews,
        totalPurchaseValue,
        successRate,
      },
      recentRequests,
      upcomingCollections,
      performanceChart,
    });
  })
);
