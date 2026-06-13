import { PrismaClient, Prisma } from '@prisma/client'
import type { Finding, PullRequestMeta, Risk, Severity } from './types.js'

/**
 * Lazy singleton Prisma client — one pool per process, survives hot reload in
 * dev, and is only instantiated on first use so DB-free entry points (like the
 * MCP `review_diff` tool) work without DATABASE_URL set.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = new PrismaClient()
  return globalForPrisma.prisma
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma()
    const value = client[prop as keyof PrismaClient]
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(client) : value
  },
})

export type { Prisma }
export * as PrismaTypes from '@prisma/client'

// ---------------------------------------------------------------------------
// Installations & repositories
// ---------------------------------------------------------------------------

export async function upsertInstallation(params: {
  githubInstallationId: number
  accountLogin: string
  accountType: string
}) {
  return prisma.installation.upsert({
    where: { githubInstallationId: BigInt(params.githubInstallationId) },
    create: {
      githubInstallationId: BigInt(params.githubInstallationId),
      accountLogin: params.accountLogin,
      accountType: params.accountType,
    },
    update: { accountLogin: params.accountLogin, accountType: params.accountType, suspended: false },
  })
}

export async function upsertRepository(params: {
  githubInstallationId: number
  githubRepoId: number
  owner: string
  name: string
  isPrivate: boolean
}) {
  const installation = await prisma.installation.findUnique({
    where: { githubInstallationId: BigInt(params.githubInstallationId) },
  })
  if (!installation) {
    throw new Error(`Unknown installation ${params.githubInstallationId} — webhook out of order?`)
  }
  const fullName = `${params.owner}/${params.name}`
  return prisma.repository.upsert({
    where: { githubRepoId: BigInt(params.githubRepoId) },
    create: {
      githubRepoId: BigInt(params.githubRepoId),
      owner: params.owner,
      name: params.name,
      fullName,
      private: params.isPrivate,
      installationId: installation.id,
    },
    update: { owner: params.owner, name: params.name, fullName, private: params.isPrivate, active: true },
  })
}

export async function deactivateRepository(githubRepoId: number) {
  await prisma.repository.updateMany({
    where: { githubRepoId: BigInt(githubRepoId) },
    data: { active: false },
  })
}

export async function listRepositories() {
  return prisma.repository.findMany({
    where: { active: true },
    include: {
      settings: true,
      installation: { select: { githubInstallationId: true, accountLogin: true } },
      _count: { select: { reviews: true } },
    },
    orderBy: { fullName: 'asc' },
  })
}

// ---------------------------------------------------------------------------
// Reviews & findings
// ---------------------------------------------------------------------------

export async function createQueuedReview(params: {
  repositoryId: string
  meta: PullRequestMeta
}) {
  return prisma.review.create({
    data: {
      status: 'queued',
      prNumber: params.meta.number,
      prTitle: params.meta.title,
      prUrl: params.meta.url,
      author: params.meta.author,
      baseBranch: params.meta.baseBranch,
      headBranch: params.meta.headBranch,
      commitSha: params.meta.headSha,
      repositoryId: params.repositoryId,
    },
  })
}

export async function markReviewRunning(reviewId: string) {
  return prisma.review.update({ where: { id: reviewId }, data: { status: 'running' } })
}

export async function completeReview(params: {
  reviewId: string
  summary: string
  overallRisk: Risk
  model: string
  durationMs: number
  findings: Finding[]
}) {
  const { reviewId, findings } = params
  return prisma.$transaction(async (tx) => {
    await tx.finding.deleteMany({ where: { reviewId } })
    if (findings.length > 0) {
      await tx.finding.createMany({
        data: findings.map((f) => ({
          reviewId,
          file: f.file,
          line: f.line,
          severity: f.severity,
          category: f.category,
          title: f.title,
          explanation: f.explanation,
          suggestedFix: f.suggestedFix ?? null,
        })),
      })
    }
    return tx.review.update({
      where: { id: reviewId },
      data: {
        status: 'completed',
        summary: params.summary,
        overallRisk: params.overallRisk,
        model: params.model,
        durationMs: params.durationMs,
        completedAt: new Date(),
      },
    })
  })
}

export async function failReview(reviewId: string, error: string) {
  return prisma.review.update({
    where: { id: reviewId },
    data: { status: 'failed', error: error.slice(0, 2_000), completedAt: new Date() },
  })
}

export type ReviewSortField = 'createdAt' | 'risk' | 'findings'
export type SortOrder = 'asc' | 'desc'

export interface ListReviewsParams {
  repoFullName?: string
  status?: 'queued' | 'running' | 'completed' | 'failed'
  /** Filter by overall risk rating. */
  risk?: Risk
  /** Filter by PR author (exact GitHub login). */
  author?: string
  /** Free-text search over PR title and author. */
  search?: string
  /** ISO date strings bounding createdAt (inclusive). */
  since?: string
  until?: string
  sort?: ReviewSortField
  order?: SortOrder
  page?: number
  pageSize?: number
}

