# BD-001 Route and Feature Inventory

*_Last updated: 2026-11-10_*

## 1. Purpose

This inventory records the active application page routes and API route handlers, the user surface each page serves, what the page currently renders, and the available evidence for its data source, authorization and persistence.

It reconciles earlier readiness documentation with the current source code.

## 2. Inspection scope and method

The route inventory was generated from the application source tree.

- UI pages: 39 `page.tsx` files under `apps/web/src/app`.
- API handlers: 14 `route.ts` files under `apps/web/src/app/api`.
- Page source, relevant components, API handlers, selected services and existing documentation were inspected.
- This is a source-code inspection, not a claim that all 39 pages or 14 handlers were runtime-tested.
- Where a page imports child components, the findings include those components only where they were inspected.
- Authorization and tenant isolation are recorded from inspected server-side code and documented architecture. They should not be assumed for uninspected page-level behavior.
- Readiness descriptions distinguish database-backed operations, local/demo data, partial integrations and unverified behavior.

## 3. Application route totals

| Surface | Page routes |
|---|---:|
| Customer | 7 |
| Station | 15 |
| Supplier | 6 |
| Platform | 6 |
| Shared landing and authentication | 2 |
| Shared quotes | 2 |
| Standalone parts request | 1 |
| **Total** | **39** |

The application also contains 14 API route handler files. These include canonical plural routes and singular compatibility aliases.

## 4. Customer surface

| Page / feature | What the source currently shows | Data source and persistence | Readiness assessment |
|---|---|---|---|
| Customer dashboard | Customer form, customer list and dashboard metrics. The metrics are hardcoded. | Customer list and form use the customer API; dashboard metrics remain demo values. | Partial |
| Customer vehicles | Vehicle information is sourced from sample workflow data. | No live API or database integration was identified in the inspected page. | Demo-backed |
| Customer services | Service information is sourced from sample workflow data. | No live API or database integration was identified in the inspected page. | Demo-backed |
| Customer quotes | Quote information is sourced from sample workflow data. | No live API or database integration was identified in the inspected page. | Demo-backed |
| Customer messages | Sample message threads are displayed. | No live messaging or notification integration was identified in the inspected page. | Demo-backed |
| Customer invoices | Invoice list and detail information use hardcoded sample records and amounts. | No live invoice API integration was identified in the inspected pages. | Demo-backed |

### Customer API integration findings

- `GET /api/customers` uses tenant context and the customer search service.
- `POST /api/customers` uses tenant context, request validation and the customer creation service.
- `GET`, `PATCH` and `DELETE /api/customers/[id]` use tenant context.
- Customer deletion is implemented as a soft archive.
- Customer form and list components call the API for create, update, retrieval and deletion.
- Some customer form fields are packed into the notes field rather than represented as separate API fields.
- The inspected customer detail page requests `/api/jobs?customerId=...`, but no matching `/api/jobs` route handler was found in the inspected API route tree.
- The customer detail page silently ignores errors from that request.

**Readiness conclusion:** Customer create and list operations have database-backed API paths, but this does not establish that every customer-facing workflow is complete. Vehicles, services, quotes, messages and invoices still contain sample or hardcoded data in the inspected pages.

## 5. Station surface

| Page / feature | What the source currently shows | Data source and persistence | Readiness assessment |
|---|---|---|---|
| Station dashboard | Dashboard metrics and workflow records are imported from sample workflow data. | Hardcoded/demo metrics and records. | Demo-backed |
| Job cards | Job records and checklist data are sample-driven. Starting intake navigates to customer creation rather than creating a job card. | No completed job-card creation workflow was identified. | Demo-backed |
| Parts | Parts metrics and records are sample-driven. The build-quote action navigates to quote creation. | No completed parts-request workflow was identified in this page. | Demo-backed |
| Reports | Report metrics and records are sample-driven. | No live reporting integration was identified in the inspected page. | Demo-backed |
| Invoices | Invoice list and detail pages use sample records. Send-invoice and record-payment buttons have no implemented handlers in the inspected detail page. | No live invoice API integration was identified in the inspected pages. | Demo-backed |
| Vehicles | Vehicle form and list components call the vehicle API. | Tenant-scoped API and database service operations exist. | Partially integrated |
| Quotes | Quote builder calculates line items locally and submits quote creation to the API. | Quote creation is database-backed; quote listing and sending are not fully implemented in the inspected UI. | Partially integrated |
| Tenant branding | Settings are initially read from local storage and saved locally. The UI also attempts a tenant-branding API update. | Backend tenant-scoped update service exists, but initial API loading and reliable UI/API synchronization are incomplete. | Partially integrated |
| MVP showcase | Displays multiple workflow panels and a parts request form. | Mixed sample/local UI behavior; not every panel was inspected in detail. | Mixed / requires further inspection |
| Audit logs | Displays two hardcoded sample events. Filter controls are disabled. | The page describes the audit query endpoint as not yet wired to authenticated tenant context. | Demo-backed |

