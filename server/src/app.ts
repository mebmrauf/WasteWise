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
import { pickupsRouter } from "./routes/pickups";
import { offersRouter } from "./routes/offers";
import { rewardsRouter } from "./routes/rewards";

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
  app.use("/api/v1/pickups", pickupsRouter);
  app.use("/api/v1/offers", offersRouter);
  app.use("/api/v1/rewards", rewardsRouter);

  app.use(
    "/uploads/avatars",
    helmet.crossOriginResourcePolicy({ policy: "cross-origin" }),
    express.static(AVATAR_UPLOAD_DIR),
  );

  app.use((_req, res) => {
    sendError(res, 404, "NOT_FOUND", "Resource not found.");
  });

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
