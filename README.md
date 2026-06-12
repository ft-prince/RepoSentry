<div align="center">

# 🛡️ RepoSentry

**An open-source AI that reviews your GitHub pull requests automatically.**

*Think spellcheck — but for bugs and security holes in your code.*

[![CI](https://github.com/ft-prince/RepoSentry/actions/workflows/ci.yml/badge.svg)](https://github.com/ft-prince/RepoSentry/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-indigo.svg)](LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)
![Free to run](https://img.shields.io/badge/cost-%240%2Fmonth-success.svg)

</div>

---

## What is this, really?

On GitHub, every code change goes through a **pull request** before it ships. Normally a teammate
has to read it and point out mistakes by hand. RepoSentry does that **first read automatically**:
the moment a pull request opens, it studies exactly what changed and leaves comments on the
specific lines that look wrong — with a plain explanation and a fix you can apply in one click.

**A concrete example.** This line has a SQL-injection vulnerability:

```js
db.query('SELECT * FROM users WHERE name = "' + name + '"')
```

RepoSentry catches it within ~30 seconds of the PR opening and comments:

> 🔴 **Critical · security** — Raw SQL built with string interpolation. A malicious `name` can read
> your whole database. Use a parameterized query:
> ```js
> db.query('SELECT * FROM users WHERE name = $1', [name])
> ```

It's an automated **first pass**, not a replacement for a senior engineer — it clears the obvious
stuff (injection bugs, money stored as floats, unhandled errors) so humans can focus on design.

**Two ways to use it:**

1. **As a GitHub bot** — reviews every pull request automatically.
2. **As an MCP server** — plug it into Claude Code / Cursor and run `review_diff` on your
   uncommitted changes *before* you even push.

- **$0 to run** — Groq free tier for inference, free Postgres/Redis/hosting tiers everywhere else
- **MIT licensed**, self-hostable in minutes
- Dark-first dashboard with review history, severity breakdowns, and metrics

## How it works

```mermaid
flowchart LR
    A([Developer opens a Pull Request]) --> B[GitHub sends a webhook]
    B --> C{apps/api<br/>verify HMAC signature}
    C -->|invalid| X[Reject 401]
    C -->|valid| D[Queue the review<br/>BullMQ + Redis]
    D --> E[Review engine<br/>packages/core]
    E --> F[Fetch diff &amp; changed files<br/>skip lockfiles / generated]
    F --> G[Chunk the diff<br/>fit the context window]
    G --> H[[Groq · Llama 3.3 70B<br/>strict JSON findings]]
    H --> I[Validate with Zod<br/>anchor to exact lines<br/>dedupe]
    I --> J[Post ONE review to GitHub<br/>inline comments + summary]
    I --> K[(Save to Postgres)]
    K --> L[Dashboard<br/>apps/web]
    J --> A

    style H fill:#4f46e5,stroke:#4f46e5,color:#fff
    style A fill:#18181b,stroke:#3f3f46,color:#fff
```

The same engine also runs as an MCP server for editors:

```mermaid
flowchart LR
    CC([Claude Code / Cursor]) -->|review_diff| MCP[apps/mcp<br/>MCP server]
    MCP --> CORE[Review engine<br/>packages/core]
    CORE --> GROQ[[Groq · Llama 3.3 70B]]
    GROQ --> CORE
    CORE -->|findings JSON| CC

    style GROQ fill:#4f46e5,stroke:#4f46e5,color:#fff
    style CC fill:#18181b,stroke:#3f3f46,color:#fff
```

## Monorepo layout

```mermaid
flowchart TD
    subgraph deployables[3 deployables]
        WEB[apps/web<br/>Next.js 15 dashboard + landing]
        API[apps/api<br/>Hono · webhooks · queue · REST]
        MCP[apps/mcp<br/>MCP server · stdio + HTTP]
    end
    CORE[packages/core<br/>review engine · ReviewLLM seam<br/>GitHub client · Prisma DB layer]
    API --> CORE
    MCP --> CORE
    WEB -->|REST| API

    style CORE fill:#4f46e5,stroke:#4f46e5,color:#fff
```

| Path | What it is |
| --- | --- |
| `packages/core` | Review engine, `ReviewLLM` seam + Groq client, GitHub client, Prisma schema/DB layer |
| `apps/api` | Hono server: GitHub App webhooks (HMAC-verified), BullMQ review queue, REST API |
| `apps/mcp` | MCP server exposing the engine as tools (stdio + HTTP transports) |
| `apps/web` | Next.js 15 dashboard + marketing page |

## Self-host in 5 minutes

Prereqs: Node 20+, pnpm 9 (`corepack enable`), Docker.

```bash
git clone https://github.com/ft-prince/RepoSentry.git
cd RepoSentry
docker compose up -d            # local Postgres + Redis, zero cloud accounts
pnpm install

cp apps/api/.env.example apps/api/.env       # add your free Groq key
cp apps/web/.env.example apps/web/.env.local # set API_INTERNAL_TOKEN (same in both)

pnpm db:push                    # create the schema
pnpm db:seed                    # optional: realistic demo data
pnpm dev                        # web :3000 · api :3001 · mcp :3002
```

Open http://localhost:3000/overview. With seed data the dashboard is fully populated; reviewing
real PRs additionally needs the GitHub App below.

> Get a free Groq key at https://console.groq.com/keys — no card required.

## Register the GitHub App

1. GitHub → Settings → Developer settings → **GitHub Apps** → *New GitHub App*.
2. Webhook URL: `https://<your-api-host>/webhooks/github` (locally, use
   `smee.io` or `cloudflared tunnel` to forward to `localhost:3001`).
   Set a **webhook secret** and keep it.
3. **Permissions:** Pull requests *(read & write)* · Contents *(read)* · Checks *(write)*.
4. **Subscribe to events:** `Pull request`.
5. Create the app, then generate a **private key** (.pem) and note the **App ID**.
6. Fill `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET` in `apps/api/.env`.
7. Install the app on a repository and open a PR — the review lands as inline comments and shows
   up in the dashboard.

## Environment variables

| Variable | App | Description |
| --- | --- | --- |
| `GROQ_API_KEY` | api, mcp | Free Groq API key (console.groq.com) |
| `GROQ_REVIEW_MODEL` | api | Optional, default `llama-3.3-70b-versatile` |
| `GROQ_SUMMARY_MODEL` | api | Optional, default `llama-3.1-8b-instant` |
| `DATABASE_URL` | api, mcp | Postgres connection string (docker-compose / Neon / Supabase) |
| `REDIS_URL` | api | Redis connection string (docker-compose / Upstash) |
| `GITHUB_APP_ID` | api, mcp | GitHub App ID |
| `GITHUB_PRIVATE_KEY` | api, mcp | GitHub App private key (`\n`-escaped or multiline) |
| `GITHUB_WEBHOOK_SECRET` | api | Webhook HMAC secret you chose at registration |
| `API_INTERNAL_TOKEN` | api, web | Shared bearer token between dashboard and API (`openssl rand -hex 32`) |
| `API_URL` | web | Where apps/api runs (default `http://localhost:3001`) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | web | GitHub OAuth for dashboard sign-in (optional in dev) |
| `AUTH_SECRET` | web | Auth.js session secret (required when OAuth is set) |
| `NEXT_PUBLIC_GITHUB_APP_URL` | web | Public install link of your GitHub App |
| `PORT` / `MCP_PORT` / `MCP_TRANSPORT` | api / mcp | Ports and MCP transport selection |

## MCP server (Claude Code, Cursor, …)

Build once (`pnpm build`), then add to Claude Code (`.mcp.json`) or Cursor
(`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "reposentry": {
      "command": "node",
      "args": ["/abs/path/to/reposentry/apps/mcp/dist/index.js"],
      "env": {
        "GROQ_API_KEY": "gsk_…",
        "DATABASE_URL": "postgresql://reposentry:reposentry@localhost:5433/reposentry"
      }
    }
  }
}
```

| Tool | Needs | What it does |
| --- | --- | --- |
| `review_diff` | Groq key only | Review any unified diff — no GitHub round-trip |
| `review_pull_request` | + DB + GitHub App | Full structured review of a connected repo's PR |
| `list_recent_reviews` | + DB | Recent review records |
| `explain_finding` | + DB | Deep dive on one finding and its fix rationale |

HTTP transport: `node apps/mcp/dist/index.js --http` serves `POST /mcp` on `:3002`.

## Per-repo configuration

Drop a `.reposentry.yml` in the repo root (all keys optional):

```yaml
severityThreshold: medium   # only post findings at/above: low | medium | high | critical
ignore:                     # globs skipped on top of built-ins (lockfiles, dist, vendored…)
  - "docs/**"
  - "**/*.test.ts"
focus:                      # free-text areas the reviewer pays extra attention to
  - payment correctness
autoReview: true            # set false to disable automatic reviews
```

## Swapping the LLM provider

The engine only talks to the `ReviewLLM` interface
([packages/core/src/llm/types.ts](packages/core/src/llm/types.ts)) — `review()`, `summarize()`,
`explain()`. Groq is the only implementation today
([groq.ts](packages/core/src/llm/groq.ts)); adding OpenRouter or a local Ollama model is one new
class implementing that interface, with zero changes to the engine, API, or MCP server. The same
seam exists for the VCS side (`GitHubClient`) so GitLab/Bitbucket can land later.

## Development

```bash
pnpm dev          # all three apps, watch mode
pnpm typecheck    # strict TS across the workspace
pnpm test         # unit tests (vitest)
pnpm build        # production builds
pnpm db:migrate   # create a migration after schema changes
```

Free-tier notes: the worker reviews **one PR at a time** and backs off exponentially on Groq 429s;
large diffs are chunked; lockfiles/generated files are skipped. Findings whose line numbers can't
be anchored to the diff are dropped, never posted as floating comments.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). PRs are reviewed by RepoSentry itself (and humans).

## License

[MIT](LICENSE)
