import { parse as parseYaml } from 'yaml'
import { z } from 'zod'
import { severitySchema, type Severity } from './types.js'

/**
 * Per-repo configuration, loaded from `.reposentry.yml` at the repo root.
 * Everything is optional; missing keys fall back to DEFAULT_REPO_CONFIG.
 */
export const repoConfigSchema = z.object({
  /** Only post findings at or above this severity. */
  severityThreshold: severitySchema.default('low'),
  /** Glob-ish patterns (supports * and **) for files to skip entirely. */
  ignore: z.array(z.string()).default([]),
  /** Free-text areas the reviewer should pay extra attention to. */
  focus: z.array(z.string()).default([]),
  /** Set false to disable automatic review on PR events. */
  autoReview: z.boolean().default(true),
})

export type RepoConfig = z.infer<typeof repoConfigSchema>

export const DEFAULT_REPO_CONFIG: RepoConfig = repoConfigSchema.parse({})

/** Files nobody wants reviewed. Merged with the per-repo ignore list. */
export const BUILTIN_IGNORE_PATTERNS = [
  '**/pnpm-lock.yaml',
  '**/package-lock.json',
  '**/yarn.lock',
  '**/bun.lockb',
  '**/Cargo.lock',
  '**/poetry.lock',
  '**/composer.lock',
  '**/Gemfile.lock',
  '**/go.sum',
  '**/*.min.js',
  '**/*.min.css',
  '**/*.map',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/node_modules/**',
  '**/vendor/**',
  '**/__generated__/**',
  '**/*.generated.*',
  '**/*.snap',
  '**/*.svg',
]

/** Parse `.reposentry.yml` content. Invalid YAML or schema falls back to defaults. */
export function parseRepoConfig(yamlContent: string | null | undefined): RepoConfig {
  if (!yamlContent) return DEFAULT_REPO_CONFIG
  try {
    const raw: unknown = parseYaml(yamlContent)
    const result = repoConfigSchema.safeParse(raw ?? {})
    return result.success ? result.data : DEFAULT_REPO_CONFIG
  } catch {
    return DEFAULT_REPO_CONFIG
  }
}

/**
 * Minimal glob matcher supporting `**` (any path segments) and `*` (within a segment).
 * Avoids a dependency for the one matching style we need.
 */
export function matchesGlob(filePath: string, pattern: string): boolean {
  const regex = globToRegExp(pattern)
  return regex.test(filePath)
}

function globToRegExp(pattern: string): RegExp {
  let out = ''
  let i = 0
  while (i < pattern.length) {
    const ch = pattern[i]
    if (ch === '*') {
      if (pattern[i + 1] === '*') {
        // `**/` matches zero or more whole segments; bare `**` matches anything
        if (pattern[i + 2] === '/') {
          out += '(?:[^/]+/)*'
          i += 3
        } else {
          out += '.*'
          i += 2
        }
      } else {
        out += '[^/]*'
        i += 1
      }
    } else {
      out += escapeRegExp(ch!)
      i += 1
    }
  }
  return new RegExp(`^${out}$`)
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function isIgnoredFile(filePath: string, config: RepoConfig): boolean {
  const patterns = [...BUILTIN_IGNORE_PATTERNS, ...config.ignore]
  return patterns.some((p) => matchesGlob(filePath, p))
}

export function meetsSeverityThreshold(severity: Severity, threshold: Severity): boolean {
  const rank: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  return rank[severity] <= rank[threshold]
}
