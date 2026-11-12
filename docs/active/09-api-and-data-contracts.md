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
