import { prisma } from "./prisma";
import { logger } from "./logger";
import { createNotification } from "./notifications";
import { sendEmail } from "./mailer";
import { env } from "./env";

export function startBiddingScheduler() {
  // Run every 1 minute
  const INTERVAL_MS = 60 * 1000;
  logger.info("Bidding Closure Scheduler started. Checking every 1 minute.");

  setInterval(async () => {
    try {
      const now = new Date();
      // For fallback: 24 hours ago
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const expiredRequests = await prisma.bulkMarketplaceRequest.findMany({
        where: {
          status: "OPEN_FOR_BIDDING",
          OR: [
            { bidEndsAt: { lte: now } },
            { bidEndsAt: null, createdAt: { lte: twentyFourHoursAgo } },
          ],
        },
        include: {
          quotations: {
            include: { company: true }
          },
          business: true,
        },
      });

      if (expiredRequests.length === 0) return;

      for (const request of expiredRequests) {
        await processExpiredRequest(request);
      }
    } catch (err) {
      logger.error({ err }, "Error in Bidding Closure Scheduler");
    }
  }, INTERVAL_MS);
}

async function processExpiredRequest(request: any) {
  try {
    logger.info({ requestId: request.id }, "Closing bidding for Bulk Request");

    let highestBid = null;

    if (request.quotations.length > 0) {
      // Find highest bid: max purchasePrice, tie-break by earliest createdAt
      highestBid = request.quotations.reduce((prev: any, curr: any) => {
        if (curr.purchasePrice > prev.purchasePrice) return curr;
        if (curr.purchasePrice === prev.purchasePrice) {
          return new Date(curr.createdAt).getTime() < new Date(prev.createdAt).getTime() ? curr : prev;
        }
        return prev;
      }, request.quotations[0]);
    }

    await prisma.$transaction(async (tx) => {
      // Update request status to BIDDING_CLOSED
      await tx.bulkMarketplaceRequest.update({
        where: { id: request.id },
        data: { status: "BIDDING_CLOSED" },
      });

      // If a highest bid exists, mark it
      if (highestBid) {
        await tx.marketplaceQuotation.update({
          where: { id: highestBid.id },
          data: { isHighestBid: true },
        });
      }
    });

    if (highestBid) {
      // Send Email
      if (request.business.email) {
        const dashboardLink = `${env.CLIENT_ORIGIN[0] || "http://localhost:3000"}/business/dashboard/marketplace`;
        
        await sendEmail({
          to: request.business.email,
          subject: "Bidding Closed – Review Your Highest Quotation",
          text: `Bidding has closed. Highest bidder is ${highestBid.company.fullName} for ৳${highestBid.purchasePrice}. Log in to review.`,
          html: `
            <p>Dear ${request.business.fullName},</p>
            <p>The 24-hour bidding period for your Bulk Waste Pickup has ended.</p>
            <p>The highest quotation has been automatically selected and is now awaiting your decision.</p>
            <ul>
              <li><strong>Pickup ID:</strong> ${request.id.slice(0, 8)}</li>
              <li><strong>Highest Bidder:</strong> ${highestBid.company.fullName}</li>
              <li><strong>Quoted Amount:</strong> ৳${highestBid.purchasePrice}</li>
            </ul>
            <p>Please log in to your WasteWise Business account to review the quotation. If you accept the offer, the selected Recycling Company will be assigned to your pickup and the collection process will begin.</p>
            <p><a href="${dashboardLink}">Review Quotation Here</a></p>
            <p>Thank you for choosing WasteWise.</p>
            <p>Best regards,<br/>The WasteWise Team</p>
          `,
        });
      }

      // Create In-App Notification
      await createNotification({
        userId: request.business.id,
        type: "GENERIC",
        title: "Bidding Closed",
        message: `Bidding has ended for request ${request.id.slice(0,8)}. The highest quotation (৳${highestBid.purchasePrice}) is waiting for your review.`,
        emailPreference: "emailNotificationsEnabled",
      });
    }
  } catch (err) {
    logger.error({ err, requestId: request.id }, "Failed to process expired request");
  }
}
