import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'

export default function ProfileLoading() {
  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <SkeletonGroup>
        <Skeleton h="h-8" w="w-40" className="mb-6" />
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4 mb-6">
          <Skeleton h="h-10" className="w-full rounded-lg" />
          <Skeleton h="h-10" className="w-full rounded-lg" />
          <Skeleton h="h-10" className="w-full rounded-lg" />
          <Skeleton h="h-10" className="w-full rounded-lg" />
        </div>
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 mb-6">
          <Skeleton h="h-5" w="w-24" className="mb-3" />
          <Skeleton h="h-10" className="w-full rounded-lg" />
        </div>
      </SkeletonGroup>
    </div>
  )
}
