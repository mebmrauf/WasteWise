import { z } from "zod";
import { VehicleType } from "@prisma/client";

const phoneRegex = /^\+?[0-9]{7,15}$/;

export const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(1, "Full name is required").max(120).optional(),
    phone: z.string().trim().regex(phoneRegex, "Enter a valid phone number").nullable().optional(),
    placeId: z.string().trim().min(1, "placeId cannot be empty").max(300).optional(),
    formattedAddress: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    emailNotificationsEnabled: z.boolean().optional(),
    smsNotificationsEnabled: z.boolean().optional(),
  })
  .strict();
type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updateCollectorProfileSchema = z
  .object({
    vehicleType: z.nativeEnum(VehicleType),
    vehicleNumber: z.string().trim().min(1, "Vehicle number is required").max(60, "Vehicle number is too long"),
    licenseNumber: z.string().trim().min(1, "License number is required").max(60, "License number is too long"),
    serviceArea: z.string().trim().min(1, "Service area is required").max(120, "Service area is too long"),
    // Radius-based coverage (optional — collectors can set this after their
    // base profile is already saved).
    serviceAreaPlaceId: z.string().trim().min(1, "placeId cannot be empty").max(300).optional(),
    serviceAreaFormattedAddress: z.string().optional(),
    serviceAreaLatitude: z.number().optional(),
    serviceAreaLongitude: z.number().optional(),
    serviceAreaRadiusKm: z
      .number()
      .min(1, "Radius must be at least 1 km")
      .max(100, "Radius can't exceed 100 km")
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const hasCenter = data.serviceAreaLatitude !== undefined || data.serviceAreaLongitude !== undefined;
    const hasRadius = data.serviceAreaRadiusKm !== undefined;
    if (hasCenter !== hasRadius) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["serviceAreaRadiusKm"],
        message: "Set both a service area location and a radius together.",
      });
    }
    if (
      (data.serviceAreaLatitude !== undefined || data.serviceAreaLongitude !== undefined) &&
      (data.serviceAreaLatitude === undefined || data.serviceAreaLongitude === undefined)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["serviceAreaLongitude"],
        message: "Service area location needs both latitude and longitude.",
      });
    }
  });
type UpdateCollectorProfileInput = z.infer<typeof updateCollectorProfileSchema>;