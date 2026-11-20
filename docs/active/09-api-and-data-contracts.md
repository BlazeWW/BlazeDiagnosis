# API and Data Contracts

## Standard response envelope

Success:

```ts
{
  success: true,
  data: unknown,
  meta?: Record<string, unknown>
}
```

Failure:

```ts
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: unknown
  }
}
```

## API rules

- [ ] Use plural resource names for canonical routes.
- [ ] Keep compatibility aliases temporary and documented.
- [ ] Validate request body/query params with Zod.
- [ ] Resolve tenant context server-side.
- [ ] Never trust client-supplied `tenantId`.
- [ ] Return the standard response envelope.
- [ ] Avoid leaking internal stack traces.
- [ ] Add request IDs to logs.
- [x] **Reject cross-tenant job card references in parts requests (BD-031).**
- [x] **Validate parts request item quantities must be > 0 (BD-031).**
- [x] **Aggregate usage reports must be tenant-scoped and expose no PII (BD-048).**

## Tenant feature flags (BD-046)

### Read contract
`isFeatureEnabled(tenantId, flagKey)`:
- Returns `boolean`.
- **Safe default:** missing flag returns `false`.
- Disabled flag returns `false`.
- Tenant-scoped: only returns flags for the caller's tenant.

### Write contract
`setTenantFeatureFlag(tenantId, flagKey, enabled, actorUserId)`:
- **Requires permission:** `platform.tenants.manage`.
- Reads previous value before writing.
- Upserts on `(tenantId, flagKey)`.
- **Audit:** writes via `writeAuditLog` with `previousValue` and `newValue`, actor, timestamp, and tenant scope.
- **Safe default:** any flag not explicitly enabled is `false`.

### Flag inventory & defaults
| Flag | Default | Type |
|---|---|---|
| (none currently registered in code) | `false` | Release flag |

New feature flags must default to `false` until explicitly enabled per tenant by a platform admin.

### Out of scope
The UI page `apps/web/src/app/[locale]/(platform)/platform/feature-flags/page.tsx` is mock-backed. Wiring it to `isFeatureEnabled` / `setTenantFeatureFlag` is a follow-up UI task.

## Cross-tenant test coverage (BD-058)

| Endpoint | Cross-tenant GET | Cross-tenant PATCH | Cross-tenant DELETE | Positive control |
|---|---|---|---|---|
| `/api/customers/[id]` | ✅ | ✅ | ✅ | ✅ |
| `/api/vehicles/[id]` | ✅ | ✅ | ✅ | ✅ |
| `/api/quotes/[id]` | — (route not implemented) | — | — | — |
| `/api/invoices/[id]` | — (route not implemented) | — | — | — |
| `/api/parts-requests/[id]` | — (route not implemented) | — | — | — |

Tests: `apps/web/src/test/cross-tenant-negative.test.ts`.
Scope note: Quote, invoice, and parts-request `[id]` routes do not yet exist in `main`. Cross-tenant tests will be added when those routes are implemented.

## Canonical routes to keep

- [ ] `/api/customers`
- [ ] `/api/customers/[id]`
- [ ] `/api/vehicles`
- [ ] `/api/vehicles/[id]`
- [ ] `/api/customer-intakes`
- [x] `/api/job-cards`
- [x] `/api/service-requests`
- [x] `/api/service-requests/[id]`
- [ ] `/api/quotes`
- [ ] `/api/parts-requests`
- [ ] `/api/supplier-responses`
- [ ] `/api/parts-orders`
- [ ] `/api/parts-orders/[id]`
- [ ] `/api/parts-orders/[id]/transitions`
- [ ] `/api/tenant-branding`
- [ ] `/api/job-cards/[id]/work`
- [ ] `/api/job-cards/[id]/labour`
- [ ] `/api/job-cards/[id]/labour/[entryId]`
- [ ] `/api/job-cards/[id]/notes`

## Temporary aliases to remove later

- [ ] `/api/vehicle`
- [ ] `/api/vehicle/[id]`
- [ ] `/api/parts-request`
- [ ] `/api/supplier-response`

## Data contract documentation required

