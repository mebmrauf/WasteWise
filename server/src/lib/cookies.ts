// Cookie names + helpers shared by every route that sets/reads/clears the
// auth cookies (register, login, oauth callbacks, refresh, logout). See
// docs/api-contract.md "Authentication" section for the full design
// rationale (why cookies over Authorization-header tokens, CSRF approach,
// the production cross-site caveat, etc).
import { randomBytes } from "node:crypto";
import type { Response } from "express";
import { secureCookieOptions } from "../middleware/security";
import type { TokenPair } from "./authTokens";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";
export const CSRF_COOKIE = "csrf_token";
export const OAUTH_STATE_COOKIE = "oauth_state";

/** Parses simple "15m" / "7d" / "30s" / "1h" durations (also bare ms numbers) into milliseconds. */
export function parseDurationMs(duration: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)?$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Unrecognized duration format: "${duration}"`);
  }
  const value = Number(match[1]);
  const unit = match[2] ?? "ms";
  const unitMs: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * unitMs[unit];
}

function accessTokenMaxAge(): number {
  return parseDurationMs(process.env.JWT_ACCESS_EXPIRES_IN ?? "15m");
}

function refreshTokenMaxAge(): number {
  return parseDurationMs(process.env.JWT_REFRESH_EXPIRES_IN ?? "7d");
}

/** Sets access_token, refresh_token, and a readable (non-httpOnly) csrf_token cookie. */
export function setAuthCookies(res: Response, tokens: TokenPair): void {
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...secureCookieOptions,
    maxAge: accessTokenMaxAge(),
  });
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...secureCookieOptions,
    maxAge: refreshTokenMaxAge(),
  });
  // Double-submit CSRF token: intentionally NOT httpOnly so client JS can
  // read it and echo it back as the `x-csrf-token` header on mutating
  // requests. It carries no secret value on its own (it's not a session
  // token) — it only proves the request originated from a page that can
  // read this origin's cookies, which a cross-site attacker cannot do.
  res.cookie(CSRF_COOKIE, randomBytes(32).toString("hex"), {
    ...secureCookieOptions,
    httpOnly: false,
    maxAge: refreshTokenMaxAge(),
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE, secureCookieOptions);
  res.clearCookie(REFRESH_TOKEN_COOKIE, secureCookieOptions);
  res.clearCookie(CSRF_COOKIE, { ...secureCookieOptions, httpOnly: false });
}
