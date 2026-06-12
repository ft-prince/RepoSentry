import { z } from 'zod'

export const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const
export const CATEGORIES = ['bug', 'security', 'performance', 'style', 'maintainability'] as const
export const RISKS = ['none', 'low', 'medium', 'high', 'critical'] as const

export const severitySchema = z.enum(SEVERITIES)
export const categorySchema = z.enum(CATEGORIES)
export const riskSchema = z.enum(RISKS)

export type Severity = z.infer<typeof severitySchema>
export type FindingCategory = z.infer<typeof categorySchema>
export type Risk = z.infer<typeof riskSchema>

/** Order matters: index 0 is most severe. Used for threshold filtering and sorting. */
export const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

export const findingSchema = z.object({
  file: z.string().min(1),
  line: z.number().int().positive(),
  severity: severitySchema,
  category: categorySchema,
  title: z.string().min(1).max(200),
  explanation: z.string().min(1),
  suggestedFix: z.string().optional().nullable(),
})

export type Finding = z.infer<typeof findingSchema>

/** What the LLM must return for a single diff chunk. */
export const chunkReviewSchema = z.object({
  findings: z.array(findingSchema),
})

export type ChunkReview = z.infer<typeof chunkReviewSchema>

/** What the LLM must return for the final summary pass. */
export const summarySchema = z.object({
  summary: z.string().min(1),
  overallRisk: riskSchema,
})

export type ReviewSummary = z.infer<typeof summarySchema>

export interface ReviewResult {
  findings: Finding[]
  summary: string
  overallRisk: Risk
  /** Findings the model produced but that failed validation or line-mapping. Logged, never posted. */
  skipped: number
}

export interface PullRequestRef {
  owner: string
  repo: string
  prNumber: number
  installationId: number
}

export interface ChangedFile {
  filename: string
  status: string
  additions: number
  deletions: number
  /** Unified diff patch for this file. Missing for binary/huge files. */
  patch?: string
}

export interface PullRequestMeta {
  number: number
  title: string
  body: string | null
  author: string
  baseBranch: string
  headBranch: string
  headSha: string
  url: string
}
