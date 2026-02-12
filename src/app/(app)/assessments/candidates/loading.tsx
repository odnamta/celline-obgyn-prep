export default function CandidatesLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-6" />
      <div className="h-7 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-1" />
      <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded mb-6" />
      <div className="h-10 w-full bg-slate-200 dark:bg-slate-700 rounded-lg mb-4" />
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700" />
        ))}
      </div>
    </div>
  )
}
