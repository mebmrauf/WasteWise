"use client";

import * as React from "react";
import { PageContainer } from "@/components/PageContainer";
import { listPaymentsHistory, PaymentRecord } from "@/lib/api/payments";
import { PaymentHistoryTable } from "@/components/PaymentHistoryTable";
import { PaymentHistorySkeleton } from "@/components/PaymentHistorySkeleton";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useRequireRole } from "@/lib/auth/AuthContext";
import { useSearchParams } from "next/navigation";

export default function AdminPaymentHistoryPage() {
  const { user, isLoading: isAuthLoading } = useRequireRole(["ADMIN"], { loginRedirectTo: "/admin/login", forbiddenRedirectTo: "/admin/login" });
  const [payments, setPayments] = React.useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const searchParams = useSearchParams();
  const status = searchParams.get("status");

  React.useEffect(() => {
    if (!user) return;
    
    listPaymentsHistory()
      .then((data) => {
        // Admin sees all payments, no filtering needed based on role ID
        setPayments(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setErrorMsg(err.message || "Failed to load payment history");
        setIsLoading(false);
      });
  }, [user]);

  if (isAuthLoading) {
    return (
      <PageContainer className="flex min-h-[60vh] items-center justify-center py-16">
        <PaymentHistorySkeleton />
      </PageContainer>
    );
  }

  if (!user) return null;

  return (
    <PageContainer className="py-8">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-h2 text-neutral-900">Platform Payments</h1>
          <p className="text-body text-neutral-500 mt-1">
            Monitor all payment transactions across WasteWise.
          </p>
        </div>

        {status === "success" && (
          <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-200">
            Payment completed successfully!
          </div>
        )}
        {status === "fail" && (
          <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200">
            Payment failed.
          </div>
        )}
        {status === "cancel" && (
          <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200">
            Payment was cancelled.
          </div>
        )}

        {errorMsg && <ErrorBanner>{errorMsg}</ErrorBanner>}

        {isLoading ? (
          <PaymentHistorySkeleton />
        ) : (
          <PaymentHistoryTable payments={payments} type="received" />
        )}
      </div>
    </PageContainer>
  );
}