- [ ] Customer DTO.
- [ ] Vehicle DTO.
- [ ] Customer intake DTO.
- [ ] Job card DTO.
- [ ] Quote DTO.
- [ ] Quote line item DTO.
- [ ] Quote approval DTO.
- [ ] Invoice DTO.
- [x] Parts request DTO (Validated in `createPartsRequestDraft`).
- [ ] Supplier response DTO.
- [ ] Purchase order DTO. See `docs/active/purchase-order-lifecycle.md`.
- [ ] Tenant branding DTO.
- [ ] Audit event DTO.

## Validation and error handling

The following API error responses were verified during BD-006 testing:

| Scenario | HTTP status | Error code |
|---|---:|---|
| Invalid request data rejected by Zod | 422 | VALIDATION_ERROR |
| Malformed JSON request body | 400 | BAD_REQUEST |
| Tenant access denied | 403 | FORBIDDEN |
| Missing customer or vehicle | 404 | NOT_FOUND |
| Unexpected server error | 500 | INTERNAL_SERVER_ERROR |

- Zod validation errors use the standard failure envelope.
- Malformed JSON returns a safe client error instead of an internal server error.
- Tenant access failures return a forbidden response.
- Unexpected server errors use a generic message to avoid exposing internal details.
- Existing success response envelopes and successful route status codes are preserved.

## Compatibility notes

The following legacy routes are compatibility aliases for canonical routes:

| Legacy route | Canonical route |
|---|---|
| `/api/vehicle` | `/api/vehicles` |
| `/api/vehicle/[id]` | `/api/vehicles/[id]` |
| `/api/parts-request` | `/api/parts-requests` |
| `/api/supplier-response` | `/api/supplier-responses` |

BD-006 verification confirmed that the legacy route handlers re-export their canonical handlers, including GET, PATCH and DELETE for vehicle-by-ID routes.
These aliases remain available for existing consumers. Removing them should be treated as a separate compatibility change and should only happen after consumers have migrated to the canonical routes.

## BD-006 API audit findings

- Customer and vehicle create/update validation uses Zod schemas.
- Vehicle updates use the shared `updateVehicleSchema`.
- Quote creation and parts catalogue creation have request validation and route tests.
- Supplier response routes validate request data and enforce tenant access.
- The `createPartsRequestSchema` currently has no usage in an API route. No new endpoint was introduced as part of this task.
- No invoice API route was found under `apps/web/src/app/api`. Invoice creation is currently handled by the invoice service. No new invoice request DTO or endpoint was invented.
- Legacy route aliases were retained and tested against their canonical handlers.

These findings describe the inspected code at the time of the BD-006 review.

## BD-006 verification record

### Focused tests

- Test files: 11 passed.
- Tests: 57 passed, 0 failed.
- Command: `pnpm --dir apps/web exec vitest run` followed by the 11 BD-006 test file paths.

### Lint

- Targeted ESLint on the modified BD-006 files passed.
- Full project lint reported issues in components and services outside the BD-006 changes.

### Typecheck and build

- Typecheck did not pass because of existing vehicle import casing and quote permission errors outside the BD-006 changes.
- Build did not pass because of the existing vehicle import casing issue.
- These unrelated issues were not changed as part of BD-006.

### Scope

- Existing API success envelopes and route status codes were preserved.
- Legacy route aliases were retained.

## Service-request persistence API

`/api/job-cards` is reserved for job cards (the workshop board and staffing
endpoints). Service-request create, list, and detail live under
`/api/service-requests`.

- `POST /api/service-requests` creates a service request and linked job card and returns
  `201` with `{ data: { serviceRequest }, success: true }`.
- `GET /api/service-requests` returns the server-resolved tenant's requests with
  `{ data: { serviceRequests }, meta: { count }, success: true }`.
- `GET /api/service-requests/[id]` returns the tenant-scoped service request or the
  same `404 NOT_FOUND` response for missing and foreign-tenant IDs.
- Create accepts `customerId`, `vehicleId`, `requestedService`, and optional
  `customerConcern` and `preferredDate`. The strict schema rejects `tenantId`
  and other unknown fields.
- Create requires `jobs.create`; list and detail require `jobs.read`. Invalid
  payloads return `422 VALIDATION_ERROR`, relationship failures return
  `409 CONFLICT`, and denied operations return `403 FORBIDDEN`.
- The accepted create body is:

  ```ts
  {
    customerId: string; // UUID
    vehicleId: string; // UUID
    requestedService: string;
    customerConcern?: string;
    preferredDate?: string; // ISO-compatible date
  }
  ```

