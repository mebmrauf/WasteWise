import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../lib/rbac";
import { requireCsrf } from "../lib/csrf";
import { sendData, sendError } from "../lib/apiResponse";
import { createComplaintSchema } from "./complaints.schemas";
import multer, { MulterError } from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export const COMPLAINT_PHOTO_UPLOAD_DIR = path.resolve(
  __dirname,
  "../../uploads/complaints"
);
fs.mkdirSync(COMPLAINT_PHOTO_UPLOAD_DIR, { recursive: true });

const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2MB
const PHOTO_MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

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
    photoUpload.array("photos", 2)(req, res, (err: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });
}


export const complaintsRouter = Router();

complaintsRouter.post(
  "/",
  requireAuth,
  requireCsrf,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      await runPhotoUpload(req, res);
    } catch (err) {
      if (err instanceof MulterError && err.code === "LIMIT_FILE_SIZE") {
        sendError(res, 400, "FILE_TOO_LARGE", "Photos must be 2MB or smaller.");
        return;
      }
      if (err instanceof Error && err.message === "UNSUPPORTED_FILE_TYPE") {
        sendError(res, 400, "UNSUPPORTED_FILE_TYPE", "Photos must be JPEG, PNG, or WebP images.");
        return;
      }
      if (err instanceof MulterError && err.code === "LIMIT_UNEXPECTED_FILE") {
        sendError(res, 400, "TOO_MANY_FILES", "You can upload a maximum of 2 photos.");
        return;
      }
      throw err;
    }

    const parsed = createComplaintSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    const { requestId, againstUserId, description } = parsed.data;
    const searchId = requestId.trim().toLowerCase();

    // Verify the request exists by partial ID matching
    const pickupRequests = await prisma.pickupRequest.findMany({
      where: {
        OR: [
          { id: { endsWith: searchId } },
          { id: { startsWith: searchId } },
        ]
      },
    });

    const bulkRequests = await prisma.bulkMarketplaceRequest.findMany({
      where: {
        OR: [
          { id: { endsWith: searchId } },
          { id: { startsWith: searchId } },
        ]
      },
    });

    if (pickupRequests.length === 0 && bulkRequests.length === 0) {
      sendError(res, 404, "NOT_FOUND", "Request not found.");
      return;
    }

    if (pickupRequests.length + bulkRequests.length > 1) {
      sendError(res, 400, "AMBIGUOUS_ID", "Request ID matches multiple records. Please provide a more specific ID.");
      return;
    }

    const actualPickupRequestId = pickupRequests.length === 1 ? pickupRequests[0].id : null;
    const actualBulkRequestId = bulkRequests.length === 1 ? bulkRequests[0].id : null;

    const photos: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        const ext = PHOTO_MIME_EXTENSIONS[file.mimetype];
        const filename = `${crypto.randomUUID()}.${ext}`;
        const filepath = path.join(COMPLAINT_PHOTO_UPLOAD_DIR, filename);
        fs.writeFileSync(filepath, file.buffer);
        photos.push(`/uploads/complaints/${filename}`);
      }
    }

    const complaint = await prisma.complaint.create({
      data: {
        complainantId: req.user!.id,
        pickupRequestId: actualPickupRequestId,
        bulkRequestId: actualBulkRequestId,
        againstUserId,
        description,
        status: "OPEN",
        photos,
      },
      include: {
        againstUser: { select: { id: true, fullName: true, email: true } },
        pickupRequest: { select: { id: true, status: true } },
        bulkRequest: { select: { id: true, status: true } },
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
        pickupRequest: { select: { id: true, status: true, pickupDate: true, pickupFormattedAddress: true } },
        bulkRequest: { select: { id: true, status: true, pickupAddress: true } },
        resolvedByAdmin: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    sendData(res, 200, { complaints });
  }),
);
