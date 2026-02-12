export default function QuestionsLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div>
          <div className="h-7 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-1" />
          <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
      <div className="flex gap-3 mb-4">
        <div className="h-10 flex-1 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="h-10 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="h-10 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg" />
      </div>
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700" />
        ))}
      </div>
    </div>
  )
}
