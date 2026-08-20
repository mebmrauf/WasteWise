import type { Server, Socket } from "./socket";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { userRoomName } from "./socket";

export function registerChatHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    socket.on("send_message", async (payload: { receiverId: string; content: string }, callback) => {
      try {
        const senderId = socket.data.user.id;
        const { receiverId, content } = payload;

        if (!receiverId || !content || typeof content !== "string" || content.trim().length === 0) {
          return callback?.({ error: "Invalid payload" });
        }

        // Verify active pickup exists
        let isAllowed = false;

        // Check Household/Collector
        const activePickup = await prisma.pickupRequest.findFirst({
          where: {
            OR: [
              { requesterId: senderId, assignedCollectorId: receiverId },
              { requesterId: receiverId, assignedCollectorId: senderId }
            ],
            status: {
              in: ["ASSIGNED", "EN_ROUTE", "ARRIVED", "VERIFYING_WEIGHTS"]
            }
          }
        });

        if (activePickup) {
          isAllowed = true;
        } else {
          // Check Business/Recycling Company
          const activeBulk = await prisma.bulkMarketplaceRequest.findFirst({
            where: {
              OR: [
                { businessId: senderId, assignedCompanyId: receiverId },
                { businessId: receiverId, assignedCompanyId: senderId }
              ],
              status: {
                in: ["RECYCLING_COMPANY_ASSIGNED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS", "VERIFYING_WEIGHTS"]
              }
            }
          });
          if (activeBulk) isAllowed = true;
        }

        if (!isAllowed) {
          return callback?.({ error: "Messaging not allowed. No active pickup exists." });
        }

        // Save message to DB
        const message = await prisma.message.create({
          data: {
            senderId,
            receiverId,
            content: content.trim(),
          }
        });

        // Emit to receiver's room
        io.to(userRoomName(receiverId)).emit("receive_message", message);
        
        // Return success to sender
        callback?.({ success: true, message });
      } catch (err) {
        logger.error({ err }, "Error in send_message socket handler");
        callback?.({ error: "Internal server error" });
      }
    });
  });
}
