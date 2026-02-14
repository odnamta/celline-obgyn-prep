import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'

export default function AssessmentEditLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <SkeletonGroup>
        <Skeleton h="h-4" w="w-16" className="mb-6" />
        <Skeleton h="h-8" w="w-64" className="mb-6" />
        <div className="space-y-4">
          <Skeleton h="h-10" className="w-full rounded-lg" />
          <Skeleton h="h-10" className="w-full rounded-lg" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton h="h-10" className="rounded-lg" />
            <Skeleton h="h-10" className="rounded-lg" />
            <Skeleton h="h-10" className="rounded-lg" />
          </div>
          <Skeleton h="h-24" className="w-full rounded-lg" />
        </div>
      </SkeletonGroup>
    </div>
  )
}
