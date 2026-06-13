import { ServerCrash } from 'lucide-react'

export function ApiError({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-danger/40 px-6 py-14 text-center">
      <ServerCrash className="size-5 text-danger" aria-hidden />
      <p className="text-sm font-medium">Couldn&apos;t reach the RepoSentry API</p>
      <p className="max-w-md text-xs text-muted">{message}</p>
      <p className="max-w-md text-xs text-faint">
        This hosted preview ships the dashboard only — the review backend isn&apos;t deployed.
        Run the full stack locally with <code className="font-mono">pnpm dev</code> (or check
        API_URL / API_INTERNAL_TOKEN in apps/web/.env).
      </p>
    </div>
  )
}
