// Profile routes — view/update the *current* user's own profile (fullName,
// phone, address, avatarUrl, notification prefs) and upload an avatar image.
// Mounted at /api/v1/users in app.ts, matching authRouter's mounting
// pattern. There's no `:userId` param anywhere here — every route operates
// on `req.user.id` (a user can only ever view/edit their own profile).
//
// This is a deliberately distinct resource from GET /api/v1/auth/me (focused
// on session/auth-state restore on app mount) — this one covers the
// household profile page's fuller data (address, avatarUrl, notification
// toggles). See docs/api-contract.md "User Profile" section for the
// reasoning and a flagged question about whether the two should eventually
// be consolidated.
import path from "node:path";
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { Router, type Request, type Response } from "express";
import multer, { MulterError } from "multer";
import { Prisma, type User } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../lib/rbac";
import { requireCsrf } from "../lib/csrf";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData, sendError } from "../lib/apiResponse";
import { clearAuthCookies } from "../lib/cookies";
import { logger } from "../lib/logger";
import {
  GeocodingResolutionError,
  isGeocodingConfigured,
  resolveAddressFromPlaceId,
} from "../lib/geocoding";
import { updateProfileSchema } from "./users.schemas";

export const usersRouter = Router();

/**
 * Strips `passwordHash` and other internal fields before ever sending a user
 * back to a client. Equivalent of auth.ts's (unexported) `toPublicUser`, kept
 * separate since this resource intentionally surfaces a superset of fields
 * (address, avatarUrl, notification prefs) that GET /auth/me deliberately
 * does not return.
 */
function toPublicProfile(user: User) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    fullName: user.fullName,
    role: user.role,
    accountType: user.accountType,
    isEmailVerified: user.isEmailVerified,
    formattedAddress: user.formattedAddress,
    latitude: user.latitude,
    longitude: user.longitude,
    placeId: user.placeId,
    avatarUrl: user.avatarUrl,
    emailNotificationsEnabled: user.emailNotificationsEnabled,
    smsNotificationsEnabled: user.smsNotificationsEnabled,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Avatar upload: local-disk multer config
//
// KNOWN LIMITATION (not solved here — see docs/api-contract.md): Render's
// filesystem is ephemeral, so anything written to disk here is lost on every
// redeploy/restart. Fine for local dev; a real production gap. Wiring up
// S3/Cloudinary is out of scope for this pass.
// ---------------------------------------------------------------------------
export const AVATAR_UPLOAD_DIR = path.resolve(__dirname, "../../uploads/avatars");
fs.mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true });

const AVATAR_MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2MB

// The client-declared `Content-Type` on a multipart part is attacker
// controlled — it's just a header the client chooses to send, not a fact
// about the bytes that follow. `AVATAR_MIME_EXTENSIONS` (used in
// `fileFilter` below) is only a cheap, early rejection for obviously wrong
// uploads; it must never be the *only* gate. The real check is
// `detectImageSignature`, run against the actual bytes after upload (see
// `runAvatarUpload`/the POST handler below), which is what determines the
// file extension actually written to disk.
//
// Byte signatures ("magic numbers") for the three formats we accept:
//   JPEG: FF D8 FF
//   PNG:  89 50 4E 47 0D 0A 1A 0A
//   WEBP: RIFF container ("RIFF" at offset 0, "WEBP" at offset 8)
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

// `memoryStorage` (not `diskStorage`) deliberately: we need the full file
// buffer available *before* anything is written to disk so
// `detectImageSignature` can run against real bytes first. The POST handler
// below writes the file to `AVATAR_UPLOAD_DIR` itself, only after that check
// passes.
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!AVATAR_MIME_EXTENSIONS[file.mimetype]) {
      cb(new Error("UNSUPPORTED_FILE_TYPE"));
      return;
    }
    cb(null, true);
  },
});

/**
 * Runs multer's middleware as a promise so its errors (bad file type, over
 * the size limit) can be normalized into the standard `{ error }` envelope
 * instead of falling through to the generic 500 handler in app.ts.
 */
function runAvatarUpload(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    avatarUpload.single("avatar")(req, res, (err: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// GET /api/v1/users/me
// ---------------------------------------------------------------------------
usersRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      // Access token verified but the row is gone (deleted account, edge
      // case) — same handling as auth.ts's GET /auth/me.
      clearAuthCookies(res);
      sendError(res, 401, "UNAUTHENTICATED", "Sign in to continue.");
      return;
    }
    sendData(res, 200, { user: toPublicProfile(user) });
  }),
);

