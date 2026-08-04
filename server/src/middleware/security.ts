// Security hardening baseline. `helmetMiddleware` and `generalRateLimiter` are
// applied globally in app.ts. `authRateLimiter` is exported separately so it
// can be applied per-route to auth-sensitive endpoints (login, register,
// OAuth callbacks).
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "../lib/env";

export const helmetMiddleware = helmet();

// This is a JSON API, never meant to be browser-cached — applied to the
// whole /api/v1 router in app.ts, not just authenticated routes, since it's
// simplest/safest to make "no caching" the default rather than special-case
// each route. Two concrete failure modes this prevents (combined with
// `app.set("etag", false)` in app.ts, since a conditional GET can 304 even
// with Cache-Control present):
//   1. A conditional re-request (browser sends `If-None-Match` against an
//      auto-generated ETag) getting a 304 Not Modified with an empty body —
//      `authFetch` in web/lib/api/auth.ts treats any non-2xx as a failure,
//      so this silently breaks pages like the profile page.
//   2. A shared machine serving a stale, per-user response (e.g. GET
//      /api/v1/users/me) out of the browser cache after logout/re-login as a
//      different user — a data-exposure risk, not just a UX bug.
export function noStoreMiddleware(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("Cache-Control", "no-store");
  next();
}

// General API traffic: generous enough not to bother normal usage.
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth-sensitive routes (login, register, forgot-password): tighter, since
// these are the routes brute-force/credential-stuffing attacks target.
// Apply per-route, e.g.:
//   router.post("/login", authRateLimiter, loginHandler);
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // Disabled under automated tests: a single test run legitimately fires far
  // more than 10 requests at these routes from the same IP in seconds. Real
  // traffic (dev/production) is always rate-limited.
  skip: () => env.NODE_ENV === "test",
  message: {
    error: "Too many attempts. Please try again later.",
  },
});

// Shared cookie config for whichever auth flow ends up setting cookies
// (e.g. a refresh token cookie). HTTPS-only (`secure`) is env-driven so it
// doesn't break local http:// dev, but is always on in production.
export const secureCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
};
