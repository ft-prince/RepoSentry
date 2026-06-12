import { Github, KeyRound, Cpu, Plug } from 'lucide-react'
import { auth, isAuthEnabled } from '@/auth'
import { getMetrics } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SignOutButton } from '@/components/signout-button'

export const metadata = { title: 'Settings' }
export const dynamic = 'force-dynamic'

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`size-1.5 rounded-full ${ok ? 'bg-[hsl(var(--success))]' : 'bg-[hsl(var(--danger))]'}`}
      aria-hidden
    />
  )
}

export default async function SettingsPage() {
  const session = isAuthEnabled ? await auth() : null
  const apiRes = await getMetrics(1)
  const apiReachable = apiRes.success

  // Status only — never the values. Secrets stay server-side.
  const groqConfigured = apiReachable
  const reviewModel = process.env.NEXT_PUBLIC_REVIEW_MODEL ?? 'llama-3.3-70b-versatile'
  const summaryModel = process.env.NEXT_PUBLIC_SUMMARY_MODEL ?? 'llama-3.1-8b-instant'

  return (
    <div className="grid gap-3 animate-fade-in lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            <Github className="size-3.5" aria-hidden /> GitHub connection
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-[13px]">
          {isAuthEnabled ? (
            session?.user ? (
              <>
                <p>
                  Signed in as <span className="font-medium">{session.user.name ?? session.user.email}</span>
                </p>
                <div>
                  <SignOutButton />
                </div>
              </>
            ) : (
              <p className="text-muted">Not signed in.</p>
            )
          ) : (
            <p className="text-muted">
              GitHub OAuth is not configured — the dashboard is running in open dev mode. Set{' '}
              <code className="font-mono text-xs">GITHUB_CLIENT_ID</code> /{' '}
              <code className="font-mono text-xs">GITHUB_CLIENT_SECRET</code> to require sign-in.
            </p>
          )}
          <p className="flex items-center gap-2 text-xs text-muted">
            <StatusDot ok={apiReachable} />
            GitHub App webhook endpoint {apiReachable ? 'reachable via API' : 'unknown — API offline'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            <Cpu className="size-3.5" aria-hidden /> Models
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-[13px]">
          <p className="flex items-center gap-2">
            <StatusDot ok={groqConfigured} />
            Groq key {groqConfigured ? 'configured on the API' : 'status unknown — API offline'}
          </p>
          <div className="flex flex-col gap-1 text-xs text-muted">
            <span>
              Review model: <code className="font-mono">{reviewModel}</code>
            </span>
            <span>
              Triage/summary model: <code className="font-mono">{summaryModel}</code>
            </span>
          </div>
          <p className="text-2xs text-faint">
            Override with GROQ_REVIEW_MODEL / GROQ_SUMMARY_MODEL on the API. The engine is
            provider-agnostic — see the ReviewLLM seam in packages/core.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            <KeyRound className="size-3.5" aria-hidden /> API access
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-[13px] text-muted">
          <p>
            The REST API is gated by <code className="font-mono text-xs">API_INTERNAL_TOKEN</code>.
            Rotate it by generating a new value (<code className="font-mono text-xs">openssl rand -hex 32</code>)
            and updating both the API and dashboard environments.
          </p>
          <p className="flex items-center gap-2 text-xs">
            <StatusDot ok={apiReachable} />
            API {apiReachable ? 'connected' : 'unreachable'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            <Plug className="size-3.5" aria-hidden /> MCP server
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-[13px] text-muted">
          <p>Use the review engine from Claude Code or Cursor:</p>
          <pre className="overflow-x-auto rounded-md border border-border bg-surface-raised/50 p-2.5 font-mono text-2xs leading-relaxed">
{`{
  "mcpServers": {
    "reposentry": {
      "command": "node",
      "args": ["apps/mcp/dist/index.js"],
      "env": { "GROQ_API_KEY": "gsk_…" }
    }
  }
}`}
          </pre>
          <div className="flex gap-1.5">
            <Badge>review_pull_request</Badge>
            <Badge>review_diff</Badge>
            <Badge>list_recent_reviews</Badge>
            <Badge>explain_finding</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
