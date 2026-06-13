'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Lightweight, dependency-free tooltip. Shows on hover and keyboard focus,
 * dismisses on Escape. The trigger must be focusable for keyboard users — wrap
 * a button/link, or pass `tabIndex={0}` on a static trigger.
 */
export function Tooltip({
  content,
  children,
  side = 'top',
  className,
}: {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'bottom'
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const id = React.useId()

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined}>{children}</span>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            'pointer-events-none absolute left-1/2 z-50 w-max max-w-xs -translate-x-1/2 rounded-md border border-border-strong bg-surface-raised px-2 py-1 text-2xs leading-relaxed text-foreground shadow-lg animate-fade-in',
            side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
            className
          )}
        >
          {content}
        </span>
      )}
    </span>
  )
}

/** A small "?" affordance that reveals help text on hover/focus. */
export function InfoHint({ content }: { content: React.ReactNode }) {
  return (
    <Tooltip content={content}>
      <button
        type="button"
        aria-label="More information"
        className="inline-flex size-3.5 items-center justify-center rounded-full border border-border text-[9px] font-medium text-faint transition-colors hover:border-border-strong hover:text-muted"
      >
        ?
      </button>
    </Tooltip>
  )
}
