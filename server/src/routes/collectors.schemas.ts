import { z } from "zod";
import { VehicleType } from "@prisma/client";

export const getVerifiedCollectorsSchema = z
  .object({
    serviceArea: z.string().optional(),
    vehicleType: z.nativeEnum(VehicleType).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    minRating: z.coerce.number().min(1).max(5).optional(),
    sort: z.enum(["nearest", "rating"]).optional(),
  })
  .refine((data) => (data.lat === undefined) === (data.lng === undefined), {
    message: "lat and lng must be provided together",
  });
