import Link from 'next/link'
import {
  Webhook,
  ScanSearch,
  Cpu,
  MessageSquareCode,
  Database,
  ShieldCheck,
  Bug,
  Gauge,
  Terminal,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const metadata = { title: 'How it works' }

const STAGES = [
  {
    icon: Webhook,
    title: 'A pull request opens',
    body: 'GitHub notifies RepoSentry the instant a PR is opened or updated. The webhook signature is verified before anything runs, so only genuine events are processed.',
  },
  {
    icon: ScanSearch,
    title: 'The diff is collected',
    body: 'RepoSentry fetches exactly what changed — skipping lockfiles, generated code, and vendored files — then splits large diffs into chunks that fit the model context.',
  },
  {
    icon: Cpu,
    title: 'AI reviews the change',
    body: 'An LLM (Llama 3.3 70B on Groq) reads each chunk and returns structured findings: file, line, severity, category, an explanation, and a suggested fix.',
  },
  {
    icon: MessageSquareCode,
    title: 'Comments land on the PR',
    body: 'Findings are validated, anchored to the exact lines, and posted as one review with inline comments, suggested-fix blocks, a summary, and an overall risk rating.',
  },
  {
    icon: Database,
    title: 'Everything is recorded',
    body: 'Each review and finding is saved so you can track history, severity trends, and time-to-review here in the dashboard.',
  },
  {
    icon: Terminal,
    title: 'Use it in your editor too',
    body: 'The same engine runs as an MCP server: call review_diff on uncommitted changes from Claude Code or Cursor before you ever push.',
  },
] as const

const CATCHES = [
  {
    icon: ShieldCheck,
    tone: 'text-severity-critical',
    title: 'Security holes',
    body: 'SQL injection, unescaped user input, unsafe comparisons, leaked secrets.',
  },
  {
    icon: Bug,
    tone: 'text-severity-high',
    title: 'Real bugs',
    body: 'Money stored as floats, off-by-one errors, race conditions, unhandled failures.',
  },
  {
    icon: Gauge,
    tone: 'text-severity-medium',
    title: 'Performance & style',
    body: 'Unbounded queries, N+1 patterns, deep nesting, maintainability smells.',
  },
] as const

export default function HowItWorksPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-8 animate-fade-in">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-xs text-accent">how it works</p>
        <h1 className="text-xl font-semibold tracking-tight">
          Spellcheck — but for bugs and security holes in your code.
        </h1>
        <p className="text-sm leading-relaxed text-muted">
          When a teammate opens a pull request, RepoSentry reads exactly what changed and leaves
          review comments on the lines that look wrong — with a plain explanation and a fix you can
          apply in one click. It&apos;s an automated <span className="text-foreground">first pass</span>,
          not a replacement for a human reviewer: it clears the obvious problems so people can focus
          on design.
        </p>
      </header>

      {/* Numbered stages */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
          The review pipeline
        </h2>
        <ol className="flex flex-col gap-px overflow-hidden rounded-lg border border-border bg-border">
          {STAGES.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="flex gap-4 bg-surface p-4">
              <div className="flex flex-col items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-subtle font-mono text-xs text-accent">
                  {i + 1}
                </span>
                {i < STAGES.length - 1 && <span className="w-px flex-1 bg-border" aria-hidden />}
              </div>
              <div className="flex-1 pb-1">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-faint" aria-hidden />
                  <h3 className="text-[13px] font-medium">{title}</h3>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* What it catches */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
          What it catches
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {CATCHES.map(({ icon: Icon, tone, title, body }) => (
            <Card key={title}>
              <CardContent className="flex flex-col gap-2">
                <Icon className={`size-4 ${tone}`} aria-hidden />
                <h3 className="text-[13px] font-medium">{title}</h3>
                <p className="text-xs leading-relaxed text-muted">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Severity legend */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
          Reading severities
        </h2>
        <Card>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['critical', 'bg-severity-critical', 'Exploitable security flaw or data loss — fix before merging.'],
                ['high', 'bg-severity-high', 'A bug that will break behavior in production.'],
                ['medium', 'bg-severity-medium', 'A likely bug or risky pattern worth a second look.'],
                ['low', 'bg-severity-low', 'Minor maintainability or style note.'],
              ] as const
            ).map(([sev, dot, desc]) => (
              <div key={sev} className="flex items-start gap-2.5">
                <span className={`mt-1 size-2 shrink-0 rounded-full ${dot}`} aria-hidden />
                <p className="text-xs text-muted">
                  <span className="font-medium capitalize text-foreground">{sev}</span> — {desc}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link href="/repositories">
          <Button variant="primary">
            Connect a repository <ArrowRight aria-hidden />
          </Button>
        </Link>
        <Link href="/reviews">
          <Button>Browse reviews</Button>
        </Link>
      </div>
    </div>
  )
}
