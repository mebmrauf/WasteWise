// CSRF protection for cookie-based sessions: double-submit token pattern.
// login/register don't need it (no session cookie exists yet for an
// attacker to ride), but any state-changing route reachable while
// authenticated (logout, profile updates, and any future authenticated
// POST/PUT/PATCH/DELETE route) should chain this after requireAuth.
import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { sendError } from "./apiResponse";
import { CSRF_COOKIE } from "./cookies";

const CSRF_HEADER = "x-csrf-token";

function tokensMatch(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  // timingSafeEqual throws on mismatched lengths rather than returning
  // false, and length itself isn't secret here, so short-circuit first.
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

  sendError(
    res,
    403,
    "CSRF_TOKEN_MISMATCH",
    "Request could not be verified. Please refresh and try again.",
  );
}
