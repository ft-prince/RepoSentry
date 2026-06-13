import { Hono } from 'hono'
import type { Queue } from 'bullmq'
import { z } from 'zod'
import {
  getMetrics,
  getReview,
  getRepoSettings,
  listRepositories,
  listReviewAuthors,
  listReviews,
  prisma,
  riskSchema,
  severitySchema,
  updateRepoSettings,
} from '@reposentry/core'
import { err, jsonSafe, ok } from './envelope.js'
import type { ReviewJobData } from './queue.js'

const listQuerySchema = z.object({
  repo: z.string().optional(),
  status: z.enum(['queued', 'running', 'completed', 'failed']).optional(),
  risk: riskSchema.optional(),
  author: z.string().max(100).optional(),
  search: z.string().max(200).optional(),
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
  sort: z.enum(['createdAt', 'risk', 'findings']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})

const settingsPatchSchema = z
  .object({
    severityThreshold: severitySchema.optional(),
    ignoreGlobs: z.array(z.string().max(500)).max(100).optional(),
    focusAreas: z.array(z.string().max(200)).max(20).optional(),
    autoReview: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'empty patch' })

export function buildApiRoutes(queue: Queue<ReviewJobData>): Hono {
  const api = new Hono()

  api.get('/repos', async (c) => {
    const repos = await listRepositories()
    return c.json(ok(jsonSafe(repos)))
  })

  api.get('/reviews', async (c) => {
    const query = listQuerySchema.safeParse(c.req.query())
    if (!query.success) return c.json(err('invalid query parameters'), 400)
    const { repo, status, risk, author, search, since, until, sort, order, page, pageSize } =
      query.data
    const result = await listReviews({
      repoFullName: repo,
      status,
      risk,
      author,
      search,
      since,
      until,
      sort,
      order,
      page,
      pageSize,
    })
    return c.json(
      ok(jsonSafe(result.reviews), {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      })
    )
  })

  // Filter facets for the Reviews page (authors + connected repos).
  api.get('/reviews/facets', async (c) => {
    const [authors, repos] = await Promise.all([listReviewAuthors(), listRepositories()])
    return c.json(
      ok(
        jsonSafe({
          authors,
          repos: repos.map((r) => r.fullName),
        })
      )
    )
  })

  api.get('/reviews/:id', async (c) => {
    const review = await getReview(c.req.param('id'))
    if (!review) return c.json(err('review not found'), 404)
    return c.json(ok(jsonSafe(review)))
  })

  api.post('/reviews/:id/rerun', async (c) => {
    const review = await getReview(c.req.param('id'))
    if (!review) return c.json(err('review not found'), 404)
    if (review.status === 'queued' || review.status === 'running') {
      return c.json(err('review is already in progress'), 409)
    }

    const installationId = review.repository.installation?.githubInstallationId
    if (!installationId) return c.json(err('repository has no installation'), 409)

    const requeued = await prisma.review.update({
      where: { id: review.id },
      data: { status: 'queued', error: null, completedAt: null },
    })
    await queue.add(
      'review',
      {
        reviewId: review.id,
        owner: review.repository.owner,
        repo: review.repository.name,
        prNumber: review.prNumber,
        installationId: Number(installationId),
      },
      { jobId: `rerun:${review.id}:${Date.now()}` }
    )
    return c.json(ok(jsonSafe(requeued)), 202)
  })

  api.get('/metrics', async (c) => {
    const days = z.coerce.number().int().min(1).max(365).default(30).parse(c.req.query('days') ?? 30)
    const metrics = await getMetrics(days)
    return c.json(ok(jsonSafe(metrics)))
  })

  api.get('/settings/:owner/:repo', async (c) => {
    const fullName = `${c.req.param('owner')}/${c.req.param('repo')}`
    const settings = await getRepoSettings(fullName)
    return c.json(ok(jsonSafe(settings)))
  })

  api.patch('/settings/:owner/:repo', async (c) => {
    const fullName = `${c.req.param('owner')}/${c.req.param('repo')}`
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json(err('request body must be JSON'), 400)
    }
    const parsed = settingsPatchSchema.safeParse(body)
    if (!parsed.success) {
      return c.json(err(`invalid settings: ${parsed.error.issues[0]?.message ?? 'bad input'}`), 400)
    }
    const updated = await updateRepoSettings(fullName, parsed.data)
    if (!updated) return c.json(err('repository not found'), 404)
    return c.json(ok(jsonSafe(updated)))
  })

  return api
}
