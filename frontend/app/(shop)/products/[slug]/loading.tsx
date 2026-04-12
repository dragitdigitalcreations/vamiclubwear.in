// Product detail route-level loading skeleton — preserves exact layout
export default function ProductDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-28 pb-16 md:px-8">
      {/* Breadcrumb */}
      <div className="mb-8 flex items-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="skeleton h-3 w-14 rounded" />
            {i < 3 && <span className="text-border">/</span>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Gallery skeleton */}
        <div className="flex flex-col gap-4 md:flex-row-reverse">
          <div className="skeleton aspect-[3/4] flex-1 rounded-lg" />
          <div className="flex gap-2 md:flex-col md:w-20">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton flex-shrink-0 h-20 w-16 rounded md:h-24 md:w-full" />
            ))}
          </div>
        </div>

        {/* Info skeleton */}
        <div className="space-y-6 pt-4">
          <div className="skeleton h-3 w-24 rounded" />
          <div className="skeleton h-10 w-4/5 rounded" />
          <div className="skeleton h-8 w-1/3 rounded" />
          <div className="space-y-2 border-t border-border pt-6">
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-5/6 rounded" />
            <div className="skeleton h-3 w-4/6 rounded" />
          </div>
          {/* Color swatches */}
          <div className="border-t border-border pt-8 space-y-4">
            <div className="skeleton h-3 w-16 rounded" />
            <div className="flex gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-7 w-7 rounded-full" />
              ))}
            </div>
          </div>
          {/* Size selector */}
          <div className="space-y-3">
            <div className="skeleton h-3 w-10 rounded" />
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-9 w-12 rounded" />
              ))}
            </div>
          </div>
          {/* Add to cart */}
          <div className="skeleton h-14 w-full rounded" />
        </div>
      </div>
    </div>
  )
}
