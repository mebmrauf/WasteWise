import { z } from "zod";
import { VehicleType } from "@prisma/client";

export const getVerifiedCollectorsSchema = z
  .object({
    vehicleType: z.nativeEnum(VehicleType).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    minRating: z.coerce.number().min(1).max(5).optional(),
    sortBy: z.enum(["distance", "rating"]).optional(),
  })
  .refine((data) => (data.latitude === undefined) === (data.longitude === undefined), {
    message: "latitude and longitude must be provided together",
  });