// ---------------------------------------------------------------------------
// PATCH /api/v1/users/me
// ---------------------------------------------------------------------------
usersRouter.patch(
  "/me",
  requireAuth,
  requireCsrf,
  asyncHandler(async (req, res) => {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    // `placeId` needs to be resolved into `formattedAddress`/`latitude`/
    // `longitude` server-side (never trust a client-supplied address string
    // or coordinates directly) before it's included in the same
    // prisma.user.update call as any other changed fields below. This is the
    // only place in the backend that calls the Geocoding API, and it fires
    // at most once per PATCH request — never per-keystroke.
    const { placeId, ...rest } = parsed.data;
    let updateData: Prisma.UserUpdateInput = rest;

    if (placeId !== undefined) {
      if (!isGeocodingConfigured()) {
        sendError(
          res,
          503,
          "GEOCODING_NOT_CONFIGURED",
          "Address lookup is currently unavailable. Please try again later.",
        );
        return;
      }

      try {
        const resolved = await resolveAddressFromPlaceId(placeId);
        updateData = {
          ...updateData,
          placeId,
          formattedAddress: resolved.formattedAddress,
          latitude: resolved.latitude,
          longitude: resolved.longitude,
        };
      } catch (err) {
        if (err instanceof GeocodingResolutionError) {
          if (err.details.type === "not_found") {
            sendError(
              res,
              400,
              "VALIDATION_ERROR",
              "That address could not be found — try selecting a suggestion from the list again.",
            );
            return;
          }
          logger.error({ err: err.details }, "Geocoding upstream failure");
          sendError(
            res,
            502,
            "GEOCODING_FAILED",
            "We couldn't verify that address right now. Please try again shortly.",
          );
          return;
        }
        throw err;
      }
    }

    let user: User;
    try {
      user = await prisma.user.update({
        where: { id: req.user!.id },
        data: updateData,
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2025") {
          // Row disappeared between token verification and this update.
          clearAuthCookies(res);
          sendError(res, 401, "UNAUTHENTICATED", "Sign in to continue.");
          return;
        }
        if (err.code === "P2002") {
          sendError(
            res,
            409,
            "PHONE_IN_USE",
            "That phone number is already linked to another account.",
          );
          return;
        }
      }
      throw err;
    }

    sendData(res, 200, { user: toPublicProfile(user) });
  }),
);

// ---------------------------------------------------------------------------
// POST /api/v1/users/me/avatar
// ---------------------------------------------------------------------------
usersRouter.post(
  "/me/avatar",
  requireAuth,
  requireCsrf,
  asyncHandler(async (req, res) => {
    const existingUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!existingUser) {
      clearAuthCookies(res);
      sendError(res, 401, "UNAUTHENTICATED", "Sign in to continue.");
      return;
    }

    try {
      await runAvatarUpload(req, res);
    } catch (err) {
      if (err instanceof MulterError && err.code === "LIMIT_FILE_SIZE") {
        sendError(res, 400, "FILE_TOO_LARGE", "Avatar image must be 2MB or smaller.");
        return;
      }
      if (err instanceof Error && err.message === "UNSUPPORTED_FILE_TYPE") {
        sendError(
          res,
          400,
          "UNSUPPORTED_FILE_TYPE",
          "Avatar must be a JPEG, PNG, or WebP image.",
        );
        return;
      }
      throw err;
    }

    if (!req.file) {
      sendError(
        res,
        400,
        "FILE_REQUIRED",
        "An avatar image file is required (multipart field name: avatar).",
      );
      return;
    }

    // The real validation: sniff the actual file bytes rather than trusting
    // the client-declared Content-Type (already loosely pre-filtered above,
    // but that alone only validates a label, not content — see
    // `detectImageSignature`'s doc comment). The detected type (not the
    // client-supplied mimetype) determines the extension we persist.
    const signature = detectImageSignature(req.file.buffer);
    if (!signature) {
      sendError(
        res,
        400,
        "UNSUPPORTED_FILE_TYPE",
        "Avatar must be a JPEG, PNG, or WebP image.",
      );
      return;
    }

    // Never trust/persist the client-supplied original filename — a random
    // suffix avoids collisions between users/uploads and avoids carrying
    // over anything from the original name.
    const filename = `${req.user!.id}-${randomBytes(8).toString("hex")}.${signature.ext}`;
    fs.writeFileSync(path.join(AVATAR_UPLOAD_DIR, filename), req.file.buffer);

    // Served back by the express.static mount in app.ts — root-relative
    // (not under /api/v1), so the frontend must join this against the
    // backend's *origin*, not NEXT_PUBLIC_API_URL (which includes the
    // /api/v1 suffix). See docs/api-contract.md "User Profile" section.
    const avatarUrl = `/uploads/avatars/${filename}`;
    const updated = await prisma.user.update({
      where: { id: existingUser.id },
      data: { avatarUrl },
    });

    // Best-effort cleanup of the previous avatar file — never fail the
    // request over this; an orphaned old file is harmless, but crashing the
    // request over cleanup would be worse than leaving one around.
    if (existingUser.avatarUrl) {
      const oldPath = path.join(AVATAR_UPLOAD_DIR, path.basename(existingUser.avatarUrl));
      fs.unlink(oldPath, (err) => {
        if (err) logger.warn({ err, oldPath }, "Failed to delete previous avatar file");
      });
    }

    sendData(res, 200, { user: toPublicProfile(updated) });
  }),
);
