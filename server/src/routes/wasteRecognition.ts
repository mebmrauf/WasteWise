// AI Waste Recognition routes — a user uploads a photo of an item, the
// backend asks Google Cloud Vision to label it, maps that onto our
// WasteCategory enum (see lib/wasteLabelMapping.ts), and logs the result to
// WasteRecognitionLog for the user's own reference and as future raw data
// for Demand Forecast / Sustainability Reports.
//
// Mounted at /api/v1/waste-recognition in app.ts, matching usersRouter's
// mounting pattern. This is a standalone feature — using it is never
// required before placing a Smart Pickup Request; see docs/api-contract.md
// if that note needs to move there later.
import path from "node:path";
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { Router, type Request, type Response } from "express";
import multer, { MulterError } from "multer";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../lib/rbac";
import { requireCsrf } from "../lib/csrf";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData, sendError } from "../lib/apiResponse";
import { logger } from "../lib/logger";
import { detectLabels, isVisionConfigured, VisionApiError } from "../lib/visionClient";
import { classifyLabels, getCategoryDefaults } from "../lib/wasteLabelMapping";

export const wasteRecognitionRouter = Router();

// ---------------------------------------------------------------------------
// Photo upload: local-disk multer config, mirroring routes/users.ts's avatar
// upload setup — see that file's comment block for the same known
// limitation (Render's filesystem is ephemeral) and the same reasoning for
// why the client-declared Content-Type is only a cheap pre-filter, not the
// real validation.
// ---------------------------------------------------------------------------
export const WASTE_PHOTO_UPLOAD_DIR = path.resolve(
  __dirname,
  "../../uploads/waste-recognition",
);
fs.mkdirSync(WASTE_PHOTO_UPLOAD_DIR, { recursive: true });

const PHOTO_MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB — a bit larger than the 2MB avatar
// limit since waste photos are taken ad hoc (often not pre-cropped/compressed
// the way a profile picture editor would).

// Same byte-signature sniffing as routes/users.ts's detectImageSignature —
// duplicated here rather than imported since users.ts doesn't currently
// export it. Worth factoring into a shared lib/imageValidation.ts if a third
// route ends up needing this too.
function detectImageSignature(buffer: Buffer): { ext: string } | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: "jpg" };
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { ext: "png" };
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { ext: "webp" };
  }
  return null;
}

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!PHOTO_MIME_EXTENSIONS[file.mimetype]) {
      cb(new Error("UNSUPPORTED_FILE_TYPE"));
      return;
    }
    cb(null, true);
  },
});

function runPhotoUpload(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    photoUpload.single("photo")(req, res, (err: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// POST /api/v1/waste-recognition
// ---------------------------------------------------------------------------
wasteRecognitionRouter.post(
  "/",
  requireAuth,
  requireCsrf,
  asyncHandler(async (req, res) => {
    if (!isVisionConfigured()) {
      sendError(
        res,
        503,
        "VISION_NOT_CONFIGURED",
        "Waste recognition is currently unavailable. Please try again later.",
      );
      return;
    }

    try {
      await runPhotoUpload(req, res);
    } catch (err) {
      if (err instanceof MulterError && err.code === "LIMIT_FILE_SIZE") {
        sendError(res, 400, "FILE_TOO_LARGE", "Photo must be 5MB or smaller.");
        return;
      }
      if (err instanceof Error && err.message === "UNSUPPORTED_FILE_TYPE") {
        sendError(res, 400, "UNSUPPORTED_FILE_TYPE", "Photo must be a JPEG, PNG, or WebP image.");
        return;
      }
      throw err;
    }

    if (!req.file) {
      sendError(
        res,
        400,
        "FILE_REQUIRED",
        "A photo file is required (multipart field name: photo).",
      );
      return;
    }

    const signature = detectImageSignature(req.file.buffer);
    if (!signature) {
      sendError(res, 400, "UNSUPPORTED_FILE_TYPE", "Photo must be a JPEG, PNG, or WebP image.");
      return;
    }

    // Call Vision before writing anything to disk — no point keeping a file
    // around if the classification step fails.
    let classification;
    let rawLabels;
    try {
      const labels = await detectLabels(req.file.buffer);
      if (labels.length === 0) {
        sendError(
          res,
          422,
          "NO_LABELS_DETECTED",
          "Couldn't identify anything in that photo. Try a clearer, closer shot.",
        );
        return;
      }
      classification = classifyLabels(labels);
      rawLabels = labels; // full label list, kept for debugging/future features
    } catch (err) {
      if (err instanceof VisionApiError) {
        logger.error({ err: err.details }, "Vision API classification failed");
        sendError(
          res,
          502,
          "VISION_FAILED",
          "We couldn't analyze that photo right now. Please try again shortly.",
        );
        return;
      }
      throw err;
    }

    // The user has opted not to save waste recognition images.
    // We skip fs.writeFileSync and just pass an empty string for the database log.
    const imageUrl = "";

    const log = await prisma.wasteRecognitionLog.create({
      data: {
        userId: req.user!.id,
        imageUrl,
        detectedCategory: classification.detectedCategory,
        isRecyclable: classification.isRecyclable,
        confidence: classification.confidence,
        rawLabels: rawLabels as unknown as Prisma.InputJsonValue,
        preparationTip: classification.preparationTip,
      },
    });

    sendData(res, 201, { scan: log });
  }),
);

// ---------------------------------------------------------------------------
// GET /api/v1/waste-recognition — the current user's own scan history.
// ---------------------------------------------------------------------------
wasteRecognitionRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const logs = await prisma.wasteRecognitionLog.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    sendData(res, 200, { scans: logs });
  }),
);

// ---------------------------------------------------------------------------
// PATCH /api/v1/waste-recognition/:id/correct — user manually corrects a
// scan's category (e.g. "this was actually plastic, not glass"). Vision's
// label detection can't reliably distinguish visually similar materials
// (clear plastic vs. glass); this lets a user fix it after the fact.
// ---------------------------------------------------------------------------
wasteRecognitionRouter.patch(
  "/:id/correct",
  requireAuth,
  requireCsrf,
  asyncHandler(async (req, res) => {
    const { category } = req.body as { category?: string };
    const validCategories = [
      "PLASTIC", "PAPER", "METAL", "GLASS", "ELECTRONIC", "ORGANIC", "MIXED", "OTHER",
    ];
    if (!category || !validCategories.includes(category)) {
      sendError(res, 400, "VALIDATION_ERROR", "A valid category is required.");
      return;
    }

    const existing = await prisma.wasteRecognitionLog.findUnique({
      where: { id: req.params.id },
    });
    if (!existing || existing.userId !== req.user!.id) {
      sendError(res, 404, "NOT_FOUND", "Scan not found.");
      return;
    }

    const defaults = getCategoryDefaults(category as never);
    const updated = await prisma.wasteRecognitionLog.update({
      where: { id: existing.id },
      data: {
        detectedCategory: category as never,
        isRecyclable: defaults.isRecyclable,
        preparationTip: defaults.preparationTip,
      },
    });

    sendData(res, 200, { scan: updated });
  }),
);