"use client";

import * as React from "react";
import { ClipboardList, Gift, Sparkles } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Icon } from "@/components/Icon";
import { MOBILE_OPERATOR_LABELS } from "@/components/OperatorSelector";
import { PageContainer } from "@/components/PageContainer";
import { StatusPill } from "@/components/StatusPill";
import { AuthApiError } from "@/lib/api/auth";
import {
  getRewardsBalance,
  getRewardsHistory,
  type GreenPointsTransaction,
  type MobileRechargeTransaction,
  type SubmitRechargeResult,
} from "@/lib/api/rewards";
import { RECHARGE_STATUS_LABEL, RECHARGE_STATUS_TONE } from "@/lib/rechargeStatus";
import { formatBdt } from "@/lib/utils";
import { RedeemRechargeWizard } from "./RedeemRechargeWizard";

type LoadState = "loading" | "ready" | "error";
type Mode = "overview" | "redeem";

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · ${date.toLocaleTimeString(
    undefined,
    { hour: "2-digit", minute: "2-digit" },
  )}`;
}

export function RewardsView() {
  const [loadState, setLoadState] = React.useState<LoadState>("loading");
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<Mode>("overview");

  const [balance, setBalance] = React.useState<number>(0);
  const [greenPointsTransactions, setGreenPointsTransactions] = React.useState<GreenPointsTransaction[]>([]);
  const [mobileRechargeTransactions, setMobileRechargeTransactions] = React.useState<MobileRechargeTransaction[]>([]);

  const fetchAll = React.useCallback(() => {
    setLoadState("loading");
    setLoadError(null);
    return Promise.all([getRewardsBalance(), getRewardsHistory()])
      .then(([balanceResult, historyResult]) => {
        setBalance(balanceResult.greenPointsBalance);
        setGreenPointsTransactions(historyResult.greenPointsTransactions);
        setMobileRechargeTransactions(historyResult.mobileRechargeTransactions);
        setLoadState("ready");
      })
      .catch((err: unknown) => {
        setLoadError(
          err instanceof AuthApiError
            ? "Couldn't load your Green Rewards. Try refreshing the page."
            : "Something went wrong loading your Green Rewards. Try refreshing the page.",
        );
        setLoadState("error");
      });
  }, []);

  React.useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  function handleWizardComplete(result: SubmitRechargeResult) {
    setBalance(result.greenPointsBalance);
    getRewardsHistory()
      .then((historyResult) => {
        setGreenPointsTransactions(historyResult.greenPointsTransactions);
        setMobileRechargeTransactions(historyResult.mobileRechargeTransactions);
      })
      .catch(() => {
      });
  }

  return (
    <PageContainer className="py-8 lg:py-12">
      <h1 className="text-h1 text-neutral-900">Green Rewards</h1>
      <p className="mt-2 text-body-lg text-neutral-500">
        Earn Green Points for every completed pickup, then redeem them for a mobile recharge.
      </p>

      {loadState === "loading" && (
        <Card className="mt-8 text-center">
          <p className="text-body-sm text-neutral-500">Loading your Green Rewards…</p>
        </Card>
      )}

      {loadState === "error" && <ErrorBanner className="mt-8">{loadError}</ErrorBanner>}

      {loadState === "ready" && mode === "redeem" && (
        <div className="mt-8">
          <RedeemRechargeWizard
            currentBalance={balance}
            onComplete={handleWizardComplete}
            onExit={() => setMode("overview")}
          />
        </div>
      )}

      {loadState === "ready" && mode === "overview" && (
        <div className="mt-8 flex flex-col gap-8">
          <Card className="flex flex-col items-center gap-3 py-8 text-center">
            <Icon icon={Gift} size="lg" className="text-primary-600" aria-hidden />
            <p className="text-body-sm text-neutral-500">Green Points balance</p>
            <p className="font-data text-data-xl text-neutral-900">{balance.toLocaleString()} pts</p>
            <Button onClick={() => setMode("redeem")}>Redeem — Mobile Recharge</Button>
          </Card>

          <div>
            <h2 className="text-h3 text-neutral-900">Points activity</h2>
            <p className="mt-1 text-body-sm text-neutral-500">Every Green Point you&apos;ve earned or redeemed.</p>

            {greenPointsTransactions.length === 0 ? (
              <Card className="mt-8 flex flex-col items-center gap-3 py-10 text-center">
                <Icon icon={Sparkles} size="lg" className="text-neutral-400" aria-hidden />
                <div>
                  <p className="text-h4 text-neutral-900">No activity yet</p>
                  <p className="mt-1 text-body-sm text-neutral-500">
                    Complete a pickup to start earning Green Points.
                  </p>
                </div>
              </Card>
            ) : (
              <div className="mt-8 flex flex-col gap-4">
                {greenPointsTransactions.map((transaction) => (
                  <Card key={transaction.id} className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-body-sm text-neutral-900">{transaction.description}</p>
                      <p className="mt-1 text-caption text-neutral-500">{formatDateTime(transaction.createdAt)}</p>
                    </div>
                    <span
                      className={
                        transaction.type === "EARNED"
                          ? "font-data text-data-base text-success-700"
                          : "font-data text-data-base text-neutral-900"
                      }
                    >
                      {transaction.type === "EARNED" ? "+" : "-"}
                      {transaction.points.toLocaleString()} pts
                    </span>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-h3 text-neutral-900">Recharge history</h2>
            <p className="mt-1 text-body-sm text-neutral-500">
              Every mobile recharge you&apos;ve attempted with your points.
            </p>

            {mobileRechargeTransactions.length === 0 ? (
              <Card className="mt-8 flex flex-col items-center gap-3 py-10 text-center">
                <Icon icon={ClipboardList} size="lg" className="text-neutral-400" aria-hidden />
                <div>
                  <p className="text-h4 text-neutral-900">No recharges yet</p>
                  <p className="mt-1 text-body-sm text-neutral-500">
                    Redeem your Green Points for a mobile recharge to see it here.
                  </p>
                </div>
              </Card>
            ) : (
              <div className="mt-8 flex flex-col gap-4">
                {mobileRechargeTransactions.map((recharge) => (
                  <Card key={recharge.id} className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-body-sm text-neutral-900">
                          {MOBILE_OPERATOR_LABELS[recharge.operator]} · {recharge.phoneNumber}
                        </p>
                        <p className="mt-1 text-caption text-neutral-500">{formatDateTime(recharge.createdAt)}</p>
                      </div>
                      <StatusPill tone={RECHARGE_STATUS_TONE[recharge.status]}>
                        {RECHARGE_STATUS_LABEL[recharge.status]}
                      </StatusPill>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="font-data text-data-base text-neutral-900">{formatBdt(recharge.amountTaka)}</span>
                      <span className="text-body-sm text-neutral-500">
                        {recharge.status === "FAILED"
                          ? `Would have cost ${recharge.pointsSpent.toLocaleString()} pts — no points deducted`
                          : `${recharge.pointsSpent.toLocaleString()} pts spent`}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
