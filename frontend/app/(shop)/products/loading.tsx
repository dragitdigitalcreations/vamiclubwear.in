// Products listing route-level loading skeleton
export default function ProductsLoading() {
  return (
    <div className="pt-16">
      {/* Header */}
      <div className="border-b border-border px-4 sm:px-6 md:px-8 lg:px-10 py-10">
        <div className="mx-auto w-full">
          <div className="skeleton h-3 w-12 rounded mb-3" />
          <div className="skeleton h-12 w-44 rounded" />
        </div>
      </div>

      {/* Grid */}
      <div className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10 py-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 md:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <div className="skeleton aspect-[3/4] w-full rounded-[14px]" />
              <div className="mt-3 space-y-2 px-1">
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/3 rounded" />
                <div className="skeleton h-4 w-1/4 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
