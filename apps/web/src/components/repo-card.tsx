'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { ChevronDown, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select, Switch } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ApiEnvelope, RepositoryItem, Severity } from '@/lib/types'

export function RepoCard({ repo }: { repo: RepositoryItem }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const reduceMotion = useReducedMotion()

  return (
    <Card>
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        onClick={() => setIsExpanded((v) => !v)}
        aria-expanded={isExpanded}
        aria-label={`${repo.fullName} settings`}
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-mono text-[13px] font-medium">{repo.fullName}</span>
            {repo.private && (
              <Badge>
                <Lock className="size-2.5" aria-hidden /> private
              </Badge>
            )}
          </span>
          <span className="tnum mt-0.5 block text-2xs text-faint">
            {repo._count.reviews} reviews · installation {repo.installation.accountLogin}
          </span>
        </span>
        <ChevronDown
          className={cn('size-4 text-faint transition-transform duration-150', isExpanded && 'rotate-180')}
          aria-hidden
        />
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <RepoSettingsForm repo={repo} />
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

function RepoSettingsForm({ repo }: { repo: RepositoryItem }) {
  const router = useRouter()
  const [threshold, setThreshold] = useState<Severity>(repo.settings?.severityThreshold ?? 'low')
  const [ignoreGlobs, setIgnoreGlobs] = useState((repo.settings?.ignoreGlobs ?? []).join(', '))
  const [focusAreas, setFocusAreas] = useState((repo.settings?.focusAreas ?? []).join(', '))
  const [autoReview, setAutoReview] = useState(repo.settings?.autoReview ?? true)

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/proxy/settings/${repo.owner}/${repo.name}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          severityThreshold: threshold,
          ignoreGlobs: splitList(ignoreGlobs),
          focusAreas: splitList(focusAreas),
          autoReview,
        }),
      })
      const body = (await res.json()) as ApiEnvelope<unknown>
      if (!body.success) throw new Error(body.error ?? 'save failed')
    },
    onSuccess: () => {
      toast.success(`Settings saved for ${repo.fullName}`)
      router.refresh()
    },
    onError: (error) =>
      toast.error('Could not save settings', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  })

  return (
    <div className="grid gap-3 border-t border-border px-4 py-3.5 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-xs text-muted">
        Comment threshold
        <Select value={threshold} onChange={(e) => setThreshold(e.target.value as Severity)}>
          <option value="low">low — post everything</option>
          <option value="medium">medium and up</option>
          <option value="high">high and up</option>
          <option value="critical">critical only</option>
        </Select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Focus areas <span className="text-2xs text-faint">(comma-separated)</span>
        <Input
          value={focusAreas}
          onChange={(e) => setFocusAreas(e.target.value)}
          placeholder="auth, payment correctness"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted sm:col-span-2">
        Ignore globs <span className="text-2xs text-faint">(comma-separated, on top of built-ins)</span>
        <Input
          value={ignoreGlobs}
          onChange={(e) => setIgnoreGlobs(e.target.value)}
          placeholder="docs/**, **/*.test.ts"
          className="font-mono text-xs"
        />
      </label>
      <div className="flex items-center gap-2.5">
        <Switch checked={autoReview} onCheckedChange={setAutoReview} label="Auto-review pull requests" />
        <span className="text-xs text-muted">Auto-review new pull requests</span>
      </div>
      <div className="flex justify-end">
        <Button variant="primary" size="sm" onClick={() => mutate()} disabled={isPending}>
          {isPending ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </div>
  )
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}
