import { z } from "zod";
import { Role, AccountType } from "@prisma/client";

// Bangladesh mobile numbers in E.164 format, e.g. +8801712345678
export const bdPhoneRegex = /^\+8801[3-9]\d{8}$/;

const selectableRole = z.enum([Role.USER, Role.COLLECTOR, Role.RECYCLING_COMPANY]);

const selectableAccountType = z.enum([AccountType.HOUSEHOLD, AccountType.BUSINESS]);

export const registerSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Enter a valid email address").optional(),
    phone: z.string().trim().regex(bdPhoneRegex, "Enter a valid Bangladesh mobile number").optional(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be at most 72 characters"),
    fullName: z.string().trim().min(1, "Full name is required").max(120),
    role: selectableRole.optional().default(Role.USER),
    accountType: selectableAccountType.optional(),
    referralCode: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === Role.USER) {
      if (data.accountType === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["accountType"],
          message: "accountType is required (HOUSEHOLD or BUSINESS) when role is USER",
        });
      }
    } else if (data.accountType !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["accountType"],
        message: "accountType is only valid when role is USER",
      });
    }

    if (data.email === undefined && data.phone === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "Provide an email address, a phone number, or both",
      });
    }
  });
type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email or phone is required"),
  password: z.string().min(1, "Password is required"),
});
type LoginInput = z.infer<typeof loginSchema>;
