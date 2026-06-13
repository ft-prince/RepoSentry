import { Skeleton } from '@/components/ui/skeleton'

export default function ReviewDetailLoading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-4 w-24" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-80" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-24 w-full" />
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-32 w-full" />
      ))}
    </div>
  )
}
