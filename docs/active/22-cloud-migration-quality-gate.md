# Cloud architecture — automated migration and release test gate

**Owner:** Squad 10 cloud architects; primary individual task BD-069. **Reviewers:** database lead BD-005, security BD-058, release lead BD-070. Gate affects every DB-changing PR and every deployment; it is not a request to apply migrations directly to production.

## Required enforcement
1. Require code owners/reviewers for `apps/web/src/db/**` and Drizzle migration files. Block unreviewed schema changes.
2. Run PR CI with pinned Node/pnpm and disposable isolated PostgreSQL; do not use production credentials. `pnpm install --frozen-lockfile`; `pnpm lint`; `pnpm typecheck`; `pnpm test`; `pnpm build`.
3. Determine actual schema and migration paths from config; avoid guessing. Fail on stale/uncommitted generated migrations, renamed migrations without documented strategy, and drift between expected and actual DB schema.
4. Test **fresh DB**: provision clean database, run the exact migration command (`pnpm --filter @blaze-diagnostics/web db:migrate`), verify constraints/indexes and representative seeded workflow queries.
5. Test **upgrade DB**: provision a fixture representing the previous released schema + representative non-sensitive data, run forward migrations; verify retained rows, referential integrity, tenant isolation, and compatible application queries.
6. Run unit, service, API and integration suites against migrated DB. Include critical customer/vehicle/job/quote/invoice/parts/supplier queries, foreign key integrity, duplicate IDs and tenant scoping; fail fast on error.
7. Verify lock/contention/timeout behaviour and DB version compatibility; ensure migrations are idempotent where expected, and no destructive operations ship without reviewed data-preservation steps.
8. Rehearse a supported **recovery** plan: tested restore from backup or safe forward-fix. Do not assume all SQL migrations are automatically reversible. Demonstrate recovery in disposable staging only.
9. Block promotion unless all required checks are green and the database/security/release leads approve. Configure GitHub protected branches or rulesets; verify status check names match workflow. Fail closed on cancelled/missing results.
10. In deployment, take a verified backup, place dangerous changes behind a controlled rollout, migrate staging first, run smoke tests, get explicit approval, then run production once with controlled credentials and post-migration health checks. Never run production migrations in pull-request jobs.

## Acceptance evidence
- PR and required checks configuration; test logs for fresh and upgrade databases; schema diff and drift report; isolation and service integration test report; one failed migration rejection demonstration; staging restore evidence with measured RTO/RPO; deployment/rollback runbook and approvals.
- Must block a deliberately broken migration, broken integration test, and unreviewed destructive change before promotion. Pass path must prove a valid migration reaches staging while prod remains unchanged until authorized.
- Recommend expand/contract migrations for breaking schema changes: add nullable/new structures, deploy compatible application, backfill, verify, and only later remove old columns in a separately reviewed release.

## Roles and control boundaries
BD-064 owns CI orchestration; BD-065 owns reproducible PostgreSQL test setup; BD-066 owns E2E regressions; BD-068 owns staging promotion; BD-069 owns migration gate, rehearsals and proof; BD-005 verifies schema contract; BD-058 verifies isolation; BD-070 records final acceptance. GitHub permissions must limit migration approval and production credentials to authorized BlazeWebWorks leads.
