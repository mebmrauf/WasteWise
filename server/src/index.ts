// Boot entry point. `dotenv/config` must load server/.env before anything
// else (including `./app`, which transitively imports `./lib/env`) so the
// process fails fast with a clear message if the environment is misconfigured,
// instead of crashing cryptically on the first request that needs a missing var.
import "dotenv/config";
import { app } from "./app";
import { env } from "./lib/env";
import { logger } from "./lib/logger";

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, "WasteWise API listening");
});
