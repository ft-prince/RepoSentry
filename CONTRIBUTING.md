# Contributing to RepoSentry

Thanks for helping! The fastest path:

## Setup

```bash
corepack enable                 # pnpm 9
docker compose up -d            # Postgres + Redis
pnpm install
cp apps/api/.env.example apps/api/.env        # add a free Groq key
cp apps/web/.env.example apps/web/.env.local
pnpm db:push && pnpm db:seed
pnpm dev
```

## Before you open a PR

- `pnpm typecheck` and `pnpm test` must pass.
- New logic in `packages/core` needs unit tests (vitest). Write the test first when fixing a bug —
  it should fail before your fix and pass after.
- Keep files focused (<800 lines) and functions small. Prefer immutable updates.
- Validate external input (webhooks, API bodies, LLM output) with Zod at the boundary.
- No secrets in code — everything configurable lives in env vars, documented in `.env.example`.

## Commit messages

Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `perf:`, `ci:`.
Scope by package when useful, e.g. `feat(core): …`, `fix(api): …`.

## Where things live

- Review logic → `packages/core/src/engine.ts`
- Prompts → `packages/core/src/llm/prompts.ts`
- LLM providers → implement `ReviewLLM` (`packages/core/src/llm/types.ts`)
- Webhook handling → `apps/api/src/webhook.ts`
- MCP tools → `apps/mcp/src/tools.ts`
- Dashboard pages → `apps/web/src/app/(app)/`

## Reporting security issues

Please do not open public issues for vulnerabilities — email the maintainers instead.
