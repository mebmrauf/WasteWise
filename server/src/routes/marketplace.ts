import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../lib/rbac";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData, sendError } from "../lib/apiResponse";
import { WasteCategory, VehicleType, Prisma, Role, PaymentStatus, PaymentMethod } from "@prisma/client";
import { createNotification } from "../lib/notifications";
import { calculateMembershipLevel, getMembershipBonusPercentage, getMembershipBadge } from "../lib/rewards";
import { calculateBulkPickupAmount } from "../lib/paymentCalculator";
import { logger } from "../lib/logger";

export const marketplaceRouter = Router();

// Configurable bidding duration (in minutes) - Set to 3 for testing, change to 1440 (24h) for production
const BIDDING_DURATION_MINUTES = 1440;
const BIDDING_DURATION_MS = BIDDING_DURATION_MINUTES * 60 * 1000;

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
  images: z.array(z.string()),
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
        bidEndsAt: new Date(Date.now() + BIDDING_DURATION_MS),
      },
    });

    sendData(res, 201, { request });
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
          },
          csrContributions: {
            select: { id: true }
          }
        } : {}),
        ...(isRecyclingCompany ? {
          quotations: {
            where: { companyId: req.user!.id }
          },
          rating: {
            select: { score: true }
          }
        } : {}),
        payments: {
          where: { status: "COMPLETED" },
          select: { id: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    // Send back with mapped hasPayment
    const mappedRequests = requests.map(r => ({
      ...r,
      hasPayment: r.payments ? r.payments.length > 0 : false
    }));

    sendData(res, 200, { requests: mappedRequests });
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
        rating: true,
        payments: {
          where: { status: "COMPLETED" },
          select: { id: true }
        }
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
      const hasQuotation = request.quotations.length > 0;
      if (request.status !== "OPEN_FOR_BIDDING" && request.assignedCompanyId !== req.user!.id && !hasQuotation) {
        sendError(res, 403, "FORBIDDEN", "You do not have permission to view this request.");
        return;
      }
    } else {
      sendError(res, 403, "FORBIDDEN", "Unauthorized account type.");
      return;
    }

    const mappedRequest = {
      ...request,
      hasPayment: request.payments ? request.payments.length > 0 : false
    };

    sendData(res, 200, { request: mappedRequest });
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

    const expirationTime = request.bidEndsAt ? request.bidEndsAt.getTime() : new Date(request.createdAt).getTime() + 24 * 60 * 60 * 1000;

    if (request.status !== "OPEN_FOR_BIDDING" || Date.now() >= expirationTime) {
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

    if (request.status !== "BIDDING_CLOSED") {
      sendError(res, 400, "BAD_REQUEST", "Bidding has not closed yet.");
      return;
    }

    const quotation = await prisma.marketplaceQuotation.findUnique({ where: { id: quoteId } });
    if (!quotation || quotation.requestId !== requestId) {
      sendError(res, 404, "NOT_FOUND", "Quotation not found.");
      return;
    }

    // Self-healing: if no highest bid is marked, calculate and persist it
    let highestBidId = quotation.isHighestBid ? quotation.id : null;
    if (!highestBidId) {
      const allQuotes = await prisma.marketplaceQuotation.findMany({ where: { requestId } });
      const existingHighest = allQuotes.find(q => q.isHighestBid);
      if (existingHighest) {
        highestBidId = existingHighest.id;
      } else if (allQuotes.length > 0) {
        const sorted = [...allQuotes].sort((a, b) => {
          if (a.purchasePrice !== b.purchasePrice) return b.purchasePrice - a.purchasePrice;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        highestBidId = sorted[0].id;
        
        await prisma.marketplaceQuotation.update({
          where: { id: highestBidId },
          data: { isHighestBid: true }
        });
      }
    }

    if (!quotation.isHighestBid && quotation.id !== highestBidId) {
      sendError(res, 400, "BAD_REQUEST", "You can only accept the highest bid.");
      return;
    }

    const otherQuotations = await prisma.marketplaceQuotation.findMany({
      where: { requestId, id: { not: quoteId } },
      select: { companyId: true }
    });

    try {
      await prisma.$transaction(async (tx) => {
        const currentRequest = await tx.bulkMarketplaceRequest.findUnique({ where: { id: requestId } });
        if (currentRequest?.status !== "BIDDING_CLOSED") {
          throw new Error("NOT_CLOSED");
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
      if (err.message === "NOT_CLOSED") {
        sendError(res, 400, "BAD_REQUEST", "Bidding is not closed or already decided.");
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

// Reject Quotation (Business only)
marketplaceRouter.post(
  "/requests/:id/quotations/:quoteId/reject",
  requireAuth,
  requireRole(Role.USER),
  asyncHandler(async (req, res) => {
    const dbUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!dbUser || dbUser.accountType !== "BUSINESS") {
      sendError(res, 403, "FORBIDDEN", "Only Business accounts can reject quotations.");
      return;
    }

    const { id: requestId, quoteId } = req.params;

    const request = await prisma.bulkMarketplaceRequest.findUnique({ where: { id: requestId } });
    if (!request || request.businessId !== req.user!.id) {
      sendError(res, 404, "NOT_FOUND", "Request not found.");
      return;
    }

    if (request.status !== "BIDDING_CLOSED") {
      sendError(res, 400, "BAD_REQUEST", "Bidding has not closed yet.");
      return;
    }

    const quotation = await prisma.marketplaceQuotation.findUnique({ where: { id: quoteId } });
    if (!quotation || quotation.requestId !== requestId) {
      sendError(res, 404, "NOT_FOUND", "Quotation not found.");
      return;
    }

    // Self-healing: if no highest bid is marked, calculate and persist it
    let highestBidId = quotation.isHighestBid ? quotation.id : null;
    if (!highestBidId) {
      const allQuotes = await prisma.marketplaceQuotation.findMany({ where: { requestId } });
      const existingHighest = allQuotes.find(q => q.isHighestBid);
      if (existingHighest) {
        highestBidId = existingHighest.id;
      } else if (allQuotes.length > 0) {
        const sorted = [...allQuotes].sort((a, b) => {
          if (a.purchasePrice !== b.purchasePrice) return b.purchasePrice - a.purchasePrice;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        highestBidId = sorted[0].id;
        
        await prisma.marketplaceQuotation.update({
          where: { id: highestBidId },
          data: { isHighestBid: true }
        });
      }
    }

    if (!quotation.isHighestBid && quotation.id !== highestBidId) {
      sendError(res, 400, "BAD_REQUEST", "You can only reject the highest bid.");
      return;
    }

    try {
      await prisma.$transaction(async (tx) => {
        const currentRequest = await tx.bulkMarketplaceRequest.findUnique({ where: { id: requestId } });
        if (currentRequest?.status !== "BIDDING_CLOSED") {
          throw new Error("NOT_CLOSED");
        }

        // Mark highest quotation as rejected
        await tx.marketplaceQuotation.update({
          where: { id: quoteId },
          data: { status: "REJECTED" }
        });

        // Request stays in BIDDING_CLOSED (unassigned state)
      });
    } catch (err: any) {
      if (err.message === "NOT_CLOSED") {
        sendError(res, 400, "BAD_REQUEST", "Bidding is not closed or already decided.");
        return;
      }
      throw err;
    }

    void createNotification({
      userId: quotation.companyId,
      type: "PICKUP_STATUS_UPDATE",
      title: "Quotation Not Selected",
      message: "Your highest quotation was rejected by the Business.",
      emailPreference: "emailNotificationsEnabled",
    });

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

    const updatedRequest = await prisma.bulkMarketplaceRequest.update({
      where: { id },
      data: { status: "COMPLETED" }
    });

    if (updatedRequest.assignedCompanyId) {
      try {
        const { amount, customerId } = await calculateBulkPickupAmount(id);
        await prisma.payment.create({
          data: {
            bulkRequestId: id,
            customerId,
            payerId: updatedRequest.assignedCompanyId,
            amount,
            paymentMethod: PaymentMethod.NOT_SELECTED,
            status: PaymentStatus.PENDING,
          }
        });
      } catch (err) {
        logger.error({ err, bulkRequestId: id }, "Failed to auto-create pending payment for bulk request");
      }
    }

    void createNotification({
      userId: request.assignedCompanyId!,
      type: "PICKUP_STATUS_UPDATE",
      title: "Collection Confirmed",
      message: `The business has confirmed the collection for request ${id.slice(0, 8)}.`,
      emailPreference: "emailNotificationsEnabled",
    });

    // Also award points to business and update membership
    if (request.verifiedTotalWeightKg) {
      const basePoints = Math.floor(request.verifiedTotalWeightKg * 2);
      
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          greenPointsBalance: true,
          totalGreenPoints: true,
          accountType: true,
          membershipLevel: true,
          sustainabilityCertificateUrl: true
        }
      });

      if (user) {
        const lifetimePoints = Math.max(user.totalGreenPoints, user.greenPointsBalance);
        const currentLevel = calculateMembershipLevel(lifetimePoints, user.accountType);
        const bonusPercentage = getMembershipBonusPercentage(currentLevel);
        const bonusPoints = Math.round(basePoints * (bonusPercentage / 100));
        const totalPoints = basePoints + bonusPoints;

        const newLifetimePoints = lifetimePoints + totalPoints;
        const newLevel = calculateMembershipLevel(newLifetimePoints, user.accountType);
        const newBadge = getMembershipBadge(newLevel);

        const bonusesBreakdown = [];
        bonusesBreakdown.push({
          name: `${currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1).toLowerCase()} Bonus${bonusPercentage > 0 ? ` (${bonusPercentage}%)` : ''}`,
          points: bonusPoints
        });

        const rewardReason = {
          basePoints,
          bonusPoints,
          totalPoints,
          bonuses: bonusesBreakdown
        };

        const updateData: any = {
          greenPointsBalance: { increment: totalPoints },
          totalGreenPoints: { increment: totalPoints },
          membershipLevel: newLevel,
          membershipBadge: newBadge
        };

        // If newly reached GOLD and no certificate yet, unlock it
        let unlockedCertificate = false;
        if ((newLevel === "GOLD" || newLevel === "PLATINUM") && !user.sustainabilityCertificateUrl) {
          updateData.sustainabilityCertificateUrl = "UNLOCKED";
          unlockedCertificate = true;
        }

        await prisma.user.update({
          where: { id: req.user!.id },
          data: updateData
        });

        await prisma.greenPointsTransaction.create({
          data: {
            userId: req.user!.id,
            points: basePoints,
            type: "EARNED",
            category: "PICKUP",
            description: `Earned from Bulk Marketplace Collection (Req: ${id.slice(0, 8)})`,
            basePoints,
            bonusPoints,
            totalPoints,
            rewardReason: rewardReason as any
          }
        });

        await prisma.greenPointsTransaction.create({
          data: {
            userId: req.user!.id,
            points: bonusPoints,
            type: "EARNED",
            category: "LOYALTY",
            description: `${currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1).toLowerCase()} Membership Bonus${bonusPercentage > 0 ? ` (${bonusPercentage}%)` : ''}`,
            basePoints: 0,
            bonusPoints: bonusPoints,
            totalPoints: bonusPoints,
          }
        });

        if (currentLevel !== newLevel) {
          await prisma.greenPointsTransaction.create({
            data: {
              userId: req.user!.id,
              points: 0,
              type: "EARNED",
              category: "BONUS",
              description: `${newLevel.charAt(0).toUpperCase() + newLevel.slice(1).toLowerCase()} Membership Unlocked`,
              basePoints: 0,
              bonusPoints: 0,
              totalPoints: 0,
            }
          });
        }

        if (unlockedCertificate) {
          await prisma.greenPointsTransaction.create({
            data: {
              userId: req.user!.id,
              points: 0,
              type: "EARNED",
              category: "BONUS",
              description: "Sustainability Certificate Awarded",
              basePoints: 0,
              bonusPoints: 0,
              totalPoints: 0,
            }
          });
        }
      }
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
