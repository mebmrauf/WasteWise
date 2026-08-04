// JWT signing/verification for access + refresh tokens. Kept separate from
// lib/authTokens.ts (which owns the refresh-token *rotation/revocation*
// bookkeeping in the DB) so this file is pure crypto/encoding with no DB
// dependency — easy to unit test in isolation.
import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { env } from "./env";

export interface AccessTokenPayload {
  sub: string; // User.id
  role: Role;
}

export interface RefreshTokenPayload {
  sub: string; // User.id
  jti: string; // unique id for this refresh token, ties the JWT to its RefreshToken DB row
}

// Pinned explicitly (rather than relying on jsonwebtoken's default behavior)
// so a future refactor can never be tricked into accepting a token signed
// with an unexpected algorithm — OWASP JWT hardening baseline.
const JWT_ALGORITHM = "HS256" as const;

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: [JWT_ALGORITHM],
  }) as AccessTokenPayload;
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, {
    algorithms: [JWT_ALGORITHM],
  }) as RefreshTokenPayload;
}

/** Decodes (without verifying) to read the `exp` claim, e.g. to persist expiresAt. */
export function decodeExpiry(token: string): Date {
  const decoded = jwt.decode(token) as { exp?: number } | null;
  if (!decoded?.exp) {
    throw new Error("Token has no exp claim");
  }
  return new Date(decoded.exp * 1000);
}