### Vehicle API and service findings

- `GET /api/vehicles` and `POST /api/vehicles` use tenant context.
- Vehicle creation uses the vehicle service, which checks for duplicate active VIN and registration values within the tenant.
- Vehicle creation also inserts the vehicle and related records through a database transaction.
- `GET`, `PATCH` and `DELETE /api/vehicles/[id]` use tenant-scoped service operations.
- Vehicle deletion is a soft archive.
- The vehicle UI calls the API for list, create, update and delete operations.
- The vehicle detail UI expects additional information such as customer name, jobs and quotes. The inspected service returns the vehicle record; the full detail-data contract requires further verification.
- Some vehicle UI and database field names differ, so the mapping should be verified.

### Quote API and service findings

- Quote creation uses tenant context and a database-backed service.
- Quote calculations include 15% tax in the inspected service.
- The quote builder currently starts with an example labor line item and keeps its editing calculations in client-side state.
- The inspected UI saves a draft through the API.
- The send action does not implement quote delivery.
- No quote detail route was identified in the inspected page tree.
- The API schema and service validation differ on whether a zero-price line item is accepted.

### Customer intake and parts integration findings

- The customer vehicle wizard submits to `POST /api/customer-intakes`.
- The inspected GET handler returns an empty intake list rather than retrieving persisted intake records.
- The intake service creates the customer and vehicle sequentially without an encompassing transaction.
- The parts request form submits request-shaped data to `/api/parts-requests`.
- The inspected endpoint handles parts catalogue records rather than job-card parts requests.
- The form expects a `requestId`, while the endpoint returns a `partId`.
- The form's `jobCardId` is not used by the inspected catalogue endpoint.
- This is a verified integration mismatch requiring a separate corrective issue or follow-up task.

### Station readiness conclusion

Vehicle and quote creation have database-backed API paths, but their UI workflows remain partial. Dashboard, job-card, parts, report and invoice pages still rely substantially on sample data or incomplete actions.

The parts request form and catalogue API have incompatible contracts. They should not be described as a working parts-request workflow.

## 6. Supplier surface

The supplier application contains six page routes.

| Page / feature | What the source currently shows | Data source and persistence | Readiness assessment |
|---|---|---|---|
| Supplier dashboard | Supplier checklist, order records and request records are imported from sample workflow data. | Sample/demo data. | Demo-backed |
| Deliveries | Delivery records are imported from sample workflow data. | Sample/demo data. | Demo-backed |
| Messages | Message records are imported from sample workflow data. | Sample/demo data. | Demo-backed |
| Orders | Supplier order records are imported from sample workflow data. | Sample/demo data. | Demo-backed |
| Quotes | Supplier quote records are imported from sample workflow data. | Sample/demo data. | Demo-backed |
| Requests | Supplier request records are imported from sample workflow data. | Sample/demo data. | Demo-backed |

### Supplier response API findings

- `GET /api/supplier-responses` uses tenant context and scopes the request lookup to the tenant.
- `POST /api/supplier-responses` uses tenant context and validates the submitted payload.
- The response and its items are inserted through separate database operations in the inspected service flow.
- No encompassing transaction was identified in that flow.
- The inspected request schema validates UUIDs and requires at least one item.
- Further validation of quantities, availability and client-supplied totals is required.
- Related-record ownership and tenant-scoping behavior should receive dedicated negative tests.
- The architecture and test-baseline documents identify supplier response API tests and a singular compatibility alias.