- `serviceRequest` in create, list, and detail responses has this shape:

  ```ts
  {
    id: string;
    customerId: string;
    vehicleId: string;
    requestedService: string;
    customerConcern?: string;
    preferredDate?: string; // ISO string
    status: 'draft' | 'received' | 'converted' | 'cancelled';
    createdAt: string; // ISO string
    updatedAt: string; // ISO string
  }
  ```

- The API exposes the service-request DTO; the linked job-card row and initial
  internal status event are persisted but their IDs and job number are not
  included in this response contract. List and detail responses are tenant
  scoped, and a foreign-tenant detail ID is indistinguishable from a missing ID.

## Job-card status mutation contract

- `PATCH /api/job-cards/[id]/status` requests a transition of a job card's
  internal status. The route ID is the job-card ID, not a service-request ID.
- The strict request body is:

  ```ts
  {
    targetInternalStatus: JobInternalStatus;
    expectedStatusVersion: number;
    reason?: string;
  }
  ```

  `expectedStatusVersion` is the integer returned by
  `GET /api/job-cards/[id]/status`; it is incremented atomically on each
  successful transition to prevent stale requests. `reason`, when provided,
  must contain 1–2,000 non-whitespace characters. Unknown fields (including
  `tenantId`, `actorId`, and `createdByUserId`) are rejected. The service
  requires a reason for actions whose rule requires one.

- `GET /api/job-cards/[id]/status` returns the tenant-scoped internal and
  customer statuses, `statusVersion`, and `updatedAt`; it requires `jobs.read`.
- The server resolves tenant context and authenticated actor from trusted
  server-side context. The service requires `jobs.update_status` and an active
  tenant membership. `site_manager` and `floor_manager` are additionally
  required to cancel, reopen, or reverse completion. Platform-admin access
  alone does not bypass this tenant role check.
- A successful request returns `200` with
  `{ data: { jobCard, statusEvent }, success: true }`. Errors use the standard
  failure envelope: malformed or unknown input is `422 VALIDATION_ERROR`;
  missing and foreign-tenant job cards share `404 NOT_FOUND`; stale state and
  illegal transitions return `409 CONFLICT`; missing permission returns
  `403 FORBIDDEN`.
- A successful status event stores the previous and target internal statuses,
  `statusType: 'internal'`, the verified session subject in the added
  `actorIdentity`, and any reason in the existing `note` field. The event's
  nullable `createdByUserId` is not used for Auth0 subjects because it
  references the separate database `users` table. State, status version, and
  event writes are atomic, and rejected requests do not create events.
- Customer status is derived from internal status and is never manually
  changed. `customer_status` is updated in the same transaction. The new
  `cancelled` enum value is added by migration.
- Station timeline: `GET /api/job-cards/[id]/status-events` requires
  `jobs.read` and returns internal events, including reason and actor identity.
  Customer timeline: `GET /api/customer/job-cards/[id]/status-events` verifies
  ownership through the tenant-scoped customer record and returns only
  customer-status events with status values and timestamps. It never returns
  internal notes or actor identity. Both timelines are newest-first with an ID
  tie-breaker.

### Conservative transition policy

The technical lead delegated lifecycle details to implementation judgment.
This explicit conservative graph is implemented in
`apps/web/src/features/job-cards/services/jobStatusRules.ts`; enum order does
not grant transitions.

| From                         | Allowed targets                                                   |
| ---------------------------- | ----------------------------------------------------------------- |
| `request_received`           | `vehicle_received`, `cancelled`                                   |
| `vehicle_received`           | `intake_in_progress`, `cancelled`                                 |
| `intake_in_progress`         | `diagnostics_in_progress`, `cancelled`                            |
| `diagnostics_in_progress`    | `quote_preparation`, `cancelled`                                  |
| `quote_preparation`          | `awaiting_customer_approval`, `cancelled`                         |
| `awaiting_customer_approval` | `work_in_progress`, `awaiting_parts`, `cancelled`                 |
| `awaiting_parts`             | `work_in_progress`, `awaiting_customer_approval`, `cancelled`     |
| `work_in_progress`           | `quality_control`, `awaiting_customer_approval`, `cancelled`      |
| `quality_control`            | `ready_for_invoice`, `work_in_progress` (QC failure), `cancelled` |
| `ready_for_invoice`          | `awaiting_payment`, `cancelled`                                   |
| `awaiting_payment`           | `ready_for_collection`, `cancelled`                               |
| `ready_for_collection`       | `completed`, `cancelled`                                          |
| `completed`                  | `ready_for_collection` (reverse completion)                       |
| `cancelled`                  | `request_received` (reopen)                                       |

