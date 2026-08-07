import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "../lib/env";

export const helmetMiddleware = helmet();

export function noStoreMiddleware(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("Cache-Control", "no-store");
  next();
}

export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  message: {
    error: "Too many attempts. Please try again later.",
  },
});

export const secureCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
};
