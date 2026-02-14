import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'

export default function CandidateDetailLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <SkeletonGroup>
        <Skeleton h="h-4" w="w-16" className="mb-6" />
        <div className="flex items-center gap-4 mb-8">
          <Skeleton h="h-16" w="w-16" className="rounded-full" />
          <div>
            <Skeleton h="h-6" w="w-40" className="mb-2" />
            <Skeleton h="h-4" w="w-56" />
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <Skeleton h="h-5" w="w-48" className="mb-2" />
              <div className="flex gap-4">
                <Skeleton h="h-4" w="w-20" />
                <Skeleton h="h-4" w="w-20" />
                <Skeleton h="h-4" w="w-24" />
              </div>
            </div>
          ))}
        </div>
      </SkeletonGroup>
    </div>
  )
}
