import { z } from "zod";
import { MobileOperator, SimType } from "@prisma/client";
import { MAX_RECHARGE_TAKA, MIN_RECHARGE_TAKA } from "../lib/rewards";

const phoneNumberSchema = z
  .string()
  .trim()
  .regex(
    /^(?:\+?880|0)1[3-9][0-9]{8}$/,
    "Enter a valid Bangladeshi mobile number (e.g. 01712345678)",
  );

export const rechargeRequestSchema = z
  .object({
    operator: z.nativeEnum(MobileOperator, { required_error: "operator is required" }),
    simType: z.nativeEnum(SimType, { required_error: "simType is required" }),
    phoneNumber: phoneNumberSchema,
    amountTaka: z
      .number({
        required_error: "amountTaka is required",
        invalid_type_error: "amountTaka must be a number",
      })
      .int("amountTaka must be a whole number (no decimals)")
      .min(MIN_RECHARGE_TAKA, `amountTaka must be at least ${MIN_RECHARGE_TAKA} Taka`)
      .max(MAX_RECHARGE_TAKA, `amountTaka must be at most ${MAX_RECHARGE_TAKA} Taka`),
  })
  .strict();
export type RechargeRequestInput = z.infer<typeof rechargeRequestSchema>;
