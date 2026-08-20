import { Router, type Request, type Response } from "express";
import multer, { MulterError } from "multer";
import { requireAuth } from "../lib/rbac";
import { requireCsrf } from "../lib/csrf";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData, sendError } from "../lib/apiResponse";
import { uploadImage, isCloudinaryConfigured } from "../lib/cloudinary";
import { logger } from "../lib/logger";
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB, matching waste-recognition's limit
const MAX_PHOTOS = 4;
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
    photoUpload.array("photos", MAX_PHOTOS)(req, res, (err: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });
}



export const wastePhotosRouter = Router();

wastePhotosRouter.post(
  "/",
  requireAuth,
  requireCsrf,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      await runPhotoUpload(req, res);
    } catch (err) {
      if (err instanceof MulterError && err.code === "LIMIT_FILE_SIZE") {
        sendError(res, 400, "FILE_TOO_LARGE", "Photos must be 5MB or smaller.");
        return;
      }
      if (err instanceof Error && err.message === "UNSUPPORTED_FILE_TYPE") {
        sendError(res, 400, "UNSUPPORTED_FILE_TYPE", "Photos must be JPEG, PNG, or WebP images.");
        return;
      }
      if (err instanceof MulterError && err.code === "LIMIT_UNEXPECTED_FILE") {
        sendError(res, 400, "TOO_MANY_FILES", `You can upload a maximum of ${MAX_PHOTOS} photos.`);
        return;
      }
      throw err;
    }

    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      sendError(
        res,
        400,
        "FILE_REQUIRED",
        "At least one photo file is required (multipart field name: photos).",
      );
      return;
    }

    if (!isCloudinaryConfigured()) {
      sendError(
        res,
        503,
        "CLOUDINARY_NOT_CONFIGURED",
        "Photo upload is currently unavailable. Please try again later.",
      );
      return;
    }

    const urls: string[] = [];
    for (const file of req.files as Express.Multer.File[]) {
      try {
        const result = await uploadImage(file.buffer, "wastewise/pickups");
        urls.push(result.url);
      } catch (err) {
        logger.error({ err }, "Cloudinary waste pickup photo upload failed");
        sendError(res, 502, "PHOTO_UPLOAD_FAILED", "Couldn't upload photo. Please try again.");
        return;
      }
    }

    sendData(res, 201, { urls });
  }),
);
