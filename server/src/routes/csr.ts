import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../lib/rbac";
import { asyncHandler } from "../lib/asyncHandler";
import { sendData, sendError } from "../lib/apiResponse";
import { Role } from "@prisma/client";

export const csrRouter = Router();

const CAUSES = [
  "Tree Plantation",
  "Community Health",
  "Elderly Care",
  "Education Support",
  "Environmental Cleanup"
] as const;

const createContributionSchema = z.object({
  pickupId: z.string().min(1),
  donationAmount: z.number().positive(),
  donationPercentage: z.number().optional().nullable(),
  selectedCause: z.enum(CAUSES),
  paymentAmount: z.number().positive(),
});

// Create CSR Contribution
csrRouter.post(
  "/contributions",
  requireAuth,
  requireRole(Role.USER),
  asyncHandler(async (req, res) => {
    const dbUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!dbUser || dbUser.accountType !== "BUSINESS") {
      sendError(res, 403, "FORBIDDEN", "Only Business accounts can make CSR contributions.");
      return;
    }

    const parsed = createContributionSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message || "Invalid input");
      return;
    }

    const { pickupId, donationAmount, donationPercentage, selectedCause, paymentAmount } = parsed.data;

    const pickup = await prisma.bulkMarketplaceRequest.findUnique({ where: { id: pickupId } });
    if (!pickup || pickup.businessId !== req.user!.id) {
      sendError(res, 404, "NOT_FOUND", "Pickup request not found.");
      return;
    }

    if (pickup.status !== "COMPLETED") {
      sendError(res, 400, "BAD_REQUEST", "Pickup request must be completed before contributing.");
      return;
    }

    if (donationAmount > paymentAmount) {
      sendError(res, 400, "BAD_REQUEST", "Donation amount cannot exceed payment amount.");
      return;
    }

    const contribution = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { bulkRequestId: pickupId, status: "COMPLETED" }
      });
      const status = payment ? "COMPLETED" : "PENDING";

      const newContribution = await tx.csrContribution.create({
        data: {
          businessId: req.user!.id,
          pickupId,
          donationAmount,
          donationPercentage: donationPercentage || null,
          selectedCause,
          paymentAmount,
          status,
        }
      });

      await tx.greenPointsTransaction.create({
        data: {
          userId: req.user!.id,
          points: 0,
          type: "REDEEMED",
          category: "CSR_CONTRIBUTION",
          description: `CSR Contribution: ${selectedCause}`,
          rewardReason: {
            donationAmount: newContribution.donationAmount,
            contributionId: newContribution.id,
            paymentAmount: newContribution.paymentAmount,
            cause: selectedCause
          } as any
        }
      });

      return newContribution;
    });

    sendData(res, 201, { contribution });
  })
);

// Get CSR Dashboard Stats
csrRouter.get(
  "/dashboard",
  requireAuth,
  requireRole(Role.USER),
  asyncHandler(async (req, res) => {
    const contributions = await prisma.csrContribution.findMany({
      where: { businessId: req.user!.id },
      orderBy: { createdAt: "desc" }
    });

    const totalDonated = contributions.reduce((sum, c) => sum + c.donationAmount, 0);
    const totalContributions = contributions.length;

    const causeCount: Record<string, number> = {};
    contributions.forEach(c => {
      causeCount[c.selectedCause] = (causeCount[c.selectedCause] || 0) + c.donationAmount;
    });

    let mostSupportedCause = null;
    let maxAmount = 0;
    for (const [cause, amount] of Object.entries(causeCount)) {
      if (amount > maxAmount) {
        maxAmount = amount;
        mostSupportedCause = cause;
      }
    }

    const lastContribution = contributions.length > 0 ? contributions[0] : null;

    sendData(res, 200, {
      stats: {
        totalDonated,
        totalContributions,
        mostSupportedCause,
        causeDistribution: causeCount,
        lastContribution
      }
    });
  })
);

// Get CSR History
csrRouter.get(
  "/history",
  requireAuth,
  requireRole(Role.USER),
  asyncHandler(async (req, res) => {
    const contributions = await prisma.csrContribution.findMany({
      where: { businessId: req.user!.id },
      orderBy: { createdAt: "desc" },
      include: {
        pickup: {
          select: { id: true, createdAt: true }
        }
      }
    });

    sendData(res, 200, { contributions });
  })
);

