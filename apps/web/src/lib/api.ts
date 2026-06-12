import 'server-only'
import type {
  ApiEnvelope,
  Metrics,
  RepositoryItem,
  ReviewDetail,
  ReviewListItem,
} from './types'

/**
 * Server-side client for the RepoSentry API. The bearer token never reaches
 * the browser — client components go through /api/proxy route handlers.
 */
function apiBase(): string {
  return process.env.API_URL ?? 'http://localhost:3001'
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const token = process.env.API_INTERNAL_TOKEN
  if (!token) {
    return { success: false, data: null, error: 'API_INTERNAL_TOKEN is not configured' }
  }
  try {
    const res = await fetch(`${apiBase()}/api${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...init?.headers,
      },
      cache: 'no-store',
    })
    return (await res.json()) as ApiEnvelope<T>
  } catch (error) {
    return {
      success: false,
      data: null,
      error: `API unreachable at ${apiBase()} — is apps/api running? (${error instanceof Error ? error.message : String(error)})`,
    }
  }
}

export function getMetrics(days = 30) {
  return apiFetch<Metrics>(`/metrics?days=${days}`)
}

export function getReviews(params: { repo?: string; status?: string; page?: number; pageSize?: number } = {}) {
  const query = new URLSearchParams()
  if (params.repo) query.set('repo', params.repo)
  if (params.status) query.set('status', params.status)
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))
  return apiFetch<ReviewListItem[]>(`/reviews?${query}`)
}

export function getReview(id: string) {
  return apiFetch<ReviewDetail>(`/reviews/${encodeURIComponent(id)}`)
}

export function getRepositories() {
  return apiFetch<RepositoryItem[]>('/repos')
}

export function rerunReview(id: string) {
  return apiFetch<ReviewDetail>(`/reviews/${encodeURIComponent(id)}/rerun`, { method: 'POST' })
}

export function patchRepoSettings(fullName: string, settings: Record<string, unknown>) {
  return apiFetch(`/settings/${fullName}`, { method: 'PATCH', body: JSON.stringify(settings) })
}
