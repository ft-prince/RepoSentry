'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, ChevronRight, Circle, X, PlugZap } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface SetupStep {
  title: string
  description: string
  done: boolean
  optional?: boolean
  /** In-app link or external URL for the action that completes this step. */
  href?: string
  external?: boolean
  cta?: string
}

const DISMISS_KEY = 'reposentry:setup-dismissed'

/**
 * First-run onboarding. Shows the six stages of getting RepoSentry working,
 * with a progress bar and the next action highlighted. Auto-hides once all
 * required steps are done, and can be dismissed manually after that.
 */
export function SetupChecklist({ steps }: { steps: SetupStep[] }) {
  const reduceMotion = useReducedMotion()
  const requiredSteps = steps.filter((s) => !s.optional)
  const doneCount = requiredSteps.filter((s) => s.done).length
  const allDone = doneCount === requiredSteps.length
  const pct = Math.round((doneCount / requiredSteps.length) * 100)

  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return allDone && window.localStorage.getItem(DISMISS_KEY) === '1'
  })

  if (dismissed) return null

  // The first not-yet-done step is the "next action".
  const nextIndex = steps.findIndex((s) => !s.done && !s.optional)

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-md bg-accent-subtle text-accent">
            <PlugZap className="size-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-medium">
              {allDone ? "You're all set up" : 'Get RepoSentry running'}
            </h2>
            <p className="text-xs text-muted">
              {allDone
                ? 'Every step is complete — reviews will run automatically on new pull requests.'
                : 'A few steps connect RepoSentry to your repositories.'}
            </p>
          </div>
        </div>
        {allDone && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Dismiss setup guide"
            onClick={() => {
              window.localStorage.setItem(DISMISS_KEY, '1')
              setDismissed(true)
            }}
          >
            <X aria-hidden />
          </Button>
        )}
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3 px-4 pt-3">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-raised"
          role="progressbar"
          aria-valuenow={doneCount}
          aria-valuemin={0}
          aria-valuemax={requiredSteps.length}
          aria-label="Setup progress"
        >
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={reduceMotion ? false : { width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
        <span className="tnum shrink-0 text-2xs text-faint">
          {doneCount}/{requiredSteps.length} done
        </span>
      </div>

      <ol className="flex flex-col p-2">
        {steps.map((step, i) => {
          const isNext = i === nextIndex
          return (
            <li
              key={step.title}
              className={cn(
                'flex items-start gap-3 rounded-md px-2 py-2.5',
                isNext && 'bg-surface-raised/60'
              )}
            >
              <span className="mt-0.5 shrink-0">
                {step.done ? (
                  <span className="flex size-5 items-center justify-center rounded-full bg-success/15 text-success">
                    <Check className="size-3" aria-hidden />
                  </span>
                ) : (
                  <span
                    className={cn(
                      'flex size-5 items-center justify-center rounded-full border',
                      isNext ? 'border-accent text-accent' : 'border-border text-faint'
                    )}
                  >
                    <span className="tnum text-2xs">{i + 1}</span>
                  </span>
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'text-[13px] font-medium',
                      step.done && 'text-muted line-through decoration-border'
                    )}
                  >
                    {step.title}
                  </span>
                  {step.optional && (
                    <span className="rounded border border-border px-1 text-[10px] text-faint">
                      optional
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted">{step.description}</p>
              </div>

              {!step.done && step.href && (
                <StepAction step={step} highlighted={isNext} />
              )}
              {step.done && (
                <span className="mt-0.5 shrink-0">
                  <Circle className="size-3 fill-success/20 text-success/40" aria-hidden />
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </Card>
  )
}

function StepAction({ step, highlighted }: { step: SetupStep; highlighted: boolean }) {
  const label = step.cta ?? 'Set up'
  const className = 'shrink-0'
  if (step.external) {
    return (
      <a href={step.href} target="_blank" rel="noreferrer" className={className}>
        <Button size="sm" variant={highlighted ? 'primary' : 'secondary'}>
          {label}
          <ChevronRight aria-hidden />
        </Button>
      </a>
    )
  }
  return (
    <Link href={step.href!} className={className}>
      <Button size="sm" variant={highlighted ? 'primary' : 'secondary'}>
        {label}
        <ChevronRight aria-hidden />
      </Button>
    </Link>
  )
}
