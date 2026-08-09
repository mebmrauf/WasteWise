"use client";

import * as React from "react";
import { Star, MessageSquare } from "lucide-react";
import { Card } from "@/components/Card";
import { Icon } from "@/components/Icon";
import { getMyRatings, type CollectorRating } from "@/lib/api/users";
import { format } from "date-fns";

export function CollectorRatingsPanel({
  averageRating,
  totalRatings,
}: {
  averageRating: number | null;
  totalRatings: number;
}) {
  const [ratings, setRatings] = React.useState<CollectorRating[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    getMyRatings()
      .then((res) => {
        if (!cancelled) setRatings(res.ratings);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (totalRatings === 0 && !isLoading) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center text-center py-8">
          <Icon icon={Star} size="lg" className="text-neutral-300 mb-4" />
          <h3 className="text-h3 text-neutral-900 mb-2">No Ratings Yet</h3>
          <p className="text-body text-neutral-500">
            Complete pickups to start earning ratings from users!
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-6">
        {/* Header Summary */}
        <div className="flex items-center gap-6 pb-6 border-b border-neutral-200">
          <div className="flex flex-col items-center">
            <span className="text-4xl font-bold text-neutral-900">
              {averageRating ? averageRating.toFixed(1) : "0.0"}
            </span>
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Icon
                  key={star}
                  icon={Star}
                  className={`h-4 w-4 ${
                    star <= Math.round(averageRating || 0)
                      ? "fill-warning-400 text-warning-400"
                      : "fill-neutral-200 text-neutral-200"
                  }`}
                />
              ))}
            </div>
            <span className="text-caption text-neutral-500 mt-1">
              {totalRatings} {totalRatings === 1 ? "rating" : "ratings"}
            </span>
          </div>
          <div>
            <h3 className="text-h3 text-neutral-900 mb-1">Your Reputation</h3>
            <p className="text-body-sm text-neutral-600">
              This score is visible to users when you bid on their pickups. Keep up the good work to win more bids!
            </p>
          </div>
        </div>

        {/* Reviews List */}
        <div>
          <h4 className="text-body font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <Icon icon={MessageSquare} size="sm" />
            Recent Feedback
          </h4>
          
          {isLoading ? (
            <p className="text-body-sm text-neutral-500">Loading reviews...</p>
          ) : ratings.length > 0 ? (
            <div className="flex flex-col gap-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
              {ratings.map((rating) => (
                <div key={rating.id} className="bg-neutral-50 rounded-lg p-4 border border-neutral-100">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Icon
                          key={star}
                          icon={Star}
                          className={`h-4 w-4 ${
                            star <= rating.score
                              ? "fill-warning-400 text-warning-400"
                              : "fill-neutral-200 text-neutral-200"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-neutral-400">
                      {format(new Date(rating.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                  {rating.comment ? (
                    <p className="text-body-sm text-neutral-700 italic">"{rating.comment}"</p>
                  ) : (
                    <p className="text-body-sm text-neutral-400 italic">No comment provided.</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body-sm text-neutral-500">No written feedback yet.</p>
          )}
        </div>
      </div>
    </Card>
  );
}