Cancellation, reopening, reverse completion, and QC failure require a reason.
Cancel, reopen, and reverse completion require an active tenant
`site_manager` or `floor_manager` role as well as `jobs.update_status`. QC
failure remains available to other authorized status editors because it is a
recovery step in normal workshop work. Cancelled jobs reopen at
`request_received`; completed jobs reversed to `ready_for_collection`.
Leaving `awaiting_customer_approval` for work or parts requires a tenant-scoped
quote in `approved` or `locked` state; it cannot be bypassed by choosing the
next status directly.

| Internal status                                                      | Customer status          |
| -------------------------------------------------------------------- | ------------------------ |
| `request_received`                                                   | `request_received`       |
| `vehicle_received`                                                   | `vehicle_checked_in`     |
| `intake_in_progress`, `diagnostics_in_progress`, `quote_preparation` | `inspection_in_progress` |
| `awaiting_customer_approval`                                         | `awaiting_approval`      |
| `awaiting_parts`                                                     | `waiting_for_parts`      |
| `work_in_progress`                                                   | `service_in_progress`    |
| `quality_control`                                                    | `final_checks`           |
| `ready_for_invoice`, `awaiting_payment`                              | `invoice_ready`          |
| `ready_for_collection`                                               | `ready_for_collection`   |
| `completed`                                                          | `completed`              |
| `cancelled`                                                          | `cancelled`              |

Customer events are emitted only when the mapped customer status changes.
Internal transition reasons and actor identities remain station-only.

### Confirmed BD-016 requirements

The technical lead confirmed that status values currently exist but no status
mutation is implemented; normal changes use `jobs.update_status`; cancel,
reopen, reverse-completed, and QC-fail actions require a valid reason; cancel
and reopen are manager actions; every change records from/to, user, and time,
with a reason where required; and stale changes return `409 CONFLICT`. The lead
delegated the remaining lifecycle details to implementation judgment; the
conservative graph and mapping above document the resulting implementation
decisions.
## Money, VAT and rounding rules

