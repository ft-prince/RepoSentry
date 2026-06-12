/** Shapes returned by the RepoSentry REST API (serialized Prisma rows). */

export type Severity = 'critical' | 'high' | 'medium' | 'low'
export type FindingCategory = 'bug' | 'security' | 'performance' | 'style' | 'maintainability'
export type Risk = 'none' | 'low' | 'medium' | 'high' | 'critical'
export type ReviewStatus = 'queued' | 'running' | 'completed' | 'failed'

export const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low']

export interface ApiEnvelope<T> {
  success: boolean
  data: T | null
  error: string | null
  meta?: { total: number; page: number; pageSize: number }
}

export interface ReviewListItem {
  id: string
  status: ReviewStatus
  prNumber: number
  prTitle: string
  prUrl: string | null
  author: string
  commitSha: string
  overallRisk: Risk | null
  createdAt: string
  completedAt: string | null
  durationMs: number | null
  repository: { fullName: string; owner: string; name: string }
  _count: { findings: number }
  findings: { severity: Severity }[]
}

export interface FindingDetail {
  id: string
  file: string
  line: number
  severity: Severity
  category: FindingCategory
  title: string
  explanation: string
  suggestedFix: string | null
  status: 'open' | 'resolved' | 'dismissed'
}

export interface ReviewDetail extends Omit<ReviewListItem, 'findings' | '_count'> {
  summary: string | null
  error: string | null
  model: string | null
  baseBranch: string | null
  headBranch: string | null
  findings: FindingDetail[]
}

export interface RepositoryItem {
  id: string
  owner: string
  name: string
  fullName: string
  private: boolean
  active: boolean
  createdAt: string
  installation: { githubInstallationId: string; accountLogin: string }
  settings: RepoSettings | null
  _count: { reviews: number }
}

export interface RepoSettings {
  severityThreshold: Severity
  ignoreGlobs: string[]
  focusAreas: string[]
  autoReview: boolean
}

export interface Metrics {
  totalReviews: number
  openCriticals: number
  repoCount: number
  avgFindingsPerReview: number
  avgReviewDurationMs: number
  severityDistribution: Partial<Record<Severity, number>>
  reviewsOverTime: { date: string; count: number }[]
}
