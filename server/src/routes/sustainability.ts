import { Router } from "express";
import { requireAuth } from "../lib/rbac";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData, sendError } from "../lib/apiResponse";
import { computeSustainabilityReport } from "../lib/sustainabilityCalculator";

export const sustainabilityRouter = Router();

// GET /api/v1/sustainability/report — the logged-in user's own impact report
sustainabilityRouter.get(
  "/report",
  requireAuth,
  asyncHandler(async (req, res) => {
    const report = await computeSustainabilityReport(req.user!.id);
    sendData(res, 200, { report });
  }),
);

// GET /api/v1/sustainability/report/platform — admin-only, all users combined
sustainabilityRouter.get(
  "/report/platform",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user!.role !== "ADMIN") {
      sendError(res, 403, "FORBIDDEN", "Admins only");
      return;
    }
    const report = await computeSustainabilityReport();
    sendData(res, 200, { report });
  }),
);