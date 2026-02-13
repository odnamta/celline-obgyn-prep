import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'

export default function StatsLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <SkeletonGroup>
        <Skeleton h="h-8" w="w-32" className="mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
              <Skeleton h="h-8" w="w-16" className="mx-auto mb-2" />
              <Skeleton h="h-4" w="w-20" className="mx-auto" />
            </div>
          ))}
        </div>
        <Skeleton h="h-6" w="w-40" className="mb-3" />
        <Skeleton h="h-48" className="w-full rounded-lg mb-8" />
        <Skeleton h="h-6" w="w-40" className="mb-3" />
        <Skeleton h="h-32" className="w-full rounded-lg" />
      </SkeletonGroup>
    </div>
  )
}
