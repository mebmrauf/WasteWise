"use client";

import * as React from "react";
import { Star, X, Loader2 } from "lucide-react";
import { Icon } from "@/components/Icon";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Button } from "@/components/Button";
import { ratePickup } from "@/lib/api/pickups";
import { z } from "zod";

const ratingSchema = z.object({
  score: z.number().min(1, "Please select a star rating").max(5),
  comment: z.string().max(500, "Comment is too long").optional(),
});

type RatingSubmitState = "idle" | "submitting" | "success" | "error";

interface CollectorRatingModalProps {
  pickupId: string;
  collectorName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CollectorRatingModal({ pickupId, collectorName, onClose, onSuccess }: CollectorRatingModalProps) {
  const [score, setScore] = React.useState<number>(0);
  const [hoveredScore, setHoveredScore] = React.useState<number>(0);
  const [comment, setComment] = React.useState("");
  const [submitState, setSubmitState] = React.useState<RatingSubmitState>("idle");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (score === 0) {
      setErrorMsg("Please select a star rating.");
      return;
    }

    const parsed = ratingSchema.safeParse({ score, comment });
    if (!parsed.success) {
      setErrorMsg(parsed.error.errors[0].message);
      return;
    }

    setSubmitState("submitting");
    setErrorMsg(null);

    try {
      await ratePickup(pickupId, score, comment || undefined);
      setSubmitState("success");
      onSuccess();
    } catch (err: any) {
      setSubmitState("error");
      setErrorMsg(err.message || "Failed to submit rating. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <div 
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-neutral-0 shadow-lg border border-neutral-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100/80 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 transition-colors"
          aria-label="Close"
        >
          <Icon icon={X} size="sm" />
        </button>

        {submitState === "success" ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success-50 text-success-500">
              <Icon icon={Star} className="h-8 w-8 fill-current" />
            </div>
            <h3 className="text-h3 text-neutral-900 mb-2">Thank you!</h3>
            <p className="text-body text-neutral-600 mb-8">
              Your feedback helps us keep the WasteWise community safe and reliable.
            </p>
            <Button onClick={onClose}>Close</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col p-6 sm:p-8">
            <h2 className="text-h2 text-neutral-900 mb-2">Rate your collector</h2>
            <p className="text-body text-neutral-600 mb-8">
              How was your experience with {collectorName ? <strong>{collectorName}</strong> : "the collector"}?
            </p>

            <div className="flex justify-center gap-2 mb-8" onMouseLeave={() => setHoveredScore(0)}>
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoveredScore || score) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setScore(star)}
                    onMouseEnter={() => setHoveredScore(star)}
                    className="p-2 transition-transform hover:scale-110 focus:outline-none"
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star 
                      className={`h-10 w-10 sm:h-12 sm:w-12 transition-colors ${
                        isFilled 
                          ? "fill-warning-400 text-warning-400" 
                          : "fill-neutral-100 text-neutral-300"
                      }`} 
                    />
                  </button>
                );
              })}
            </div>

            <div className="mb-8">
              <label htmlFor="comment" className="block text-body-sm font-medium text-neutral-700 mb-2">
                Leave a comment (optional)
              </label>
              <textarea
                id="comment"
                rows={3}
                className="w-full rounded-md border border-neutral-300 px-4 py-3 text-body focus:border-role-user-500 focus:outline-none focus:ring-1 focus:ring-role-user-500"
                placeholder="What did they do well? How could they improve?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                disabled={submitState === "submitting"}
              />
              <div className="mt-1 flex justify-end">
                <span className="text-xs text-neutral-400">{comment.length}/500</span>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-6">
                <ErrorBanner>{errorMsg}</ErrorBanner>
              </div>
            )}

            <Button
              type="submit"
              disabled={score === 0 || submitState === "submitting"}
              className="w-full"
            >
              {submitState === "submitting" ? (
                <>
                  <Icon icon={Loader2} className="mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Rating"
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
