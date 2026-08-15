import { z } from "zod";

export const createComplaintSchema = z.object({
  pickupRequestId: z.string().min(1, "Pickup Request ID is required"),
  againstUserId: z.string().optional(),
  description: z.string().min(10, "Description must be at least 10 characters long").max(1000),
});

export const updateComplaintStatusSchema = z.object({
  status: z.enum(["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"]),
  resolutionNotes: z.string().optional(),
});
