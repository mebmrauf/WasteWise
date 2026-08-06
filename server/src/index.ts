import "dotenv/config";
import http from "node:http";
import { app } from "./app";
import { env } from "./lib/env";
import { logger } from "./lib/logger";
import { createSocketServer } from "./realtime/socket";
import { registerPickupTrackingHandlers } from "./realtime/pickupEvents";

const httpServer = http.createServer(app);

const io = createSocketServer(httpServer);
registerPickupTrackingHandlers(io);

httpServer.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, "WasteWise API listening");
});
