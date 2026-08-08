import pino from "pino";
import { env } from "./env";

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "email",
      "password",
      "passwordHash",
      "token",
      "*.password",
      "*.email",
      "*.token",
      "req.headers.cookie",
      "req.headers.authorization",
      "res.headers[\"set-cookie\"]",
    ],
    censor: "[REDACTED]",
  },
  ...(env.NODE_ENV === "development"
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
          },
        },
      }
    : {}),
});
