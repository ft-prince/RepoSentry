import { TriangleAlert } from 'lucide-react'

const REPO_URL = 'https://github.com/ft-prince/RepoSentry'

/**
 * Site-wide notice for the hosted preview. Only the dashboard (apps/web) is
 * deployed here — the review backend (apps/api: GitHub webhooks + the AI review
 * worker) is not, so live data, sign-in, and PR reviews need a local run.
 *
 * Gated on NEXT_PUBLIC_DEMO_MODE so it never appears in a full local/self-host
 * setup. Set NEXT_PUBLIC_DEMO_MODE=true in Vercel to switch it on.
 */
export function DemoBanner() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') return null

  return (
    <div className="flex items-center justify-center gap-2 border-b border-severity-high/30 bg-severity-high/10 px-4 py-2 text-center text-xs text-severity-high">
      <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
      <p>
        Frontend-only preview — the review backend isn&apos;t deployed, so the dashboard has no
        live data. Run the full stack locally:{' '}
        <a
          href={`${REPO_URL}#self-host-in-5-minutes`}
          target="_blank"
          rel="noreferrer"
          className="font-medium underline underline-offset-2"
        >
          self-host in 5 minutes
        </a>
        .
      </p>
    </div>
  )
}
