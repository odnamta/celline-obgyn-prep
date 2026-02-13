import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'

export default function MembersLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <SkeletonGroup>
        <Skeleton h="h-4" w="w-32" className="mb-6" />
        <Skeleton h="h-8" w="w-48" className="mb-2" />
        <Skeleton h="h-4" w="w-64" className="mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <Skeleton h="h-10" w="w-10" circle />
              <div className="flex-1">
                <Skeleton h="h-4" w="w-40" className="mb-1" />
                <Skeleton h="h-3" w="w-56" />
              </div>
              <Skeleton h="h-6" w="w-16" />
            </div>
          ))}
        </div>
      </SkeletonGroup>
    </div>
  )
}
