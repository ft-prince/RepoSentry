import { Skeleton } from '@/components/ui/skeleton'

export default function RepositoriesLoading() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-8 w-32" />
      </div>
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}
