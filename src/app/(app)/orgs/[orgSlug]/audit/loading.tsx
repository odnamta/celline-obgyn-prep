import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'

export default function AuditLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <SkeletonGroup>
        <Skeleton h="h-4" w="w-32" className="mb-6" />
        <Skeleton h="h-8" w="w-32" className="mb-2" />
        <Skeleton h="h-4" w="w-48" className="mb-6" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <Skeleton h="h-4" w="w-4" />
              <div className="flex-1">
                <Skeleton h="h-4" className="w-3/4 mb-1" />
                <Skeleton h="h-3" w="w-32" />
              </div>
              <Skeleton h="h-3" w="w-20" />
            </div>
          ))}
        </div>
      </SkeletonGroup>
    </div>
  )
}
