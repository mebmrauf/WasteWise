"use client";

import * as React from "react";
import { ClipboardList, Gift, Sparkles, ArrowDownRight, ArrowUpRight, Smartphone } from "lucide-react";
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
import { formatBdt, cn } from "@/lib/utils";
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

      {loadState === "ready" && (
        <div className="mt-8 flex flex-col gap-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 to-primary-900 p-8 shadow-xl text-center animate-slide-up">
            <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
            <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
            
            <div className="relative z-10 flex flex-col items-center gap-4">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-md shadow-inner">
                <Icon icon={Gift} size="xl" className="text-white" aria-hidden />
              </div>
              <div>
                <p className="text-body-sm text-primary-100 uppercase tracking-widest font-semibold mb-2">Available Balance</p>
                <div className="flex items-baseline justify-center gap-2">
                  <p className="font-data text-display text-white">{balance.toLocaleString()}</p>
                  <p className="font-data text-data-lg text-primary-200">pts</p>
                </div>
              </div>
              {mode === "overview" ? (
                <Button onClick={() => setMode("redeem")} variant="secondary" className="mt-4 px-8 py-6 rounded-full shadow-lg hover:scale-105 transition-transform bg-white text-primary-800 hover:bg-neutral-50 border-0">
                  Redeem Mobile Recharge
                </Button>
              ) : (
                <Button onClick={() => setMode("overview")} variant="ghost" className="mt-4 text-white hover:bg-white/10 hover:text-white rounded-full">
                  Cancel Redemption
                </Button>
              )}
            </div>
          </div>

          {mode === "redeem" && (
            <div className="animate-slide-up">
              <RedeemRechargeWizard
                currentBalance={balance}
                onComplete={handleWizardComplete}
                onExit={() => setMode("overview")}
              />
            </div>
          )}

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
              <div className="mt-6 flex flex-col gap-3">
                {greenPointsTransactions.map((transaction) => (
                  <Card key={transaction.id} className="flex flex-col gap-4 p-5 rounded-2xl hover:shadow-md transition-all border-neutral-100 bg-white/60 backdrop-blur-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "flex items-center justify-center h-10 w-10 rounded-full",
                          transaction.type === "EARNED" ? "bg-success-100 text-success-600" : "bg-neutral-100 text-neutral-600"
                        )}>
                          <Icon icon={transaction.type === "EARNED" ? ArrowDownRight : ArrowUpRight} size="sm" />
                        </div>
                        <div>
                          <p className="text-body font-medium text-neutral-900">{transaction.description}</p>
                          <p className="mt-0.5 text-caption text-neutral-500">{formatDateTime(transaction.createdAt)}</p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "font-data text-data-lg",
                          transaction.type === "EARNED" ? "text-success-700" : "text-neutral-900"
                        )}
                      >
                        {transaction.type === "EARNED" ? "+" : "-"}
                        {transaction.points.toLocaleString()} pts
                      </span>
                    </div>

                    {transaction.type === "EARNED" && transaction.rewardReason && (
                      <div className="mt-2 pl-14 flex flex-col gap-3 border-t border-neutral-100 pt-3">
                        {transaction.rewardReason.materials.length > 0 && (
                          <div>
                            <p className="text-caption font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Materials</p>
                            <div className="flex flex-col gap-1">
                              {transaction.rewardReason.materials.map((mat, i) => (
                                <div key={i} className="flex justify-between items-center text-body-sm text-neutral-700">
                                  <span>{mat.category} <span className="text-neutral-400">({mat.weight} kg)</span></span>
                                  <span className="font-medium">+{mat.points} pts</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {transaction.rewardReason.bonuses.length > 0 && (
                          <div>
                            <p className="text-caption font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Bonuses</p>
                            <div className="flex flex-col gap-1">
                              {transaction.rewardReason.bonuses.map((bonus, i) => (
                                <div key={i} className="flex justify-between items-center text-body-sm text-neutral-700">
                                  <span>{bonus.name}</span>
                                  <span className="font-medium text-success-600">+{bonus.points} pts</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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
              <div className="mt-6 flex flex-col gap-3">
                {mobileRechargeTransactions.map((recharge) => (
                  <Card key={recharge.id} className="flex flex-col gap-4 p-5 rounded-2xl hover:shadow-md transition-all border-neutral-100 bg-white/60 backdrop-blur-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 pb-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary-100 text-primary-600">
                          <Icon icon={Smartphone} size="sm" />
                        </div>
                        <div>
                          <p className="text-body font-medium text-neutral-900">
                            {MOBILE_OPERATOR_LABELS[recharge.operator]} Recharge
                          </p>
                          <p className="mt-0.5 text-caption text-neutral-500">{recharge.phoneNumber} · {formatDateTime(recharge.createdAt)}</p>
                        </div>
                      </div>
                      <StatusPill tone={RECHARGE_STATUS_TONE[recharge.status]}>
                        {RECHARGE_STATUS_LABEL[recharge.status]}
                      </StatusPill>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-body-sm text-neutral-500">Amount:</span>
                        <span className="font-data text-data-lg text-neutral-900">{formatBdt(recharge.amountTaka)}</span>
                      </div>
                      <span className={cn(
                        "text-body-sm font-medium",
                        recharge.status === "FAILED" ? "text-neutral-500 line-through" : "text-neutral-700"
                      )}>
                        {recharge.pointsSpent.toLocaleString()} pts spent
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
