import { Skeleton } from '@/components/ui/skeleton'

export default function OverviewLoading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-44 w-full" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-5">
        <Skeleton className="h-56 lg:col-span-3" />
        <Skeleton className="h-56 lg:col-span-2" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
