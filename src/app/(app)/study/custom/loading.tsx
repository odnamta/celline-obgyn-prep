import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'

export default function CustomStudyLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <SkeletonGroup>
        <Skeleton h="h-4" w="w-32" className="mb-6" />
        <Skeleton h="h-8" w="w-48" className="mb-2" />
        <Skeleton h="h-4" w="w-64" className="mb-6" />
        <div className="space-y-4">
          <Skeleton h="h-10" className="w-full rounded-lg" />
          <Skeleton h="h-10" className="w-full rounded-lg" />
          <Skeleton h="h-10" className="w-full rounded-lg" />
          <Skeleton h="h-12" w="w-40" className="rounded-lg" />
        </div>
      </SkeletonGroup>
    </div>
  )
}