_Added for BD-025 (#117). Status: these rules follow the assumptions stated in PR #166 and are
pending product-lead confirmation._

- **One implementation.** All quote and invoice totals are calculated by
  `apps/web/src/lib/money/cents.ts`. Do not calculate money anywhere else.
- **Units.** Amounts are calculated in whole cents (integers), never in floating-point rand.
  Quantities may have two decimals (for example 1.5 labour hours). Tax rates are percentages
  with up to two decimals (15 means 15%).
- **Prices.** Unit prices exclude VAT. VAT-inclusive pricing is not supported yet (pending a
  product decision).
- **Discounts.** A line discount is a rand amount, capped at the line subtotal. VAT is charged
  after the discount.
- **VAT.** Each line has its own VAT rate; the default is `DEFAULT_VAT_RATE` (15). VAT is
  rounded per line. If VAT should instead be rounded once on the document total, only
  `calculateDocumentTotals` changes.
- **Rounding.** Half a cent rounds up (half-up), using integer arithmetic only.
- **Invalid input.** Missing, invalid or negative values count as 0. Amounts too large to
  calculate exactly throw a `RangeError` instead of losing cents.
- **Storage.** Amounts are saved as `numeric(12,2)` strings produced by `centsToString`
  (for example `'218.50'`). The maximum is R9,999,999,999.99.
- **Quote line totals.** A saved quote line's `total` is the amount after discount, excluding
  VAT. New quote lines are saved with `DEFAULT_VAT_RATE`.
- **Approvals.** Invoices include only `approved` and `not_required` lines. Whether a quote's
  saved total should drop when a line is declined is pending a product decision.
- **Never** use `* 0.15`, `toFixed` or `Math.round` on rand amounts in new code. Use the
  functions in `cents.ts`.

## Labour tracking and technician notes (BD-020)

Table `job_labour_entries` (schema in `db/schema/jobs.ts`; migration `drizzle/0006_job_labour_entries.sql`).

| Route | Method | Permission | Notes |
| --- | --- | --- | --- |
| `/api/job-cards/[id]/work` | GET | `jobs.read` | Labour entries + notes. Staff vs customer view decided from the session role. |
| `/api/job-cards/[id]/labour` | POST | `jobs.update_status` | Log time: `technicianId`, `startedAt`, `endedAt` (ISO), optional `note`, `visibility` (default `internal`). |
| `/api/job-cards/[id]/labour/[entryId]` | PATCH | `jobs.update_status` | Correct an entry; `reason` required plus at least one changed field. |
| `/api/job-cards/[id]/notes` | POST | `jobs.add_internal_note` / `jobs.add_customer_note` | `body`, `visibility` (default `internal`). |

Rules:

- Job card and technician (`mechanic` role) must belong to the session tenant: 404 / 422 otherwise.
- `endedAt` must be at least one minute after `startedAt` (422); minutes are calculated on the server.
- A technician cannot have overlapping time across job cards (409). Checked in code; add a Postgres exclusion constraint with the migration to also stop simultaneous saves.
- Corrections update the row in place. `audit_logs` (`job_card.labour_corrected`) keeps the previous values, new values and the reason. This is the correction history.
- Customers only receive items marked `customer` on their own job card. No internal notes, internal labour or technician ids (`jobWorkSerializers.ts`). Other non-staff users get 403.
- The audit actor is stored in `newValue.actor` (Auth0 id + email) until Auth0 ids are linked to `users`.

## Supplier response form (BD-032)

### Validation contract
`createSupplierResponseSchema` (in `apps/web/src/features/parts/schemas/supplierResponseSchema.ts`):
- `quantityAvailable` must be a positive number (> 0).
- `unitPrice` must be non-negative (>= 0).
- `availability` must be one of `available`, `partial`, `unavailable`.
- `eta`, if provided, must be a valid ISO datetime in the future.
- `items` must contain at least one entry.

### Route contract
`POST /api/supplier-responses`:
- Resolves tenant via `requireTenantContext()`.
- Rejects `tenantId` in body that does not match the caller's tenant (403).
- Verifies `supplierId` is linked to the caller's tenant via `tenantSuppliers` with `status = 'active'` (403 otherwise).
- Returns `201` with `{ data: { response }, success: true }` on success.

Tests: `apps/web/src/app/api/supplier-responses/route.test.ts` (7 tests).

### UI
`SupplierResponseForm` (`apps/web/src/components/forms/supplierResponseForm.tsx`) renders price, quantity, availability, and ETA inputs; submits via `POST /api/supplier-responses`. Wired into `apps/web/src/app/[locale]/(supplier)/supplier/requests/page.tsx` with a fixture request pending the supplier-facing list endpoint.

Tests: `apps/web/src/components/forms/supplierResponseForm.test.tsx` (4 tests) — static render verification via `renderToStaticMarkup`.

### Out of scope
- Supplier-facing request list endpoint (`GET /api/supplier/requests`) — required to render one form per real request.
- Alternate-part field in the form — follow-up.
- Decline action — follow-up.
- State retention after API errors — covered by the component's `error` prop but not exercised end-to-end.

## Usage analytics (BD-048)

### Metric dictionary
| Metric | Source | Definition |
|---|---|---|
| `jobsCreated` | `job_cards` table | `count(*)` where `tenantId` matches and `createdAt >= now - days` |
| `quotesSent` | `quotes` table | `count(*)` where `tenantId` matches, `createdAt >= now - days`, and `status IN ('sent','approved','locked')` |

**Dropped from initial design:** `activeUsers` — `audit_logs.actorUserId` is mostly empty until Auth0 user linking completes. Will be reintroduced once user identity is reliably populated.

### Contract
`getTenantUsageMetrics(tenantId, days = 30)`:
- **Requires permission:** `platform.tenants.manage`.
- **Tenant-scoped:** filters `tenantId` on `job_cards` and `quotes`.
- **Date-filtered:** only rows where `createdAt >= now - days`.
- **Safe empty state:** returns zero-valued metrics when no rows exist.
- **Input validation:** `days` must be a positive finite number.
- **No PII exposure:** aggregate counts only — no per-row detail leaves the service.

### Query notes
- Uses indexed columns (`tenant_id`, `created_at` on `job_cards` and `quotes`).
- Quote count includes `sent`, `approved`, and `locked` statuses.

### Out of scope
- `activeUsers` metric — deferred until Auth0 user linking lands.
- UI wiring (`apps/web/src/app/[locale]/(platform)/platform/usage/page.tsx`) is a follow-up task.