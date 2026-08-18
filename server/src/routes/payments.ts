import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../lib/rbac";
import { PaymentMethod, PaymentStatus, PickupStatus, BulkRequestStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { processGreenPointsForPickup } from "../lib/paymentRewards";
import { sendData, sendError } from "../lib/apiResponse";
import { logger } from "../lib/logger";
// @ts-expect-error sslcommerz-lts types are incomplete
import SSLCommerzPayment from "sslcommerz-lts";

import { calculateSmartPickupAmount, calculateBulkPickupAmount } from "../lib/paymentCalculator";

const router = Router();

const STORE_ID = process.env.SSLCOMMERZ_STORE_ID || "testbox";
const STORE_PASS = process.env.SSLCOMMERZ_STORE_PASS || "qwerty";
const IS_LIVE = process.env.SSLCOMMERZ_IS_LIVE === "true";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const API_URL = process.env.API_URL || "http://localhost:4000";

const initiateSchema = z.object({
  pickupId: z.string().optional(),
  bulkRequestId: z.string().optional(),
});

const codSchema = z.object({
  pickupId: z.string().optional(),
  bulkRequestId: z.string().optional(),
});

interface SSLCommerzInitResponse {
  GatewayPageURL?: string;
  gatewayPageURL?: string;
  GatewayPageUrl?: string;
}

router.post("/initiate", requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = initiateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.issues });
    }

    const { pickupId, bulkRequestId } = parsed.data;
    if (!pickupId && !bulkRequestId) {
      return res.status(400).json({ error: "BAD_REQUEST", message: "Provide pickupId or bulkRequestId" });
    }

    const payerId = req.user!.id;
    let amount = 0;
    let customerId = "";

    if (pickupId) {
      const pickup = await prisma.pickupRequest.findUniqueOrThrow({ where: { id: pickupId } });
      if (pickup.status !== PickupStatus.COMPLETED) {
        return res.status(400).json({ error: "BAD_REQUEST", message: "Pickup is not COMPLETED" });
      }
      if (pickup.assignedCollectorId !== payerId) {
        return res.status(403).json({ error: "FORBIDDEN", message: "You are not the assigned collector" });
      }
      const data = await calculateSmartPickupAmount(pickupId);
      amount = data.amount;
      customerId = data.customerId;
    } else if (bulkRequestId) {
      const bulkRequest = await prisma.bulkMarketplaceRequest.findUniqueOrThrow({ where: { id: bulkRequestId } });
      if (bulkRequest.status !== BulkRequestStatus.COMPLETED) {
        return res.status(400).json({ error: "BAD_REQUEST", message: "Bulk request is not COMPLETED" });
      }
      if (bulkRequest.assignedCompanyId !== payerId) {
        return res.status(403).json({ error: "FORBIDDEN", message: "You are not the assigned recycling company" });
      }
      const data = await calculateBulkPickupAmount(bulkRequestId);
      amount = data.amount;
      customerId = data.customerId;
    }

    if (amount <= 0) {
      return res.status(400).json({ error: "BAD_REQUEST", message: "Payment amount must be greater than 0" });
    }

    // Find the existing PENDING payment
    let existingPayment = await prisma.payment.findFirst({
      where: {
        OR: [
          { pickupId: pickupId || undefined },
          { bulkRequestId: bulkRequestId || undefined }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!existingPayment) {
      // Self-heal: create the missing payment record
      existingPayment = await prisma.payment.create({
        data: {
          pickupId: pickupId || undefined,
          bulkRequestId: bulkRequestId || undefined,
          customerId,
          payerId,
          amount,
          paymentMethod: PaymentMethod.NOT_SELECTED,
          status: PaymentStatus.PENDING,
        }
      });
    }

    if (existingPayment.status === "COMPLETED") {
      return res.status(400).json({ error: "BAD_REQUEST", message: "Payment already completed for this request." });
    }

    // Update existing payment
    const payment = await prisma.payment.update({
      where: { id: existingPayment.id },
      data: {
        paymentMethod: PaymentMethod.SSLCOMMERZ,
      }
    });

    // Generate SSLCommerz session
    const data = {
      total_amount: amount,
      currency: "BDT",
      tran_id: payment.id,
      success_url: `${API_URL}/api/v1/payments/ssl-success`,
      fail_url: `${API_URL}/api/v1/payments/ssl-fail`,
      cancel_url: `${API_URL}/api/v1/payments/ssl-cancel`,
      ipn_url: `${API_URL}/api/v1/payments/ssl-ipn`,
      shipping_method: "NO",
      product_name: "Waste Collection Payment",
      product_category: "Service",
      product_profile: "non-physical-goods",
      cus_name: "Customer",
      cus_email: "customer@example.com",
      cus_add1: "Dhaka",
      cus_city: "Dhaka",
      cus_postcode: "1000",
      cus_country: "Bangladesh",
      cus_phone: "01700000000",
    };

    const sslcz = new SSLCommerzPayment(STORE_ID, STORE_PASS, IS_LIVE);

    logger.info({ requestData: data }, "Sending SSLCommerz init request");

    sslcz.init(data).then((apiResponse: SSLCommerzInitResponse) => {
      logger.info({ sslczResponse: apiResponse }, "SSLCommerz init response");
      const GatewayPageURL = apiResponse.GatewayPageURL || apiResponse.gatewayPageURL || apiResponse.GatewayPageUrl;

      if (!GatewayPageURL) {
        logger.error({ apiResponse }, "GatewayPageURL missing in SSLCommerz response");
        return sendError(res, 500, "PAYMENT_INIT_FAILED", "Invalid response from payment gateway.");
      }

      return sendData(res, 200, { gatewayUrl: GatewayPageURL });
    }).catch((err: unknown) => {
      logger.error({ err }, "SSLCommerz init error");
      const message = err instanceof Error ? err.message : "Failed to initialize SSLCommerz payment";
      return sendError(res, 500, "INTERNAL_SERVER_ERROR", message);
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to initialize payment";
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message });
  }
});

