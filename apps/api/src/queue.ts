import { Queue, Worker, type Job } from 'bullmq'
import { Redis } from 'ioredis'
import {
  GitHubClient,
  GroqReviewLLM,
  ReviewEngine,
  completeReview,
  failReview,
  logger,
  markReviewRunning,
} from '@reposentry/core'
import type { Env } from './env.js'

export const REVIEW_QUEUE_NAME = 'reposentry-reviews'

export interface ReviewJobData {
  reviewId: string
  owner: string
  repo: string
  prNumber: number
  installationId: number
}

export function createRedisConnection(env: Env): Redis {
  // BullMQ requires maxRetriesPerRequest: null on its connections.
  return new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })
}

export function createReviewQueue(connection: Redis): Queue<ReviewJobData> {
  return new Queue<ReviewJobData>(REVIEW_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 30_000 },
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 500 },
    },
  })
}

/**
 * The review worker. Concurrency is 1 BY DESIGN: Groq's free tier rate-limits
 * aggressively, so we process one PR at a time and let BullMQ hold the rest.
 */
export function startReviewWorker(env: Env, connection: Redis): Worker<ReviewJobData> {
  const llm = new GroqReviewLLM({
    apiKey: env.GROQ_API_KEY,
    reviewModel: env.GROQ_REVIEW_MODEL,
    summaryModel: env.GROQ_SUMMARY_MODEL,
  })
  const engine = new ReviewEngine({ llm })

  const worker = new Worker<ReviewJobData>(
    REVIEW_QUEUE_NAME,
    async (job: Job<ReviewJobData>) => {
      const { reviewId, owner, repo, prNumber, installationId } = job.data
      const startedAt = Date.now()
      logger.info('worker.review-start', { reviewId, repo: `${owner}/${repo}`, prNumber })

      await markReviewRunning(reviewId)
      try {
        const github = GitHubClient.forInstallation(installationId)
        const { result, meta } = await engine.reviewPullRequest(github, {
          owner,
          repo,
          prNumber,
          installationId,
        })

        await github.postReview({
          owner,
          repo,
          prNumber,
          commitSha: meta.headSha,
          summary: result.summary,
          overallRisk: result.overallRisk,
          findings: result.findings,
        })

        await completeReview({
          reviewId,
          summary: result.summary,
          overallRisk: result.overallRisk,
          model: engine.modelName,
          durationMs: Date.now() - startedAt,
          findings: result.findings,
        })
        logger.info('worker.review-done', {
          reviewId,
          findings: result.findings.length,
          durationMs: Date.now() - startedAt,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error('worker.review-failed', { reviewId, error: message })
        // Mark failed only on the final attempt; intermediate failures retry.
        if (job.attemptsMade + 1 >= (job.opts.attempts ?? 1)) {
          await failReview(reviewId, message)
        }
        throw error
      }
    },
    { connection, concurrency: 1 }
  )

  worker.on('error', (error) => logger.error('worker.error', { error: String(error) }))
  return worker
}
