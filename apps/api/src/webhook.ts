import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Queue } from 'bullmq'
import { z } from 'zod'
import {
  GitHubClient,
  createQueuedReview,
  deactivateRepository,
  logger,
  parseRepoConfig,
  prisma,
  upsertInstallation,
  upsertRepository,
} from '@reposentry/core'
import type { ReviewJobData } from './queue.js'

/** Constant-time HMAC SHA-256 verification of `x-hub-signature-256`. */
export function verifyWebhookSignature(
  payload: string,
  signatureHeader: string | undefined,
  secret: string
): boolean {
  if (!signatureHeader?.startsWith('sha256=')) return false
  const expected = createHmac('sha256', secret).update(payload).digest('hex')
  const provided = signatureHeader.slice('sha256='.length)
  if (provided.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'))
}

// Validate only the fields we use — GitHub payloads are huge and unversioned.
const pullRequestEventSchema = z.object({
  action: z.string(),
  number: z.number().int(),
  installation: z.object({ id: z.number().int() }),
  repository: z.object({
    id: z.number().int(),
    name: z.string(),
    private: z.boolean(),
    owner: z.object({ login: z.string(), type: z.string().optional() }),
  }),
  pull_request: z.object({
    number: z.number().int(),
    title: z.string(),
    body: z.string().nullable(),
    html_url: z.string(),
    draft: z.boolean().optional(),
    user: z.object({ login: z.string() }).nullable(),
    base: z.object({ ref: z.string() }),
    head: z.object({ ref: z.string(), sha: z.string() }),
  }),
})

const installationEventSchema = z.object({
  action: z.string(),
  installation: z.object({
    id: z.number().int(),
    account: z.object({ login: z.string(), type: z.string().optional() }).nullable(),
  }),
  repositories: z
    .array(z.object({ id: z.number().int(), name: z.string(), full_name: z.string(), private: z.boolean() }))
    .optional(),
  repositories_added: z
    .array(z.object({ id: z.number().int(), name: z.string(), full_name: z.string(), private: z.boolean() }))
    .optional(),
  repositories_removed: z
    .array(z.object({ id: z.number().int(), full_name: z.string() }))
    .optional(),
})

const REVIEWABLE_ACTIONS = new Set(['opened', 'synchronize', 'reopened', 'ready_for_review'])

export async function handleWebhookEvent(
  eventName: string,
  payload: unknown,
  queue: Queue<ReviewJobData>
): Promise<{ status: number; message: string }> {
  switch (eventName) {
    case 'pull_request':
      return handlePullRequestEvent(payload, queue)
    case 'installation':
    case 'installation_repositories':
      return handleInstallationEvent(payload)
    case 'ping':
      return { status: 200, message: 'pong' }
    default:
      return { status: 202, message: `event ${eventName} ignored` }
  }
}

async function handlePullRequestEvent(
  payload: unknown,
  queue: Queue<ReviewJobData>
): Promise<{ status: number; message: string }> {
  const parsed = pullRequestEventSchema.safeParse(payload)
  if (!parsed.success) {
    logger.warn('webhook.invalid-pr-payload', { issues: parsed.error.issues.slice(0, 3) })
    return { status: 400, message: 'invalid pull_request payload' }
  }
  const event = parsed.data

  if (!REVIEWABLE_ACTIONS.has(event.action)) {
    return { status: 202, message: `action ${event.action} ignored` }
  }
  if (event.pull_request.draft) {
    return { status: 202, message: 'draft PR ignored' }
  }

  const owner = event.repository.owner.login
  const repoName = event.repository.name
  const installationId = event.installation.id

  // Make sure installation + repo rows exist even if install webhooks were missed.
  await upsertInstallation({
    githubInstallationId: installationId,
    accountLogin: owner,
    accountType: event.repository.owner.type ?? 'User',
  })
  const repo = await upsertRepository({
    githubInstallationId: installationId,
    githubRepoId: event.repository.id,
    owner,
    name: repoName,
    isPrivate: event.repository.private,
  })

  // Respect autoReview from both DB settings and .reposentry.yml
  const settings = await prisma.repoSettings.findUnique({ where: { repositoryId: repo.id } })
  if (settings && !settings.autoReview) {
    return { status: 202, message: 'autoReview disabled for repo' }
  }
  try {
    const github = GitHubClient.forInstallation(installationId)
    const configFile = await github.getRepoConfigFile(owner, repoName, event.pull_request.head.sha)
    if (configFile && !parseRepoConfig(configFile).autoReview) {
      return { status: 202, message: 'autoReview disabled via .reposentry.yml' }
    }
  } catch (error) {
    // Config fetch failing should never block a review.
    logger.warn('webhook.config-fetch-failed', { error: String(error) })
  }

  const review = await createQueuedReview({
    repositoryId: repo.id,
    meta: {
      number: event.pull_request.number,
      title: event.pull_request.title,
      body: event.pull_request.body,
      author: event.pull_request.user?.login ?? 'unknown',
      baseBranch: event.pull_request.base.ref,
      headBranch: event.pull_request.head.ref,
      headSha: event.pull_request.head.sha,
      url: event.pull_request.html_url,
    },
  })

  await queue.add(
    'review',
    { reviewId: review.id, owner, repo: repoName, prNumber: event.pull_request.number, installationId },
    // One job per PR+commit: a force-push replaces the stale queued job.
    { jobId: `${owner}/${repoName}#${event.pull_request.number}@${event.pull_request.head.sha}` }
  )

  logger.info('webhook.review-enqueued', {
    reviewId: review.id,
    repo: `${owner}/${repoName}`,
    prNumber: event.pull_request.number,
    action: event.action,
  })
  return { status: 202, message: `review ${review.id} enqueued` }
}

async function handleInstallationEvent(payload: unknown): Promise<{ status: number; message: string }> {
  const parsed = installationEventSchema.safeParse(payload)
  if (!parsed.success) {
    logger.warn('webhook.invalid-installation-payload', { issues: parsed.error.issues.slice(0, 3) })
    return { status: 400, message: 'invalid installation payload' }
  }
  const event = parsed.data
  const account = event.installation.account

  if (event.action === 'deleted') {
    await prisma.installation.updateMany({
      where: { githubInstallationId: BigInt(event.installation.id) },
      data: { suspended: true },
    })
    return { status: 200, message: 'installation suspended' }
  }

  await upsertInstallation({
    githubInstallationId: event.installation.id,
    accountLogin: account?.login ?? 'unknown',
    accountType: account?.type ?? 'User',
  })

  const added = [...(event.repositories ?? []), ...(event.repositories_added ?? [])]
  for (const repo of added) {
    const [owner, name] = repo.full_name.split('/')
    if (!owner || !name) continue
    await upsertRepository({
      githubInstallationId: event.installation.id,
      githubRepoId: repo.id,
      owner,
      name,
      isPrivate: repo.private,
    })
  }
  for (const repo of event.repositories_removed ?? []) {
    await deactivateRepository(repo.id)
  }

  return { status: 200, message: `installation synced (${added.length} repos added)` }
}
