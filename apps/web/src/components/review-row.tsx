'use client'

import { useRouter } from 'next/navigation'
import { TableCell, TableRow } from '@/components/ui/table'
import { RiskBadge, StatusBadge } from '@/components/ui/badge'
import { formatRelative } from '@/lib/utils'
import type { ReviewListItem, Severity } from '@/lib/types'
import { SEVERITIES } from '@/lib/types'
import { cn } from '@/lib/utils'

const DOT: Record<Severity, string> = {
  critical: 'bg-severity-critical',
  high: 'bg-severity-high',
  medium: 'bg-severity-medium',
  low: 'bg-severity-low',
}

/** Compact severity dots, e.g. ●2 ●1, instead of four chips per row. */
export function SeverityDots({ findings }: { findings: { severity: Severity }[] }) {
  const counts = new Map<Severity, number>()
  for (const f of findings) counts.set(f.severity, (counts.get(f.severity) ?? 0) + 1)
  if (counts.size === 0) return <span className="text-xs text-faint">none</span>
  return (
    <span className="inline-flex items-center gap-2">
      {SEVERITIES.filter((s) => counts.has(s)).map((s) => (
        <span key={s} className="inline-flex items-center gap-1 text-xs text-muted">
          <span className={cn('size-1.5 rounded-full', DOT[s])} aria-hidden />
          <span className="tnum">{counts.get(s)}</span>
          <span className="sr-only">{s}</span>
        </span>
      ))}
    </span>
  )
}

export function ReviewRow({ review }: { review: ReviewListItem }) {
  const router = useRouter()
  const href = `/reviews/${review.id}`
  return (
    <TableRow
      data-clickable="true"
      tabIndex={0}
      role="link"
      aria-label={`Review of PR #${review.prNumber}: ${review.prTitle}`}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          router.push(href)
        }
      }}
      className="focus-visible:bg-surface-raised"
    >
      <TableCell className="max-w-0 w-2/5">
        <div className="truncate font-mono text-[13px]">{review.prTitle}</div>
        <div className="mt-0.5 truncate text-2xs text-faint">
          {review.repository.fullName} #{review.prNumber}
        </div>
      </TableCell>
      <TableCell className="text-muted">{review.author}</TableCell>
      <TableCell>
        <StatusBadge status={review.status} />
      </TableCell>
      <TableCell>
        <RiskBadge risk={review.overallRisk} />
      </TableCell>
      <TableCell>
        <SeverityDots findings={review.findings} />
      </TableCell>
      <TableCell className="tnum whitespace-nowrap text-right text-xs text-faint">
        {formatRelative(review.createdAt)}
      </TableCell>
    </TableRow>
  )
}
