export default function ResultsLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-6" />
      <div className="h-7 w-64 bg-slate-200 dark:bg-slate-700 rounded mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700" />
        ))}
      </div>
      <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700" />
        ))}
      </div>
    </div>
  )
}
