import { z } from "zod";

export const getMessagesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
});
