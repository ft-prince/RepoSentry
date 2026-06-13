import type { ReadonlyURLSearchParams } from 'next/navigation'

export type SortField = 'createdAt' | 'risk' | 'findings'
export type SortOrder = 'asc' | 'desc'

export interface ReviewFilters {
  search: string
  repo: string
  author: string
  status: string
  risk: string
  /** Date-range preset key (see DATE_PRESETS). */
  range: string
  sort: SortField
  order: SortOrder
  page: number
}

export const DEFAULT_FILTERS: ReviewFilters = {
  search: '',
  repo: '',
  author: '',
  status: '',
  risk: '',
  range: '',
  sort: 'createdAt',
  order: 'desc',
  page: 1,
}

export const DATE_PRESETS: { value: string; label: string; days: number }[] = [
  { value: '7d', label: 'Last 7 days', days: 7 },
  { value: '30d', label: 'Last 30 days', days: 30 },
  { value: '90d', label: 'Last 90 days', days: 90 },
]

export const STATUS_OPTIONS = ['completed', 'running', 'queued', 'failed'] as const
export const RISK_OPTIONS = ['critical', 'high', 'medium', 'low', 'none'] as const

const SORT_FIELDS: SortField[] = ['createdAt', 'risk', 'findings']

export function parseFilters(params: ReadonlyURLSearchParams): ReviewFilters {
  const sortParam = params.get('sort')
  const orderParam = params.get('order')
  return {
    search: params.get('search') ?? '',
    repo: params.get('repo') ?? '',
    author: params.get('author') ?? '',
    status: params.get('status') ?? '',
    risk: params.get('risk') ?? '',
    range: params.get('range') ?? '',
    sort: SORT_FIELDS.includes(sortParam as SortField) ? (sortParam as SortField) : 'createdAt',
    order: orderParam === 'asc' ? 'asc' : 'desc',
    page: Math.max(1, Number(params.get('page')) || 1),
  }
}

/** Serialize filters to a URLSearchParams, omitting defaults to keep URLs clean. */
export function filtersToQuery(filters: ReviewFilters): URLSearchParams {
  const query = new URLSearchParams()
  if (filters.search) query.set('search', filters.search)
  if (filters.repo) query.set('repo', filters.repo)
  if (filters.author) query.set('author', filters.author)
  if (filters.status) query.set('status', filters.status)
  if (filters.risk) query.set('risk', filters.risk)
  if (filters.range) query.set('range', filters.range)
  if (filters.sort !== 'createdAt') query.set('sort', filters.sort)
  if (filters.order !== 'desc') query.set('order', filters.order)
  if (filters.page > 1) query.set('page', String(filters.page))
  return query
}

/** Build the API request query, expanding the date preset into an ISO `since`. */
export function filtersToApiQuery(filters: ReviewFilters, pageSize: number): URLSearchParams {
  const query = new URLSearchParams({ page: String(filters.page), pageSize: String(pageSize) })
  if (filters.search) query.set('search', filters.search)
  if (filters.repo) query.set('repo', filters.repo)
  if (filters.author) query.set('author', filters.author)
  if (filters.status) query.set('status', filters.status)
  if (filters.risk) query.set('risk', filters.risk)
  query.set('sort', filters.sort)
  query.set('order', filters.order)

  const preset = DATE_PRESETS.find((p) => p.value === filters.range)
  if (preset) {
    const since = new Date(Date.now() - preset.days * 24 * 60 * 60 * 1000)
    query.set('since', since.toISOString())
  }
  return query
}

export interface ActiveFilter {
  key: keyof ReviewFilters
  label: string
}

/** Human-readable chips for the filters that are currently narrowing results. */
export function activeFilters(filters: ReviewFilters): ActiveFilter[] {
  const chips: ActiveFilter[] = []
  if (filters.search) chips.push({ key: 'search', label: `“${filters.search}”` })
  if (filters.repo) chips.push({ key: 'repo', label: filters.repo })
  if (filters.author) chips.push({ key: 'author', label: `@${filters.author}` })
  if (filters.status) chips.push({ key: 'status', label: `status: ${filters.status}` })
  if (filters.risk) chips.push({ key: 'risk', label: `risk: ${filters.risk}` })
  if (filters.range) {
    const preset = DATE_PRESETS.find((p) => p.value === filters.range)
    if (preset) chips.push({ key: 'range', label: preset.label.toLowerCase() })
  }
  return chips
}

export function hasActiveFilters(filters: ReviewFilters): boolean {
  return activeFilters(filters).length > 0
}
