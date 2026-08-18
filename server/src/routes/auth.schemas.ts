import { z } from "zod";
import { Role, AccountType } from "@prisma/client";

const phoneRegex = /^\+?[0-9]{7,15}$/;

const selectableRole = z.enum([Role.USER, Role.COLLECTOR, Role.RECYCLING_COMPANY]);

const selectableAccountType = z.enum([AccountType.HOUSEHOLD, AccountType.BUSINESS]);

export const registerSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    phone: z.string().trim().regex(phoneRegex, "Enter a valid phone number").optional(),
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

    if (data.role === Role.COLLECTOR && data.phone === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Phone number is required for collector accounts",
      });
    }
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email or phone is required"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const verifyEmailSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
