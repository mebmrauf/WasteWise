// Refresh-token issuance/rotation/revocation against the RefreshToken table.
// Design: the refresh token handed to the client IS a signed JWT (so its
// signature/expiry can be checked statelessly), but we additionally persist a
// sha256 hash of it in RefreshToken so we can revoke a specific token before
// its JWT `exp` (logout, rotation, reuse detection) without needing a
// separate JWT blocklist. Never store/log the raw token — only its hash.
import { randomUUID, createHash } from "node:crypto";
import type { User } from "@prisma/client";
import { prisma } from "./prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken, decodeExpiry } from "./jwt";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export function hashRefreshToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/** Issues a brand-new access+refresh token pair for a freshly authenticated user. */
export async function issueTokenPair(user: Pick<User, "id" | "role">): Promise<TokenPair> {
  const accessToken = signAccessToken({ sub: user.id, role: user.role });

  const jti = randomUUID();
  const refreshToken = signRefreshToken({ sub: user.id, jti });

  await prisma.refreshToken.create({
    data: {
      id: jti,
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: decodeExpiry(refreshToken),
    },
  });

  return { accessToken, refreshToken };
}

export class RefreshTokenError extends Error {}

/**
 * Verifies a raw refresh token cookie value, checks it against the DB
 * (unrevoked, not expired, not already rotated-away), rotates it into a new
 * pair, and revokes the old row. Throws RefreshTokenError on any failure —
 * callers should respond 401 and clear cookies.
 */
export async function rotateRefreshToken(rawToken: string): Promise<TokenPair> {
  let payload;
  try {
    payload = verifyRefreshToken(rawToken);
  } catch {
    throw new RefreshTokenError("Invalid or expired refresh token");
  }

  const tokenHash = hashRefreshToken(rawToken);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!existing || existing.userId !== payload.sub) {
    throw new RefreshTokenError("Refresh token not recognized");
  }

  if (existing.revokedAt) {
    // Reuse of an already-rotated/revoked token: treat as a possible theft
    // and revoke every other active refresh token for this user defensively.
    await prisma.refreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new RefreshTokenError("Refresh token has already been used");
  }

  if (existing.expiresAt.getTime() < Date.now()) {
    throw new RefreshTokenError("Refresh token expired");
  }

  const user = await prisma.user.findUnique({ where: { id: existing.userId } });
  if (!user) {
    throw new RefreshTokenError("User no longer exists");
  }

  const newPair = await issueTokenPair(user);
  const newJti = verifyRefreshToken(newPair.refreshToken).jti;

  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date(), replacedByTokenId: newJti },
  });

  return newPair;
}

/** Best-effort revoke on logout. Never throws — an invalid/missing token is a no-op. */
export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = hashRefreshToken(rawToken);
  await prisma.refreshToken
    .updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    .catch(() => undefined);
}
