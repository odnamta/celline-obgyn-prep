export default function AnalyticsLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-6" />
      <div className="h-7 w-56 bg-slate-200 dark:bg-slate-700 rounded mb-6" />
      <div className="h-48 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 mb-8" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700" />
        ))}
      </div>
      <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700" />
        ))}
      </div>
    </div>
  )
}
