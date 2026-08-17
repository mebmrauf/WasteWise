"use client";

import React, { useEffect, useState } from "react";
import { PageContainer } from "@/components/PageContainer";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Printer, ArrowLeft, Download, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { authFetch } from "@/lib/api/auth";
import { useParams, useSearchParams, useRouter } from "next/navigation";

export default function ReceiptPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const pickupId = params.pickupId as string;
  const isBulk = searchParams.get("type") === "bulk";
  const shouldPrint = searchParams.get("download") === "true";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<any>(null);

  useEffect(() => {
    async function fetchReceipt() {
      try {
        const receiptData = await authFetch<any>(`/payments/receipt/${pickupId}${isBulk ? '?type=bulk' : ''}`);
        setReceipt(receiptData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchReceipt();
  }, [pickupId, isBulk]);

  useEffect(() => {
    if (!loading && receipt && shouldPrint) {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, receipt, shouldPrint]);

  if (loading) {
    return (
      <PageContainer className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </PageContainer>
    );
  }

  if (error || !receipt) {
    return (
      <PageContainer className="py-12">
        <Card className="p-12 text-center max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Receipt Unavailable</h2>
          <p className="text-neutral-500 mb-6">{error || "Payment record not found."}</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="py-8 lg:py-12 bg-neutral-50 min-h-screen">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        
        {/* Print Controls (Hidden when printing) */}
        <div className="flex items-center justify-between print:hidden">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
            <Button variant="primary" onClick={() => window.print()}>
              <Download className="w-4 h-4 mr-2" /> Save PDF
            </Button>
          </div>
        </div>

        {/* Receipt Document */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
          
          {/* Header */}
          <div className="bg-emerald-600 text-white p-8 sm:p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <CheckCircle2 className="w-48 h-48" />
            </div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center text-emerald-600 mb-4 shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Payment Receipt</h1>
              <p className="text-emerald-100 font-medium">WasteWise Environmental Services</p>
            </div>
          </div>

          {/* Body */}
          <div className="p-8 sm:p-12">
            
            <div className="flex flex-col sm:flex-row justify-between gap-8 mb-12 pb-12 border-b border-neutral-100">
              <div className="flex flex-col gap-1">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Receipt Number</p>
                <p className="text-lg font-mono text-neutral-900 font-bold">{receipt.id.slice(0, 12).toUpperCase()}</p>
              </div>
              <div className="flex flex-col gap-1 sm:text-right">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Date Paid</p>
                <p className="text-lg font-bold text-neutral-900">{format(new Date(receipt.updatedAt), "MMMM d, yyyy")}</p>
                <p className="text-sm text-neutral-500">{format(new Date(receipt.updatedAt), "h:mm a")}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 mb-12">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-100 pb-2">Billed To</p>
                <p className="font-bold text-neutral-900 text-lg mt-2">{receipt.payer.fullName}</p>
                <p className="text-neutral-500">{receipt.payer.email}</p>
                <p className="text-sm px-2 py-1 bg-neutral-100 text-neutral-700 rounded w-fit mt-1">{receipt.payer.accountType}</p>
              </div>
              
              <div className="flex flex-col gap-2">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-100 pb-2">Paid To</p>
                <p className="font-bold text-neutral-900 text-lg mt-2">{receipt.customer.fullName}</p>
                <p className="text-neutral-500">{receipt.customer.email}</p>
                <p className="text-sm px-2 py-1 bg-neutral-100 text-neutral-700 rounded w-fit mt-1">{receipt.customer.accountType}</p>
              </div>
            </div>

            {/* Transaction Details */}
            <div className="bg-neutral-50 rounded-xl p-6 mb-8 border border-neutral-100">
              <h3 className="font-bold text-neutral-900 mb-4 uppercase tracking-wider text-sm">Transaction Details</h3>
              <div className="flex justify-between items-center py-3 border-b border-neutral-200">
                <span className="text-neutral-600">Service</span>
                <span className="font-medium text-neutral-900">
                  {isBulk ? "Bulk Waste Collection" : "Smart Waste Pickup"}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-neutral-200">
                <span className="text-neutral-600">Reference ID</span>
                <span className="font-mono text-sm text-neutral-900">{isBulk ? receipt.bulkRequestId?.slice(0, 8) : receipt.pickupId?.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-neutral-200">
                <span className="text-neutral-600">Payment Method</span>
                <span className="font-medium text-neutral-900">{receipt.paymentMethod === "SSLCOMMERZ" ? "Online (SSLCommerz)" : "Cash on Delivery"}</span>
              </div>
              {receipt.transactionId && (
                <div className="flex justify-between items-center py-3 border-b border-neutral-200">
                  <span className="text-neutral-600">Gateway Transaction ID</span>
                  <span className="font-mono text-sm text-neutral-900">{receipt.transactionId}</span>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="flex justify-end pt-6 border-t-2 border-neutral-900">
              <div className="flex flex-col items-end">
                <p className="text-sm text-neutral-500 font-bold uppercase tracking-widest mb-1">Total Paid</p>
                <p className="text-4xl font-black text-emerald-600">৳{receipt.amount.toLocaleString()}</p>
              </div>
            </div>

          </div>

          <div className="bg-neutral-900 text-neutral-400 p-6 text-center text-sm">
            <p>Thank you for contributing to a greener planet with WasteWise!</p>
            <p className="mt-1 opacity-50">This receipt is automatically generated and does not require a physical signature.</p>
          </div>

        </div>
      </div>
    </PageContainer>
  );
}
