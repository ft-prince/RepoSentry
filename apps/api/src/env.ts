import { z } from 'zod'

/**
 * Validate required configuration at startup — fail fast with a clear message
 * instead of a cryptic runtime error three requests in.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),
  GITHUB_APP_ID: z.string().min(1, 'GITHUB_APP_ID is required'),
  GITHUB_PRIVATE_KEY: z.string().min(1, 'GITHUB_PRIVATE_KEY is required'),
  GITHUB_WEBHOOK_SECRET: z.string().min(1, 'GITHUB_WEBHOOK_SECRET is required'),
  /** Shared secret the dashboard uses to call this API server-side. */
  API_INTERNAL_TOKEN: z.string().min(16, 'API_INTERNAL_TOKEN must be at least 16 chars'),
  GROQ_REVIEW_MODEL: z.string().optional(),
  GROQ_SUMMARY_MODEL: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

export function loadEnv(): Env {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Invalid environment configuration:\n${issues}`)
  }
  return result.data
}
