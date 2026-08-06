import { z } from "zod";
import { VehicleType } from "@prisma/client";

const phoneRegex = /^\+?[0-9]{7,15}$/;

export const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(1, "Full name is required").max(120).optional(),
    phone: z.string().trim().regex(phoneRegex, "Enter a valid phone number").nullable().optional(),
    placeId: z.string().trim().min(1, "placeId cannot be empty").max(300).optional(),
    emailNotificationsEnabled: z.boolean().optional(),
    smsNotificationsEnabled: z.boolean().optional(),
  })
  .strict();
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updateCollectorProfileSchema = z
  .object({
    vehicleType: z.nativeEnum(VehicleType),
    licenseNumber: z.string().trim().max(60, "License number is too long").optional(),
    serviceArea: z.string().trim().max(120, "Service area is too long").optional(),
  })
  .strict();
export type UpdateCollectorProfileInput = z.infer<typeof updateCollectorProfileSchema>;
