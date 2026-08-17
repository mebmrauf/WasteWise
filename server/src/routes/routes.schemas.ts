import { z } from "zod";

export const startRouteSchema = z
  .object({
    pickupRequestIds: z.array(z.string().trim().min(1)).min(1, "Select at least one pickup"),
  })
  .strict();
type StartRouteInput = z.infer<typeof startRouteSchema>;
