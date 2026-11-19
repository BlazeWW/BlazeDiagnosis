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

## Canonical routes to keep

- [ ] `/api/customers`
- [ ] `/api/customers/[id]`
- [ ] `/api/vehicles`
- [ ] `/api/vehicles/[id]`
- [ ] `/api/customer-intakes`
- [x] `/api/job-cards`
- [x] `/api/job-cards/[id]`
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
- [ ] Parts request DTO.
- [ ] Supplier response DTO.
- [ ] Tenant branding DTO.
- [ ] Audit event DTO.

## Job-card persistence API

- `POST /api/job-cards` creates a service request and linked job card and returns
  `201` with `{ data: { serviceRequest }, success: true }`.
- `GET /api/job-cards` returns the server-resolved tenant's requests with
  `{ data: { serviceRequests }, meta: { count }, success: true }`.
- `GET /api/job-cards/[id]` returns the tenant-scoped service request or the
  same `404 NOT_FOUND` response for missing and foreign-tenant IDs.
- Create accepts `customerId`, `vehicleId`, `requestedService`, and optional
  `customerConcern` and `preferredDate`. The strict schema rejects `tenantId`
  and other unknown fields.
- Create requires `jobs.create`; list and detail require `jobs.read`. Invalid
  payloads return `422 VALIDATION_ERROR`, relationship failures return
  `409 CONFLICT`, and denied operations return `403 FORBIDDEN`.

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
