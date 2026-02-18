import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'

export default function TakeAssessmentLoading() {
  return (
    <SkeletonGroup className="max-w-3xl mx-auto px-4 py-6">
      {/* Header: timer + progress */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton h="h-4" w="w-32" />
        <Skeleton h="h-8" w="w-20" className="rounded-full" />
      </div>
      {/* Progress bar */}
      <Skeleton h="h-1.5" className="rounded-full mb-8" />
      {/* Question stem */}
      <Skeleton h="h-6" w="w-3/4" className="mb-6" />
      {/* Options */}
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} h="h-14" className="rounded-lg" />
        ))}
      </div>
      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <Skeleton h="h-9" w="w-24" className="rounded-lg" />
        <Skeleton h="h-9" w="w-24" className="rounded-lg" />
      </div>
    </SkeletonGroup>
  )
}