router.post("/cod", requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = codSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.issues });
    }

    const { pickupId, bulkRequestId } = parsed.data;
    if (!pickupId && !bulkRequestId) {
      return res.status(400).json({ error: "BAD_REQUEST", message: "Provide pickupId or bulkRequestId" });
    }

    const payerId = req.user!.id;
    let amount = 0;
    let customerId = "";

    if (pickupId) {
      const pickup = await prisma.pickupRequest.findUniqueOrThrow({ where: { id: pickupId } });
      if (pickup.status !== PickupStatus.COMPLETED) {
        return res.status(400).json({ error: "BAD_REQUEST", message: "Pickup is not COMPLETED" });
      }
      if (pickup.assignedCollectorId !== payerId) {
        return res.status(403).json({ error: "FORBIDDEN", message: "You are not the assigned collector" });
      }
      const data = await calculateSmartPickupAmount(pickupId);
      amount = data.amount;
      customerId = data.customerId;
    } else if (bulkRequestId) {
      const bulkRequest = await prisma.bulkMarketplaceRequest.findUniqueOrThrow({ where: { id: bulkRequestId } });
      if (bulkRequest.status !== BulkRequestStatus.COMPLETED) {
        return res.status(400).json({ error: "BAD_REQUEST", message: "Bulk request is not COMPLETED" });
      }
      if (bulkRequest.assignedCompanyId !== payerId) {
        return res.status(403).json({ error: "FORBIDDEN", message: "You are not the assigned recycling company" });
      }
      const data = await calculateBulkPickupAmount(bulkRequestId);
      amount = data.amount;
      customerId = data.customerId;
    }

    // Find the existing PENDING payment
    let existingPayment = await prisma.payment.findFirst({
      where: {
        OR: [
          { pickupId: pickupId || undefined },
          { bulkRequestId: bulkRequestId || undefined }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!existingPayment) {
      // Self-heal: create the missing payment record
      existingPayment = await prisma.payment.create({
        data: {
          pickupId: pickupId || undefined,
          bulkRequestId: bulkRequestId || undefined,
          customerId,
          payerId,
          amount,
          paymentMethod: PaymentMethod.NOT_SELECTED,
          status: PaymentStatus.PENDING,
        }
      });
    }

    if (existingPayment.status === "COMPLETED") {
      return res.status(400).json({ error: "BAD_REQUEST", message: "Payment already completed for this request." });
    }

    const payment = await prisma.payment.update({
      where: { id: existingPayment.id },
      data: {
        paymentMethod: PaymentMethod.COD,
        status: PaymentStatus.COMPLETED,
      }
    });

    // Process Green Points for smart pickup
    if (pickupId) {
      await processGreenPointsForPickup(pickupId);
    }

    if (bulkRequestId) {
      await prisma.csrContribution.updateMany({
        where: { pickupId: bulkRequestId, status: "PENDING" },
        data: { status: "COMPLETED" }
      });
    }

    res.json({ message: "COD Payment Recorded", payment });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to record COD payment";
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message });
  }
});


