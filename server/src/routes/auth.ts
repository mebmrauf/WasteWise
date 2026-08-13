import { randomBytes, randomInt } from "node:crypto";
import { Router } from "express";
import { Prisma, type User } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword } from "../lib/passwords";
import {
  issueTokenPair,
  rotateRefreshToken,
  revokeRefreshToken,
  RefreshTokenError,
} from "../lib/authTokens";
import {
  setAuthCookies,
  clearAuthCookies,
  REFRESH_TOKEN_COOKIE,
  OAUTH_STATE_COOKIE,
} from "../lib/cookies";
import { requireAuth } from "../lib/rbac";
import { requireCsrf } from "../lib/csrf";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData, sendError } from "../lib/apiResponse";
import { authRateLimiter, secureCookieOptions } from "../middleware/security";
import { env } from "../lib/env";
import { logger } from "../lib/logger";
import { registerSchema, loginSchema, verifyEmailSchema } from "./auth.schemas";
import { sendEmail, buildVerificationCodeEmail } from "../lib/mailer";
import {
  buildGoogleAuthorizationUrl,
  exchangeGoogleCode,
  isGoogleOAuthConfigured,
} from "../lib/oauth/google";
import {
  buildFacebookAuthorizationUrl,
  exchangeFacebookCode,
  isFacebookOAuthConfigured,
} from "../lib/oauth/facebook";
import type { OAuthProfile } from "../lib/oauth/types";

export const authRouter = Router();

const FRONTEND_ORIGIN = env.CLIENT_ORIGIN[0];
const POST_LOGIN_REDIRECT_PATH = "/";
const OAUTH_STATE_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;

function loginErrorRedirect(reason: string): string {
  return `${FRONTEND_ORIGIN}/login?error=${encodeURIComponent(reason)}`;
}

function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    fullName: user.fullName,
    role: user.role,
    accountType: user.accountType,
    isEmailVerified: user.isEmailVerified,
    avatarUrl: user.avatarUrl,
    membershipLevel: user.membershipLevel,
    membershipBadge: user.membershipBadge,
    totalGreenPoints: user.totalGreenPoints,
    giftClaimed: user.giftClaimed,
    selectedGift: user.selectedGift,
    nextGiftEligibleDate: user.nextGiftEligibleDate,
    discountCouponClaimed: user.discountCouponClaimed,
    nextDiscountEligibleDate: user.nextDiscountEligibleDate,
    createdAt: user.createdAt,
  };
}

const EMAIL_VERIFICATION_CODE_TTL_MS = 30 * 60 * 1000;

async function issueEmailVerificationCode(userId: string, email: string, fullName: string): Promise<void> {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  await prisma.emailVerificationCode.create({
    data: {
      userId,
      code,
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_CODE_TTL_MS),
    },
  });

  const { subject, html, text } = buildVerificationCodeEmail(fullName, code);
  void sendEmail({ to: email, subject, html, text }).catch((err) => {
    logger.error({ err, userId }, "Failed to send email verification code");
  });
}

authRouter.post(
  "/register",
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    const { email, phone, password, fullName, role, accountType } = parsed.data;

    const passwordHash = await hashPassword(password);

    let user: User;
    try {
      user = await prisma.user.create({
        data: { 
          email, 
          phone, 
          passwordHash, 
          fullName, 
          role, 
          accountType,
          collectorProfile: role === "COLLECTOR" ? {
            create: {
              vehicleType: "BICYCLE_VAN",
              vehicleNumber: "",
              licenseNumber: "",
              serviceArea: "",
              verificationStatus: "PENDING",
            }
          } : undefined,
          recyclingCompanyProfile: role === "RECYCLING_COMPANY" ? {
            create: {
              companyName: fullName,
              district: "Dhaka",
              verificationStatus: "PENDING",
            }
          } : undefined,
          businessProfile: role === "USER" && accountType === "BUSINESS" ? {
            create: {
              businessName: fullName,
              verificationStatus: "PENDING",
            }
          } : undefined
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        sendError(
          res,
          409,
          "ACCOUNT_EXISTS",
          "An account with this email or phone number already exists.",
        );
        return;
      }
      throw err;
    }

    if (user.email) {
      await issueEmailVerificationCode(user.id, user.email, user.fullName);
    }

    const tokens = await issueTokenPair(user);
    setAuthCookies(res, tokens);
    sendData(res, 201, { user: toPublicUser(user) });
  }),
);

