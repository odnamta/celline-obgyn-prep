import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'

export default function McqStudyLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <SkeletonGroup>
        <div className="flex items-center justify-between mb-6">
          <Skeleton h="h-4" w="w-32" />
          <Skeleton h="h-4" w="w-20" />
        </div>
        <Skeleton h="h-2" className="w-full rounded-full mb-8" />
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700">
          <Skeleton h="h-6" className="w-3/4 mb-6" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} h="h-12" className="w-full rounded-lg" />
            ))}
          </div>
        </div>
      </SkeletonGroup>
    </div>
  )
}
