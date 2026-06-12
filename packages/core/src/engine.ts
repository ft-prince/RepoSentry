import type { ReviewLLM, ReviewContext } from './llm/types.js'
import type { GitHubClient } from './github.js'
import {
  SEVERITY_RANK,
  type ChangedFile,
  type Finding,
  type PullRequestMeta,
  type PullRequestRef,
  type ReviewResult,
} from './types.js'
import {
  DEFAULT_REPO_CONFIG,
  isIgnoredFile,
  meetsSeverityThreshold,
  parseRepoConfig,
  type RepoConfig,
} from './config.js'
import { chunkDiffs, parseFileDiff, splitUnifiedDiff, type FileDiff } from './diff.js'
import { logger } from './logger.js'

/** ~6k tokens of diff per LLM call keeps llama-3.3-70b well inside its context. */
const MAX_CHUNK_CHARS = 24_000
/** Hard cap on findings posted to a single PR — beyond this it's noise. */
const MAX_FINDINGS_PER_REVIEW = 30

export interface EngineOptions {
  llm: ReviewLLM
  maxChunkChars?: number
}

/**
 * The review engine. Pure orchestration: fetch diff → filter → chunk →
 * LLM review per chunk → validate/anchor findings → summarize.
 * No GitHub posting and no DB writes happen here; callers compose those.
 */
export class ReviewEngine {
  private readonly llm: ReviewLLM
  private readonly maxChunkChars: number

  constructor(options: EngineOptions) {
    this.llm = options.llm
    this.maxChunkChars = options.maxChunkChars ?? MAX_CHUNK_CHARS
  }

  get modelName(): string {
    return this.llm.modelName
  }

  /** Review a GitHub pull request. Returns findings anchored to valid diff lines. */
  async reviewPullRequest(
    github: GitHubClient,
    ref: PullRequestRef
  ): Promise<{ result: ReviewResult; meta: PullRequestMeta; config: RepoConfig }> {
    const meta = await github.getPullRequest(ref.owner, ref.repo, ref.prNumber)
    const [files, configFile] = await Promise.all([
      github.listChangedFiles(ref.owner, ref.repo, ref.prNumber),
      github.getRepoConfigFile(ref.owner, ref.repo, meta.headSha),
    ])
    const config = parseRepoConfig(configFile)

    const context: ReviewContext = {
      description: describePullRequest(meta),
      focusAreas: config.focus,
    }

    const result = await this.reviewFiles(files, context, config)
    return { result, meta, config }
  }

  /** Review a raw unified diff (no GitHub access needed) — used by the MCP `review_diff` tool. */
  async reviewRawDiff(
    rawDiff: string,
    extraContext?: string,
    config: RepoConfig = DEFAULT_REPO_CONFIG
  ): Promise<ReviewResult> {
    const files = splitUnifiedDiff(rawDiff)
    if (files.length === 0) {
      return {
        findings: [],
        summary: 'The input did not contain a parseable unified diff.',
        overallRisk: 'none',
        skipped: 0,
      }
    }
    const context: ReviewContext = {
      description: extraContext?.trim() || 'Ad-hoc diff review (no pull request context provided).',
      focusAreas: config.focus,
    }
    return this.reviewFiles(files, context, config)
  }

  private async reviewFiles(
    files: ChangedFile[],
    context: ReviewContext,
    config: RepoConfig
  ): Promise<ReviewResult> {
    const diffs = files
      .filter((f) => !isIgnoredFile(f.filename, config))
      .map(parseFileDiff)
      .filter((d): d is FileDiff => d !== null)

    if (diffs.length === 0) {
      return {
        findings: [],
        summary: 'No reviewable files in this change (everything matched the ignore list or had no text diff).',
        overallRisk: 'none',
        skipped: 0,
      }
    }

    const chunks = chunkDiffs(diffs, this.maxChunkChars)
    logger.info('engine.review-start', { files: diffs.length, chunks: chunks.length })

    const diffsByFile = new Map(diffs.map((d) => [d.filename, d]))
    const rawFindings: Finding[] = []
    let skipped = 0

    // Sequential on purpose: one in-flight Groq call respects free-tier limits.
    for (const chunk of chunks) {
      const review = await this.llm.review(chunk.text, context)
      for (const finding of review.findings) {
        const anchored = anchorFinding(finding, diffsByFile)
        if (anchored) rawFindings.push(anchored)
        else {
          skipped++
          logger.warn('engine.finding-unanchored', { file: finding.file, line: finding.line })
        }
      }
    }

    const findings = dedupeAndFilter(rawFindings, config).slice(0, MAX_FINDINGS_PER_REVIEW)
    const summary = await this.llm.summarize(findings, context)

    logger.info('engine.review-done', { findings: findings.length, skipped })
    return { findings, summary: summary.summary, overallRisk: summary.overallRisk, skipped }
  }
}

function describePullRequest(meta: PullRequestMeta): string {
  const body = meta.body?.trim()
  return [
    `Title: ${meta.title}`,
    `Author: ${meta.author}`,
    `Branch: ${meta.headBranch} → ${meta.baseBranch}`,
    body ? `Description:\n${truncate(body, 2_000)}` : 'Description: (none)',
  ].join('\n')
}

/**
 * Validate that a finding points at a line that exists in the file's diff.
 * If the exact line is not commentable, snap to the nearest commentable line
 * within 3 lines; otherwise drop the finding (never post a floating comment).
 */
function anchorFinding(finding: Finding, diffsByFile: Map<string, FileDiff>): Finding | null {
  const diff = diffsByFile.get(finding.file)
  if (!diff) return null
  if (diff.commentableLines.has(finding.line)) return finding

  const SNAP_DISTANCE = 3
  for (let offset = 1; offset <= SNAP_DISTANCE; offset++) {
    for (const candidate of [finding.line + offset, finding.line - offset]) {
      if (candidate > 0 && diff.commentableLines.has(candidate)) {
        return { ...finding, line: candidate }
      }
    }
  }
  return null
}

/** Collapse duplicates (same file+line+category), keep the most severe, apply the threshold, sort. */
function dedupeAndFilter(findings: Finding[], config: RepoConfig): Finding[] {
  const byKey = new Map<string, Finding>()
  for (const finding of findings) {
    const key = `${finding.file}:${finding.line}:${finding.category}`
    const existing = byKey.get(key)
    if (!existing || SEVERITY_RANK[finding.severity] < SEVERITY_RANK[existing.severity]) {
      byKey.set(key, finding)
    }
  }
  return [...byKey.values()]
    .filter((f) => meetsSeverityThreshold(f.severity, config.severityThreshold))
    .sort(
      (a, b) =>
        SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
        a.file.localeCompare(b.file) ||
        a.line - b.line
    )
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}…`
}
