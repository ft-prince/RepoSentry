'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  GitPullRequest,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  SlidersHorizontal,
  ArrowDown,
  ArrowUp,
} from 'lucide-react'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input, Select } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ReviewRow } from '@/components/review-row'
import { SavedViewsBar } from '@/components/reviews/saved-views-bar'
import { useDebounce } from '@/lib/use-debounce'
import {
  activeFilters,
  DATE_PRESETS,
  DEFAULT_FILTERS,
  filtersToApiQuery,
  filtersToQuery,
  hasActiveFilters,
  parseFilters,
  RISK_OPTIONS,
  STATUS_OPTIONS,
  type ReviewFilters,
  type SortField,
} from '@/lib/review-filters'
import type { ApiEnvelope, ReviewListItem } from '@/lib/types'

const PAGE_SIZE = 20

interface Facets {
  authors: string[]
  repos: string[]
}

async function fetchJson<T>(url: string): Promise<ApiEnvelope<T>> {
  const res = await fetch(url)
  const body = (await res.json()) as ApiEnvelope<T>
  if (!body.success) throw new Error(body.error ?? 'request failed')
  return body
}

export function ReviewsExplorer() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const filters = useMemo(() => parseFilters(searchParams), [searchParams])

  // Write filters to the URL — this IS the state, so views are shareable/bookmarkable.
  const apply = (patch: Partial<ReviewFilters>, resetPage = true) => {
    const next: ReviewFilters = { ...filters, ...patch, ...(resetPage ? { page: 1 } : {}) }
    const query = filtersToQuery(next).toString()
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  // Debounced search box, kept in sync when filters change externally (chips, saved views).
  const [searchInput, setSearchInput] = useState(filters.search)
  const debouncedSearch = useDebounce(searchInput, 300)
  useEffect(() => setSearchInput(filters.search), [filters.search])
  useEffect(() => {
    if (debouncedSearch !== filters.search) apply({ search: debouncedSearch })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const facetsQuery = useQuery({
    queryKey: ['review-facets'],
    queryFn: () => fetchJson<Facets>('/api/proxy/reviews/facets'),
    staleTime: 60_000,
  })
  const facets = facetsQuery.data?.data ?? { authors: [], repos: [] }

  const reviewsQuery = useQuery({
    queryKey: ['reviews', filtersToApiQuery(filters, PAGE_SIZE).toString()],
    queryFn: () =>
      fetchJson<ReviewListItem[]>(`/api/proxy/reviews?${filtersToApiQuery(filters, PAGE_SIZE)}`),
    placeholderData: keepPreviousData,
  })

  const reviews = reviewsQuery.data?.data ?? []
  const total = reviewsQuery.data?.meta?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const chips = activeFilters(filters)
  const currentQuery = filtersToQuery(filters).toString()

  const toggleSort = (field: SortField) => {
    if (filters.sort === field) apply({ order: filters.order === 'asc' ? 'desc' : 'asc' }, false)
    else apply({ sort: field, order: 'desc' }, false)
  }

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      <SavedViewsBar currentQuery={currentQuery} onApply={(q) => router.push(q ? `${pathname}?${q}` : pathname)} />

      {/* Filter bar */}
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" aria-hidden />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search PR title or author…"
              className="pl-8"
              aria-label="Search reviews"
            />
          </div>
          <FilterSelect
            value={filters.repo}
            onChange={(v) => apply({ repo: v })}
            label="Repository"
            options={facets.repos.map((r) => ({ value: r, label: r }))}
            allLabel="All repos"
          />
          <FilterSelect
            value={filters.author}
            onChange={(v) => apply({ author: v })}
            label="Author"
            options={facets.authors.map((a) => ({ value: a, label: a }))}
            allLabel="All authors"
          />
          <FilterSelect
            value={filters.status}
            onChange={(v) => apply({ status: v })}
            label="Status"
            options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
            allLabel="Any status"
          />
          <FilterSelect
            value={filters.risk}
            onChange={(v) => apply({ risk: v })}
            label="Risk"
            options={RISK_OPTIONS.map((r) => ({ value: r, label: r }))}
            allLabel="Any risk"
          />
          <FilterSelect
            value={filters.range}
            onChange={(v) => apply({ range: v })}
            label="Date range"
            options={DATE_PRESETS.map((p) => ({ value: p.value, label: p.label }))}
            allLabel="Any time"
          />
        </div>

        {/* Active filter chips + counts */}
        <div className="flex flex-wrap items-center gap-1.5">
          <SlidersHorizontal className="size-3 text-faint" aria-hidden />
          {chips.length === 0 ? (
            <span className="text-2xs text-faint">No filters applied</span>
          ) : (
            chips.map((chip) => (
              <button
                key={chip.key}
                onClick={() => apply({ [chip.key]: DEFAULT_FILTERS[chip.key] } as Partial<ReviewFilters>)}
                className="inline-flex items-center gap-1 rounded border border-border bg-surface-raised px-1.5 py-0.5 text-2xs text-muted transition-colors hover:border-border-strong hover:text-foreground"
              >
                {chip.label}
                <X className="size-2.5" aria-hidden />
              </button>
            ))
          )}
          {hasActiveFilters(filters) && (
            <button
              onClick={() => router.push(pathname)}
              className="ml-1 text-2xs text-accent hover:underline"
            >
              Clear all
            </button>
          )}
          <span className="tnum ml-auto text-xs text-faint">
            {reviewsQuery.isPending ? '…' : `${total} review${total === 1 ? '' : 's'}`}
          </span>
        </div>
      </div>

      {/* Results */}
      {reviewsQuery.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : reviewsQuery.isError ? (
        <EmptyState
          icon={GitPullRequest}
          title="Couldn't load reviews"
          description={
            reviewsQuery.error instanceof Error ? reviewsQuery.error.message : 'Unknown error'
          }
          action={
            <Button size="sm" onClick={() => reviewsQuery.refetch()}>
              Try again
            </Button>
          }
        />
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={GitPullRequest}
          title={hasActiveFilters(filters) ? 'No reviews match these filters' : 'No reviews yet'}
          description={
            hasActiveFilters(filters)
              ? 'Try widening or clearing the filters above.'
              : 'Open a pull request on a connected repository and the review will appear here.'
          }
          action={
            hasActiveFilters(filters) ? (
              <Button size="sm" onClick={() => router.push(pathname)}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Pull request</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Status</TableHead>
                <SortHeader label="Risk" field="risk" filters={filters} onSort={toggleSort} />
                <SortHeader label="Findings" field="findings" filters={filters} onSort={toggleSort} />
                <SortHeader
                  label="When"
                  field="createdAt"
                  filters={filters}
                  onSort={toggleSort}
                  align="right"
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.map((review) => (
                <ReviewRow key={review.id} review={review} />
              ))}
            </TableBody>
          </Table>

          {pageCount > 1 && (
            <div className="flex items-center justify-end gap-2">
              <span className="tnum text-xs text-faint">
                Page {filters.page} of {pageCount}
              </span>
              <Button
                size="icon"
                variant="ghost"
                disabled={filters.page <= 1}
                onClick={() => apply({ page: filters.page - 1 }, false)}
                aria-label="Previous page"
              >
                <ChevronLeft aria-hidden />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                disabled={filters.page >= pageCount}
                onClick={() => apply({ page: filters.page + 1 }, false)}
                aria-label="Next page"
              >
                <ChevronRight aria-hidden />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function FilterSelect({
  value,
  onChange,
  label,
  options,
  allLabel,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  options: { value: string; label: string }[]
  allLabel: string
}) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="max-w-[160px] capitalize"
    >
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  )
}

function SortHeader({
  label,
  field,
  filters,
  onSort,
  align,
}: {
  label: string
  field: SortField
  filters: ReviewFilters
  onSort: (field: SortField) => void
  align?: 'right'
}) {
  const isActive = filters.sort === field
  return (
    <TableHead className={align === 'right' ? 'text-right' : undefined}>
      <button
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1 transition-colors hover:text-foreground ${
          isActive ? 'text-foreground' : ''
        } ${align === 'right' ? 'flex-row-reverse' : ''}`}
        aria-label={`Sort by ${label}`}
      >
        {label}
        {isActive ? (
          filters.order === 'asc' ? (
            <ArrowUp className="size-3" aria-hidden />
          ) : (
            <ArrowDown className="size-3" aria-hidden />
          )
        ) : (
          <ArrowDown className="size-3 opacity-0" aria-hidden />
        )}
      </button>
    </TableHead>
  )
}