**Readiness conclusion:** The supplier response API has database-backed operations, but the six inspected supplier pages remain sample-driven. API availability does not establish that the supplier portal workflows are fully connected.

## 7. Platform surface

The platform application contains six page routes.

| Page / feature | What the source currently shows | Data source and persistence | Readiness assessment |
|---|---|---|---|
| Platform dashboard | Tenant, usage and checklist records are imported from platform sample workflow data. | Sample/demo data. | Demo-backed |
| Tenants | Tenant records are imported from sample workflow data. | No completed tenant-provisioning workflow was identified in the inspected page. | Demo-backed |
| Subscriptions | Subscription records are imported from sample workflow data. | No completed billing integration was identified in the inspected page. | Demo-backed |
| Feature flags | Feature-flag records are imported from sample workflow data. | No completed feature-flag management integration was identified in the inspected page. | Demo-backed |
| Usage | Usage records are imported from sample workflow data. | No live usage reporting integration was identified in the inspected page. | Demo-backed |
| Audit logs | Displays hardcoded sample audit events. Filter controls are disabled. | No connected audit query workflow was identified in the inspected page. | Demo-backed |

### Platform readiness conclusion

The inspected platform pages are primarily sample-driven. The existing readiness documentation also identifies tenant provisioning and suspension, subscription and billing workflows, feature-flag mutation endpoints, SaaS telemetry and audit reporting as incomplete areas.

These findings describe the inspected pages and documentation. They do not establish that no related backend code exists elsewhere in the repository.

## 8. Shared and standalone routes

| Page / feature | What the source currently shows | Data source and persistence | Readiness assessment |
|---|---|---|---|
| Shared landing page | Static landing page with navigation cards and a theme toggle. | Static page content; no API or database integration identified. | Presentational |
| Login page | Email and password fields are displayed. | No login submission handler, Auth0 login call or authenticated redirect was identified in the inspected page. | Incomplete |
| Shared quotes list | Three hardcoded sample quotes are displayed. View buttons have no handlers. | No quote-list API retrieval identified. | Demo-backed |
| Shared quote creation | Uses the station QuoteBuilder component. | Quote creation uses the quote API; UI workflow remains partial. | Partially integrated |
| Standalone parts request | Displays a parts request form and a static sample request row. | Form submits to the parts catalogue endpoint, which does not implement the request contract expected by the form. | Integration mismatch |

### Shared route readiness conclusion

The landing page is presentational. The inspected login page does not demonstrate a completed authentication flow. Shared quote listing remains sample-driven, while quote creation is partially connected to the API.

The standalone parts-request page shares the same verified form-to-catalogue API mismatch described in the station findings.

## 9. API route inventory

The source tree contains 14 API route handler files.

