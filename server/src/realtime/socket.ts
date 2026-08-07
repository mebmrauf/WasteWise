import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer, type Socket as SocketIOSocket } from "socket.io";
import type { Role } from "@prisma/client";
import { verifyAccessToken } from "../lib/jwt";
import { ACCESS_TOKEN_COOKIE } from "../lib/cookies";
import { env } from "../lib/env";
import { logger } from "../lib/logger";

interface SocketData {
  user: {
    id: string;
    role: Role;
  };
}

export type Server = SocketIOServer<Record<string, never>, Record<string, never>, Record<string, never>, SocketData>;
export type Socket = SocketIOSocket<Record<string, never>, Record<string, never>, Record<string, never>, SocketData>;

export function pickupRoomName(pickupRequestId: string): string {
  return `pickup:${pickupRequestId}`;
}

function parseCookieHeader(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;

  for (const pair of header.split(";")) {
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex === -1) continue;
    const name = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();
    if (!name) continue;
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }
  return cookies;
}

function authenticateSocket(socket: Socket, next: (err?: Error) => void): void {
  const cookies = parseCookieHeader(socket.handshake.headers.cookie);
  const token = cookies[ACCESS_TOKEN_COOKIE];

  if (!token) {
    next(new Error("UNAUTHENTICATED"));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    socket.data.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new Error("UNAUTHENTICATED"));
  }
}

let io: Server | undefined;

export function createSocketServer(httpServer: HttpServer): Server {
  if (io) {
    throw new Error("createSocketServer() was already called for this process.");
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    },
  });

  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    logger.info(
      { userId: socket.data.user.id, role: socket.data.user.role, socketId: socket.id },
      "Socket connected",
    );

    socket.on("disconnect", (reason) => {
      logger.info(
        { userId: socket.data.user.id, socketId: socket.id, reason },
        "Socket disconnected",
      );
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error("Socket.io server has not been initialized yet — call createSocketServer() first.");
  }
  return io;
}
