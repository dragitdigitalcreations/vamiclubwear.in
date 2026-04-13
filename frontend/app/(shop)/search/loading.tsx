export default function SearchLoading() {
  return (
    <div className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10 pt-32 pb-24">
      <div className="mb-10">
        <div className="skeleton h-9 w-24 rounded mb-6" />
        <div className="skeleton h-12 w-full max-w-xl rounded" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 md:gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <div className="skeleton aspect-[4/7] w-full rounded-[4px]" />
            <div className="mt-3 space-y-2">
              <div className="skeleton h-4 w-3/4 rounded" />
              <div className="skeleton h-3 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
