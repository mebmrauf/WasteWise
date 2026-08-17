export function PaymentHistorySkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      {/* Stats Skeletons */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white border border-neutral-100 rounded-2xl p-5 h-24">
            <div className="w-16 h-4 bg-neutral-200 rounded mb-4"></div>
            <div className="w-12 h-6 bg-neutral-200 rounded"></div>
          </div>
        ))}
      </div>

      {/* Filter Skeleton */}
      <div className="bg-white border border-neutral-100 rounded-2xl p-4 h-16 w-full"></div>

      {/* Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white border border-neutral-100 rounded-3xl p-6 h-64">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="w-24 h-3 bg-neutral-200 rounded mb-2"></div>
                <div className="w-32 h-8 bg-neutral-200 rounded"></div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="w-20 h-5 bg-neutral-200 rounded-full"></div>
                <div className="w-20 h-5 bg-neutral-200 rounded-full"></div>
              </div>
            </div>
            <div className="w-full h-10 bg-neutral-100 rounded-xl mb-4"></div>
            <div className="w-full h-4 bg-neutral-100 rounded mb-2"></div>
            <div className="w-3/4 h-4 bg-neutral-100 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
