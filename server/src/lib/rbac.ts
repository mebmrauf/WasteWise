import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { verifyAccessToken } from "./jwt";
import { sendError } from "./apiResponse";
import { ACCESS_TOKEN_COOKIE } from "./cookies";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
      };
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[ACCESS_TOKEN_COOKIE];
  if (!token) {
    sendError(res, 401, "UNAUTHENTICATED", "Sign in to continue.");
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    sendError(res, 401, "UNAUTHENTICATED", "Your session has expired. Please sign in again.");
  }
}

export function requireRole(...allowedRoles: Role[]) {
  return function (req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
      sendError(res, 401, "UNAUTHENTICATED", "Sign in to continue.");
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      sendError(res, 403, "FORBIDDEN", "You do not have permission to perform this action.");
      return;
    }
    next();
  };
}
