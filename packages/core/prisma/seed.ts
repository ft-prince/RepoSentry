/**
 * Seed realistic demo data so the dashboard looks alive on first run.
 * Usage: pnpm db:seed (idempotent — wipes and re-creates demo rows).
 */
import { PrismaClient, type Severity, type FindingCategory, type Risk } from '@prisma/client'

const prisma = new PrismaClient()

const DAY_MS = 24 * 60 * 60 * 1000

const REPOS = [
  { owner: 'acme', name: 'checkout-service', private: true },
  { owner: 'acme', name: 'web-dashboard', private: false },
  { owner: 'acme', name: 'infra-tools', private: true },
]

const PR_TITLES = [
  'feat: add idempotency keys to payment intents',
  'fix: race condition in webhook retry handler',
  'refactor: extract pricing rules into strategy module',
  'feat: server-side pagination for orders table',
  'fix: handle null shipping address in tax calc',
  'chore: bump prisma to v6 and regenerate client',
  'feat: rate-limit login attempts per IP',
  'fix: off-by-one in invoice proration window',
  'refactor: replace moment with date-fns',
  'feat: streaming export of audit logs',
  'fix: escape HTML in customer notes rendering',
  'perf: batch fetch product variants in cart view',
  'feat: add SCIM user deprovisioning endpoint',
  'fix: stale cache on currency conversion table',
  'refactor: consolidate retry/backoff helpers',
  'feat: dark mode for embedded checkout widget',
  'fix: double-submit on slow card validation',
  'chore: tighten tsconfig strictness flags',
  'feat: per-tenant feature flag overrides',
  'fix: timezone drift in subscription renewal cron',
  'perf: index orders by (tenant_id, created_at)',
  'feat: webhook signature rotation support',
  'fix: unhandled rejection in S3 multipart upload',
  'refactor: split monolithic order controller',
]

const AUTHORS = ['mlopez', 'kchen', 'dpatel', 'asmith', 'jnguyen', 'roliveira']

interface DemoFinding {
  file: string
  line: number
  severity: Severity
  category: FindingCategory
  title: string
  explanation: string
  suggestedFix?: string
}

const FINDING_POOL: DemoFinding[] = [
  {
    file: 'src/payments/intent.ts',
    line: 87,
    severity: 'critical',
    category: 'security',
    title: 'Raw SQL built with string interpolation',
    explanation:
      'The tenant ID is interpolated directly into the query string, allowing SQL injection from any caller that controls the header. Use a parameterized query.',
    suggestedFix: "await db.query('SELECT * FROM intents WHERE tenant_id = $1', [tenantId])",
  },
  {
    file: 'src/webhooks/retry.ts',
    line: 42,
    severity: 'high',
    category: 'bug',
    title: 'Retry counter mutated outside the lock',
    explanation:
      'attempts++ happens after the mutex is released, so two concurrent deliveries can both read the same value and exceed the max retry budget.',
  },
  {
    file: 'src/cart/totals.ts',
    line: 130,
    severity: 'high',
    category: 'bug',
    title: 'Floating-point arithmetic on currency amounts',
    explanation:
      'Totals are accumulated as IEEE-754 doubles. Sum drift will appear at scale; amounts should be integer minor units (cents).',
    suggestedFix: 'const totalCents = items.reduce((sum, i) => sum + i.priceCents * i.qty, 0)',
  },
  {
    file: 'src/auth/session.ts',
    line: 23,
    severity: 'critical',
    category: 'security',
    title: 'Session token compared with non-constant-time equality',
    explanation:
      'Using === for token comparison leaks timing information. Use crypto.timingSafeEqual on equal-length buffers.',
    suggestedFix: 'crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))',
  },
  {
    file: 'src/orders/export.ts',
    line: 210,
    severity: 'medium',
    category: 'performance',
    title: 'Unbounded query loads every order into memory',
    explanation:
      'findMany without take/cursor will OOM on large tenants. Stream with a cursor and a fixed page size.',
  },
  {
    file: 'src/ui/notes.tsx',
    line: 56,
    severity: 'high',
    category: 'security',
    title: 'dangerouslySetInnerHTML with unsanitized user input',
    explanation:
      'Customer notes are rendered as raw HTML. Any customer can store a script payload that runs in the agent dashboard (stored XSS).',
  },
  {
    file: 'src/billing/proration.ts',
    line: 74,
    severity: 'medium',
    category: 'bug',
    title: 'Inclusive/exclusive boundary mismatch in proration window',
    explanation:
      'The window uses <= on both ends, so the boundary day is billed twice when a plan changes at midnight UTC.',
  },
  {
    file: 'src/lib/retry.ts',
    line: 18,
    severity: 'low',
    category: 'maintainability',
    title: 'Magic numbers for backoff schedule',
    explanation: 'The 250/2/10000 backoff constants should be named so call sites can reason about them.',
  },
  {
    file: 'src/cron/renewals.ts',
    line: 95,
    severity: 'medium',
    category: 'bug',
    title: 'Date constructed from local time in a UTC cron',
    explanation:
      'new Date(y, m, d) uses the host timezone; on a UTC host this is fine but staging runs in PST and renews a day early.',
  },
  {
    file: 'src/api/users.ts',
    line: 142,
    severity: 'low',
    category: 'style',
    title: 'Deeply nested conditionals in handler',
    explanation: 'Four levels of nesting; early returns on the guard clauses would flatten this.',
  },
  {
    file: 'src/upload/multipart.ts',
    line: 61,
    severity: 'high',
    category: 'bug',
    title: 'Floating promise on abortMultipartUpload',
    explanation:
      'The cleanup call is not awaited and has no catch — failures leave orphaned parts billed forever and surface as unhandled rejections.',
    suggestedFix: 'await s3.abortMultipartUpload(params).promise().catch(log.warn)',
  },
  {
    file: 'src/flags/overrides.ts',
    line: 33,
    severity: 'medium',
    category: 'maintainability',
    title: 'Tenant override map mutated in place',
    explanation:
      'The shared defaults object is mutated per request, leaking one tenant’s overrides to the next. Clone before merging.',
    suggestedFix: 'const merged = { ...defaults, ...tenantOverrides }',
  },
]

