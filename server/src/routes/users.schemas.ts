import { z } from "zod";
import { VehicleType } from "@prisma/client";
import { bdPhoneRegex } from "./auth.schemas";

export const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(1, "Full name is required").max(120).optional(),
    phone: z.string().trim().regex(bdPhoneRegex, "Enter a valid Bangladesh mobile number").optional(),
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
  })
  .strict();
type UpdateCollectorProfileInput = z.infer<typeof updateCollectorProfileSchema>;
