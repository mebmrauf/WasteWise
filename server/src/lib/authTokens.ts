import { randomUUID, createHash } from "node:crypto";
import type { User } from "@prisma/client";
import { prisma } from "./prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken, decodeExpiry } from "./jwt";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function hashRefreshToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

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

export class RefreshTokenError extends Error { }

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

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = hashRefreshToken(rawToken);
  await prisma.refreshToken
    .updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    .catch(() => undefined);
}