authRouter.post(
  "/verify-email",
  requireAuth,
  authRateLimiter,
  requireCsrf,
  asyncHandler(async (req, res) => {
    const dbUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!dbUser) {
      sendError(res, 401, "UNAUTHENTICATED", "Sign in to continue.");
      return;
    }
    if (dbUser.isEmailVerified) {
      sendData(res, 200, { user: toPublicUser(dbUser) });
      return;
    }

    const parsed = verifyEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    const matchingCode = await prisma.emailVerificationCode.findFirst({
      where: {
        userId: dbUser.id,
        code: parsed.data.code,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!matchingCode) {
      sendError(res, 400, "INVALID_CODE", "That code is invalid or has expired.");
      return;
    }

    const [, updatedUser] = await prisma.$transaction([
      prisma.emailVerificationCode.update({
        where: { id: matchingCode.id },
        data: { consumedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: dbUser.id },
        data: { isEmailVerified: true, emailVerificationReminderSentAt: null },
      }),
    ]);

    sendData(res, 200, { user: toPublicUser(updatedUser) });
  }),
);

authRouter.post(
  "/resend-verification-email",
  requireAuth,
  authRateLimiter,
  requireCsrf,
  asyncHandler(async (req, res) => {
    const dbUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!dbUser) {
      sendError(res, 401, "UNAUTHENTICATED", "Sign in to continue.");
      return;
    }
    if (dbUser.isEmailVerified) {
      sendError(res, 400, "ALREADY_VERIFIED", "Your email is already verified.");
      return;
    }
    if (!dbUser.email) {
      sendError(res, 400, "NO_EMAIL", "There is no email address on this account.");
      return;
    }

    await issueEmailVerificationCode(dbUser.id, dbUser.email, dbUser.fullName);
    sendData(res, 200, { success: true });
  }),
);

authRouter.post(
  "/login",
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    const { identifier, password } = parsed.data;

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { phone: identifier }] },
    });

    if (!user) {
      sendError(res, 401, "INVALID_CREDENTIALS", "Incorrect email/phone or password.");
      return;
    }

    if (!user.passwordHash) {
      sendError(
        res,
        401,
        "OAUTH_ONLY_ACCOUNT",
        "This account uses social login. Continue with Google or Facebook instead.",
      );
      return;
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) {
      sendError(res, 401, "INVALID_CREDENTIALS", "Incorrect email/phone or password.");
      return;
    }

    const tokens = await issueTokenPair(user);
    setAuthCookies(res, tokens);
    sendData(res, 200, { user: toPublicUser(user) });
  }),
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const rawToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (!rawToken) {
      sendError(res, 401, "MISSING_REFRESH_TOKEN", "No active session.");
      return;
    }

    try {
      const tokens = await rotateRefreshToken(rawToken);
      setAuthCookies(res, tokens);
      sendData(res, 200, { success: true });
    } catch (err) {
      clearAuthCookies(res);
      if (err instanceof RefreshTokenError) {
        sendError(res, 401, "INVALID_REFRESH_TOKEN", err.message);
        return;
      }
      throw err;
    }
  }),
);

authRouter.post(
  "/logout",
  requireCsrf,
  asyncHandler(async (req, res) => {
    const rawToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (rawToken) {
      await revokeRefreshToken(rawToken);
    }
    clearAuthCookies(res);
    sendData(res, 200, { success: true });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      clearAuthCookies(res);
      sendError(res, 401, "UNAUTHENTICATED", "Sign in to continue.");
      return;
    }
    sendData(res, 200, { user: toPublicUser(user) });
  }),
);

async function findOrCreateOAuthUser(
  provider: "GOOGLE" | "FACEBOOK",
  profile: OAuthProfile,
): Promise<{ user: User } | { error: string }> {
  const existingAccount = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: { provider, providerAccountId: profile.providerAccountId },
    },
    include: { user: true },
  });
  if (existingAccount) {
    return { user: existingAccount.user };
  }

  if (!profile.email) {
    return { error: "oauth_email_required" };
  }

  const existingUserByEmail = await prisma.user.findUnique({ where: { email: profile.email } });
  if (existingUserByEmail) {
    await prisma.oAuthAccount.create({
      data: {
        provider,
        providerAccountId: profile.providerAccountId,
        userId: existingUserByEmail.id,
      },
    });
    return { user: existingUserByEmail };
  }

  const user = await prisma.user.create({
    data: {
      email: profile.email,
      fullName: profile.fullName,
      passwordHash: null,
      role: "USER",
      accountType: "HOUSEHOLD",
      isEmailVerified: true, // provider already verified this email address
      oauthAccounts: {
        create: { provider, providerAccountId: profile.providerAccountId },
      },
    },
  });
  return { user };
}

