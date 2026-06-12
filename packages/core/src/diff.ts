import type { ChangedFile } from './types.js'

/**
 * Diff utilities: parse per-file unified patches (as returned by the GitHub
 * "list PR files" API), figure out which new-file line numbers are commentable,
 * and chunk large diffs to stay inside the LLM context budget.
 */

export interface FileDiff {
  filename: string
  status: string
  additions: number
  deletions: number
  patch: string
  /** New-file line numbers that appear in the diff (added or context) — valid anchors for inline comments. */
  commentableLines: Set<number>
  /** New-file line numbers that were added (RIGHT side `+` lines). */
  addedLines: Set<number>
}

/** A batch of file diffs sized to fit one LLM call. */
export interface DiffChunk {
  files: FileDiff[]
  /** The prompt-ready diff text for this chunk. */
  text: string
}

const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/

export function parseFileDiff(file: ChangedFile): FileDiff | null {
  if (!file.patch) return null
  const commentableLines = new Set<number>()
  const addedLines = new Set<number>()

  let newLine = 0
  for (const line of file.patch.split('\n')) {
    const hunk = HUNK_HEADER.exec(line)
    if (hunk) {
      newLine = parseInt(hunk[3]!, 10)
      continue
    }
    if (line.startsWith('+')) {
      commentableLines.add(newLine)
      addedLines.add(newLine)
      newLine++
    } else if (line.startsWith('-')) {
      // deletion: old side only, new line number does not advance
    } else if (line.startsWith('\\')) {
      // "\ No newline at end of file"
    } else {
      commentableLines.add(newLine)
      newLine++
    }
  }

  return {
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    patch: file.patch,
    commentableLines,
    addedLines,
  }
}

/**
 * Annotate a patch with explicit new-file line numbers so the model reports
 * `line` values we can anchor comments to without guessing.
 */
export function annotatePatch(diff: FileDiff): string {
  const out: string[] = []
  let newLine = 0
  for (const line of diff.patch.split('\n')) {
    const hunk = HUNK_HEADER.exec(line)
    if (hunk) {
      newLine = parseInt(hunk[3]!, 10)
      out.push(line)
      continue
    }
    if (line.startsWith('-') || line.startsWith('\\')) {
      out.push(`      ${line}`)
    } else {
      out.push(`${String(newLine).padStart(5)} ${line}`)
      newLine++
    }
  }
  return out.join('\n')
}

function fileSection(diff: FileDiff): string {
  return `--- FILE: ${diff.filename} (${diff.status}, +${diff.additions}/-${diff.deletions}) ---\n${annotatePatch(diff)}`
}

/**
 * Group file diffs into chunks whose rendered text stays under maxChars
 * (~4 chars per token). A single oversized file gets its patch truncated
 * rather than dropped, so huge files still get a partial review.
 */
export function chunkDiffs(diffs: FileDiff[], maxChars: number): DiffChunk[] {
  const chunks: DiffChunk[] = []
  let current: FileDiff[] = []
  let currentLen = 0

  const flush = () => {
    if (current.length === 0) return
    chunks.push({ files: current, text: current.map(fileSection).join('\n\n') })
    current = []
    currentLen = 0
  }

  for (const diff of diffs) {
    let section = fileSection(diff)
    if (section.length > maxChars) {
      const truncated: FileDiff = {
        ...diff,
        patch: truncatePatchAtHunkBoundary(diff.patch, maxChars),
      }
      section = fileSection(truncated)
      flush()
      chunks.push({ files: [truncated], text: section })
      continue
    }
    if (currentLen + section.length > maxChars) flush()
    current.push(diff)
    currentLen += section.length + 2
  }
  flush()
  return chunks
}

/** Cut a patch at the last full hunk that fits, so we never feed half a hunk. */
function truncatePatchAtHunkBoundary(patch: string, maxChars: number): string {
  if (patch.length <= maxChars) return patch
  const lines = patch.split('\n')
  const kept: string[] = []
  let length = 0
  let lastHunkStart = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (HUNK_HEADER.test(line)) lastHunkStart = kept.length
    if (length + line.length + 1 > maxChars) {
      return kept.slice(0, lastHunkStart || kept.length).join('\n')
    }
    kept.push(line)
    length += line.length + 1
  }
  return kept.join('\n')
}

/**
 * Parse a raw multi-file unified diff (e.g. `git diff` output) into ChangedFile
 * records. Used by the MCP `review_diff` tool where there is no GitHub API.
 */
export function splitUnifiedDiff(rawDiff: string): ChangedFile[] {
  const files: ChangedFile[] = []
  // Split on "diff --git" headers; also tolerate bare ---/+++ diffs.
  const parts = rawDiff.split(/^diff --git /m).filter((p) => p.trim().length > 0)
  const sources = parts.length > 0 ? parts : [rawDiff]

  for (const part of sources) {
    const newFileMatch = /^\+\+\+ (?:b\/)?(.+)$/m.exec(part)
    const oldFileMatch = /^--- (?:a\/)?(.+)$/m.exec(part)
    const filename =
      newFileMatch && newFileMatch[1] !== '/dev/null'
        ? newFileMatch[1]!.trim()
        : oldFileMatch?.[1]?.trim()
    if (!filename) continue

    const firstHunk = part.search(/^@@ /m)
    if (firstHunk === -1) continue
    const patch = part.slice(firstHunk).trimEnd()

    let additions = 0
    let deletions = 0
    for (const line of patch.split('\n')) {
      if (line.startsWith('+') && !line.startsWith('+++')) additions++
      else if (line.startsWith('-') && !line.startsWith('---')) deletions++
    }

    const status =
      oldFileMatch?.[1] === '/dev/null'
        ? 'added'
        : newFileMatch?.[1] === '/dev/null'
          ? 'removed'
          : 'modified'

    files.push({ filename, status, additions, deletions, patch })
  }
  return files
}
