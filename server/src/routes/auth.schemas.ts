// zod request schemas for /api/v1/auth/*. Kept alongside routes/auth.ts
// (rather than a shared cross-route schema file) since these are only used
// here.
import { z } from "zod";
import { Role, AccountType } from "@prisma/client";

// Loose E.164-ish check: optional leading +, 7-15 digits. Good enough for a
// Phase 1 project without pulling in a phone-number parsing library.
const phoneRegex = /^\+?[0-9]{7,15}$/;

// ADMIN is intentionally excluded — never self-service.
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
    // Household vs. Business — only meaningful (and required) when `role` is
    // `USER` (the default); forbidden for COLLECTOR/RECYCLING_COMPANY, same
    // "this is only valid for one specific role" pattern as `role` itself
    // excluding ADMIN. Mirrors the nullable-only-for-USER shape of
    // User.accountType in schema.prisma.
    accountType: selectableAccountType.optional(),
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
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  // Either an email or a phone number — looked up against both columns.
  identifier: z.string().trim().min(1, "Email or phone is required"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;
