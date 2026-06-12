import { Octokit } from '@octokit/rest'
import { createAppAuth } from '@octokit/auth-app'
import type { ChangedFile, Finding, PullRequestMeta, Risk } from './types.js'
import { logger } from './logger.js'

export interface GitHubAppCredentials {
  appId: string
  privateKey: string
}

export function loadGitHubAppCredentials(): GitHubAppCredentials {
  const appId = process.env.GITHUB_APP_ID
  const privateKey = process.env.GITHUB_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!appId || !privateKey) {
    throw new Error('GITHUB_APP_ID and GITHUB_PRIVATE_KEY must be set')
  }
  return { appId, privateKey }
}

/**
 * GitHub client scoped to one App installation. Wraps Octokit so the rest of
 * the codebase never touches raw REST shapes — and so a GitLab/Bitbucket
 * client can implement the same surface later.
 */
export class GitHubClient {
  private readonly octokit: Octokit

  constructor(credentials: GitHubAppCredentials, installationId: number) {
    this.octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: credentials.appId,
        privateKey: credentials.privateKey,
        installationId,
      },
    })
  }

  static forInstallation(installationId: number): GitHubClient {
    return new GitHubClient(loadGitHubAppCredentials(), installationId)
  }

  async getPullRequest(owner: string, repo: string, prNumber: number): Promise<PullRequestMeta> {
    const { data } = await this.octokit.pulls.get({ owner, repo, pull_number: prNumber })
    return {
      number: data.number,
      title: data.title,
      body: data.body,
      author: data.user?.login ?? 'unknown',
      baseBranch: data.base.ref,
      headBranch: data.head.ref,
      headSha: data.head.sha,
      url: data.html_url,
    }
  }

  async listChangedFiles(owner: string, repo: string, prNumber: number): Promise<ChangedFile[]> {
    const files = await this.octokit.paginate(this.octokit.pulls.listFiles, {
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    })
    return files.map((f) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      patch: f.patch,
    }))
  }

  /** Fetch a file's content at a ref. Returns null when missing or not a file. */
  async getFileContent(owner: string, repo: string, path: string, ref: string): Promise<string | null> {
    try {
      const { data } = await this.octokit.repos.getContent({ owner, repo, path, ref })
      if (Array.isArray(data) || data.type !== 'file' || !('content' in data)) return null
      return Buffer.from(data.content, 'base64').toString('utf8')
    } catch (error) {
      const status = (error as { status?: number }).status
      if (status === 404) return null
      throw error
    }
  }

  /** Load `.reposentry.yml` from the PR's head ref, if present. */
  async getRepoConfigFile(owner: string, repo: string, ref: string): Promise<string | null> {
    return this.getFileContent(owner, repo, '.reposentry.yml', ref)
  }

  /**
   * Post ONE review containing all inline comments plus the summary body.
   * Zero findings → an approving review so the PR author gets a signal either way.
   */
  async postReview(params: {
    owner: string
    repo: string
    prNumber: number
    commitSha: string
    summary: string
    overallRisk: Risk
    findings: Finding[]
  }): Promise<void> {
    const { owner, repo, prNumber, commitSha, summary, overallRisk, findings } = params

    const comments = findings.map((f) => ({
      path: f.file,
      line: f.line,
      side: 'RIGHT' as const,
      body: formatFindingComment(f),
    }))

    const body = formatReviewBody(summary, overallRisk, findings)

    try {
      await this.octokit.pulls.createReview({
        owner,
        repo,
        pull_number: prNumber,
        commit_id: commitSha,
        event: findings.length === 0 ? 'APPROVE' : 'COMMENT',
        body,
        comments,
      })
    } catch (error) {
      // A stale line anchor makes GitHub reject the whole review (422).
      // Fall back to a summary-only review rather than posting nothing.
      const status = (error as { status?: number }).status
      if (status === 422 && comments.length > 0) {
        logger.warn('github.review-comments-rejected', { owner, repo, prNumber })
        await this.octokit.pulls.createReview({
          owner,
          repo,
          pull_number: prNumber,
          commit_id: commitSha,
          event: 'COMMENT',
          body: `${body}\n\n---\n_Inline comment anchors were rejected by GitHub (the diff may have changed); findings are listed above._\n\n${findings.map((f) => `- **${f.severity}** \`${f.file}:${f.line}\` — ${f.title}`).join('\n')}`,
        })
        return
      }
      throw error
    }
  }
}

const SEVERITY_LABEL: Record<Finding['severity'], string> = {
  critical: '🔴 Critical',
  high: '🟠 High',
  medium: '🟡 Medium',
  low: '⚪ Low',
}

function formatFindingComment(finding: Finding): string {
  const parts = [
    `**${SEVERITY_LABEL[finding.severity]} · ${finding.category}** — ${finding.title}`,
    '',
    finding.explanation,
  ]
  if (finding.suggestedFix) {
    parts.push('', '**Suggested fix:**', '```suggestion', finding.suggestedFix, '```')
  }
  parts.push('', '<sub>RepoSentry · automated first-pass review</sub>')
  return parts.join('\n')
}

function formatReviewBody(summary: string, overallRisk: Risk, findings: Finding[]): string {
  const counts: Record<string, number> = {}
  for (const f of findings) counts[f.severity] = (counts[f.severity] ?? 0) + 1
  const breakdown =
    findings.length === 0
      ? 'No issues found.'
      : (['critical', 'high', 'medium', 'low'] as const)
          .filter((s) => counts[s])
          .map((s) => `${SEVERITY_LABEL[s]}: ${counts[s]}`)
          .join(' · ')

  return [
    '## RepoSentry review',
    '',
    summary,
    '',
    `**Overall risk:** \`${overallRisk}\` · **Findings:** ${findings.length}`,
    '',
    breakdown,
    '',
    '<sub>Automated first-pass review — catches obvious bugs, security smells and style issues. It does not replace a human reviewer.</sub>',
  ].join('\n')
}
