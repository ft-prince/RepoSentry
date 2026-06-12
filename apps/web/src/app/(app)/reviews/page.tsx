'use client'

import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { GitPullRequest, ChevronLeft, ChevronRight } from 'lucide-react'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input, Select } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ReviewRow } from '@/components/review-row'
import type { ApiEnvelope, ReviewListItem } from '@/lib/types'

const PAGE_SIZE = 20

async function fetchReviews(params: { repo: string; status: string; page: number }) {
  const query = new URLSearchParams({ page: String(params.page), pageSize: String(PAGE_SIZE) })
  if (params.repo) query.set('repo', params.repo)
  if (params.status) query.set('status', params.status)
  const res = await fetch(`/api/proxy/reviews?${query}`)
  const body = (await res.json()) as ApiEnvelope<ReviewListItem[]>
  if (!body.success) throw new Error(body.error ?? 'failed to load reviews')
  return body
}

export default function ReviewsPage() {
  const [repoFilter, setRepoFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['reviews', repoFilter, statusFilter, page],
    queryFn: () => fetchReviews({ repo: repoFilter, status: statusFilter, page }),
    placeholderData: keepPreviousData,
  })

  const reviews = data?.data ?? []
  const total = data?.meta?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={repoFilter}
          onChange={(e) => {
            setRepoFilter(e.target.value)
            setPage(1)
          }}
          placeholder="Filter by repo, e.g. acme/checkout-service"
          className="max-w-xs font-mono text-xs"
          aria-label="Filter by repository"
        />
        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="running">Running</option>
          <option value="queued">Queued</option>
          <option value="failed">Failed</option>
        </Select>
        <span className="ml-auto tnum text-xs text-faint">{total} reviews</span>
      </div>

      {isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={GitPullRequest}
          title="Couldn't load reviews"
          description={error instanceof Error ? error.message : 'Unknown error'}
        />
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={GitPullRequest}
          title="No reviews match"
          description="Try clearing the filters, or open a pull request on a connected repository."
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Pull request</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Findings</TableHead>
                <TableHead className="text-right">When</TableHead>
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
                Page {page} of {pageCount}
              </span>
              <Button
                size="icon"
                variant="ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft aria-hidden />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => p + 1)}
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
