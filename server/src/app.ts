// Express app factory — separated from src/index.ts so tests can import a
// fully-configured `app` with supertest without binding a real port.
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { env } from "./lib/env";
import { helmetMiddleware, generalRateLimiter, noStoreMiddleware } from "./middleware/security";
import { requestLogger } from "./middleware/requestLogger";
import { logger } from "./lib/logger";
import { sendError } from "./lib/apiResponse";
import { authRouter } from "./routes/auth";
import { usersRouter, AVATAR_UPLOAD_DIR } from "./routes/users";

export function createApp() {
  const app = express();

  // Render (like most PaaS) sits behind a reverse proxy that sets
  // X-Forwarded-For — without this, express-rate-limit throws
  // ERR_ERL_UNEXPECTED_X_FORWARDED_FOR and/or buckets every user under the
  // proxy's single IP, defeating generalRateLimiter/authRateLimiter. Only
  // trust it in production, where we know Render's proxy is the source.
  if (env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  // Express's default weak ETag can turn a conditional GET (browser sends
  // `If-None-Match`) into a 304 Not Modified with an empty body — combined
  // with noStoreMiddleware below, this keeps every /api/v1/* JSON response
  // un-cacheable rather than relying on Cache-Control alone. See
  // middleware/security.ts's noStoreMiddleware comment for the failure modes.
  app.set("etag", false);

  app.use(helmetMiddleware);
  app.use(requestLogger);
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    }),
  );
  app.use(generalRateLimiter);
  app.use(express.json());
  // Auth cookies (access/refresh/csrf) are read via req.cookies by
  // lib/rbac.ts and lib/csrf.ts — no signing secret needed since the tokens
  // themselves are signed JWTs / opaque values verified independently.
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    res.json({ data: { status: "ok" } });
  });

  // This is a JSON API, not static/cacheable content — applied broadly to
  // the whole /api/v1 router (not just authenticated routes) since that's
  // simpler and safer than special-casing individual routes.
  app.use("/api/v1", noStoreMiddleware);

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/users", usersRouter);
  // TODO: mount further route modules here, e.g.
  // app.use("/api/v1/pickups", pickupsRouter);

  // Serves uploaded avatar images back out. Deliberately root-relative (not
  // under /api/v1) since it's static file serving, not a JSON API route —
  // see routes/users.ts and docs/api-contract.md for the local-disk-storage
  // caveat (ephemeral on Render).
  //
  // The global helmetMiddleware() above sets Cross-Origin-Resource-Policy:
  // same-origin, which blocks the browser from loading these images from
  // web/ (a different origin in dev — localhost:3000 vs localhost:4000, and
  // different registrable domains once deployed) even though CORS itself is
  // configured correctly — CORP is a separate, stricter mechanism. Only this
  // route relaxes it, not the API's global default, since these files are
  // meant to be publicly embeddable images, unlike the JSON API responses.
  app.use(
    "/uploads/avatars",
    helmet.crossOriginResourcePolicy({ policy: "cross-origin" }),
    express.static(AVATAR_UPLOAD_DIR),
  );

  // 404 fallback — kept last so it never shadows a real route.
  app.use((_req, res) => {
    sendError(res, 404, "NOT_FOUND", "Resource not found.");
  });

  // Central error handler. Never forward `err.message`/`err.stack` from
  // unexpected (non-validation) errors to the client — log the detail
  // server-side instead, since it could contain internals we don't want to
  // leak (and must never contain secrets like password hashes or tokens).
  app.use(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      logger.error({ err, path: req.path }, "Unhandled error");
      sendError(res, 500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
    },
  );

  return app;
}

export const app = createApp();
