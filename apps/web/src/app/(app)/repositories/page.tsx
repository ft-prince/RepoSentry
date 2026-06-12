import { FolderGit2 } from 'lucide-react'
import { getRepositories } from '@/lib/api'
import { EmptyState } from '@/components/ui/empty-state'
import { ApiError } from '@/components/api-error'
import { RepoCard } from '@/components/repo-card'
import { Button } from '@/components/ui/button'

export const metadata = { title: 'Repositories' }
export const dynamic = 'force-dynamic'

const GITHUB_APP_URL = process.env.NEXT_PUBLIC_GITHUB_APP_URL ?? 'https://github.com/apps'

export default async function RepositoriesPage() {
  const res = await getRepositories()
  if (!res.success || !res.data) return <ApiError message={res.error ?? 'Failed to load repos'} />
  const repos = res.data

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">
          Repositories where the RepoSentry GitHub App is installed.
        </p>
        <a href={GITHUB_APP_URL} target="_blank" rel="noreferrer">
          <Button variant="primary" size="sm">
            Install on GitHub
          </Button>
        </a>
      </div>

      {repos.length === 0 ? (
        <EmptyState
          icon={FolderGit2}
          title="No repositories connected"
          description="Install the GitHub App on a repository to start reviewing pull requests. Manage installs from your GitHub settings."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {repos.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>
      )}
    </div>
  )
}
