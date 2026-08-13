import * as React from "react";
import { X, CheckCircle2, Star, Loader2 } from "lucide-react";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { confirmBulkCollection, rateBulkCollection, type BulkMarketplaceRequest } from "@/lib/api/marketplace";
import { z } from "zod";

const ratingSchema = z.object({
  score: z.number().min(1).max(5),
  comment: z.string().max(500).optional(),
});

interface Props {
  request: BulkMarketplaceRequest;
  onClose: () => void;
  onSuccess: () => void;
}

export function BusinessConfirmationModal({ request, onClose, onSuccess }: Props) {
  const [step, setStep] = React.useState<"confirm" | "rate" | "done">(request.status === "COMPLETED" && !request.rating ? "rate" : "confirm");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Rating state
  const [score, setScore] = React.useState(0);
  const [hoveredScore, setHoveredScore] = React.useState(0);
  const [comment, setComment] = React.useState("");

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await confirmBulkCollection(request.id);
      setStep("rate");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to confirm collection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRate = async () => {
    if (score === 0) {
      setErrorMsg("Please select a rating.");
      return;
    }
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await rateBulkCollection(request.id, score, comment || undefined);
      setStep("done");
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit rating.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl border border-neutral-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100/80 text-neutral-500 hover:bg-neutral-200 transition-colors"
        >
          <Icon icon={X} size="sm" />
        </button>

        {step === "confirm" && (
          <div className="p-6 sm:p-8">
            <h2 className="text-h3 text-neutral-900 mb-2">Review Collection</h2>
            <p className="text-body text-neutral-600 mb-6">
              Review the verified weights and photos before confirming the collection.
            </p>

            {errorMsg && <ErrorBanner className="mb-6">{errorMsg}</ErrorBanner>}

            <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-100 mb-6">
              <h3 className="font-semibold text-neutral-900 mb-3">Verified Weights</h3>
              <div className="flex flex-col gap-2">
                {request.verifiedWeights ? (
                  Object.entries(request.verifiedWeights).map(([cat, weight]) => (
                    <div key={cat} className="flex justify-between items-center text-body-sm">
                      <span className="capitalize text-neutral-600">{cat.toLowerCase()}</span>
                      <span className="font-medium text-neutral-900">{weight} kg</span>
                    </div>
                  ))
                ) : (
                  <p className="text-body-sm text-neutral-500">No verified weights provided.</p>
                )}
                <div className="mt-2 pt-2 border-t border-neutral-200 flex justify-between items-center text-body font-bold">
                  <span>Total</span>
                  <span>{request.verifiedTotalWeightKg || 0} kg</span>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="font-semibold text-neutral-900 mb-3">Collection Photos</h3>
              {request.collectionPhotos && request.collectionPhotos.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {request.collectionPhotos.map((photo, idx) => (
                    <img key={idx} src={photo} alt="Collection Proof" className="rounded-lg object-cover w-full h-32 border border-neutral-200" />
                  ))}
                </div>
              ) : (
                <p className="text-body-sm text-neutral-500">No photos were uploaded.</p>
              )}
            </div>

            <div className="flex gap-4">
              <Button onClick={onClose} variant="secondary" className="flex-1" disabled={isSubmitting}>
                Report Issue
              </Button>
              <Button onClick={handleConfirm} className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Collection"}
              </Button>
            </div>
          </div>
        )}

        {step === "rate" && (
          <div className="p-6 sm:p-8">
            <h2 className="text-h3 text-neutral-900 mb-2">Rate Recycling Company</h2>
            <p className="text-body text-neutral-600 mb-6">
              How was your experience with {request.assignedCompany?.fullName}?
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
                  >
                    <Star 
                      className={`h-10 w-10 sm:h-12 sm:w-12 transition-colors ${
                        isFilled ? "fill-warning-500 text-warning-500" : "fill-transparent text-neutral-300"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <div className="mb-6">
              <label className="block text-body-sm font-medium text-neutral-700 mb-2">
                Leave a comment (optional)
              </label>
              <textarea
                rows={3}
                className="w-full rounded-md border border-neutral-300 px-4 py-3 text-body"
                placeholder="Share your experience..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {errorMsg && <ErrorBanner className="mb-6">{errorMsg}</ErrorBanner>}

            <Button onClick={handleRate} className="w-full" disabled={score === 0 || isSubmitting}>
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Submit Rating"}
            </Button>
            
            <button 
              onClick={() => {
                setStep("done");
                onSuccess();
              }} 
              className="w-full mt-4 text-body-sm text-neutral-500 hover:text-neutral-700"
            >
              Skip for now
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-h3 text-neutral-900 mb-2">Collection Completed!</h3>
            <p className="text-body text-neutral-600 mb-8">
              Green Points have been awarded to your account.
            </p>
            <Button onClick={onClose}>Close</Button>
          </div>
        )}
      </div>
    </div>
  );
}
