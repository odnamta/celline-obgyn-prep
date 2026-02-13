import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'

export default function CourseLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <SkeletonGroup>
        <Skeleton h="h-4" w="w-32" className="mb-6" />
        <Skeleton h="h-8" w="w-64" className="mb-2" />
        <Skeleton h="h-4" w="w-48" className="mb-8" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <Skeleton h="h-5" w="w-40" className="mb-3" />
              <div className="space-y-2 pl-4">
                <Skeleton h="h-4" className="w-3/4" />
                <Skeleton h="h-4" className="w-2/3" />
                <Skeleton h="h-4" className="w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </SkeletonGroup>
    </div>
  )
}
