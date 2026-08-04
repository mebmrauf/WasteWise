// Request logging middleware — attaches a request ID (reusing an inbound
// `x-request-id` header when present, e.g. from a proxy/load balancer) and
// logs one structured line per request for traceability.
import { randomUUID } from "node:crypto";
import pinoHttp from "pino-http";
import { logger } from "../lib/logger";

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers["x-request-id"];
    const id = (Array.isArray(existing) ? existing[0] : existing) ?? randomUUID();
    res.setHeader("x-request-id", id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  // pino-http's default req/res serializers include the full headers object,
  // which would otherwise log raw Cookie / Set-Cookie values (access/refresh
  // JWTs, CSRF token) in plaintext on every line — never store/log raw
  // tokens (see server/src/lib/authTokens.ts's own rule for the DB side).
  redact: {
    paths: ["req.headers.cookie", "req.headers.authorization", 'res.headers["set-cookie"]'],
    censor: "[REDACTED]",
  },
});
