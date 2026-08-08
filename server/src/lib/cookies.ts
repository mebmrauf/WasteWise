import { randomBytes } from "node:crypto";
import type { Response } from "express";
import { secureCookieOptions } from "../middleware/security";
import type { TokenPair } from "./authTokens";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";
export const CSRF_COOKIE = "csrf_token";
export const OAUTH_STATE_COOKIE = "oauth_state";

function parseDurationMs(duration: string): number {
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

export function setAuthCookies(res: Response, tokens: TokenPair): void {
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...secureCookieOptions,
    maxAge: accessTokenMaxAge(),
  });
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...secureCookieOptions,
    maxAge: refreshTokenMaxAge(),
  });
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
