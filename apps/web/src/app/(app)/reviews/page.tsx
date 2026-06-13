import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { ReviewsExplorer } from '@/components/reviews/reviews-explorer'

export const metadata = { title: 'Reviews' }

export default function ReviewsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-full" />
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      }
    >
      <ReviewsExplorer />
    </Suspense>
  )
}
