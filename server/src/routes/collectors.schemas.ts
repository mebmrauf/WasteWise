import { z } from "zod";
import { VehicleType } from "@prisma/client";

export const getVerifiedCollectorsSchema = z.object({
  serviceArea: z.string().optional(),
  vehicleType: z.nativeEnum(VehicleType).optional(),
});