| API route | Main responsibility | Tenant protection / persistence evidence | Assessment |
|---|---|---|---|
| `GET, POST /api/customer-intakes` | Customer and vehicle intake | [GET handler, tenant guard and empty result](https://github.com/BlazeWW/BlazeDiagnosis/blob/main/apps/web/src/app/api/customer-intakes/route.ts#L15-L21); [POST handler and service call](https://github.com/BlazeWW/BlazeDiagnosis/blob/main/apps/web/src/app/api/customer-intakes/route.ts#L31-L35). | Partial |
| `GET, PATCH, DELETE /api/customers/[id]` | Retrieve, update and archive a customer | Tenant context and customer service operations are used. | Database-backed; edge cases need review |
| `GET, POST /api/customers` | Search/list and create customers | Tenant context, validation and customer service operations are used. | Database-backed |
| `GET, POST /api/parts-request` | Compatibility alias for parts catalogue operations | Re-exports the plural route handler. | Temporary alias |
| `GET, POST /api/parts-requests` | Parts catalogue operations | Tenant context and database operations are used. The endpoint is not the job-card parts-request workflow expected by the current form. | Database-backed catalogue; UI contract mismatch |
| `GET, POST /api/quotes` | Retrieve and create quotes | [GET handler and tenant context](https://github.com/BlazeWW/BlazeDiagnosis/blob/main/apps/web/src/app/api/quotes/route.ts#L28-L30); [POST handler, tenant context, validation and quote service call](https://github.com/BlazeWW/BlazeDiagnosis/blob/main/apps/web/src/app/api/quotes/route.ts#L39-L43). Quote creation uses the tenant-scoped `createQuoteFromJobCard` service. | Database-backed creation; listing requires further verification |
| `GET, POST /api/supplier-response` | Compatibility alias for supplier responses | Identified in the API contract and test-baseline documentation as a compatibility alias. | Temporary alias |
| `GET, POST /api/supplier-responses` | Supplier response operations | Tenant context and supplier response service operations are used. | Database-backed; validation and transaction review needed |
| `GET, PUT /api/tenant-branding` | Retrieve and update tenant branding | Tenant-scoped backend service and permission checks are documented; UI integration is partial. | Partially integrated |
| `GET, PATCH, DELETE /api/vehicle/[id]` | Singular vehicle compatibility route | The API contract identifies this as a temporary alias. | Temporary alias |
| `GET, POST /api/vehicle` | Singular vehicle compatibility route | The API contract identifies this as a temporary alias. | Temporary alias |
| `GET, PATCH, DELETE /api/vehicles/[id]` | Retrieve, update and archive a vehicle | [GET handler](https://github.com/BlazeWW/BlazeDiagnosis/blob/main/apps/web/src/app/api/vehicles/[id]/route.ts#L13-L17); [PATCH handler](https://github.com/BlazeWW/BlazeDiagnosis/blob/main/apps/web/src/app/api/vehicles/[id]/route.ts#L29-L34); [DELETE handler](https://github.com/BlazeWW/BlazeDiagnosis/blob/main/apps/web/src/app/api/vehicles/[id]/route.ts#L42-L46). All three use tenant context and tenant-scoped service calls. DELETE performs a soft archive. | Database-backed |
| `GET /api/vehicles/customer/[id]` | Retrieve vehicles for a customer | Route exists in the source tree; detailed behavior requires separate inspection. | Requires further verification |
| `GET, POST /api/vehicles` | List and create vehicles | Tenant context, validation and vehicle service operations are used. | Database-backed |

### Canonical route naming

The API contract document identifies these nine canonical routes:

- `/api/customers`
- `/api/customers/[id]`
- `/api/vehicles`
- `/api/vehicles/[id]`
- `/api/customer-intakes`
- `/api/quotes`
- `/api/parts-requests`
- `/api/supplier-responses`
- `/api/tenant-branding`

It identifies four temporary aliases:

- `/api/vehicle`
- `/api/vehicle/[id]`
- `/api/parts-request`
- `/api/supplier-response`

### API coverage gaps

The inspected API route tree does not contain handlers for several workflows referenced by the UI, including `/api/jobs` and a complete invoice workflow.

The presence of an API route does not prove that every related UI operation uses the correct contract or that all authorization and tenant-isolation cases have been tested.

## 10. Authentication, tenant isolation and provider architecture

### Authentication

The documented authentication architecture identifies:

- `apps/web/src/lib/auth/session.ts` as the session resolution location.
- `apps/web/src/lib/auth/verify.ts` as the Auth0 JWT validation location.
- Authentication through either an `Authorization: Bearer <token>` header or the `auth0_session` cookie.
- Custom Auth0 claims for tenant ID, tenant role, permissions and tenant memberships.
- `requireUser()` as the base authentication guard.

### Tenant isolation

The documented tenant controls are:

- `requireTenantContext()` in `apps/web/src/lib/tenancy/tenantContext.ts`.
- `requireTenantPermission()` in `apps/web/src/lib/authorization/guards.ts`.
- Tenant membership and permission metadata are validated server-side.
- Client-supplied tenant IDs must not be trusted.
- Tenant-owned database queries must be scoped to the authenticated tenant.

The inspected customer and vehicle API routes use tenant context and tenant-scoped services. However, the architecture document's general statement that most routes are protected is not a substitute for testing each route.

### Development fallback

The auth architecture documentation records a development fallback profile when Auth0 is not configured.

This must not be treated as production authentication. Production readiness requires a real Auth0 session and appropriate tenant membership and permission checks.

### Provider interfaces

The repository documents two provider interfaces:

- Vehicle lookup: `apps/web/src/lib/providers/vehicle/types.ts`
- Parts fitment: `apps/web/src/lib/providers/parts/types.ts`

The provider registries support prioritized provider selection and fallback behavior.

The South African provider implementations are documented as `NOT_IMPLEMENTED`. Manual catalog providers require their respective feature flags to be enabled.

**Readiness conclusion:** Provider interfaces and registry structures exist, but the documented South African integrations are stubs. Their existence does not establish that live vehicle or parts-provider integrations are available.

### Security verification still required

The auth architecture document recommends additional tests for:

- Cross-tenant reads returning `403 Forbidden`.
- Permission checks for `tenant.settings.update`, `quotes.create` and `parts.request`.
- Auth0 cookie fallback behavior.
- Auth0 token validation.
- Tenant isolation for customers, vehicles, quotes, invoices and parts requests.

These are documented recommendations, not evidence that all these tests currently exist or pass.

## 11. Readiness reconciliation

The existing `docs/active/16-page-readiness-matrix.md` was last updated on 1 July 2026. It provides a useful planning baseline, but its readiness descriptions should be interpreted alongside the newer source-code findings in this inventory.

| Area | Earlier readiness description | Finding from this inspection |
|---|---|---|
| Customer dashboard | Dashboard present | Customer form and list have API integration, but dashboard metrics remain hardcoded. |
| Customer vehicles, services, quotes and messages | Demo or incomplete | Sample workflow data remains in the inspected pages. |
| Customer invoices | Present; ownership and API confirmation required | Invoice list and detail pages still use hardcoded sample records. |
| Station vehicles | Present | Database-backed API operations exist; UI and detail-data contracts need further verification. |
| Station job cards | Demo | Job-card workflow remains sample-driven; no completed job-card API workflow was identified. |
| Station quotes | Present | Quote creation is database-backed, but listing and sending remain incomplete in the inspected UI. |
| Station invoices | Layout refined | Invoice records remain sample-driven and key actions have no implemented handlers. |
| Station parts | Demo | Parts catalogue API exists, but the inspected request form uses an incompatible contract. |
| Station reports | Demo | Report metrics and records remain sample-driven. |
| Tenant branding | Present | Backend update operations exist, but UI loading and synchronization are incomplete. |
| Supplier pages | Sample-driven | All six inspected supplier pages import sample workflow data. |
| Platform pages | Demo | All six inspected platform pages are primarily sample-driven. |
| Audit logs | Present | The inspected audit page uses hardcoded records and disabled filters. |

### Reconciled overall assessment

The application has a broader set of page routes and backend operations than a simple demo, but route existence and database-backed services should not be confused with completed end-to-end workflows.

The strongest confirmed database-backed UI/API areas are customer create/list, vehicle operations and quote creation. Even these areas have incomplete behavior or contracts requiring further review.

The customer-facing service, vehicle, quote, message and invoice pages, supplier portal pages, platform pages, job-card workflows, reports and invoice workflows still have significant sample-driven or incomplete behavior in the inspected source.

The parts request form-to-catalogue endpoint mismatch is a specific verified integration defect.

## 12. Follow-up work and identified gaps

The following items were identified during the source inspection. They are findings for review and follow-up, not a claim that BD-001 implements these changes.

| Priority for follow-up | Finding | Suggested next action |
|---|---|---|
| High | Parts request form submits request-shaped data to a parts catalogue endpoint. | Define a dedicated parts-request contract and align the form, API and service. |
| High | Job-card workflows are sample-driven and no `/api/jobs` handler was found in the inspected API route tree. | Confirm the intended job-card scope and define the required API and data contract. |
| High | Invoice pages use sample data and key invoice actions are not implemented. | Define invoice API, persistence and workflow requirements. |
| High | Tenant isolation and permission behavior need broader negative-test coverage. | Add cross-tenant and permission-denial tests for tenant-owned resources. |
| Medium | Customer intake GET returns an empty list. | Connect intake retrieval to persisted records and verify its response contract. |
| Medium | Supplier response and its items are written separately. | Review transaction handling and validate related-record ownership and totals. |
| Medium | Quote creation is connected, but quote listing and sending are incomplete. | Define quote retrieval, detail and delivery workflows. |
| Medium | Tenant branding UI does not initially load from the API. | Connect initial loading and handle API failures consistently. |
| Medium | Supplier and platform pages remain sample-driven. | Define and implement the required portal data services. |
| Medium | Provider interfaces exist, but South African provider implementations are stubs. | Track external provider integration as separate work. |
| Medium | Twelve DTOs are listed as required in the API contract document. | Document and review the required request and response contracts. |

### Recommended verification

The test-baseline document lists the following commands:

- `pnpm test`
- `pnpm test:web`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`

The existence of these commands in project documentation does not mean they have been executed or passed during this inventory inspection.

Recommended test coverage includes:

- Positive and negative authorization cases.
- Cross-tenant access rejection.
- Customer and vehicle CRUD behavior.
- Quote creation and validation.
- Supplier response validation and persistence.
- API response-envelope consistency.
- UI loading, empty, error and success states.

## 13. Completion boundary

This document provides a route and feature inventory based on source-code inspection.

It does not claim that:

- All 39 page routes were runtime-tested.
- All 14 API handlers were tested.
- All workflows are production-ready.
- Every route has independently verified authorization and tenant isolation.
- All tests or quality commands pass.
- Provider integrations documented as stubs are operational.

The inventory is intended to support BD-001 review, readiness reconciliation and the creation of separately scoped follow-up issues.

Further implementation work should be tracked against the relevant GitHub issues rather than silently expanding the scope of this inventory.

## 14. Quality Check Results

The following checks were run from the repository root on 10 November 2026.

| Command | Result | Details |
|---|---|---|
| `pnpm lint` | Failed | 9 errors and 20 warnings. Errors include functions accessed before declaration and explicit `any` types. |
| `pnpm typecheck` | Failed | 7 TypeScript errors across 2 files. These include a vehicle component filename casing conflict and unsupported quote permission names. |
| `pnpm test` | Partially passed; overall failed | 14 test files passed and 12 failed during setup because `AUTH0_DOMAIN` or `AUTH0_AUDIENCE` was missing. 47 individual tests passed. |
| `pnpm build` | Failed | Next.js could not resolve `./vehicleForm` because of the vehicle component filename casing mismatch. A multiple-lockfile workspace warning was also reported. |

**Verification note:** These results record the repository state at the time of inspection. They do not establish that all routes or workflows are production-ready. No unrelated application code or configuration was changed as part of this documentation update.

## 15. Customer and Vehicle Verification Evidence

The following existing test files were inspected as part of the BD-001 verification review.

### Customer verification

| Test file | Test cases | Coverage |
|---|---:|---|
| `src/app/api/customers/route.test.ts` | 3 | Customer listing, customer creation and invalid payload validation. |
| `src/app/api/customers/[id]/route.test.ts` | 5 | Customer retrieval, missing records, simulated cross-tenant denial, updates and archiving. |
| `src/features/customers/services/customerService.test.ts` | 6 | Permission checks, duplicate phone numbers, missing customers, tenant-scoped updates, archiving and customer/vehicle intake. |

### Vehicle verification

| Test file | Test cases | Coverage |
|---|---:|---|
| `src/app/api/vehicles/route.test.ts` | 2 | Vehicle listing and creation. |
| `src/features/vehicles/services/vehicleService.test.ts` | 6 | Vehicle creation, duplicate VIN checks, customer vehicle listing, retrieval, mileage updates and archiving. |

### Verification limitations

- API and service tests use mocked dependencies. They do not replace full integration tests against the database and authentication provider.
- The customer API tests simulate a cross-tenant denial. They do not independently prove database-level tenant isolation.
- The vehicle API tests do not explicitly cover negative authorization or cross-tenant access.
- The vehicle service tests mock the permission guard and database. They do not independently prove that cross-tenant access is blocked.
- The earlier test run had 12 test files fail during setup because `AUTH0_DOMAIN` or `AUTH0_AUDIENCE` was missing. The affected API tests must not be reported as successfully executed in that run.

These tests provide evidence of existing customer and vehicle behaviour, but further integration and authorization testing is still needed to establish complete tenant isolation.