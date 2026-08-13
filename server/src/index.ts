import "dotenv/config";
import http from "node:http";
import { app } from "./app";
import { env } from "./lib/env";
import { logger } from "./lib/logger";
import { createSocketServer } from "./realtime/socket";
import { registerPickupTrackingHandlers } from "./realtime/pickupEvents";
import { prisma } from "./lib/prisma";
import { hashPassword } from "./lib/passwords";
<<<<<<< HEAD
import { startRecyclingReminderScheduler } from "./lib/reminderScheduler";
=======
import { startEmailVerificationReminderScheduler } from "./lib/emailVerificationReminders";
>>>>>>> origin/main

const httpServer = http.createServer(app);

async function ensureAdminUser() {
  const email = env.ADMIN_EMAIL;
  const passwordHash = await hashPassword(env.ADMIN_PASSWORD);
  
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "ADMIN", isEmailVerified: true },
    create: {
      email,
      fullName: "System Admin",
      passwordHash,
      role: "ADMIN",
      isEmailVerified: true,
    },
  });
  logger.info("Admin user seeded/verified");
}
const io = createSocketServer(httpServer);
registerPickupTrackingHandlers(io);

ensureAdminUser().then(() => {
  httpServer.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, "WasteWise API listening");
<<<<<<< HEAD
    startRecyclingReminderScheduler();
    logger.info("Smart Pickup Reminder scheduler started");
=======
    startEmailVerificationReminderScheduler();
>>>>>>> origin/main
  });
}).catch((err) => {
  logger.fatal({ err }, "Failed to seed admin user. Exiting...");
  process.exit(1);
});
