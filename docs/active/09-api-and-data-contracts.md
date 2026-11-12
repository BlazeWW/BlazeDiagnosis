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
