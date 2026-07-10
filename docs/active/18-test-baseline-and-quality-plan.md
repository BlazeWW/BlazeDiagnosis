# Test Baseline and Quality Plan

## Purpose

This document records the first production-readiness test baseline for Blaze Diagnostics. The goal is to give interns repeatable examples for testing every new API route, service function, schema, and shared utility before production hardening continues.

## New test commands

From the repo root:

```bash
pnpm test
pnpm test:web
```

From `apps/web`:

```bash
pnpm test
pnpm test:watch
pnpm test:coverage
```

## Baseline test coverage added

### Shared utility tests

- `src/lib/api/response.test.ts`
- `src/lib/apiClient.test.ts`
- `src/lib/quoteTotals.test.ts`
- `src/lib/tenantBranding.test.ts`

### Schema validation tests

- `src/features/customers/schemas/customerSchemas.test.ts`
- `src/features/vehicles/schemas/vehicleSchema.test.ts`
- `src/features/parts/schemas/partsSchemas.test.ts`
- `src/features/tenants/schemas/tenantBrandingSchema.test.ts`

### Service function tests

- `src/features/customers/services/customerService.test.ts`
- `src/features/vehicles/services/vehicleService.test.ts`
- `src/features/quotes/services/laborRules.test.ts`
- `src/features/quotes/services/quoteService.test.ts`
- `src/features/invoices/services/invoiceService.test.ts`

### API route tests

- `src/app/api/customers/route.test.ts`
- `src/app/api/customers/[id]/route.test.ts`
- `src/app/api/customer-intakes/route.test.ts`
- `src/app/api/vehicles/route.test.ts`
- `src/app/api/vehicles/[id]/route.test.ts`
- `src/app/api/vehicles/customer/[id]/route.test.ts`
- `src/app/api/quotes/route.test.ts`
- `src/app/api/parts-requests/route.test.ts`
- `src/app/api/supplier-responses/route.test.ts`
- `src/app/api/aliases.test.ts`

## API behaviour now enforced by tests

All tested API routes must return the standardized envelope:

```ts
{ success: true, data, meta? }
```

or:

```ts
{ success: false, error: { code, message, details? } }
```

The quote API was also standardized while adding tests. `/api/quotes` now uses the shared response helpers, tenant context, validation, and quote service functions instead of returning raw `NextResponse.json({ quote })` payloads.

## Fixes made during test creation

- Added root and web-level test scripts.
- Added reusable API route test helpers.
- Added reusable Drizzle mock helpers for future service tests.
- Standardized `/api/quotes` response handling.
- Added `GET /api/customer-intakes?customerId=...` so the existing API client function has a valid route.
- Added `PATCH /api/vehicles/[id]` because the API client already called it.
- Changed `/api/supplier-response` into a true compatibility alias for `/api/supplier-responses`.
- Fixed API client customer create/update functions to unwrap `{ customer }` responses consistently.

## Intern testing rules from this point forward

Every new feature must include:

- At least one schema test for every input schema.
- At least one service test for every exported service function.
- At least one API test for every HTTP method on every route.
- At least one negative test for validation, not-found, or unauthorized behaviour.
- Tests for tenant scoping wherever a `tenantId` is used.
- Tests for customer-visible versus internal-only data where relevant.

## Suggested next testing work

### Software Engineering 1

- Add tests for customer and vehicle UI components.
- Add tests for form validation states.
- Add tests for empty states and responsive table fallbacks.

### Software Engineering 2

- Add deeper service tests for job cards, notifications, chat, parts workflows, and reports.
- Add transaction rollback test scenarios.
- Add integration tests against a test PostgreSQL database.

### Software Development 1

- Add tests for quote builder UI interactions.
- Add tests for customer wizard form step logic.
- Add tests for tenant branding preview and document preview rendering.

### Software Development 2

- Add API tests for every future route before connecting UI screens.
- Add API client tests for every exported client helper.
- Add fixture factories for customers, vehicles, quotes, invoices, and parts.

### Cloud Administration

- Add CI job to run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
- Add test database provisioning plan.
- Add migration validation job.

### Cyber Security

- Add authorization negative tests.
- Add cross-tenant access tests.
- Add tests ensuring internal notes and supplier margins are not customer-visible.
- Add audit-log creation tests for quote approvals, invoice creation, and role changes.

## Definition of done for future pull requests

A pull request is not ready unless:

- New or changed functions have tests.
- New or changed APIs have tests.
- Tests pass locally.
- Lint, typecheck, and build pass locally.
- The pull request checklist references the relevant test files.
