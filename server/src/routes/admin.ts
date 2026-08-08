import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../lib/rbac";
import { requireCsrf } from "../lib/csrf";
import { sendData, sendError } from "../lib/apiResponse";
import { VerificationStatus } from "@prisma/client";
import { toPublicCollectorProfile } from "./users";

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

    sendData(res, 200, { collector: publicCollector });
  }),
);
