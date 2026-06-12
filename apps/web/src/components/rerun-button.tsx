'use client'

import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { RotateCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { ApiEnvelope } from '@/lib/types'

export function RerunButton({ reviewId, disabled }: { reviewId: string; disabled?: boolean }) {
  const router = useRouter()
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/proxy/reviews/${reviewId}/rerun`, { method: 'POST' })
      const body = (await res.json()) as ApiEnvelope<unknown>
      if (!body.success) throw new Error(body.error ?? 'rerun failed')
      return body
    },
    onSuccess: () => {
      toast.success('Review re-queued', { description: 'It will run as soon as the worker is free.' })
      router.refresh()
    },
    onError: (error) => {
      toast.error('Could not re-run review', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    },
  })

  return (
    <Button onClick={() => mutate()} disabled={disabled || isPending} size="sm">
      <RotateCw className={isPending ? 'animate-spin' : ''} aria-hidden />
      Re-run review
    </Button>
  )
}
