import { describe, expect, test } from 'vitest'
import { annotatePatch, chunkDiffs, parseFileDiff, splitUnifiedDiff } from './diff.js'
import type { ChangedFile } from './types.js'

const SAMPLE_PATCH = [
  '@@ -10,4 +10,6 @@ function add(a, b) {',
  ' const x = 1',
  '-const y = 2',
  '+const y = 3',
  '+const z = 4',
  ' return x + y',
  '+// trailing comment',
].join('\n')

const file = (patch?: string): ChangedFile => ({
  filename: 'src/math.ts',
  status: 'modified',
  additions: 3,
  deletions: 1,
  patch,
})

describe('parseFileDiff', () => {
  test('returns null when there is no patch (binary files)', () => {
    expect(parseFileDiff(file(undefined))).toBeNull()
  })

  test('computes commentable new-file lines from hunks', () => {
    const diff = parseFileDiff(file(SAMPLE_PATCH))!
    // new lines: 10 ctx, 11 (+y=3), 12 (+z=4), 13 ctx, 14 (+comment)
    expect([...diff.commentableLines].sort((a, b) => a - b)).toEqual([10, 11, 12, 13, 14])
    expect([...diff.addedLines].sort((a, b) => a - b)).toEqual([11, 12, 14])
  })
})

describe('annotatePatch', () => {
  test('prefixes new-file line numbers and skips deletions', () => {
    const diff = parseFileDiff(file(SAMPLE_PATCH))!
    const lines = annotatePatch(diff).split('\n')
    expect(lines[1]).toBe('   10  const x = 1')
    expect(lines[2]).toBe('      -const y = 2')
    expect(lines[3]).toBe('   11 +const y = 3')
  })
})

describe('chunkDiffs', () => {
  test('groups small files into one chunk', () => {
    const diffs = [parseFileDiff(file(SAMPLE_PATCH))!, parseFileDiff(file(SAMPLE_PATCH))!]
    const chunks = chunkDiffs(diffs, 10_000)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]!.files).toHaveLength(2)
  })

  test('splits when the budget is exceeded', () => {
    const diffs = [parseFileDiff(file(SAMPLE_PATCH))!, parseFileDiff(file(SAMPLE_PATCH))!]
    const chunks = chunkDiffs(diffs, 200)
    expect(chunks.length).toBeGreaterThan(1)
  })
})

describe('splitUnifiedDiff', () => {
  test('parses a git-style multi-file diff', () => {
    const raw = [
      'diff --git a/src/a.ts b/src/a.ts',
      'index 111..222 100644',
      '--- a/src/a.ts',
      '+++ b/src/a.ts',
      '@@ -1,2 +1,2 @@',
      '-old line',
      '+new line',
      ' context',
      'diff --git a/src/b.ts b/src/b.ts',
      '--- /dev/null',
      '+++ b/src/b.ts',
      '@@ -0,0 +1,1 @@',
      '+brand new',
    ].join('\n')
    const files = splitUnifiedDiff(raw)
    expect(files.map((f) => f.filename)).toEqual(['src/a.ts', 'src/b.ts'])
    expect(files[1]!.status).toBe('added')
    expect(files[0]!.additions).toBe(1)
    expect(files[0]!.deletions).toBe(1)
  })

  test('returns empty for non-diff input', () => {
    expect(splitUnifiedDiff('hello world')).toEqual([])
  })
})
