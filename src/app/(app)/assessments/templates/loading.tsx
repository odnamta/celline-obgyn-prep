import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'

export default function TemplatesLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <SkeletonGroup>
        <Skeleton h="h-8" w="w-56" className="mb-2" />
        <Skeleton h="h-4" w="w-40" className="mb-8" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <Skeleton h="h-5" w="w-48" className="mb-2" />
              <Skeleton h="h-3" w="w-32" className="mb-3" />
              <div className="flex gap-3">
                <Skeleton h="h-3" w="w-16" />
                <Skeleton h="h-3" w="w-16" />
                <Skeleton h="h-3" w="w-20" />
              </div>
            </div>
          ))}
        </div>
      </SkeletonGroup>
    </div>
  )
}
