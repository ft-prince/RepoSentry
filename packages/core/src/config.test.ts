import { describe, expect, test } from 'vitest'
import {
  DEFAULT_REPO_CONFIG,
  isIgnoredFile,
  matchesGlob,
  meetsSeverityThreshold,
  parseRepoConfig,
} from './config.js'

describe('parseRepoConfig', () => {
  test('returns defaults for missing content', () => {
    expect(parseRepoConfig(null)).toEqual(DEFAULT_REPO_CONFIG)
  })

  test('parses a valid config', () => {
    const config = parseRepoConfig(
      ['severityThreshold: high', 'ignore:', '  - "docs/**"', 'focus:', '  - auth'].join('\n')
    )
    expect(config.severityThreshold).toBe('high')
    expect(config.ignore).toEqual(['docs/**'])
    expect(config.focus).toEqual(['auth'])
  })

  test('falls back to defaults on invalid YAML or schema', () => {
    expect(parseRepoConfig('severityThreshold: [nonsense')).toEqual(DEFAULT_REPO_CONFIG)
    expect(parseRepoConfig('severityThreshold: extreme')).toEqual(DEFAULT_REPO_CONFIG)
  })
})

describe('matchesGlob', () => {
  test('** crosses path segments', () => {
    expect(matchesGlob('a/b/c/file.min.js', '**/*.min.js')).toBe(true)
    expect(matchesGlob('file.min.js', '**/*.min.js')).toBe(true)
    expect(matchesGlob('a/dist/x.js', '**/dist/**')).toBe(true)
  })

  test('* stays within a segment', () => {
    expect(matchesGlob('src/a.ts', 'src/*.ts')).toBe(true)
    expect(matchesGlob('src/deep/a.ts', 'src/*.ts')).toBe(false)
  })
})

describe('isIgnoredFile', () => {
  test('skips lockfiles by default', () => {
    expect(isIgnoredFile('pnpm-lock.yaml', DEFAULT_REPO_CONFIG)).toBe(true)
    expect(isIgnoredFile('packages/core/src/engine.ts', DEFAULT_REPO_CONFIG)).toBe(false)
  })

  test('honors per-repo ignore globs', () => {
    const config = { ...DEFAULT_REPO_CONFIG, ignore: ['docs/**'] }
    expect(isIgnoredFile('docs/guide.md', config)).toBe(true)
  })
})

describe('meetsSeverityThreshold', () => {
  test('threshold high keeps critical and high only', () => {
    expect(meetsSeverityThreshold('critical', 'high')).toBe(true)
    expect(meetsSeverityThreshold('high', 'high')).toBe(true)
    expect(meetsSeverityThreshold('medium', 'high')).toBe(false)
  })
})
