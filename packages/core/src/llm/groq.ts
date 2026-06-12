import Groq from 'groq-sdk'
import type { ZodSchema } from 'zod'
import {
  chunkReviewSchema,
  summarySchema,
  type ChunkReview,
  type Finding,
  type ReviewSummary,
} from '../types.js'
import type { ReviewContext, ReviewLLM } from './types.js'
import {
  REVIEW_SYSTEM_PROMPT,
  SUMMARY_SYSTEM_PROMPT,
  buildReviewUserPrompt,
  buildSummaryUserPrompt,
} from './prompts.js'
import { logger } from '../logger.js'

export interface GroqReviewLLMOptions {
  apiKey?: string
  /** Model for the heavy review pass. */
  reviewModel?: string
  /** Cheaper model for the summary pass. */
  summaryModel?: string
  maxJsonRetries?: number
}

const DEFAULT_REVIEW_MODEL = 'llama-3.3-70b-versatile'
const DEFAULT_SUMMARY_MODEL = 'llama-3.1-8b-instant'
const DEFAULT_JSON_RETRIES = 3
const BACKOFF_BASE_MS = 2_000
const MAX_HTTP_RETRIES = 5

/**
 * Groq implementation of the ReviewLLM seam. Uses Groq JSON mode for
 * structured output, validates with Zod, retries malformed JSON up to
 * maxJsonRetries, and backs off exponentially on HTTP 429 (free-tier limits).
 */
export class GroqReviewLLM implements ReviewLLM {
  private readonly client: Groq
  private readonly reviewModel: string
  private readonly summaryModel: string
  private readonly maxJsonRetries: number

  constructor(options: GroqReviewLLMOptions = {}) {
    const apiKey = options.apiKey ?? process.env.GROQ_API_KEY
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not set — get a free key at https://console.groq.com')
    }
    // Disable the SDK's built-in retries; we own backoff so 429 waits are visible in logs.
    this.client = new Groq({ apiKey, maxRetries: 0 })
    this.reviewModel = options.reviewModel ?? DEFAULT_REVIEW_MODEL
    this.summaryModel = options.summaryModel ?? DEFAULT_SUMMARY_MODEL
    this.maxJsonRetries = options.maxJsonRetries ?? DEFAULT_JSON_RETRIES
  }

  get modelName(): string {
    return this.reviewModel
  }

  async review(diffChunk: string, context: ReviewContext): Promise<ChunkReview> {
    const result = await this.completeJson(
      this.reviewModel,
      REVIEW_SYSTEM_PROMPT,
      buildReviewUserPrompt(diffChunk, context.description, context.focusAreas),
      chunkReviewSchema
    )
    // Fail soft: a chunk whose JSON never validated contributes zero findings.
    return result ?? { findings: [] }
  }

  async summarize(findings: Finding[], context: ReviewContext): Promise<ReviewSummary> {
    const result = await this.completeJson(
      this.summaryModel,
      SUMMARY_SYSTEM_PROMPT,
      buildSummaryUserPrompt(context.description, JSON.stringify(findings, null, 2)),
      summarySchema
    )
    if (result) return result
    // Fail soft with a deterministic fallback derived from the findings.
    return {
      summary:
        findings.length === 0
          ? 'Automated review found no issues. Human review is still recommended for design-level concerns.'
          : `Automated review found ${findings.length} issue(s). See inline comments for details.`,
      overallRisk: worstRisk(findings),
    }
  }

  async explain(finding: Finding, context: string): Promise<string> {
    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content:
          'You are RepoSentry, an automated code reviewer. Explain one review finding in depth for the engineer fixing it: why it is a problem, what can go wrong in production, and why the suggested fix (if any) is correct. Be concrete and concise (under 300 words). Plain prose and short code snippets only.',
      },
      {
        role: 'user',
        content: `Context: ${context}\n\nFinding:\n${JSON.stringify(finding, null, 2)}`,
      },
    ]
    const raw = await this.completeWithBackoff(this.reviewModel, messages, false)
    return raw ?? 'Explanation unavailable: the LLM request failed after retries.'
  }

  /**
   * One JSON-mode completion, Zod-validated. Retries malformed output up to
   * maxJsonRetries with a corrective message, and 429/5xx with backoff.
   * Returns null when every attempt failed (caller fails soft).
   */
  private async completeJson<T>(
    model: string,
    system: string,
    user: string,
    schema: ZodSchema<T>
  ): Promise<T | null> {
    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]

    for (let attempt = 1; attempt <= this.maxJsonRetries; attempt++) {
      const raw = await this.completeWithBackoff(model, messages)
      if (raw === null) return null

      const parsed = safeJsonParse(raw)
      if (parsed !== undefined) {
        const result = schema.safeParse(parsed)
        if (result.success) return result.data
        logger.warn('llm.invalid-schema', { model, attempt, issues: result.error.issues.slice(0, 3) })
      } else {
        logger.warn('llm.invalid-json', { model, attempt })
      }

      messages.push({ role: 'assistant', content: raw })
      messages.push({
        role: 'user',
        content:
          'Your previous response was not valid for the required JSON schema. Respond again with ONLY the JSON object in the exact shape specified, no other text.',
      })
    }
    logger.error('llm.json-retries-exhausted', { model })
    return null
  }

  /** HTTP-level call with exponential backoff on 429 and transient 5xx. */
  private async completeWithBackoff(
    model: string,
    messages: Groq.Chat.ChatCompletionMessageParam[],
    jsonMode = true
  ): Promise<string | null> {
    for (let attempt = 0; attempt < MAX_HTTP_RETRIES; attempt++) {
      try {
        const completion = await this.client.chat.completions.create({
          model,
          messages,
          temperature: 0.1,
          max_tokens: 4096,
          ...(jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
        })
        return completion.choices[0]?.message?.content ?? null
      } catch (error) {
        const status = (error as { status?: number }).status
        const isRetryable = status === 429 || (typeof status === 'number' && status >= 500)
        if (!isRetryable || attempt === MAX_HTTP_RETRIES - 1) {
          logger.error('llm.request-failed', { model, status, error: String(error) })
          if (!isRetryable) throw error
          return null
        }
        const delay = BACKOFF_BASE_MS * 2 ** attempt + Math.floor(Math.random() * 500)
        logger.warn('llm.rate-limited', { model, status, retryInMs: delay, attempt })
        await sleep(delay)
      }
    }
    return null
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    // Some models wrap JSON in fences despite instructions — strip and retry once.
    const stripped = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')
    try {
      return JSON.parse(stripped)
    } catch {
      return undefined
    }
  }
}

function worstRisk(findings: Finding[]): ReviewSummary['overallRisk'] {
  if (findings.length === 0) return 'none'
  if (findings.some((f) => f.severity === 'critical')) return 'critical'
  if (findings.some((f) => f.severity === 'high')) return 'high'
  if (findings.some((f) => f.severity === 'medium')) return 'medium'
  return 'low'
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
