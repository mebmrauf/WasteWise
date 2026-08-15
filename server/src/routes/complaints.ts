import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../lib/rbac";
import { requireCsrf } from "../lib/csrf";
import { sendData, sendError } from "../lib/apiResponse";
import { createComplaintSchema } from "./complaints.schemas";

export const complaintsRouter = Router();

complaintsRouter.post(
  "/",
  requireAuth,
  requireCsrf,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = createComplaintSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    const { pickupRequestId, againstUserId, description } = parsed.data;

    // Verify the pickup request exists
    const pickupRequest = await prisma.pickupRequest.findUnique({
      where: { id: pickupRequestId },
    });

    if (!pickupRequest) {
      sendError(res, 404, "NOT_FOUND", "Pickup request not found.");
      return;
    }

    const complaint = await prisma.complaint.create({
      data: {
        complainantId: req.user!.id,
        pickupRequestId,
        againstUserId,
        description,
        status: "OPEN",
      },
      include: {
        againstUser: { select: { id: true, fullName: true, email: true } },
        pickupRequest: { select: { id: true, status: true } },
      }
    });

    sendData(res, 201, { complaint });
  }),
);

complaintsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const complaints = await prisma.complaint.findMany({
      where: { complainantId: req.user!.id },
      include: {
        againstUser: { select: { id: true, fullName: true, email: true } },
        pickupRequest: { select: { id: true, status: true, timeSlotStart: true, timeSlotEnd: true, pickupFormattedAddress: true } },
        resolvedByAdmin: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    sendData(res, 200, { complaints });
  }),
);