/** Map a sort field to a Prisma orderBy clause. Risk/findings have a stable createdAt tiebreak. */
function reviewOrderBy(
  sort: ReviewSortField,
  order: SortOrder
): Prisma.ReviewOrderByWithRelationInput[] {
  switch (sort) {
    case 'findings':
      return [{ findings: { _count: order } }, { createdAt: 'desc' }]
    case 'risk':
      // Enum order in the schema is none→critical, so asc = least risky first.
      return [{ overallRisk: order }, { createdAt: 'desc' }]
    case 'createdAt':
    default:
      return [{ createdAt: order }]
  }
}

export async function listReviews(params: ListReviewsParams = {}) {
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20))

  const createdAt: Prisma.DateTimeFilter = {}
  if (params.since) createdAt.gte = new Date(params.since)
  if (params.until) createdAt.lte = new Date(params.until)

  const where: Prisma.ReviewWhereInput = {
    ...(params.repoFullName ? { repository: { fullName: params.repoFullName } } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.risk ? { overallRisk: params.risk } : {}),
    ...(params.author ? { author: params.author } : {}),
    ...(params.since || params.until ? { createdAt } : {}),
    ...(params.search
      ? {
          OR: [
            { prTitle: { contains: params.search, mode: 'insensitive' } },
            { author: { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const orderBy = reviewOrderBy(params.sort ?? 'createdAt', params.order ?? 'desc')

  const [total, reviews] = await prisma.$transaction([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      include: {
        repository: { select: { fullName: true, owner: true, name: true } },
        _count: { select: { findings: true } },
        findings: { select: { severity: true } },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])
  return { reviews, total, page, pageSize }
}

/** Distinct PR authors across all reviews, for the Reviews filter dropdown. */
export async function listReviewAuthors(): Promise<string[]> {
  const rows = await prisma.review.findMany({
    distinct: ['author'],
    select: { author: true },
    orderBy: { author: 'asc' },
  })
  return rows.map((r) => r.author).filter(Boolean)
}

export async function getReview(reviewId: string) {
  return prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      repository: {
        select: {
          fullName: true,
          owner: true,
          name: true,
          installation: { select: { githubInstallationId: true } },
        },
      },
      findings: { orderBy: [{ severity: 'asc' }, { file: 'asc' }, { line: 'asc' }] },
    },
  })
}

export async function getFinding(findingId: string) {
  return prisma.finding.findUnique({
    where: { id: findingId },
    include: {
      review: {
        select: {
          id: true,
          prNumber: true,
          prTitle: true,
          commitSha: true,
          repository: { select: { fullName: true } },
        },
      },
    },
  })
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function getRepoSettings(repoFullName: string) {
  return prisma.repoSettings.findFirst({ where: { repository: { fullName: repoFullName } } })
}

export async function updateRepoSettings(
  repoFullName: string,
  data: {
    severityThreshold?: Severity
    ignoreGlobs?: string[]
    focusAreas?: string[]
    autoReview?: boolean
  }
) {
  const repo = await prisma.repository.findUnique({ where: { fullName: repoFullName } })
  if (!repo) return null
  return prisma.repoSettings.upsert({
    where: { repositoryId: repo.id },
    create: { repositoryId: repo.id, ...data },
    update: data,
  })
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

export async function getMetrics(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const [totalReviews, completedReviews, repoCount, recentReviews] = await prisma.$transaction([
    prisma.review.count({ where: { createdAt: { gte: since } } }),
    prisma.review.findMany({
      where: { createdAt: { gte: since }, status: 'completed' },
      select: { createdAt: true, durationMs: true, _count: { select: { findings: true } } },
    }),
    prisma.repository.count({ where: { active: true } }),
    prisma.review.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
  ])

  const severityGroups = await prisma.finding.groupBy({
    by: ['severity'],
    where: { createdAt: { gte: since } },
    orderBy: { severity: 'asc' },
    _count: { severity: true },
  })

  const openCriticals = await prisma.finding.count({
    where: { severity: 'critical', status: 'open' },
  })

  // Reviews per day for the chart
  const perDay = new Map<string, number>()
  for (const r of recentReviews) {
    const day = r.createdAt.toISOString().slice(0, 10)
    perDay.set(day, (perDay.get(day) ?? 0) + 1)
  }
  const reviewsOverTime: { date: string; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    reviewsOverTime.push({ date, count: perDay.get(date) ?? 0 })
  }

  const findingCounts = completedReviews.map((r) => r._count.findings)
  const avgFindingsPerReview =
    findingCounts.length > 0
      ? findingCounts.reduce((a, b) => a + b, 0) / findingCounts.length
      : 0
  const durations = completedReviews
    .map((r) => r.durationMs)
    .filter((d): d is number => d !== null)
  const avgReviewDurationMs =
    durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0

  const severityDistribution = Object.fromEntries(
    severityGroups.map((g) => [g.severity, g._count.severity])
  )

  return {
    totalReviews,
    openCriticals,
    repoCount,
    avgFindingsPerReview: Math.round(avgFindingsPerReview * 10) / 10,
    avgReviewDurationMs: Math.round(avgReviewDurationMs),
    severityDistribution,
    reviewsOverTime,
  }
}
