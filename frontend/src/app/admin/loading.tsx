export default function AdminLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse" aria-label="Loading page">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gray-200 dark:bg-gray-800" />
        <div className="space-y-2 flex-1">
          <div className="h-7 bg-gray-200 dark:bg-gray-800 rounded-lg w-48" />
          <div className="h-4 bg-gray-100 dark:bg-gray-900 rounded w-72" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-gray-200 dark:bg-gray-800" />
        ))}
      </div>
      <div className="h-14 rounded-2xl bg-gray-200 dark:bg-gray-800" />
      <div className="h-72 rounded-2xl bg-gray-200 dark:bg-gray-800" />
    </div>
  )
}
