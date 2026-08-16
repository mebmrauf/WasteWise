import { z } from "zod";

export const createComplaintSchema = z.object({
  requestId: z.string().min(6, "Request ID is too short (must be at least 6 characters)"),
  againstUserId: z.string().optional(),
  description: z.string().min(10, "Description must be at least 10 characters long").max(1000),
});

export const updateComplaintStatusSchema = z.object({
  status: z.enum(["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"]),
  resolutionNotes: z.string().optional(),
});