// Generate Receipt
csrRouter.get(
  "/receipt/:id",
  requireAuth,
  requireRole(Role.USER),
  asyncHandler(async (req, res) => {
    const contribution = await prisma.csrContribution.findUnique({
      where: { id: req.params.id },
      include: {
        business: {
          include: { businessProfile: true }
        }
      }
    });

    if (!contribution || contribution.businessId !== req.user!.id) {
      sendError(res, 404, "NOT_FOUND", "Contribution not found");
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>CSR Contribution Receipt</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
        <style>
          body { font-family: sans-serif; background: #f9fafb; margin: 0; padding: 20px; }
          .receipt-container { background: #fff; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #eee; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          .actions { max-width: 680px; margin: 0 auto 20px auto; display: flex; justify-content: flex-end; gap: 12px; }
          .btn { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; font-size: 14px; font-weight: 600; border-radius: 6px; cursor: pointer; border: none; transition: all 0.2s; font-family: inherit; }
          .btn-primary { background: #10b981; color: white; }
          .btn-primary:hover { background: #059669; }
          .btn-outline { background: white; color: #374151; border: 1px solid #d1d5db; }
          .btn-outline:hover { background: #f3f4f6; }
          
          .header { text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 20px; }
          .logo { display: flex; align-items: center; justify-content: center; gap: 8px; color: #10b981; font-size: 24px; font-weight: bold; margin-bottom: 8px; }
          .title { font-size: 20px; color: #374151; margin: 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 12px; }
          .label { color: #6b7280; font-weight: bold; }
          .value { color: #111827; }
          .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 14px; }
          .amount-box { background: #ecfdf5; border: 1px solid #10b981; padding: 16px; text-align: center; border-radius: 8px; margin: 24px 0; }
          .amount-value { font-size: 32px; font-weight: bold; color: #065f46; margin: 8px 0 0 0; }
          
          @media print {
            body { background: white; padding: 0; }
            .receipt-container { box-shadow: none; border: none; padding: 0; margin: 0; max-width: 100%; }
            .actions { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="actions" data-html2canvas-ignore>
          <button class="btn btn-outline" onclick="window.print()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Print
          </button>
          <button class="btn btn-primary" onclick="downloadPDF()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Download PDF
          </button>
        </div>
        
        <div class="receipt-container" id="receipt-content">
          <div class="header">
            <div class="logo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
              WasteWise
            </div>
            <p class="title">CSR Contribution Receipt</p>
          </div>
          
          <div class="row">
            <span class="label">Date & Time:</span>
            <span class="value">${new Date(contribution.createdAt).toLocaleString()}</span>
          </div>
          <div class="row">
            <span class="label">Receipt / Reference Number:</span>
            <span class="value">REF-${contribution.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div class="row">
            <span class="label">Contribution ID:</span>
            <span class="value">${contribution.id}</span>
          </div>
          <div class="row">
            <span class="label">Business Name:</span>
            <span class="value">${contribution.business.businessProfile?.businessName || contribution.business.fullName}</span>
          </div>
          <div class="row">
            <span class="label">Supported Cause:</span>
            <span class="value">${contribution.selectedCause}</span>
          </div>
          ${contribution.pickupId ? `
          <div class="row">
            <span class="label">Related Pickup ID:</span>
            <span class="value">${contribution.pickupId}</span>
          </div>
          ` : ''}
          
          <div class="amount-box">
            <div class="label" style="color: #065f46">Contribution Amount</div>
            <p class="amount-value">BDT ${contribution.donationAmount.toLocaleString()}</p>
          </div>

          <div class="footer">
            <p>This receipt is issued for transparency and record-keeping.</p>
            <p>Thank you for supporting sustainability and social causes through WasteWise!</p>
          </div>
        </div>

        <script>
          function downloadPDF() {
            const element = document.getElementById('receipt-content');
            const opt = {
              margin:       15,
              filename:     'CSR_Receipt_${contribution.id}.pdf',
              image:        { type: 'jpeg', quality: 0.98 },
              html2canvas:  { scale: 2, useCORS: true },
              jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            html2pdf().set(opt).from(element).save();
          }
        </script>
      </body>
      </html>
    `;

    res.setHeader("Content-Type", "text/html");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline';"
    );
    res.send(html);
  })
);
