import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'

export default function LessonLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <SkeletonGroup>
        <Skeleton h="h-4" w="w-32" className="mb-6" />
        <Skeleton h="h-8" w="w-56" className="mb-2" />
        <Skeleton h="h-4" w="w-40" className="mb-8" />
        <div className="space-y-4">
          <Skeleton h="h-4" className="w-full" />
          <Skeleton h="h-4" className="w-5/6" />
          <Skeleton h="h-4" className="w-4/6" />
          <Skeleton h="h-64" className="w-full rounded-lg" />
          <Skeleton h="h-4" className="w-full" />
          <Skeleton h="h-4" className="w-3/4" />
        </div>
      </SkeletonGroup>
    </div>
  )
}
