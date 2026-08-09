import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "./env";
import { sendError } from "./apiResponse";
import { CSRF_COOKIE } from "./cookies";

const CSRF_HEADER = "x-csrf-token";

function tokensMatch(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}

export function requireCsrf(req: Request, res: Response, next: NextFunction): void {
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER];

  if (
    typeof cookieToken === "string" &&
    cookieToken.length > 0 &&
    typeof headerToken === "string" &&
    tokensMatch(headerToken, cookieToken)
  ) {
    next();
    return;
  }

  // Fallback to Origin-based CSRF defense for cross-domain deployments
  // where the frontend cannot read the backend's CSRF cookie via document.cookie.
  const requestOrigin = req.headers.origin;
  if (requestOrigin && env.CLIENT_ORIGIN.includes(requestOrigin)) {
    next();
    return;
  }

  sendError(
    res,
    403,
    "CSRF_TOKEN_MISMATCH",
    "Request could not be verified. Please refresh and try again.",
  );
}