// Helper to get correct redirect URL based on payer role
async function getRedirectUrl(tran_id: string, status: string): Promise<string> {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: tran_id },
      include: { payer: true }
    });
    if (!payment) return `${APP_URL}/dashboard/payments?status=${status}`;

    const { role, accountType } = payment.payer;
    let basePath = "/dashboard/payments";

    if (role === "COLLECTOR") basePath = "/collector/payment-history";
    else if (role === "RECYCLING_COMPANY") basePath = "/recycling/payment-history";
    else if (role === "USER" && accountType === "BUSINESS") basePath = "/business/dashboard/payments";

    return `${APP_URL}${basePath}?status=${status}`;
  } catch {
    return `${APP_URL}/dashboard/payments?status=${status}`;
  }
}

// SSLCommerz Webhooks (these do not use requireAuth since SSLCommerz calls them)
router.post("/ssl-success", async (req: Request, res: Response) => {
  const { tran_id, val_id } = req.body;
  logger.info({ body: req.body }, "Received ssl-success webhook");

  try {
    const sslcz = new SSLCommerzPayment(STORE_ID, STORE_PASS, IS_LIVE);
    const validationData = await sslcz.validate({ val_id });

    logger.info({ validationData }, "SSLCommerz validation response");

    if (validationData?.status === "VALID" || validationData?.status === "VALIDATED") {
      const payment = await prisma.payment.findUniqueOrThrow({ where: { id: tran_id } });
      if (payment.status !== PaymentStatus.COMPLETED) {
        await prisma.payment.update({
          where: { id: tran_id },
          data: { status: PaymentStatus.COMPLETED, transactionId: val_id },
        });

        if (payment.pickupId) {
          await processGreenPointsForPickup(payment.pickupId);
        }
        if (payment.bulkRequestId) {
          await prisma.csrContribution.updateMany({
            where: { pickupId: payment.bulkRequestId, status: "PENDING" },
            data: { status: "COMPLETED" }
          });
        }
      }
      const redirectUrl = await getRedirectUrl(tran_id, "success");
      return res.send(`<html><head><meta http-equiv="refresh" content="0; url=${redirectUrl}"></head><body><script>window.location.href="${redirectUrl}";</script><p>Redirecting to WasteWise...</p></body></html>`);
    } else {
      logger.error({ validationData }, "SSLCommerz validation failed");
      const redirectUrl = await getRedirectUrl(tran_id, "fail");
      return res.send(`<html><head><meta http-equiv="refresh" content="0; url=${redirectUrl}"></head><body><script>window.location.href="${redirectUrl}";</script><p>Redirecting to WasteWise...</p></body></html>`);
    }
  } catch (err) {
    logger.error({ err }, "Error processing ssl-success");
    res.send(`<html><head><meta http-equiv="refresh" content="0; url=${APP_URL}/dashboard/payments?status=error"></head><body><script>window.location.href="${APP_URL}/dashboard/payments?status=error";</script><p>Redirecting to WasteWise...</p></body></html>`);
  }
});

router.post("/ssl-fail", async (req: Request, res: Response) => {
  const { tran_id } = req.body;
  logger.info({ body: req.body }, "Received ssl-fail webhook");
  try {
    await prisma.payment.update({
      where: { id: tran_id },
      data: { status: PaymentStatus.FAILED },
    });
    const redirectUrl = await getRedirectUrl(tran_id, "fail");
    res.send(`<html><head><meta http-equiv="refresh" content="0; url=${redirectUrl}"></head><body><script>window.location.href="${redirectUrl}";</script><p>Redirecting to WasteWise...</p></body></html>`);
  } catch (err) {
    logger.error({ err }, "Error processing ssl-fail");
    res.send(`<html><head><meta http-equiv="refresh" content="0; url=${APP_URL}/dashboard/payments?status=error"></head><body><script>window.location.href="${APP_URL}/dashboard/payments?status=error";</script><p>Redirecting to WasteWise...</p></body></html>`);
  }
});

