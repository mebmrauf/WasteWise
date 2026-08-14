"use client";

import * as React from "react";
import { ClipboardX, ShieldAlert } from "lucide-react";
import { AvailableJobListItem } from "@/components/AvailableJobListItem";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Icon } from "@/components/Icon";
import { Input } from "@/components/Input";

import { AuthApiError } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/AuthContext";
import { submitOffer } from "@/lib/api/offers";
import {
  listOpenPickups,
  LOAD_SIZE_KG_RANGES,
  LOAD_SIZE_LABELS,
  formatKgRange,
  type LoadSize,
  type PickupRequestSummary,
} from "@/lib/api/pickups";

function estimateJobWeightRangeLabel(items: { loadSize: LoadSize }[]): string {
  const totals = items.reduce(
    (sum, item) => {
      const range = LOAD_SIZE_KG_RANGES[item.loadSize];
      return { minKg: sum.minKg + range.minKg, maxKg: sum.maxKg + range.maxKg };
    },
    { minKg: 0, maxKg: 0 },
  );
  return `${totals.minKg}-${totals.maxKg} Kg`;
}

const bidErrorMessages: Record<string, string> = {
  COLLECTOR_NOT_VERIFIED: "Your collector account must be verified before you can submit an offer.",
  FORBIDDEN: "This pickup request was sent exclusively to another collector.",
  PICKUP_NOT_OPEN:
    "This pickup is no longer open — it may already have been assigned. The list below has been refreshed.",
  OFFER_ALREADY_EXISTS: "You've already submitted an offer on this pickup.",
  NOT_FOUND: "This pickup no longer exists. The list below has been refreshed.",
  VALIDATION_ERROR: "Enter a valid bid amount (and keep any message under 500 characters).",
};

function resolveBidErrorMessage(err: unknown): string {
  if (err instanceof AuthApiError) {
    return bidErrorMessages[err.code] ?? "Couldn't submit your offer. Try again.";
  }
  return "Couldn't submit your offer. Try again.";
}

type LoadState = "loading" | "ready" | "error" | "unverified";

