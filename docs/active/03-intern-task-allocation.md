# Intern Task Allocation

The workload is intentionally expanded so every intern has meaningful work. Each group should split into smaller squads of 2-4 people where needed.

## Software Engineering 1

Primary focus: backend foundations and core domain services.

### Tasks

- [ ] Review Drizzle schema and document missing tables/columns.
- [ ] Implement customer service persistence.
- [ ] Implement vehicle service persistence.
- [ ] Implement job card service persistence.
- [ ] Implement quote service persistence.
- [ ] Implement invoice service persistence.
- [ ] Add service-level validation with Zod.
- [ ] Add audit logging to quote, invoice, job, and tenant-setting mutations.
- [ ] Add unit tests for quote totals.
- [ ] Add unit tests for invoice totals.
- [ ] Add unit tests for tenant guard failures.

### Deliverables

- Pull requests with tests.
- API/data contract notes in `docs/active/09-api-and-data-contracts.md`.
- Updated feature checklists.

## Software Engineering 2

Primary focus: SaaS architecture, tenant isolation, auth, permissions, and integrations.

### Tasks

- [x] Replace mock auth/session layer with selected production auth implementation.
- [x] Implement tenant memberships and role checks.
- [x] Build central `requireTenantPermission` usage audit.
- [x] Standardize API error handling.
- [x] Build vehicle lookup provider abstraction.
- [x] Build parts fitment provider abstraction.
- [x] Add provider stubs for manual catalog and future South African lookup APIs.
- [x] Review database indexes.
- [x] Prepare migration reset plan.
- [x] Add integration tests for cross-tenant access prevention.

### Deliverables

- Auth architecture note.
- Tenant isolation test results.
- Provider interface documentation.

## Software Development 1

Primary focus: staff-facing screens and low-skill UX.

### Tasks

- [ ] Refine station dashboard.
- [ ] Complete customer + vehicle wizard UX.
- [ ] Add duplicate warning UI for customer/vehicle creation.
- [ ] Build customer profile page.
- [ ] Build vehicle profile page.
- [ ] Build job card list and detail pages.
- [ ] Build inspection checklist UI.
- [ ] Build responsive table/card layouts.
- [ ] Add empty states and loading states.
- [ ] Add inline help text for non-technical users.

### Deliverables

- Screens linked from station navigation.
- UX notes for each completed page.
- Screenshots in PR description.

## Software Development 2

Primary focus: customer, supplier, quote, invoice, and branding UX.

### Tasks

- [ ] Improve customer dashboard.
- [ ] Build mobile quote approval page.
- [ ] Complete quote builder UX.
- [ ] Add branded quote preview.
- [ ] Add branded invoice preview.
- [ ] Improve tenant branding settings.
- [ ] Build supplier request list.
- [ ] Build supplier response form.
- [ ] Build delivery status UI.
- [ ] Test light/dark theme consistency.

### Deliverables

- Customer approval flow ready for mobile testing.
- Supplier flow ready for pilot feedback.
- Theme consistency report.

## Cloud Administration

Primary focus: production operations.

### Tasks

- [ ] Create local Docker Compose for PostgreSQL.
- [ ] Document environment variables by environment.
- [ ] Add CI pipeline for install, lint, typecheck, tests, and build.
- [ ] Add deployment plan.
- [ ] Add preview deployment workflow.
- [ ] Add database backup runbook.
- [ ] Add restore drill runbook.
- [ ] Add monitoring/logging plan.
- [ ] Add release checklist.
- [ ] Add incident response contact flow.

### Deliverables

- CI workflow PR.
- Cloud runbook documentation.
- Backup/restore proof document.

## Cyber Security

Primary focus: production security and trust.

### Tasks

- [ ] Review route-level access control.
- [ ] Review API validation and error responses.
- [ ] Review tenant isolation risks.
- [ ] Review customer-visible vs internal data separation.
- [ ] Review file upload/download risks.
- [ ] Review auth/session risks.
- [ ] Create threat model.
- [ ] Create security test checklist.
- [ ] Create production security sign-off checklist.
- [ ] Review dependency and secret hygiene.

### Deliverables

- Security findings log.
- Threat model.
- Production security sign-off recommendation.

## Next assignment wave after latest cleanup

Use this section to create new GitHub issues from the current state.

### Software Engineering 1 - persistence and data services

- [ ] Convert customer list/detail pages from demo/API fallback data to database-backed services.
- [ ] Convert vehicle list/detail pages from demo/API fallback data to database-backed services.
- [ ] Implement invoice query service for station invoice register.
- [ ] Implement invoice detail query service with tenant and customer ownership guards.
- [ ] Add Zod schemas for customer, vehicle, quote, invoice, and parts mutations.
- [ ] Add unit tests for customer duplicate detection.
- [ ] Add unit tests for vehicle duplicate detection.
- [ ] Add unit tests for invoice total calculations.

### Software Engineering 2 - auth, tenancy, and route protection

- [ ] Add route group protection plan for `(customer)`, `(station)`, `(supplier)`, and `(platform)` areas.
- [ ] Replace temporary session helpers with the selected production auth implementation.
- [ ] Audit all API routes for client-supplied `tenantId` usage.
- [ ] Remove singular alias API routes once the UI uses canonical plural routes.
- [ ] Add tenant isolation integration tests for customer, vehicle, invoice, quote, and supplier routes.
- [ ] Document the RBAC matrix in the active docs.

### Software Development 1 - station workflow UX

- [ ] Refine station customer list and detail pages for low-technical-skill users.
- [ ] Refine station vehicle list and detail pages.
- [ ] Build job card detail page from the current job-card list surface.
- [ ] Add empty/loading/error states to station customers, vehicles, job cards, invoices, parts, and reports.
- [ ] Verify station pages stay inside `AppShell` at desktop, tablet, and mobile widths.
- [ ] Add screenshots to PRs for every touched station page.

### Software Development 2 - customer/supplier UX

- [ ] Connect customer quote page to the future approval flow design.
- [ ] Refine customer messages page into a usable chat-style layout.
- [ ] Refine supplier request and quote pages into action-oriented queues.
- [ ] Add delivery timeline UX to supplier deliveries.
- [ ] Test all customer and supplier surfaces in light and dark mode.
- [ ] Add mobile screenshots to PRs for every touched customer/supplier page.

### Cloud Administration - validation and deployment readiness

- [ ] Add CI workflow for `pnpm install`, `pnpm lint`, `pnpm typecheck`, and `pnpm build`.
- [ ] Add a local Docker Compose PostgreSQL setup.
- [ ] Document exact Node and pnpm versions.
- [ ] Add preview deployment instructions.
- [ ] Add migration validation steps.
- [ ] Add backup/restore proof checklist.

### Cyber Security - production sign-off preparation

- [ ] Build a route access matrix from the current route inventory.
- [ ] Review invoice/customer/vehicle detail routes for access-control risk.
- [ ] Review supplier pages for customer data exposure risk.
- [ ] Review platform pages for tenant data exposure risk.
- [ ] Add a tenant isolation test checklist for QA.
- [ ] Add a security sign-off issue template or checklist.
