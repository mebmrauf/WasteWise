"use client";

import * as React from "react";
import { PageContainer } from "@/components/PageContainer";
import { listPaymentsHistory, PaymentRecord } from "@/lib/api/payments";
import { PaymentHistoryTable } from "@/components/PaymentHistoryTable";
import { PaymentHistorySkeleton } from "@/components/PaymentHistorySkeleton";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useRequireRole } from "@/lib/auth/AuthContext";

export default function CollectorPaymentHistoryPage() {
  const { user, isLoading: isAuthLoading } = useRequireRole(["COLLECTOR"]);
  const [payments, setPayments] = React.useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user) return;
    
    listPaymentsHistory()
      .then((data) => {
        setPayments(data.filter(p => p.payerId === user.id && p.pickupId != null));
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
        <p className="text-body-sm text-neutral-500">Loading…</p>
      </PageContainer>
    );
  }

  if (!user) return null;

  return (
    <PageContainer className="py-8">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-h2 text-neutral-900">Payment History</h1>
          <p className="text-body text-neutral-500 mt-1">
            Review the payments you have made to customers for collections.
          </p>
        </div>

        {errorMsg && <ErrorBanner>{errorMsg}</ErrorBanner>}

        {isLoading ? (
          <PaymentHistorySkeleton />
        ) : (
          <PaymentHistoryTable payments={payments} type="made" />
        )}
      </div>
    </PageContainer>
  );
}
