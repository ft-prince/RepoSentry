import type { ChunkReview, Finding, ReviewSummary } from '../types.js'

export interface ReviewContext {
  /** Repo + PR metadata shown to the model (title, description, branch). */
  description: string
  /** Free-text focus areas from repo config. */
  focusAreas: string[]
}

/**
 * The LLM seam. The review engine only talks to this interface, so swapping
 * Groq for OpenRouter or a local Ollama model means writing one new class —
 * the engine, API, and MCP server are untouched.
 */
export interface ReviewLLM {
  /** Review one diff chunk and return validated findings. */
  review(diffChunk: string, context: ReviewContext): Promise<ChunkReview>
  /** Produce the overall summary + risk from the merged finding list. */
  summarize(findings: Finding[], context: ReviewContext): Promise<ReviewSummary>
  /** Free-text deep dive on one finding: why it matters and how the fix works. */
  explain(finding: Finding, context: string): Promise<string>
  /** Model identifier recorded on each review for traceability. */
  readonly modelName: string
}
