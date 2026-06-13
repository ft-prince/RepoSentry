import Link from 'next/link'
import { GitPullRequest, ArrowUpRight } from 'lucide-react'
import { getMetrics, getRepositories, getReviews } from '@/lib/api'
import { KpiCard } from '@/components/kpi-card'
import { ReviewsOverTimeChart, SeverityDistributionChart } from '@/components/charts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { ReviewRow } from '@/components/review-row'
import { SetupChecklist, type SetupStep } from '@/components/setup-checklist'
import { formatDuration } from '@/lib/utils'
import { ApiError } from '@/components/api-error'

export const metadata = { title: 'Overview' }
export const dynamic = 'force-dynamic'

const GITHUB_APP_URL = process.env.NEXT_PUBLIC_GITHUB_APP_URL ?? 'https://github.com/apps'

export default async function OverviewPage() {
  const [metricsRes, reviewsRes, reposRes, completedRes] = await Promise.all([
    getMetrics(30),
    getReviews({ pageSize: 8 }),
    getRepositories(),
    getReviews({ status: 'completed', pageSize: 1 }),
  ])

  if (!metricsRes.success || !metricsRes.data) {
    return <ApiError message={metricsRes.error ?? 'Failed to load metrics'} />
  }
  const metrics = metricsRes.data
  const recent = reviewsRes.data ?? []
  const repos = reposRes.data ?? []
  const reviewsTotal = reviewsRes.meta?.total ?? 0
  const completedTotal = completedRes.meta?.total ?? 0
  const findingsTotal = Object.values(metrics.severityDistribution).reduce(
    (sum, n) => sum + (n ?? 0),
    0
  )
  const reviewsThisWeek = metrics.reviewsOverTime.slice(-7).reduce((sum, d) => sum + d.count, 0)

  const steps: SetupStep[] = [
    {
      title: 'Connect a repository',
      description: 'Install the RepoSentry GitHub App and grant it access to a repo.',
      done: metrics.repoCount > 0,
      href: GITHUB_APP_URL,
      external: true,
      cta: 'Install',
    },
    {
      title: 'Configure review rules',
      description: 'Set a severity threshold, ignore globs, or focus areas per repo.',
      done: repos.some((r) => r.settings !== null),
      optional: true,
      href: '/repositories',
      cta: 'Configure',
    },
    {
      title: 'Open a pull request',
      description: 'Any PR on a connected repo triggers a review automatically.',
      done: reviewsTotal > 0,
      href: '/how-it-works',
      cta: 'Learn how',
    },
    {
      title: 'Get your first AI review',
      description: 'RepoSentry posts inline comments and a summary within ~30–60s.',
      done: completedTotal > 0,
      href: '/reviews',
      cta: 'View',
    },
    {
      title: 'Review findings & apply fixes',
      description: 'Browse findings by severity and copy the suggested fixes.',
      done: findingsTotal > 0,
      href: '/reviews',
      cta: 'Browse',
    },
    {
      title: 'Use it in your editor (MCP)',
      description: 'Run review_diff from Claude Code or Cursor before you push.',
      done: false,
      optional: true,
      href: '/settings',
      cta: 'Set up',
    },
  ]

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <SetupChecklist steps={steps} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Reviews this week"
          value={reviewsThisWeek}
          hint="last 7 days"
          info="Pull requests reviewed in the last 7 days across all connected repositories."
        />
        <KpiCard
          label="Open criticals"
          value={metrics.openCriticals}
          hint="unresolved critical findings"
          tone="danger"
          info="Critical-severity findings that are still open (not resolved or dismissed). Fix these before merging."
        />
        <KpiCard
          label="Avg findings / PR"
          value={metrics.avgFindingsPerReview}
          hint="completed reviews, 30 days"
          info="Average number of findings per completed review over the last 30 days."
        />
        <KpiCard
          label="Repos connected"
          value={metrics.repoCount}
          hint={`avg review ${formatDuration(metrics.avgReviewDurationMs)}`}
          info="Repositories with the GitHub App installed and active. The hint shows the average time a review takes."
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Reviews over time</CardTitle>
            <span className="text-2xs text-faint">30 days</span>
          </CardHeader>
          <CardContent>
            <ReviewsOverTimeChart data={metrics.reviewsOverTime} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Findings by severity</CardTitle>
            <span className="text-2xs text-faint">30 days</span>
          </CardHeader>
          <CardContent>
            <SeverityDistributionChart distribution={metrics.severityDistribution} />
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Recent reviews</h2>
          <Link
            href="/reviews"
            className="inline-flex items-center gap-0.5 rounded text-xs text-accent hover:underline"
          >
            View all <ArrowUpRight className="size-3" aria-hidden />
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            icon={GitPullRequest}
            title="No reviews yet"
            description="Install the GitHub App on a repository and open a pull request — the first review will land here. Or run pnpm db:seed for demo data."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Pull request</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Findings</TableHead>
                <TableHead className="text-right">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((review) => (
                <ReviewRow key={review.id} review={review} />
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
