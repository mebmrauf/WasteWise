import { Router, type Request, type Response } from "express";
import multer, { MulterError } from "multer";
import { Prisma, type CollectorProfile, type User } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../lib/rbac";
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
import { isCloudinaryConfigured, uploadAvatarImage } from "../lib/cloudinary";
import { updateProfileSchema, updateCollectorProfileSchema, updateRecyclingProfileSchema } from "./users.schemas";

export const usersRouter = Router();

export function toPublicCollectorProfile(profile: CollectorProfile) {
  return {
    vehicleType: profile.vehicleType,
    vehicleNumber: profile.vehicleNumber,
    licenseNumber: profile.licenseNumber,
    serviceArea: profile.serviceArea,
    verificationStatus: profile.verificationStatus,
    averageRating: profile.averageRating,
    totalRatings: profile.totalRatings,
  };
}

export function toPublicRecyclingProfile(profile: any) {
  return {
    companyName: profile.companyName,
    tradeLicenseNumber: profile.tradeLicenseNumber,
    district: profile.district,
    serviceAreas: profile.serviceAreas,
    acceptedWasteMaterials: profile.acceptedWasteMaterials,
    currentInventoryKg: profile.currentInventoryKg,
    verificationStatus: profile.verificationStatus,
  };
}

function toPublicProfile(user: User & { collectorProfile?: CollectorProfile | null; recyclingCompanyProfile?: any | null }) {
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
    collectorProfile: user.collectorProfile ? toPublicCollectorProfile(user.collectorProfile) : null,
    recyclingCompanyProfile: user.recyclingCompanyProfile ? toPublicRecyclingProfile(user.recyclingCompanyProfile) : null,
  };
}

const AVATAR_MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_AVATAR_BYTES = 10 * 1024 * 1024;

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

function runAvatarUpload(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    avatarUpload.single("avatar")(req, res, (err: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

usersRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { collectorProfile: true, recyclingCompanyProfile: true },
    });
    if (!user) {
      clearAuthCookies(res);
      sendError(res, 401, "UNAUTHENTICATED", "Sign in to continue.");
      return;
    }
    sendData(res, 200, { user: toPublicProfile(user) });
  }),
);

usersRouter.patch(
  "/me/collector-profile",
  requireAuth,
  requireRole("COLLECTOR"),
  requireCsrf,
  asyncHandler(async (req, res) => {
    const parsed = updateCollectorProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    const { vehicleType, vehicleNumber, licenseNumber, serviceArea } = parsed.data;

    const collectorProfile = await prisma.collectorProfile.upsert({
      where: { userId: req.user!.id },
      create: {
        userId: req.user!.id,
        vehicleType,
        vehicleNumber,
        licenseNumber,
        serviceArea,
        verificationStatus: "PENDING",
      },
      update: {
        vehicleType,
        vehicleNumber,
        licenseNumber,
        serviceArea,
        verificationStatus: "PENDING",
      },
    });

    sendData(res, 200, { collectorProfile: toPublicCollectorProfile(collectorProfile) });
  }),
);

usersRouter.patch(
  "/me/recycling-profile",
  requireAuth,
  requireRole("RECYCLING_COMPANY"),
  requireCsrf,
  asyncHandler(async (req, res) => {
    const parsed = updateRecyclingProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    const { companyName, tradeLicenseNumber, district, serviceAreas, acceptedWasteMaterials } = parsed.data;

    const recyclingProfile = await prisma.recyclingCompanyProfile.upsert({
      where: { userId: req.user!.id },
      create: {
        userId: req.user!.id,
        companyName: companyName || "",
        tradeLicenseNumber,
        district: district || "",
        serviceAreas: serviceAreas || [],
        acceptedWasteMaterials: (acceptedWasteMaterials || []) as any,
        verificationStatus: "PENDING",
      },
      update: {
        companyName,
        tradeLicenseNumber,
        district,
        serviceAreas,
        acceptedWasteMaterials: acceptedWasteMaterials as any,
      },
    });

    sendData(res, 200, { recyclingProfile: toPublicRecyclingProfile(recyclingProfile) });
  }),
);

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

    const { placeId, formattedAddress, latitude, longitude, ...rest } = parsed.data;
    let updateData: Prisma.UserUpdateInput = rest;

    if (formattedAddress !== undefined && placeId === undefined) {
      updateData.formattedAddress = formattedAddress;
    }

    if (placeId !== undefined) {
      if (formattedAddress && latitude !== undefined && longitude !== undefined) {
        updateData = {
          ...updateData,
          placeId,
          formattedAddress,
          latitude,
          longitude,
        };
      } else {
        // Fallback for older clients that don't send coordinates directly
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

    if (!isCloudinaryConfigured()) {
      sendError(
        res,
        503,
        "CLOUDINARY_NOT_CONFIGURED",
        "Avatar upload is currently unavailable. Please try again later.",
      );
      return;
    }

    let publicId: string;
    try {
      ({ publicId } = await uploadAvatarImage(req.file.buffer, existingUser.id));
    } catch (err) {
      logger.error({ err }, "Cloudinary avatar upload failed");
      sendError(res, 502, "AVATAR_UPLOAD_FAILED", "Couldn't upload that image. Please try again.");
      return;
    }

    const updated = await prisma.user.update({
      where: { id: existingUser.id },
      data: { avatarUrl: publicId },
    });

    sendData(res, 200, { user: toPublicProfile(updated) });
  }),
);

usersRouter.get(
  "/me/ratings",
  requireAuth,
  requireRole("COLLECTOR"),
  asyncHandler(async (req, res) => {
    const ratings = await prisma.rating.findMany({
      where: { collectorId: req.user!.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        score: true,
        comment: true,
        createdAt: true,
      },
    });

    sendData(res, 200, { ratings });
  }),
);

usersRouter.get(
  "/me/stats",
  requireAuth,
  requireRole("COLLECTOR"),
  asyncHandler(async (req, res) => {
    const collectorId = req.user!.id;
    
    // Get pickups completed by this collector
    const pickups = await prisma.pickupRequest.findMany({
      where: {
        assignedCollectorId: collectorId,
        status: "COMPLETED",
      },
      include: {
        items: true,
        weightRecord: true,
      },
    });

    const categoryStats: Record<string, number> = {};
    const dailyStats: Record<string, number> = {};

    // Initialize daily stats for the last 7 days
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      dailyStats[dateStr] = 0;
    }

    pickups.forEach((pickup) => {
      // For category stats, use the exactWeightKg if available (from items)
      pickup.items.forEach((item) => {
        const weight = item.exactWeightKg || 0;
        if (!categoryStats[item.category]) {
          categoryStats[item.category] = 0;
        }
        categoryStats[item.category] += weight;
      });

      // For daily stats, use the exactWeightKg sum of all items
      // Group by the day the pickup was updated to COMPLETED (updatedAt)
      const dateStr = pickup.updatedAt.toISOString().split("T")[0];
      if (dailyStats[dateStr] !== undefined) {
        const totalWeight = pickup.items.reduce((sum, item) => sum + (item.exactWeightKg || 0), 0);
        dailyStats[dateStr] += totalWeight;
      }
    });

    // Format for charts
    const formattedCategoryStats = Object.keys(categoryStats).map((category) => ({
      category,
      weight: categoryStats[category],
    }));

    const formattedDailyStats = Object.keys(dailyStats)
      .sort((a, b) => a.localeCompare(b))
      .map((date) => ({
        date,
        weight: dailyStats[date],
      }));

    sendData(res, 200, {
      categoryStats: formattedCategoryStats,
      dailyStats: formattedDailyStats,
    });
  }),
);