const RISK_BY_WORST: Record<string, Risk> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
  none: 'none',
}

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length]!
}

async function main() {
  console.log('Seeding demo data…')

  // Wipe previous demo data (cascades to repos → reviews → findings)
  await prisma.installation.deleteMany({ where: { accountLogin: 'acme' } })

  const installation = await prisma.installation.create({
    data: { githubInstallationId: BigInt(990001), accountLogin: 'acme', accountType: 'Organization' },
  })

  const repos = []
  for (const [i, r] of REPOS.entries()) {
    repos.push(
      await prisma.repository.create({
        data: {
          githubRepoId: BigInt(880100 + i),
          owner: r.owner,
          name: r.name,
          fullName: `${r.owner}/${r.name}`,
          private: r.private,
          installationId: installation.id,
          settings: {
            create: {
              severityThreshold: 'low',
              ignoreGlobs: ['**/*.test.ts'],
              focusAreas: i === 0 ? ['payment correctness', 'idempotency'] : [],
            },
          },
        },
      })
    )
  }

  let findingCursor = 0
  for (let i = 0; i < PR_TITLES.length; i++) {
    const repo = pick(repos, i)
    const createdAt = new Date(Date.now() - Math.floor((i / PR_TITLES.length) * 28 + 1) * DAY_MS + (i % 5) * 3600_000)
    const findingCount = [0, 1, 2, 3, 1, 2, 0, 4][i % 8]!
    const findings = Array.from({ length: findingCount }, (_, j) => {
      const f = pick(FINDING_POOL, findingCursor + j)
      return { ...f, line: f.line + ((i * 7) % 40) }
    })
    findingCursor += findingCount

    const worst =
      findings.length === 0
        ? 'none'
        : (['critical', 'high', 'medium', 'low'] as const).find((s) =>
            findings.some((f) => f.severity === s)
          )!

    const failed = i === 13
    await prisma.review.create({
      data: {
        status: failed ? 'failed' : 'completed',
        prNumber: 100 + i,
        prTitle: pick(PR_TITLES, i),
        prUrl: `https://github.com/${repo.fullName}/pull/${100 + i}`,
        author: pick(AUTHORS, i),
        baseBranch: 'main',
        headBranch: `feat/${pick(PR_TITLES, i).split(' ')[1]?.replace(/[^a-z-]/g, '') ?? 'change'}-${i}`,
        commitSha: `${(i + 10).toString(16)}f3a${i}c91e2b7d4a8f06${(i * 13).toString(16).padStart(2, '0')}5d1c9e0b2a47f8`.slice(0, 40),
        overallRisk: failed ? null : RISK_BY_WORST[worst],
        summary: failed
          ? null
          : findings.length === 0
            ? 'Automated review found no issues in this change. The diff is small and well-scoped; human review is still recommended for design-level concerns.'
            : `Automated review found ${findings.length} issue(s), the most important being: ${findings[0]!.title.toLowerCase()}. See inline comments for details and suggested fixes.`,
        error: failed ? 'Groq API: 429 rate limit exceeded after 5 retries' : null,
        model: 'llama-3.3-70b-versatile',
        durationMs: failed ? null : 14_000 + (i * 3_137) % 45_000,
        createdAt,
        completedAt: failed ? createdAt : new Date(createdAt.getTime() + 30_000),
        repositoryId: repo.id,
        findings: { create: findings.map((f) => ({ ...f, status: 'open' as const })) },
      },
    })
  }

  const reviewCount = await prisma.review.count()
  const findingCount = await prisma.finding.count()
  console.log(`Seeded ${repos.length} repos, ${reviewCount} reviews, ${findingCount} findings.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
