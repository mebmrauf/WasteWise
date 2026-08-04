// Authentication + role-based access control middleware. Exported from
// server/src/lib/ (not middleware/) so routes can
// `import { requireAuth, requireRole } from "../lib/rbac"` and apply them
// per-route, e.g.:
//
//   router.post("/pickups", requireAuth, requireRole("USER"), handler);
//   router.get("/admin/verifications", requireAuth, requireRole("ADMIN"), handler);
//
// requireRole assumes requireAuth already ran (it reads req.user) — always
// chain requireAuth first.
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

/** Verifies the access_token cookie and attaches `req.user`. 401s otherwise. */
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

/** Restricts a route to one or more roles. Must run after requireAuth. */
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
