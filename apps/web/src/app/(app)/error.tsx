'use client'

import { useEffect } from 'react'
import { ServerCrash } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface to the browser console; a real deploy would forward to Sentry etc.
    console.error('dashboard error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-danger/40 px-6 py-16 text-center">
      <ServerCrash className="size-6 text-danger" aria-hidden />
      <p className="text-sm font-medium">Something went wrong</p>
      <p className="max-w-md text-xs text-muted">
        {error.message || 'An unexpected error occurred while rendering this page.'}
      </p>
      <Button variant="primary" size="sm" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
