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
    expectedUpdatedAt: string;
    reason?: string;
  }
  ```

  `expectedUpdatedAt` is the job card's current `updatedAt` ISO timestamp and
  is the optimistic concurrency token. `reason`, when provided, must contain
  1–2,000 non-whitespace characters. Unknown fields (including `tenantId`,
  `actorId`, and `createdByUserId`) are rejected. The service requires a reason
  for actions whose approved rule requires one.
- The server resolves tenant context and authenticated actor from trusted
  server-side context. The service requires `jobs.update_status` for that
  tenant for normal status changes. Manager-only handling for cancellation and
  reopening is required; the exact manager roles and the full transition graph
  still need confirmation.
- A successful request returns `200` with
  `{ data: { jobCard, statusEvent }, success: true }`. Errors use the standard
  failure envelope: malformed or unknown input is `422 VALIDATION_ERROR`;
  missing and foreign-tenant job cards share `404 NOT_FOUND`; stale state and
  illegal transitions return `409 CONFLICT`; missing permission returns
  `403 FORBIDDEN`.
- A successful status event stores the previous and target internal statuses,
  `statusType: 'internal'`, the server-resolved actor in `createdByUserId`,
  and any reason in the existing `note` field. State and event writes must be
  atomic, and rejected requests must not create events.
- Customer status is derived from internal status and is never manually
  changed. A `cancelled` customer status value and database migration are
  required. The exact mapping for other internal statuses and customer
  timeline visibility remain to be confirmed.

### Confirmed BD-016 requirements

The technical lead confirmed that status values currently exist but no status
mutation is implemented; normal changes use `jobs.update_status`; cancel,
reopen, reverse-completed, and QC-fail actions require a valid reason; cancel
and reopen are manager actions; every change records from/to, user, and time,
with a reason where required; and stale changes return `409 CONFLICT`.

The exact allowed edges, the manager roles and any distinct permissions,
reopen/reverse/QC-fail target states, and customer-status mapping beyond
`cancelled` remain unresolved. Do not infer them from enum order.
