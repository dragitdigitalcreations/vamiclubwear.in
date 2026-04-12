// Homepage route-level loading — shown by Next.js while page.tsx streams in
export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero skeleton */}
      <div className="relative flex min-h-[85vh] items-end bg-[#100a06] pb-16 pt-28 px-6 md:px-12">
        <div className="max-w-3xl space-y-5 w-full">
          <div className="skeleton h-3 w-32 rounded" />
          <div className="skeleton h-14 w-3/4 rounded" />
          <div className="skeleton h-14 w-1/2 rounded" />
          <div className="skeleton h-5 w-2/5 rounded mt-2" />
          <div className="flex gap-4 pt-4">
            <div className="skeleton h-12 w-36 rounded" />
            <div className="skeleton h-12 w-32 rounded" />
          </div>
        </div>
      </div>
      {/* Products grid skeleton */}
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-8">
        <div className="skeleton h-10 w-48 rounded mb-10" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
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
