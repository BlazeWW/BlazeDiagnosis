# Current Application State After Layout and Build Fixes

_Last updated: 2026-11-12_

## Purpose

This document replaces older MVP status notes as the current snapshot for planning new development. It reflects the latest cleanup pass, invoice page refinement, placeholder replacement, and station customer/vehicle detail build fix.

## Current baseline

Blaze Diagnostics is now past a pure MVP prototype, but it is not production-ready yet. The current app contains usable starting screens for the main customer, station, supplier, and platform areas. Several screens still use demo-safe/static data and must be connected to production services, database persistence, authentication, tenant context, and audited workflows.

## Confirmed completed cleanup

- [x] Root npm lockfiles removed.
- [x] Empty/legacy root frontend placeholder removed.
- [x] Completed MVP and legacy documentation moved into `docs/archive/`.
- [x] Active documentation moved into `docs/active/`.
- [x] Documentation templates added under `docs/templates/`.
- [x] Documentation standards added under `docs/standards/`.
- [x] React Router usage removed from active app source.
- [x] Next App Router route hooks convention documented.
- [x] Main package naming updated to Blaze Diagnostics.
- [x] Obvious ordinary source file casing issues renamed to camelCase.
- [x] Placeholder caption removed from active application pages.
- [x] Station invoice list and detail pages moved back into the shared `AppShell` layout.
- [x] Station customer detail page exports a valid page module.
- [x] Station vehicle detail page exports a valid page module.

## Current implemented page surfaces

### Public/auth

- [x] Locale landing page.
- [x] Login page.

### Customer area

- [x] Customer dashboard.
- [x] Customer vehicles page.
- [x] Customer services page.
- [x] Customer quotes page.
- [x] Customer invoices page.
- [x] Customer invoice detail page.
- [x] Customer messages page.

### Station area

- [x] Station dashboard.
- [x] Customer list page.
- [x] Customer detail page.
- [x] Add customer + vehicle wizard page.
- [x] Vehicle list page.
- [x] Vehicle detail page.
- [x] Job cards page.
- [x] Quote list page.
- [x] Quote builder page.
- [x] Invoice list page.
- [x] Invoice detail page.
- [x] Parts page.
- [x] Reports page.
- [x] Branding settings page.
- [x] Showcase/demo page.

## Confirmed job-card persistence behavior

- [x] Tenant-scoped `POST /api/job-cards`, `GET /api/job-cards`, and
      `GET /api/job-cards/[id]` routes are implemented and covered by tests using
      the local fixture adapter.
- [x] The focused job-card suite passes: 6 test files, 30 tests.
- [ ] The station job-card page still uses demo data and is not integrated with
      the persistence API; status transitions, assignment, and timeline are also
      separate follow-up work.
- [ ] No disposable-database test setup is established in the repository.
      Transaction failure is covered with a mocked Drizzle transaction, not a live
      database rollback test.

### Supplier area

- [x] Supplier dashboard.
- [x] Supplier requests page.
- [x] Supplier quotes page.
- [x] Supplier orders page.
- [x] Supplier deliveries page.
- [x] Supplier messages page.

### Platform admin area

- [x] Platform dashboard.
- [x] Tenants page.
- [x] Subscriptions page.
- [x] Feature flags page.
- [x] Usage page.
- [x] Audit logs page.

## Current production blockers

These items must be addressed before production or paid pilot usage.

- [ ] Replace mock/session fallback authentication with production auth.
- [ ] Remove or strictly gate any demo/localStorage workflows.
- [ ] Connect remaining customer, vehicle, job card, quote, invoice, supplier, delivery, and message pages to database-backed services; job-card persistence endpoints exist, but the station page remains demo-backed.
- [ ] Enforce tenant authorization on every tenant-owned read and mutation.
- [ ] Remove temporary singular alias API routes after frontend migration.
- [ ] Add automated tests for tenant isolation, quote approvals, invoice generation, and supplier workflows.
- [ ] Generate and verify a clean Drizzle migration path.
- [ ] Add CI checks for install, lint, typecheck, tests, and build.
- [ ] Add production deployment, backup, restore, logging, and monitoring runbooks.
- [ ] Complete security review and sign-off.

## Immediate local validation required

Run these commands on the local development machine after pulling the latest repo package:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm build
```

If any command fails, log the failure as a GitHub issue using `docs/templates/githubIssueTemplate.md` and assign it to the relevant intern group in `docs/active/03-intern-task-allocation.md`.

## Rule for new work

New work should not reintroduce placeholder-only pages. Every new page must have at minimum:

- a valid default export,
- shared `AppShell` or approved layout wrapper,
- typed data shape,
- empty state,
- loading/error plan,
- tenant-aware service plan,
- linked documentation update.
