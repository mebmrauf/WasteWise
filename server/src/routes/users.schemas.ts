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
    rewardsEmailNotificationsEnabled: z.boolean().optional(),
  })
  .strict();
type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updateCollectorProfileSchema = z
  .object({
    vehicleType: z.nativeEnum(VehicleType),
    vehicleNumber: z.string().trim().min(1, "Vehicle number is required").max(60, "Vehicle number is too long"),
    licenseNumber: z.string().trim().min(1, "License number is required").max(60, "License number is too long"),
    serviceArea: z.string().trim().min(1, "Service area is required").max(120, "Service area is too long"),
  })
  .strict();
type UpdateCollectorProfileInput = z.infer<typeof updateCollectorProfileSchema>;

export const updateRecyclingProfileSchema = z
  .object({
    companyName: z.string().trim().min(1, "Company name is required").optional(),
    tradeLicenseNumber: z.string().trim().optional().nullable(),
    district: z.string().trim().min(1, "District is required").optional(),
    serviceAreas: z.array(z.string()).optional(),
    acceptedWasteMaterials: z.array(z.string()).optional(), // Will map to WasteCategory
  })
  .strict();

export const updateBusinessProfileSchema = z
  .object({
    businessName: z.string().trim().min(1, "Business name is required").optional(),
    tradeLicenseNumber: z.string().trim().optional().nullable(),
  })
  .strict();

export const deleteAccountSchema = z
  .object({
    password: z.string().min(1, "Password is required").optional(),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required").optional(),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be at most 72 characters"),
  })
  .strict();
