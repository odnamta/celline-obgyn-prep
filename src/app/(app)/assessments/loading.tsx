export default function AssessmentsLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-7 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          <div className="h-9 w-20 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        </div>
      </div>
      <div className="h-10 w-full bg-slate-200 dark:bg-slate-700 rounded-lg mb-4" />
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700" />
        ))}
      </div>
    </div>
  )
}
