import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../lib/rbac";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData, sendError } from "../lib/apiResponse";
import { WasteCategory, VehicleType, Prisma, Role } from "@prisma/client";

export const marketplaceRouter = Router();

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
        }
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
      if (request.status !== "OPEN_FOR_BIDDING" && request.assignedCompanyId !== req.user!.id) {
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

    const parsed = createQuotationSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message || "Invalid input");
      return;
    }

    // Upsert quotation
    const quotation = await prisma.marketplaceQuotation.upsert({
      where: {
        requestId_companyId: { requestId, companyId: req.user!.id }
      },
      create: {
        requestId,
        companyId: req.user!.id,
        ...parsed.data,
      },
      update: {
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

    await prisma.$transaction(async (tx) => {
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

    sendData(res, 200, { success: true });
  })
);
