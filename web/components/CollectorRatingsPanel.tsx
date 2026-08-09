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
    <Card className="glass-panel p-6 flex flex-col h-[400px] border-0 shadow-lg rounded-2xl md:col-span-2 lg:col-span-1">
      <div className="flex flex-col h-full">
        {/* Header Summary */}
        <div className="flex items-center gap-4 pb-6 border-b border-neutral-200/50 shrink-0">
          <div className="flex flex-col items-center justify-center p-4 bg-primary-50 rounded-2xl">
            <span className="text-4xl font-heading font-bold text-primary-700">
              {averageRating ? averageRating.toFixed(1) : "0.0"}
            </span>
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Icon
                  key={star}
                  icon={Star}
                  className={`h-3 w-3 ${
                    star <= Math.round(averageRating || 0)
                      ? "fill-primary-500 text-primary-500"
                      : "fill-primary-200 text-primary-200"
                  }`}
                />
              ))}
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-primary-600 mt-2">
              {totalRatings} {totalRatings === 1 ? "Rating" : "Ratings"}
            </span>
          </div>
          <div className="flex-1">
            <h3 className="text-h4 font-heading text-neutral-900 mb-1">Reputation</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Your overall score. Higher ratings help you win more bids!
            </p>
          </div>
        </div>

        {/* Reviews List */}
        <div className="flex flex-col flex-1 pt-6 overflow-hidden">
          <h4 className="text-body-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2 shrink-0">
            <Icon icon={MessageSquare} className="h-4 w-4 text-primary-500" />
            Recent Feedback
          </h4>
          
          {isLoading ? (
            <p className="text-body-sm text-neutral-500">Loading reviews...</p>
          ) : ratings.length > 0 ? (
            <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar pb-2">
              {ratings.map((rating) => (
                <div key={rating.id} className="bg-white/50 rounded-xl p-4 border border-white/40 shadow-sm shrink-0 transition-transform hover:-translate-y-0.5">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Icon
                          key={star}
                          icon={Star}
                          className={`h-3 w-3 ${
                            star <= rating.score
                              ? "fill-primary-400 text-primary-400"
                              : "fill-neutral-200 text-neutral-200"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-neutral-400 font-medium">
                      {format(new Date(rating.createdAt), "MMM d")}
                    </span>
                  </div>
                  {rating.comment ? (
                    <p className="text-sm text-neutral-700 italic leading-relaxed">"{rating.comment}"</p>
                  ) : (
                    <p className="text-sm text-neutral-400 italic">No comment provided.</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center pb-4 opacity-70">
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mb-3">
                <Icon icon={Star} className="h-6 w-6 text-primary-500" />
              </div>
              <p className="text-sm font-medium text-neutral-900">No reviews yet</p>
              <p className="text-xs text-neutral-500 mt-1">Complete pickups to earn feedback.</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
