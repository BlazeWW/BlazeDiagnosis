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
