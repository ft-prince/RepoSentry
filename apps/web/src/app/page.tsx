import Link from 'next/link'
import {
  ArrowRight,
  Github,
  GitPullRequest,
  Terminal,
  Webhook,
  ShieldCheck,
  Bug,
  Gauge,
  SpellCheck,
} from 'lucide-react'
import { Logo, LogoGlyph } from '@/components/logo'
import { Button } from '@/components/ui/button'

const REPO_URL = 'https://github.com/ft-prince/RepoSentry'

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-5xl px-5">
      {/* Nav */}
      <nav className="flex h-14 items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2">
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            <Button variant="ghost" size="sm">
              <Github aria-hidden /> GitHub
            </Button>
          </a>
          <Link href="/overview">
            <Button variant="primary" size="sm">
              Open dashboard
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero — copy first, no gradient, no emoji */}
      <section className="grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
        <div className="flex flex-col gap-5">
          <p className="font-mono text-xs text-accent">open source · MIT · $0 to run</p>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
            A first-pass code review on every pull request.
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-muted">
            RepoSentry reviews PRs the moment they open: it reads the diff, flags bugs, security
            smells, and style issues, and leaves inline comments with concrete fixes. It won&apos;t
            replace your senior engineer — it makes sure they never see the obvious stuff.
          </p>
          <div className="flex items-center gap-2.5">
            <Link href="/overview">
              <Button variant="primary" size="lg">
                Open dashboard <ArrowRight aria-hidden />
              </Button>
            </Link>
            <a href={`${REPO_URL}#self-host-in-5-minutes`} target="_blank" rel="noreferrer">
              <Button size="lg">Self-host in 5 minutes</Button>
            </a>
          </div>
          <p className="font-mono text-2xs text-faint">
            Next.js · Hono · Groq (free tier) · Postgres · MCP
          </p>
        </div>

        {/* A realistic review comment, not a floating glass card */}
        <div className="rounded-lg border border-border bg-surface font-mono text-xs leading-relaxed">
          <div className="flex items-center gap-2 border-b border-border px-3.5 py-2 text-2xs text-faint">
            <GitPullRequest className="size-3.5" aria-hidden />
            acme/checkout-service · PR #142 · src/payments/intent.ts
          </div>
          <div className="flex flex-col gap-2.5 p-3.5">
            <div className="flex items-center gap-2">
              <LogoGlyph className="size-3.5 text-accent" />
              <span className="font-medium text-foreground">reposentry</span>
              <span className="text-faint">reviewed 38s after open</span>
            </div>
            <p>
              <span className="font-semibold text-severity-critical">critical · security</span>{' '}
              <span className="text-foreground">Raw SQL built with string interpolation</span>
            </p>
            <p className="text-muted">
              `tenantId` comes from a request header and is interpolated into the query. Any caller
              can inject SQL. Use a parameterized query:
            </p>
            <pre className="overflow-x-auto rounded border border-border bg-surface-raised/60 p-2.5 text-[11px]">
              <code>{`- db.query(\`SELECT * FROM intents WHERE tenant_id = '\${tenantId}'\`)
+ db.query('SELECT * FROM intents WHERE tenant_id = $1', [tenantId])`}</code>
            </pre>
            <p className="text-2xs text-faint">+2 more findings · overall risk: critical</p>
          </div>
        </div>
      </section>

      {/* In plain English — for non-experts, dense and quiet */}
      <section className="border-t border-border py-16">
        <div className="flex items-center gap-2">
          <SpellCheck className="size-4 text-accent" aria-hidden />
          <p className="font-mono text-xs text-accent">in plain english</p>
        </div>
        <h2 className="mt-4 max-w-2xl text-lg font-semibold leading-snug tracking-tight">
          It&apos;s spellcheck — but for bugs and security holes in your code.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          On GitHub, every code change goes through a <span className="text-foreground">pull request</span>{' '}
          before it ships. Normally a teammate has to read it and point out mistakes by hand.
          RepoSentry does that first read automatically: the moment a pull request opens, it studies
          exactly what changed and leaves comments on the specific lines that look wrong — with a
          plain explanation and a fix you can apply in one click.
        </p>

        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {/* What happens, in four steps, no jargon */}
          <ol className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
            <li className="flex gap-3">
              <span className="font-mono text-xs text-faint">1</span>
              <p className="text-[13px] text-muted">
                <span className="text-foreground">You open a pull request.</span> Some code changed
                and you want it merged.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-xs text-faint">2</span>
              <p className="text-[13px] text-muted">
                <span className="text-foreground">RepoSentry reads the change</span> and asks an AI:
                are there bugs, security holes, or risky patterns here?
              </p>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-xs text-faint">3</span>
              <p className="text-[13px] text-muted">
                <span className="text-foreground">It comments on the exact lines</span> — what&apos;s
                wrong, why it matters, and the corrected code.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-xs text-faint">4</span>
              <p className="text-[13px] text-muted">
                <span className="text-foreground">Everything is logged</span> in a dashboard so you
                can see history, severity, and trends.
              </p>
            </li>
          </ol>

          {/* What it catches, concrete */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">What it catches</p>
            <ul className="flex flex-col gap-3">
              <li className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-severity-critical" aria-hidden />
                <p className="text-[13px] text-muted">
                  <span className="text-foreground">Security holes</span> — e.g. SQL injection, where
                  unescaped input could let an attacker read your whole database.
                </p>
              </li>
              <li className="flex gap-3">
                <Bug className="mt-0.5 size-4 shrink-0 text-severity-high" aria-hidden />
                <p className="text-[13px] text-muted">
                  <span className="text-foreground">Real bugs</span> — money stored as decimals,
                  off-by-one errors, race conditions, unhandled failures.
                </p>
              </li>
              <li className="flex gap-3">
                <Gauge className="mt-0.5 size-4 shrink-0 text-severity-medium" aria-hidden />
                <p className="text-[13px] text-muted">
                  <span className="text-foreground">Performance & style</span> — slow queries,
                  unbounded loops, and maintainability smells.
                </p>
              </li>
            </ul>
            <p className="mt-1 text-2xs leading-relaxed text-faint">
              It&apos;s a first pass, not a replacement for a human reviewer. It clears the obvious
              stuff so people can focus on design.
            </p>
          </div>
        </div>
      </section>

      {/* How it works — numbered, dense, no icon circles */}
      <section className="border-t border-border py-16">
        <h2 className="mb-2 text-lg font-semibold tracking-tight">How it works</h2>
        <p className="mb-8 text-sm text-muted">The same flow, with the technical detail.</p>
        <ol className="grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
          {[
            {
              icon: Webhook,
              step: '01',
              title: 'PR opens, webhook fires',
              body: 'The GitHub App receives pull_request events, verifies the HMAC signature, and queues a review — one at a time, respecting free-tier rate limits.',
            },
            {
              icon: GitPullRequest,
              step: '02',
              title: 'The engine reads the diff',
              body: 'Changed files are filtered (lockfiles and generated code skipped), chunked to fit the context window, and reviewed by Llama 3.3 70B on Groq with strict JSON output.',
            },
            {
              icon: Terminal,
              step: '03',
              title: 'Inline comments, exact lines',
              body: 'Findings are validated, anchored to real diff lines, deduplicated, and posted as one review: inline comments with suggested fixes plus a summary and risk rating.',
            },
          ].map(({ icon: Icon, step, title, body }) => (
            <li key={step} className="flex flex-col gap-2.5 bg-surface p-6">
              <div className="flex items-center justify-between">
                <Icon className="size-4 text-accent" aria-hidden />
                <span className="font-mono text-2xs text-faint">{step}</span>
              </div>
              <h3 className="text-sm font-medium">{title}</h3>
              <p className="text-xs leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* MCP angle */}
      <section className="grid items-center gap-10 border-t border-border py-16 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <p className="font-mono text-xs text-accent">mcp server</p>
          <h2 className="text-lg font-semibold tracking-tight">
            The same reviewer, inside your editor.
          </h2>
          <p className="text-sm leading-relaxed text-muted">
            RepoSentry ships as an MCP server. Plug it into Claude Code or Cursor and call{' '}
            <code className="font-mono text-xs">review_diff</code> on uncommitted changes before
            you even push — same engine, same rules, no GitHub round-trip.
          </p>
          <ul className="flex flex-col gap-1.5 font-mono text-xs text-muted">
            <li>review_pull_request — full PR review, structured findings</li>
            <li>review_diff — any unified diff, no GitHub needed</li>
            <li>list_recent_reviews — review history</li>
            <li>explain_finding — deep dive on one finding</li>
          </ul>
        </div>
        <pre className="overflow-x-auto rounded-lg border border-border bg-surface p-4 font-mono text-xs leading-relaxed text-muted">
          <code>{`// .mcp.json (Claude Code) or Cursor settings
{
  "mcpServers": {
    "reposentry": {
      "command": "node",
      "args": ["apps/mcp/dist/index.js"],
      "env": { "GROQ_API_KEY": "gsk_…" }
    }
  }
}

> claude "review my staged changes with reposentry"`}</code>
        </pre>
      </section>

      {/* Self-host CTA */}
      <section className="flex flex-col items-start gap-4 border-t border-border py-16">
        <h2 className="text-lg font-semibold tracking-tight">Run it yourself. Keep your code.</h2>
        <p className="max-w-lg text-sm leading-relaxed text-muted">
          MIT licensed, built entirely on free tiers: Groq for inference, Neon or Supabase for
          Postgres, Upstash for Redis, Vercel and Railway for hosting. Local dev needs nothing but
          Docker and a Groq key.
        </p>
        <pre className="w-full max-w-lg overflow-x-auto rounded-lg border border-border bg-surface p-4 font-mono text-xs leading-relaxed text-muted">
          <code>{`git clone ${REPO_URL.replace('https://', 'https://')}.git
cd reposentry && docker compose up -d
pnpm install && pnpm db:push && pnpm db:seed
pnpm dev   # web :3000 · api :3001 · mcp :3002`}</code>
        </pre>
        <a href={REPO_URL} target="_blank" rel="noreferrer">
          <Button variant="primary" size="lg">
            <Github aria-hidden /> Star on GitHub
          </Button>
        </a>
      </section>

      <footer className="flex items-center justify-between border-t border-border py-8 text-2xs text-faint">
        <span>MIT licensed. An automated first pass — not a replacement for human review.</span>
        <a href={REPO_URL} className="hover:text-muted" target="_blank" rel="noreferrer">
          github.com/ft-prince/RepoSentry
        </a>
      </footer>
    </main>
  )
}
