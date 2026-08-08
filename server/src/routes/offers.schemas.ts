import { z } from "zod";

const pickupRequestIdSchema = z.string().trim().min(1, "pickupRequestId is required");

const offerMessageSchema = z
  .string()
  .trim()
  .max(500, "message must be 500 characters or fewer")
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const MAX_BID_AMOUNT_BDT = 10_000_000;

export const submitOfferSchema = z
  .object({
    pickupRequestId: pickupRequestIdSchema,
    bidAmount: z
      .number({ required_error: "bidAmount is required", invalid_type_error: "bidAmount must be a number" })
      .finite("bidAmount must be a finite number")
      .positive("bidAmount must be greater than 0")
      .max(MAX_BID_AMOUNT_BDT, `bidAmount must be ${MAX_BID_AMOUNT_BDT.toLocaleString("en-US")} or less`),
    bidAmountsPerKg: z.record(
      z.string(),
      z
        .number({ invalid_type_error: "bid amount must be a number" })
        .finite("bid amount must be a finite number")
        .positive("bid amount must be greater than 0")
    ),
    message: offerMessageSchema,
  })
  .strict();
type SubmitOfferInput = z.infer<typeof submitOfferSchema>;
