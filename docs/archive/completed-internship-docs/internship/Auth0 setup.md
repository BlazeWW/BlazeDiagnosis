# Blaze Diagnostics

Blaze Diagnostics is a white-label SaaS platform for South African vehicle service stations, mechanics, customers, parts suppliers, and platform administrators.

The app is being moved from MVP/student prototype status toward production readiness.

## Product scope

Core production workflows:

- Tenant setup and white-label branding
- Role-based authentication and authorization
- Customer and vehicle management
- Customer + vehicle intake wizard
- Job cards and workshop workflow
- Quote builder and customer approvals
- Branded quotes and invoices
- Parts requests and supplier responses
- Parts delivery tracking
- Customer/station/supplier communication
- Audit logs, reporting, and SaaS administration

## Tech stack

- pnpm workspace
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-compatible component layout
- Drizzle ORM
- PostgreSQL
- Prettier with organized imports

## Repository structure

```txt
apps/
  web/                  Main Next.js application
packages/
  shared/               Shared package placeholder
docs/
  active/               Current production development documentation
  archive/              Completed MVP, internship, POD, and legacy docs
  standards/            Documentation standards
  templates/            Issue, PR, feature, and progress templates
  training/             Intern training material still useful going forward
```

## Setup

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
pnpm --filter @blaze-diagnostics/web db:generate
pnpm --filter @blaze-diagnostics/web db:migrate
pnpm dev
```

> For Auth0 integration, set `AUTH0_DOMAIN` and `AUTH0_AUDIENCE` in `apps/web/.env.local` to match your Auth0 tenant and API audience.

## Workspace scripts

```bash
pnpm dev
pnpm build
pnpm lint
pnpm format
pnpm typecheck
pnpm test:web
```

## Active documentation

Start here:

- `docs/README.md` - documentation index
- `docs/active/00-production-readiness-roadmap.md` - roadmap to production
- `docs/active/01-current-repo-cleanup-log.md` - cleanup completed and remaining cleanup
- `docs/active/02-development-workstreams.md` - workstreams by discipline
- `docs/active/03-intern-task-allocation.md` - group-specific intern workload
- `docs/active/04-feature-implementation-checklists.md` - feature checklists
- `docs/active/05-code-refactor-backlog.md` - refactor backlog
- `docs/active/06-documentation-backlog.md` - docs still required
- `docs/active/07-release-readiness-checklist.md` - production release gates
- `docs/active/08-vehicle-fitment-and-parts-catalog.md` - SA fitment and parts catalog plan
- `docs/active/09-api-and-data-contracts.md` - API standardization plan
- `docs/active/10-quality-security-cloud-gates.md` - QA/security/cloud gates
- `docs/active/13-current-application-state.md` - latest route/page and blocker snapshot
- `docs/active/14-forward-development-plan.md` - forward development gates and sprint plan
- `docs/active/15-production-documentation-plan.md` - documentation still required for production
- `docs/active/16-page-readiness-matrix.md` - page-by-page readiness tracker
- `docs/active/17-github-issue-breakdown.md` - GitHub issue backlog for interns

## Current development status

The latest cleanup and implementation passes have:

- moved invoice pages back into the shared station layout,
- replaced MVP placeholder screens with basic usable surfaces,
- fixed placeholder-only station customer and vehicle detail pages that blocked `next build`,
- added active planning docs for the next production development phase.

Before new feature development, run:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm build
```

Log any failures as GitHub issues and link them to the relevant active docs.

## Documentation archive

Completed MVP, intern, POD, and legacy documents have been moved to `docs/archive/`.

Archived documents are preserved for reference but should not be used as the active implementation plan unless explicitly reopened.

## Architectural rule

Every tenant-owned operation must include a server-side tenant authorization check before reading or mutating data.

## Development rule

Do not build new production features on demo-only or localStorage-only workflows. New work should use database-backed services, typed API contracts, tenant-aware authorization, and production documentation updates.

## Testing

Run the web test baseline from the repo root:

```bash
pnpm test
```

The first production-readiness test baseline is documented in `docs/active/18-test-baseline-and-quality-plan.md`. New features must include schema, service, API, and negative-path tests before being considered ready for review.
