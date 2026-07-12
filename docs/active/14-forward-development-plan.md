# Forward Development Plan

_Last updated: 2026-07-01_

## Objective

Move Blaze Diagnostics from a cleaned and partially functional prototype into a production-ready SaaS platform for South African service stations, customers, suppliers, and platform administrators.

The next development phase should prioritize production foundations before adding large new feature surfaces.

## Development gates

### Gate 1: Build stability

Owner groups: Software Engineering 1, Software Development 1, Cloud Administration

- [ ] `pnpm install` succeeds from a clean checkout.
- [ ] `pnpm lint` passes.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm build` passes.
- [ ] No Next.js page file is placeholder-only.
- [ ] No active source imports `react-router-dom`.
- [ ] No committed `package-lock.json` or generated build artifacts.
- [ ] All failed checks are converted into GitHub issues.

### Gate 2: Production data foundation

Owner groups: Software Engineering 1, Software Engineering 2

- [ ] Review Drizzle schema against product workflows.
- [ ] Remove duplicate/obsolete migrations or document migration reset process.
- [ ] Confirm indexes for tenant-scoped lookups.
- [ ] Add seed data only for local/demo environments.
- [ ] Add Zod validation schemas for major mutations.
- [ ] Create typed DTOs for every major API resource.
- [ ] Connect customer and vehicle flows to production services.

### Gate 3: Auth, tenant isolation, and RBAC

Owner groups: Software Engineering 2, Cyber Security

- [ ] Select and document the production auth provider.
- [ ] Implement real session retrieval.
- [ ] Implement tenant membership checks.
- [ ] Implement role and permission matrix.
- [ ] Replace dev tenant fallback in production builds.
- [ ] Add route guards for customer, station, supplier, and platform areas.
- [ ] Add cross-tenant access tests.
- [ ] Add audit logging for sensitive actions.

### Gate 4: Core workflow persistence

Owner groups: Software Engineering 1, Software Development 1, Software Development 2

- [ ] Customer + vehicle wizard persists to database.
- [ ] Customer and vehicle detail pages load from database.
- [ ] Job card list and detail workflows persist to database.
- [ ] Quote builder persists drafts, revisions, and sent quotes.
- [ ] Customer quote approval persists item-level decisions.
- [ ] Invoice generation uses approved quote items.
- [X] Parts request and supplier response workflows persist to database.
- [X] Delivery status updates persist and appear on station/supplier/customer surfaces.

### Gate 5: Market-ready UX

Owner groups: Software Development 1, Software Development 2

- [ ] Every major workflow has empty, loading, error, and success states.
- [ ] Customer quote approval works on mobile.
- [ ] Workshop pages work on tablet.
- [ ] Station admin pages work on desktop.
- [ ] Light and dark themes are visually consistent.
- [ ] Tenant branding is visible on portal, quotes, and invoices.
- [ ] Low-technical-skill users can complete key workflows without training.
- [ ] Accessibility review completed for forms, dialogs, navigation, and tables.

### Gate 6: Production operations

Owner groups: Cloud Administration, Cyber Security

- [ ] CI pipeline active.
- [ ] Preview deployment active.
- [ ] Production deployment runbook complete.
- [ ] Environment variable matrix complete.
- [ ] Backup and restore process tested.
- [ ] Logging and monitoring configured.
- [ ] Error reporting configured.
- [ ] Incident response runbook complete.
- [ ] Security sign-off complete.

## Suggested sprint structure

### Sprint 1: Stabilize and validate

- Resolve lint/typecheck/build failures.
- Remove remaining placeholder-only code.
- Confirm route inventory.
- Confirm docs and GitHub issue structure.

### Sprint 2: Auth and tenancy

- Implement production auth.
- Add tenant membership checks.
- Add route guards.
- Add permission matrix.

### Sprint 3: Customer and vehicle persistence

- Persist customer wizard.
- Persist vehicle wizard.
- Build customer/vehicle detail services.
- Add duplicate detection.

### Sprint 4: Job cards and workshop workflow

- Build service request to job card flow.
- Add mechanic/floor manager assignment.
- Add job timeline.
- Add internal and customer-visible notes.

### Sprint 5: Quotes and approvals

- Persist quote builder.
- Add quote revisions.
- Add mobile customer approval.
- Add labor dependency rules.
- Add quote audit log.

### Sprint 6: Invoices and documents

- Generate invoices from approved quote items.
- Add branded invoice/quote document generation.
- Add manual payment status.
- Add invoice audit log.

### Sprint 7: Parts, suppliers, and delivery

- Persist parts requests.
- Add supplier response form.
- Add supplier comparison.
- Add parts order and delivery status tracking.

### Sprint 8: Reports and production operations

- Add operational reports.
- Add cloud deployment and runbooks.
- Add security sign-off.
- Prepare pilot tenant onboarding.

## Definition of done for every PR

- [ ] Code follows camelCase filename convention where applicable.
- [ ] Pages stay inside the correct layout.
- [ ] Shared types live in `src/types`.
- [ ] Reusable UI lives in `src/components`.
- [ ] Business logic is outside page files.
- [ ] API responses use the standard envelope.
- [ ] Tenant context is resolved server-side.
- [ ] No client-provided `tenantId` is trusted.
- [ ] Light and dark themes are checked.
- [ ] Responsive behavior is checked.
- [ ] Documentation is updated.
