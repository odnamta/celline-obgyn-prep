import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'

export default function NotificationsLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <SkeletonGroup>
        <Skeleton h="h-8" w="w-48" className="mb-6" />
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} h="h-8" w="w-20" className="rounded-full" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <Skeleton h="h-2" w="w-2" className="rounded-full" />
                <Skeleton h="h-4" className="flex-1" />
                <Skeleton h="h-3" w="w-16" />
              </div>
            </div>
          ))}
        </div>
      </SkeletonGroup>
    </div>
  )
}