router.post("/ssl-cancel", async (req: Request, res: Response) => {
  const { tran_id } = req.body;
  logger.info({ body: req.body }, "Received ssl-cancel webhook");
  try {
    await prisma.payment.update({
      where: { id: tran_id },
      data: { status: PaymentStatus.CANCELLED },
    });
    const redirectUrl = await getRedirectUrl(tran_id, "cancel");
    res.send(`<html><head><meta http-equiv="refresh" content="0; url=${redirectUrl}"></head><body><script>window.location.href="${redirectUrl}";</script><p>Redirecting to WasteWise...</p></body></html>`);
  } catch (err) {
    logger.error({ err }, "Error processing ssl-cancel");
    res.send(`<html><head><meta http-equiv="refresh" content="0; url=${APP_URL}/dashboard/payments?status=error"></head><body><script>window.location.href="${APP_URL}/dashboard/payments?status=error";</script><p>Redirecting to WasteWise...</p></body></html>`);
  }
});

router.post("/ssl-ipn", async (req: Request, res: Response) => {
  const { tran_id, status, val_id } = req.body;
  logger.info({ body: req.body }, "Received ssl-ipn webhook");
  try {
    if (status === "VALID") {
      const payment = await prisma.payment.findUniqueOrThrow({ where: { id: tran_id } });
      if (payment.status !== PaymentStatus.COMPLETED) {
        await prisma.payment.update({
          where: { id: tran_id },
          data: { status: PaymentStatus.COMPLETED, transactionId: val_id },
        });

        if (payment.pickupId) {
          await processGreenPointsForPickup(payment.pickupId);
        }
        if (payment.bulkRequestId) {
          await prisma.csrContribution.updateMany({
            where: { pickupId: payment.bulkRequestId, status: "PENDING" },
            data: { status: "COMPLETED" }
          });
        }
      }
    }
    res.status(200).send("OK");
  } catch {
    res.status(500).send("Error processing IPN");
  }
});


// History Endpoint
router.get("/history", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    let whereClause: Prisma.PaymentWhereInput = {
      OR: [
        { customerId: userId },
        { payerId: userId }
      ]
    };

    if (userRole === "ADMIN") {
      whereClause = {};
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        customer: { select: { fullName: true, accountType: true, email: true } },
        payer: { select: { fullName: true, accountType: true, email: true } },
        pickup: { select: { id: true, createdAt: true } },
        bulkRequest: { select: { id: true, createdAt: true } },
      },
      orderBy: { createdAt: "desc" }
    });

    sendData(res, 200, payments);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch payment history";
    sendError(res, 500, "INTERNAL_SERVER_ERROR", message);
  }
});

// Receipt Endpoint
router.get("/receipt/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type } = req.query; // 'bulk' or 'smart'
    const userId = req.user!.id;
    const userRole = req.user!.role;

    let payment;
    if (type === "bulk") {
      payment = await prisma.payment.findFirst({
        where: { bulkRequestId: id, status: PaymentStatus.COMPLETED },
        include: {
          customer: { select: { fullName: true, accountType: true, email: true } },
          payer: { select: { fullName: true, accountType: true, email: true } },
          bulkRequest: true
        }
      });
    } else {
      payment = await prisma.payment.findFirst({
        where: { pickupId: id, status: PaymentStatus.COMPLETED },
        include: {
          customer: { select: { fullName: true, accountType: true, email: true } },
          payer: { select: { fullName: true, accountType: true, email: true } },
          pickup: true
        }
      });
    }

    if (!payment) {
      sendError(res, 404, "NOT_FOUND", "No completed payment found for this pickup.");
      return;
    }

    // Auth check - must be customer, payer, or admin
    if (userRole !== "ADMIN" && payment.customerId !== userId && payment.payerId !== userId) {
      sendError(res, 403, "FORBIDDEN", "Not authorized to view this receipt.");
      return;
    }

    sendData(res, 200, payment);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch receipt";
    sendError(res, 500, "INTERNAL_SERVER_ERROR", message);
  }
});

export default router;
