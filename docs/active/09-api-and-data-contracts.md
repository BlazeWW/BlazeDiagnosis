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
- [ ] `/api/tenant-branding`

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
- [ ] Tenant branding DTO.
- [ ] Audit event DTO.

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
