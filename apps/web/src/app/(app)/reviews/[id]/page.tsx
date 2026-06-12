import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ExternalLink, GitBranch, GitCommitHorizontal, ShieldAlert } from 'lucide-react'
import { getReview } from '@/lib/api'
import { RiskBadge, SeverityBadge, StatusBadge, Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { CodeBlock, langForFile } from '@/components/code-block'
import { RerunButton } from '@/components/rerun-button'
import { ApiError } from '@/components/api-error'
import { formatDateTime, formatDuration, shortSha } from '@/lib/utils'
import type { FindingDetail } from '@/lib/types'

export const metadata = { title: 'Review detail' }
export const dynamic = 'force-dynamic'

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const res = await getReview(id)
  if (!res.success && res.error === 'review not found') notFound()
  if (!res.success || !res.data) return <ApiError message={res.error ?? 'Failed to load review'} />
  const review = res.data

  const byFile = new Map<string, FindingDetail[]>()
  for (const finding of review.findings) {
    byFile.set(finding.file, [...(byFile.get(finding.file) ?? []), finding])
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <Link
        href="/reviews"
        className="inline-flex w-fit items-center gap-1 rounded text-xs text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> All reviews
      </Link>

      {/* PR header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-mono text-base font-semibold leading-snug">
            {review.prTitle}
            {review.prUrl && (
              <a
                href={review.prUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-2 inline-flex align-middle text-muted hover:text-foreground"
                aria-label="Open pull request on GitHub"
              >
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            )}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span>
              {review.repository.fullName} #{review.prNumber}
            </span>
            <span>by {review.author}</span>
            {review.headBranch && (
              <span className="inline-flex items-center gap-1 font-mono text-2xs">
                <GitBranch className="size-3" aria-hidden />
                {review.headBranch} → {review.baseBranch}
              </span>
            )}
            <span className="inline-flex items-center gap-1 font-mono text-2xs">
              <GitCommitHorizontal className="size-3" aria-hidden />
              {shortSha(review.commitSha)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={review.status} />
          <RiskBadge risk={review.overallRisk} />
          <RerunButton
            reviewId={review.id}
            disabled={review.status === 'queued' || review.status === 'running'}
          />
        </div>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="flex flex-col gap-2">
          {review.status === 'failed' ? (
            <p className="text-sm text-danger">{review.error ?? 'Review failed.'}</p>
          ) : (
            <p className="text-sm leading-relaxed text-foreground">
              {review.summary ?? 'Review has not completed yet.'}
            </p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-2xs text-faint">
            <span className="tnum">{formatDateTime(review.createdAt)}</span>
            {review.model && <span className="font-mono">{review.model}</span>}
            {review.durationMs !== null && (
              <span className="tnum">took {formatDuration(review.durationMs)}</span>
            )}
            <span className="tnum">{review.findings.length} findings</span>
          </div>
        </CardContent>
      </Card>

      {/* Findings grouped by file */}
      {review.findings.length === 0 ? (
        review.status === 'completed' && (
          <EmptyState
            icon={ShieldAlert}
            title="No findings"
            description="The automated pass found nothing to flag in this change."
          />
        )
      ) : (
        <div className="flex flex-col gap-3">
          {[...byFile.entries()].map(([file, findings]) => (
            <section key={file} aria-label={`Findings in ${file}`}>
              <h2 className="mb-1.5 flex items-baseline gap-2 font-mono text-xs text-muted">
                {file}
                <span className="tnum text-2xs text-faint">{findings.length}</span>
              </h2>
              <div className="flex flex-col gap-2">
                {findings.map((finding) => (
                  <FindingCard key={finding.id} finding={finding} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

async function FindingCard({ finding }: { finding: FindingDetail }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
        <SeverityBadge severity={finding.severity} />
        <Badge className="capitalize">{finding.category}</Badge>
        <span className="text-[13px] font-medium">{finding.title}</span>
        <span className="ml-auto font-mono text-2xs text-faint">line {finding.line}</span>
      </div>
      <CardContent className="flex flex-col gap-3">
        <p className="text-[13px] leading-relaxed text-muted">{finding.explanation}</p>
        {finding.suggestedFix && (
          <CodeBlock
            code={finding.suggestedFix}
            lang={langForFile(finding.file)}
            label={`suggested fix · ${finding.file}:${finding.line}`}
          />
        )}
      </CardContent>
    </Card>
  )
}
