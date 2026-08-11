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
import { usersRouter } from "./routes/users";
import { wasteRecognitionRouter, WASTE_PHOTO_UPLOAD_DIR } from "./routes/wasteRecognition";
import { pickupsRouter } from "./routes/pickups";
import { offersRouter } from "./routes/offers";
import { rewardsRouter } from "./routes/rewards";
import { referralsRouter } from "./routes/referrals";
import { notificationsRouter } from "./routes/notifications";
import { adminRouter } from "./routes/admin";
import { collectorsRouter } from "./routes/collectors";

export function createApp() {
  const app = express();

  if (env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.set("etag", false);

  app.use(helmetMiddleware);
  app.use(requestLogger);
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
      maxAge: 86400, // cache preflight OPTIONS requests for 24 hours
    }),
  );
  app.use(generalRateLimiter);
  app.use(express.json());
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    res.json({ data: { status: "ok" } });
  });

  app.use("/api/v1", noStoreMiddleware);

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/users", usersRouter);
  app.use("/api/v1/waste-recognition", wasteRecognitionRouter);
  app.use("/api/v1/pickups", pickupsRouter);
  app.use("/api/v1/offers", offersRouter);
  app.use("/api/v1/rewards", rewardsRouter);
  app.use("/api/v1/referrals", referralsRouter);
  app.use("/api/v1/notifications", notificationsRouter);
  app.use("/api/v1/admin", adminRouter);
  app.use("/api/v1/collectors", collectorsRouter);

  // Serves uploaded waste-recognition photos back out. Deliberately
  // root-relative (not under /api/v1) since it's static file serving, not a
  // JSON API route.
  app.use(
    "/uploads/waste-recognition",
    helmet.crossOriginResourcePolicy({ policy: "cross-origin" }),
    (req, res, next) => {
      res.setHeader("Content-Disposition", "attachment");
      res.setHeader("X-Content-Type-Options", "nosniff");
      next();
    },
    express.static(WASTE_PHOTO_UPLOAD_DIR),
  );

  // 404 fallback — kept last so it never shadows a real route.
  app.use((_req, res) => {
    sendError(res, 404, "NOT_FOUND", "Resource not found.");
  });

  app.use(
    (err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      logger.error({ err, path: req.path }, "Unhandled error");
      sendError(res, 500, "INTERNAL_ERROR", err?.message || "Something went wrong. Please try again.");
    },
  );

  return app;
}

export const app = createApp();
