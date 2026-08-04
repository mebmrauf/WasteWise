// Auth routes — registration, email/phone login, refresh/logout, and
// Google/Facebook OAuth (server-side authorization-code redirect flow).
// Mounted at /api/v1/auth in app.ts. Design rationale (token delivery,
// OAuth completion, role defaults, etc) is documented in
// docs/api-contract.md under "Authentication" — read that first.
import { randomBytes } from "node:crypto";
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
import { registerSchema, loginSchema } from "./auth.schemas";
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

// The frontend origin OAuth callbacks redirect back to once cookies are set.
// CLIENT_ORIGIN may be a comma-separated list (multiple allowed origins for
// CORS) — the first entry is treated as the canonical frontend URL for
// browser redirects.
const FRONTEND_ORIGIN = env.CLIENT_ORIGIN[0];
const POST_LOGIN_REDIRECT_PATH = "/";
const OAUTH_STATE_COOKIE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

function loginErrorRedirect(reason: string): string {
  return `${FRONTEND_ORIGIN}/login?error=${encodeURIComponent(reason)}`;
}

/** Strips password hash and other internal fields before ever sending a user back to a client. */
function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    fullName: user.fullName,
    role: user.role,
    accountType: user.accountType,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
  };
}

// ---------------------------------------------------------------------------
// POST /api/v1/auth/register
// ---------------------------------------------------------------------------
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
        data: { email, phone, passwordHash, fullName, role, accountType },
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

    const tokens = await issueTokenPair(user);
    setAuthCookies(res, tokens);
    sendData(res, 201, { user: toPublicUser(user) });
  }),
);

// ---------------------------------------------------------------------------
// POST /api/v1/auth/login
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// POST /api/v1/auth/refresh
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// POST /api/v1/auth/logout
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// GET /api/v1/auth/me
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// OAuth: shared find-or-create-and-link logic
// ---------------------------------------------------------------------------
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
    // Schema requires User.email — cannot create/link an account without one.
    return { error: "oauth_email_required" };
  }

  const existingUserByEmail = await prisma.user.findUnique({ where: { email: profile.email } });
  if (existingUserByEmail) {
    // Account linking: same email, new provider identity.
    await prisma.oAuthAccount.create({
      data: {
        provider,
        providerAccountId: profile.providerAccountId,
        userId: existingUserByEmail.id,
      },
    });
    return { user: existingUserByEmail };
  }

  // Brand-new user. Role defaults to USER — OAuth is not (yet) an onboarding
  // path for Collector/Recycling Company accounts in Phase 1; see
  // docs/api-contract.md for the reasoning.
  //
  // accountType defaults to HOUSEHOLD: OAuth is a low-friction, one-click
  // consumer flow with no form step to ask "Household or Business?" — a
  // Business account holder is more likely to go through the deliberate
  // email/phone registration form anyway. See docs/api-contract.md §4/§7.
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
  // This runs mid full-page-navigation (the browser landed here via the
  // provider's redirect, not a fetch()) — an uncaught throw would fall
  // through to the global error handler and show the user a raw JSON body
  // instead of a graceful redirect back to /login. Catch anything
  // unexpected (DB hiccup, a findOrCreateOAuthUser edge case) here so every
  // path out of this function is a redirect.
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

// ---------------------------------------------------------------------------
// GET /api/v1/auth/google — redirect to Google's consent screen
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// GET /api/v1/auth/google/callback
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// GET /api/v1/auth/facebook — redirect to Facebook's consent screen
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// GET /api/v1/auth/facebook/callback
// ---------------------------------------------------------------------------
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
