import * as React from 'react'
import { cn } from '@/lib/utils'
import type { Risk, ReviewStatus, Severity } from '@/lib/types'

export function Badge({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-2xs font-medium text-muted',
        className
      )}
    >
      {children}
    </span>
  )
}

const SEVERITY_DOT: Record<Severity, string> = {
  critical: 'bg-severity-critical',
  high: 'bg-severity-high',
  medium: 'bg-severity-medium',
  low: 'bg-severity-low',
}

/** Severity chip: muted dot + label, never neon. */
export function SeverityBadge({ severity, count }: { severity: Severity; count?: number }) {
  return (
    <Badge>
      <span className={cn('size-1.5 rounded-full', SEVERITY_DOT[severity])} aria-hidden />
      <span className="capitalize">{severity}</span>
      {count !== undefined && <span className="tnum text-faint">{count}</span>}
    </Badge>
  )
}

const RISK_STYLE: Record<Risk, string> = {
  critical: 'text-severity-critical border-severity-critical/30',
  high: 'text-severity-high border-severity-high/30',
  medium: 'text-severity-medium border-severity-medium/30',
  low: 'text-muted',
  none: 'text-success border-success/30',
}

export function RiskBadge({ risk }: { risk: Risk | null }) {
  if (!risk) return <span className="text-2xs text-faint">—</span>
  return <Badge className={cn('uppercase tracking-wide', RISK_STYLE[risk])}>{risk}</Badge>
}

const STATUS_STYLE: Record<ReviewStatus, { label: string; cls: string }> = {
  queued: { label: 'Queued', cls: 'text-faint' },
  running: { label: 'Running', cls: 'text-accent' },
  completed: { label: 'Completed', cls: 'text-success' },
  failed: { label: 'Failed', cls: 'text-danger' },
}

export function StatusBadge({ status }: { status: ReviewStatus }) {
  const { label, cls } = STATUS_STYLE[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs', cls)}>
      <span
        className={cn(
          'size-1.5 rounded-full bg-current',
          status === 'running' && 'animate-pulse'
        )}
        aria-hidden
      />
      {label}
    </span>
  )
}
