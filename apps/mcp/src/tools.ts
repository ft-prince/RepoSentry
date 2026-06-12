import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import {
  GitHubClient,
  GroqReviewLLM,
  ReviewEngine,
  getFinding,
  listReviews,
  logger,
  prisma,
} from '@reposentry/core'

/**
 * Register the four RepoSentry tools on an MCP server.
 *
 * - review_diff works with only GROQ_API_KEY set.
 * - review_pull_request additionally needs GitHub App credentials and (for the
 *   installation lookup) DATABASE_URL.
 * - list_recent_reviews / explain_finding need DATABASE_URL.
 */
export function registerTools(server: McpServer): void {
  // Lazy: only constructed on first tool call so `--help` and handshakes don't need env vars.
  let engine: ReviewEngine | null = null
  let llm: GroqReviewLLM | null = null
  const getLlm = () => (llm ??= new GroqReviewLLM())
  const getEngine = () => (engine ??= new ReviewEngine({ llm: getLlm() }))

  server.tool(
    'review_pull_request',
    'Run a full AI code review of a GitHub pull request. Fetches the diff via the RepoSentry GitHub App installation, reviews it with the LLM engine, and returns structured findings (file, line, severity, category, explanation, suggested fix) plus a summary and overall merge risk. Does NOT post anything to GitHub.',
    {
      owner: z.string().min(1).describe('Repository owner (user or org), e.g. "vercel"'),
      repo: z.string().min(1).describe('Repository name, e.g. "next.js"'),
      prNumber: z.number().int().positive().describe('Pull request number'),
    },
    async ({ owner, repo, prNumber }) => {
      const repository = await prisma.repository.findUnique({
        where: { fullName: `${owner}/${repo}` },
        include: { installation: { select: { githubInstallationId: true } } },
      })
      if (!repository) {
        return errorResult(
          `Repository ${owner}/${repo} is not connected to RepoSentry. Install the GitHub App on it first (see the dashboard's Repositories page).`
        )
      }
      const installationId = Number(repository.installation.githubInstallationId)
      const github = GitHubClient.forInstallation(installationId)
      const { result, meta } = await getEngine().reviewPullRequest(github, {
        owner,
        repo,
        prNumber,
        installationId,
      })
      return jsonResult({
        pullRequest: { title: meta.title, author: meta.author, url: meta.url, headSha: meta.headSha },
        summary: result.summary,
        overallRisk: result.overallRisk,
        findings: result.findings,
      })
    }
  )

  server.tool(
    'review_diff',
    'Run an AI code review over an arbitrary unified diff (e.g. `git diff` output) without touching GitHub. Returns structured findings, a summary, and an overall risk rating. Optionally pass extra context describing what the change is supposed to do.',
    {
      diff: z.string().min(1).max(400_000).describe('Unified diff text (git diff / PR .diff format)'),
      context: z
        .string()
        .max(5_000)
        .optional()
        .describe('Optional context: what the change is meant to do, constraints, focus areas'),
    },
    async ({ diff, context }) => {
      const result = await getEngine().reviewRawDiff(diff, context)
      return jsonResult({
        summary: result.summary,
        overallRisk: result.overallRisk,
        findings: result.findings,
      })
    }
  )

  server.tool(
    'list_recent_reviews',
    'List recent RepoSentry reviews recorded in the database, optionally filtered to one repository. Returns review id, PR number/title, status, risk, finding count, and timestamps.',
    {
      repo: z
        .string()
        .optional()
        .describe('Optional repository full name filter, e.g. "acme/checkout-service"'),
      limit: z.number().int().positive().max(50).default(10).describe('Max records to return'),
    },
    async ({ repo, limit }) => {
      const { reviews } = await listReviews({ repoFullName: repo, page: 1, pageSize: limit })
      return jsonResult(
        reviews.map((r) => ({
          id: r.id,
          repo: r.repository.fullName,
          prNumber: r.prNumber,
          prTitle: r.prTitle,
          author: r.author,
          status: r.status,
          overallRisk: r.overallRisk,
          findingCount: r._count.findings,
          createdAt: r.createdAt.toISOString(),
        }))
      )
    }
  )

  server.tool(
    'explain_finding',
    'Deep-dive explanation of one stored review finding: why it is a problem, the production impact, and the rationale behind the suggested fix. Pass a finding id from review_pull_request results stored in the dashboard or list_recent_reviews → review detail.',
    {
      findingId: z.string().min(1).describe('Finding id (cuid) from a stored review'),
    },
    async ({ findingId }) => {
      const finding = await getFinding(findingId)
      if (!finding) return errorResult(`No finding with id ${findingId}.`)

      const explanation = await getLlm().explain(
        {
          file: finding.file,
          line: finding.line,
          severity: finding.severity,
          category: finding.category,
          title: finding.title,
          explanation: finding.explanation,
          suggestedFix: finding.suggestedFix,
        },
        `PR #${finding.review.prNumber} "${finding.review.prTitle}" in ${finding.review.repository.fullName} at commit ${finding.review.commitSha.slice(0, 7)}`
      )
      return jsonResult({
        finding: {
          id: finding.id,
          file: finding.file,
          line: finding.line,
          severity: finding.severity,
          category: finding.category,
          title: finding.title,
          suggestedFix: finding.suggestedFix,
        },
        deepExplanation: explanation,
      })
    }
  )

  logger.info('mcp.tools-registered', { tools: 4 })
}

function jsonResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
}

function errorResult(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true }
}
