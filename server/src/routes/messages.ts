import { Router } from "express";
import { requireAuth } from "../lib/rbac";
import { prisma } from "../lib/prisma";
import { sendData, sendError } from "../lib/apiResponse";
import { getMessagesQuerySchema } from "./messages.schemas";

export const messagesRouter = Router();

messagesRouter.get("/chat/:userId", requireAuth, async (req, res) => {
  try {
    const currentUserId = req.user!.id;
    const targetUserId = req.params.userId;
    const query = getMessagesQuerySchema.parse(req.query);

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: currentUserId },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
      take: query.limit + 1,
      cursor: query.cursor ? { id: query.cursor } : undefined,
    });

    let nextCursor: string | undefined = undefined;
    if (messages.length > query.limit) {
      const nextItem = messages.pop();
      nextCursor = nextItem!.id;
    }

    sendData(res, 200, { messages: messages.reverse(), nextCursor });
  } catch {
    sendError(res, 400, "BAD_REQUEST", "Failed to fetch messages");
  }
});
