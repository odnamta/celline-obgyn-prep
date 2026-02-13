import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'

export default function MyLibraryLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <SkeletonGroup>
        <Skeleton h="h-8" w="w-40" className="mb-2" />
        <Skeleton h="h-4" w="w-56" className="mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <Skeleton h="h-5" className="w-3/4 mb-3" />
              <Skeleton h="h-4" className="w-1/2 mb-2" />
              <Skeleton h="h-3" className="w-1/3" />
            </div>
          ))}
        </div>
      </SkeletonGroup>
    </div>
  )
}
