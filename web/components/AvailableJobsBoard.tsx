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
      <div className="mb-6">
        <h2 className="text-h2 text-neutral-900">Available Jobs</h2>
        <p className="mt-1 text-body text-neutral-500">Pickups requested in your service area.</p>
      </div>

      {loadState === "loading" && (
        <Card className="mt-8 text-center">
          <p className="text-body-sm text-neutral-500">Loading open pickup requests…</p>
        </Card>
      )}

      {loadState === "error" && <ErrorBanner className="mt-8">{loadError}</ErrorBanner>}

      {loadState === "unverified" && (
        <Card className="mt-8 flex flex-col items-center gap-3 py-10 text-center">
          <Icon icon={ShieldAlert} size="lg" className="text-warning-500" aria-hidden />
          <div>
            <p className="text-h4 text-neutral-900">Verification pending</p>
            <p className="mt-1 max-w-md text-body-sm text-neutral-500">
              Your collector account needs to be verified by an admin before you can browse open
              pickup requests. Check back once your profile has been approved.
            </p>
          </div>
          <Button variant="secondary" onClick={() => void fetchJobs()}>
            Check again
          </Button>
        </Card>
      )}

      {loadState === "ready" && jobs.length === 0 && (
        <Card className="mt-8 flex flex-col items-center gap-3 py-10 text-center">
          <Icon icon={ClipboardX} size="lg" className="text-neutral-400" aria-hidden />
          <div>
            <p className="text-h4 text-neutral-900">No open pickup requests right now</p>
            <p className="mt-1 text-body-sm text-neutral-500">
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
                  onSelect={(id) => setExpandedJobId(isExpanded ? null : id)}
                />

                {isExpanded && (
                  <Card className="flex flex-col gap-4">
                    {alreadySubmitted ? (
                      <p className="text-body-sm text-neutral-600">
                        You&apos;ve already submitted an offer on this pickup — the requester will be
                        notified if they accept it.
                      </p>
                    ) : (
                      <>
                        <h2 className="text-h4 text-neutral-900">Place a bid</h2>
                        {bidErrors[job.id] && <ErrorBanner>{bidErrors[job.id]}</ErrorBanner>}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          {job.items.map((item) => (
                            <Input
                              key={item.category}
                              label={`${item.category} Bid per KG (BDT)`}
                              type="number"
                              inputMode="numeric"
                              min={0}
                              step="1"
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
                          <Input
                            label="Message (optional)"
                            placeholder="e.g. Can pick up at 3pm"
                            maxLength={500}
                            value={messageByJob[job.id] ?? ""}
                            onChange={(event) =>
                              setMessageByJob((prev) => ({ ...prev, [job.id]: event.target.value }))
                            }
                          />
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