export function AvailableJobsBoard() {
  const { user } = useAuth();
  const [loadState, setLoadState] = React.useState<LoadState>("loading");
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [jobs, setJobs] = React.useState<PickupRequestSummary[]>([]);

  const [expandedJobId, setExpandedJobId] = React.useState<string | null>(null);
  const [bidAmountsByJob, setBidAmountsByJob] = React.useState<Record<string, Record<string, string>>>({});
  const [messageByJob, setMessageByJob] = React.useState<Record<string, string>>({});
  const [submittingJobId, setSubmittingJobId] = React.useState<string | null>(null);
  const [bidErrors, setBidErrors] = React.useState<Record<string, string>>({});
  const [submittedJobIds, setSubmittedJobIds] = React.useState<Set<string>>(new Set());

  const fetchJobs = React.useCallback(() => {
    setLoadState("loading");
    setLoadError(null);
    return listOpenPickups()
      .then(({ pickups }) => {
        setJobs(pickups);
        setLoadState("ready");
      })
      .catch((err: unknown) => {
        if (err instanceof AuthApiError && err.code === "COLLECTOR_NOT_VERIFIED") {
          setLoadState("unverified");
          return;
        }
        setLoadError(
          err instanceof AuthApiError
            ? "Couldn't load open pickup requests. Try refreshing the page."
            : "Something went wrong loading open pickup requests. Try refreshing the page.",
        );
        setLoadState("error");
      });
  }, []);

  React.useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  async function handleSubmitBid(pickupId: string) {
    const job = jobs.find((j) => j.id === pickupId);
    if (!job) return;

    const bids = bidAmountsByJob[pickupId] || {};
    const bidAmountsPerKg: Record<string, number> = {};
    let totalEstimatedBid = 0;

    for (const item of job.items) {
      const raw = bids[item.category] ?? "";
      const num = Number(raw);
      if (!raw.trim() || !Number.isFinite(num) || num <= 0 || !Number.isInteger(num)) {
        setBidErrors((prev) => ({ ...prev, [pickupId]: `Enter a valid whole number for ${item.category} bid.` }));
        return;
      }
      bidAmountsPerKg[item.category] = num;
      const range = LOAD_SIZE_KG_RANGES[item.loadSize];
      totalEstimatedBid += num * range.maxKg;
    }

    setBidErrors((prev) => {
      const next = { ...prev };
      delete next[pickupId];
      return next;
    });
    setSubmittingJobId(pickupId);
    try {
      const trimmedMessage = (messageByJob[pickupId] ?? "").trim();
      await submitOffer({
        pickupRequestId: pickupId,
        bidAmount: totalEstimatedBid,
        bidAmountsPerKg,
        message: trimmedMessage || undefined,
      });
      setSubmittingJobId(null);
      setSubmittedJobIds((prev) => new Set(prev).add(pickupId));
      setExpandedJobId(null);
    } catch (err) {
      setSubmittingJobId(null);
      setBidErrors((prev) => ({ ...prev, [pickupId]: resolveBidErrorMessage(err) }));
      if (err instanceof AuthApiError && err.code === "OFFER_ALREADY_EXISTS") {
        setSubmittedJobIds((prev) => new Set(prev).add(pickupId));
      }
      if (err instanceof AuthApiError && (err.code === "PICKUP_NOT_OPEN" || err.code === "NOT_FOUND")) {
        void fetchJobs();
      }
    }
  }

  return (
    <div className="w-full">
      {loadState === "loading" && (
        <Card className="glass-panel border-0 shadow-sm mt-8 text-center p-8">
          <p className="text-body-sm text-neutral-500">Loading open pickup requests…</p>
        </Card>
      )}

      {loadState === "error" && <ErrorBanner className="mt-8">{loadError}</ErrorBanner>}

      {loadState === "unverified" && (
        <Card className="glass-panel mt-8 flex flex-col items-center gap-4 py-16 text-center shadow-lg border-0 rounded-2xl">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-warning-100 text-warning-500">
            <Icon icon={ShieldAlert} size="lg" aria-hidden />
          </div>
          <div>
            <p className="font-heading text-h3 text-neutral-900">Verification pending</p>
            <p className="mt-2 text-body-lg text-neutral-500 max-w-sm mx-auto">
              Your collector account needs to be verified by an admin before you can browse open
              pickup requests. Check back once your profile has been approved.
            </p>
          </div>
          <Button variant="secondary" onClick={() => void fetchJobs()} className="mt-4 px-8">
            Check again
          </Button>
        </Card>
      )}

      {loadState === "ready" && jobs.length === 0 && (
        <Card className="glass-panel mt-8 flex flex-col items-center gap-4 py-16 text-center shadow-lg border-0 rounded-2xl">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-primary-500">
            <Icon icon={ClipboardX} size="lg" aria-hidden />
          </div>
          <div>
            <p className="font-heading text-h3 text-neutral-900">No open pickup requests</p>
            <p className="mt-2 text-body-lg text-neutral-500 max-w-sm mx-auto">
              New requests appear here as households post them — check back soon.
            </p>
          </div>
        </Card>
      )}

      {loadState === "ready" && jobs.length > 0 && (
        <div className="mt-8 flex flex-col gap-4">
          {jobs.map((job) => {
            const alreadySubmitted = submittedJobIds.has(job.id);
            const isExpanded = expandedJobId === job.id;
            const isSubmitting = submittingJobId === job.id;

            return (
              <div key={job.id} className="flex flex-col gap-3">
                <AvailableJobListItem
                  pickup={{
                    id: job.id,
                    pickupFormattedAddress: job.pickupFormattedAddress,
                    timeSlotStart: job.timeSlotStart,
                    timeSlotEnd: job.timeSlotEnd,
                    items: job.items.map((item) => ({
                      id: item.id,
                      category: item.category,
                      quantityLabel: `${LOAD_SIZE_LABELS[item.loadSize]} (${formatKgRange(item.loadSize)})`,
                    })),
                  }}
                  estimatedWeightRangeLabel={estimateJobWeightRangeLabel(job.items)}
                  isDirectRequest={Boolean(user) && job.preferredCollectorId === user!.id}
                  onSelect={(id) => setExpandedJobId(isExpanded ? null : id)}
                />

                {isExpanded && (
                  <Card className="glass-panel border-0 shadow-sm flex flex-col gap-4 rounded-xl p-6 bg-white/40 mt-[-8px]">
                    {alreadySubmitted ? (
                      <p className="text-body-sm text-neutral-600">
                        You&apos;ve already submitted an offer on this pickup — the requester will be
                        notified if they accept it.
                      </p>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 border-b border-neutral-100 pb-4 mb-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                            <Icon icon={ShieldAlert} size="sm" />
                          </div>
                          <div>
                            <h2 className="text-h4 text-neutral-900 leading-tight">Place your bid</h2>
                            <p className="text-body-sm text-neutral-500">Offer your best price per KG.</p>
                          </div>
                        </div>
                        
                        {bidErrors[job.id] && <ErrorBanner className="mb-4">{bidErrors[job.id]}</ErrorBanner>}
                        
                        <div className="bg-neutral-50/50 border border-neutral-100 p-5 rounded-2xl flex flex-col gap-5">
                          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            {job.items.map((item) => (
                              <Input
                                key={item.category}
                                label={`${item.category} Bid (BDT/KG)`}
                                type="number"
                                inputMode="numeric"
                                min={0}
                                step="1"
                                placeholder="e.g. 15"
                                className="bg-white"
                                value={bidAmountsByJob[job.id]?.[item.category] ?? ""}
                                onChange={(event) =>
                                  setBidAmountsByJob((prev) => ({
                                    ...prev,
                                    [job.id]: {
                                      ...(prev[job.id] || {}),
                                      [item.category]: event.target.value,
                                    },
                                  }))
                                }
                              />
                            ))}
                          </div>
                          <div className="pt-2">
                            <Input
                              label="Message (optional)"
                              placeholder="e.g. I can pick up right now at 3pm"
                              maxLength={500}
                              className="bg-white"
                              value={messageByJob[job.id] ?? ""}
                              onChange={(event) =>
                                setMessageByJob((prev) => ({ ...prev, [job.id]: event.target.value }))
                              }
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-3">
                          <Button variant="ghost" size="sm" onClick={() => setExpandedJobId(null)}>
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            disabled={isSubmitting}
                            onClick={() => void handleSubmitBid(job.id)}
                          >
                            {isSubmitting ? "Submitting…" : "Submit bid"}
                          </Button>
                        </div>
                      </>
                    )}
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