async function completeOAuthLogin(
  provider: "GOOGLE" | "FACEBOOK",
  profile: OAuthProfile,
): Promise<{ redirectUrl: string; tokens?: Awaited<ReturnType<typeof issueTokenPair>> }> {
  try {
    const result = await findOrCreateOAuthUser(provider, profile);
    if ("error" in result) {
      return { redirectUrl: loginErrorRedirect(result.error) };
    }
    const tokens = await issueTokenPair(result.user);
    return { redirectUrl: `${FRONTEND_ORIGIN}${POST_LOGIN_REDIRECT_PATH}`, tokens };
  } catch (err) {
    logger.error({ err, provider }, "OAuth login failed unexpectedly");
    return { redirectUrl: loginErrorRedirect("oauth_failed") };
  }
}

authRouter.get("/google", authRateLimiter, (req, res) => {
  if (!isGoogleOAuthConfigured()) {
    sendError(res, 503, "OAUTH_NOT_CONFIGURED", "Google sign-in is not available right now.");
    return;
  }
  const state = randomBytes(16).toString("hex");
  res.cookie(OAUTH_STATE_COOKIE, state, {
    ...secureCookieOptions,
    maxAge: OAUTH_STATE_COOKIE_MAX_AGE_MS,
  });
  res.redirect(buildGoogleAuthorizationUrl(state));
});

authRouter.get(
  "/google/callback",
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const { code, state, error } = req.query;
    const expectedState = req.cookies?.[OAUTH_STATE_COOKIE];
    res.clearCookie(OAUTH_STATE_COOKIE, secureCookieOptions);

    if (error) {
      res.redirect(loginErrorRedirect("oauth_denied"));
      return;
    }
    if (!expectedState || state !== expectedState || typeof code !== "string") {
      res.redirect(loginErrorRedirect("oauth_state_mismatch"));
      return;
    }

    let profile: OAuthProfile;
    try {
      profile = await exchangeGoogleCode(code);
    } catch {
      res.redirect(loginErrorRedirect("oauth_exchange_failed"));
      return;
    }

    const { redirectUrl, tokens } = await completeOAuthLogin("GOOGLE", profile);
    if (tokens) setAuthCookies(res, tokens);
    res.redirect(redirectUrl);
  }),
);

authRouter.get("/facebook", authRateLimiter, (req, res) => {
  if (!isFacebookOAuthConfigured()) {
    sendError(res, 503, "OAUTH_NOT_CONFIGURED", "Facebook sign-in is not available right now.");
    return;
  }
  const state = randomBytes(16).toString("hex");
  res.cookie(OAUTH_STATE_COOKIE, state, {
    ...secureCookieOptions,
    maxAge: OAUTH_STATE_COOKIE_MAX_AGE_MS,
  });
  res.redirect(buildFacebookAuthorizationUrl(state));
});

authRouter.get(
  "/facebook/callback",
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const { code, state, error } = req.query;
    const expectedState = req.cookies?.[OAUTH_STATE_COOKIE];
    res.clearCookie(OAUTH_STATE_COOKIE, secureCookieOptions);

    if (error) {
      res.redirect(loginErrorRedirect("oauth_denied"));
      return;
    }
    if (!expectedState || state !== expectedState || typeof code !== "string") {
      res.redirect(loginErrorRedirect("oauth_state_mismatch"));
      return;
    }

    let profile: OAuthProfile;
    try {
      profile = await exchangeFacebookCode(code);
    } catch {
      res.redirect(loginErrorRedirect("oauth_exchange_failed"));
      return;
    }

    const { redirectUrl, tokens } = await completeOAuthLogin("FACEBOOK", profile);
    if (tokens) setAuthCookies(res, tokens);
    res.redirect(redirectUrl);
  }),
);
