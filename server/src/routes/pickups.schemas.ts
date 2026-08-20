import { z } from "zod";
import { PickupStatus, WasteCategory, LoadSize } from "@prisma/client";

const pickupRequestItemSchema = z
  .object({
    category: z.nativeEnum(WasteCategory, { required_error: "category is required" }),
    loadSize: z.nativeEnum(LoadSize, { required_error: "loadSize is required" }),
    exactWeightKg: z.number().positive().optional(),
  })
  .strict();

const itemsSchema = z
  .array(pickupRequestItemSchema, { required_error: "items is required" })
  .min(1, "Select at least one item")
  .refine((items) => new Set(items.map((item) => item.category)).size === items.length, {
    message: "Duplicate categories are not allowed — each category can appear at most once per request",
  });

const isoDateTimeSchema = z.string().datetime({ message: "must be an ISO 8601 datetime string" });

const placeIdSchema = z.string().trim().min(1, "placeId is required").max(300);

export const createPickupRequestSchema = z
  .object({
    items: itemsSchema,
    pickupDate: isoDateTimeSchema,
    placeId: placeIdSchema,
    formattedAddress: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    serviceArea: z.string().optional(),
    preferredCollectorId: z.string().cuid().optional(),
    isExclusiveToPreferred: z.boolean().default(false),
    isBulk: z.boolean().default(false),
    estimatedTotalWeight: z.number().positive().optional(),
    photoUrls: z.array(z.string()).max(4, "You can attach at most 4 photos").default([]),
    wasteDescription: z.string().trim().max(1000).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const pickup = new Date(data.pickupDate);
    const now = new Date();
    
    // Allow scheduling from today onwards
    now.setHours(0, 0, 0, 0);
    const pickupDay = new Date(pickup);
    pickupDay.setHours(0, 0, 0, 0);

    if (pickupDay < now) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "pickupDate cannot be in the past",
        path: ["pickupDate"],
      });
    }
  });
export type CreatePickupRequestInput = z.infer<typeof createPickupRequestSchema>;

const pickupIdSchema = z.string().trim().min(1, "pickupRequestId is required");

export const joinPickupRoomSchema = z.object({
  pickupRequestId: pickupIdSchema,
});
export type JoinPickupRoomInput = z.infer<typeof joinPickupRoomSchema>;

export const locationUpdateSchema = z.object({
  pickupRequestId: pickupIdSchema,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type LocationUpdateInput = z.infer<typeof locationUpdateSchema>;

const STATUS_UPDATE_TARGETS = [
  PickupStatus.EN_ROUTE,
  PickupStatus.ARRIVED,
  PickupStatus.CANCELLED,
] as const;

export const statusUpdateSchema = z.object({
  pickupRequestId: pickupIdSchema,
  status: z.enum(
    STATUS_UPDATE_TARGETS as unknown as [PickupStatus, ...PickupStatus[]],
  ),
});
export type StatusUpdateInput = z.infer<typeof statusUpdateSchema>;

export const submitWeightsSchema = z.object({
  pickupRequestId: pickupIdSchema,
  weights: z.record(z.string(), z.number().positive()),
});
export type SubmitWeightsInput = z.infer<typeof submitWeightsSchema>;

export const acceptWeightsSchema = z.object({
  pickupRequestId: pickupIdSchema,
});
export type AcceptWeightsInput = z.infer<typeof acceptWeightsSchema>;

export const rejectWeightsSchema = z.object({
  pickupRequestId: pickupIdSchema,
});
export type RejectWeightsInput = z.infer<typeof rejectWeightsSchema>;

export const ratePickupSchema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});
export type RatePickupInput = z.infer<typeof ratePickupSchema>;
