# Auth, Tenant Isolation, and Provider Architecture

## Auth architecture note

- Auth is resolved in `apps/web/src/lib/auth/session.ts`.
- User sessions are validated with Auth0 JWT tokens via `apps/web/src/lib/auth/verify.ts`.
- Authentication is accepted from `Authorization: Bearer <token>` or from the `auth0_session` cookie.
- Auth0 custom claims are used to carry tenant membership and permission metadata:
  - `custom:tenant_id`
  - `custom:tenant_role`
  - `custom:permissions`
  - `custom:tenant_memberships`
- `requireUser()` protects authenticated routes and is the base guard for tenant and permission checks.
- Tenant-scoped access is enforced by:
  - `requireTenantContext()` in `apps/web/src/lib/tenancy/tenantContext.ts`
  - `requireTenantPermission()` in `apps/web/src/lib/authorization/guards.ts`
- The tenant guard returns the authenticated tenant context and rejects cross-tenant access when the active tenant does not match the requested tenant.
- API responses are standardized through `apps/web/src/lib/api/response.ts` with a consistent success/error envelope.

## Tenant isolation test results

### Code audit summary

- Tenant context is resolved server-side for the majority of tenant-owned routes.
- The audit identified the following key route/service patterns:
  - `GET /api/customers` and `/api/customers/[id]` use `requireTenantContext()`.
  - `GET /api/vehicles` and `/api/vehicles/[id]` use `requireTenantContext()`.
  - `POST /api/parts-requests` and `/api/supplier-responses` use tenant-guarded service flows.
  - Service-level write/read methods such as `searchCustomers`, `getVehicleById`, `createInvoiceFromApprovedQuote`, and `getStationDashboardMetrics` call `requireTenantPermission()` with explicit tenant IDs.
- Tenant membership data is stored in the auth payload and validated against the requested `tenantId` before permitting access.

### Findings

- No core route was found to trust an unvalidated `tenantId` without a server-side `requireTenantContext()` or `requireTenantPermission()` call.
- Existing route handlers already use a standard API error envelope in `apps/web/src/lib/api/response.ts`.
- The current auth/session helper contains a development fallback profile when Auth0 is not configured. This makes the runtime safe for local development but must be replaced by a real Auth0 session in production.

### Recommended next tests

- Add integration tests that verify cross-tenant reads return `403 Forbidden` for `customers`, `vehicles`, `quotes`, `invoices`, and `parts_requests`.
- Add permission tests for `requireTenantPermission()` on `tenant.settings.update`, `quotes.create`, and `parts.request`.
- Add regression tests for `auth0_session` cookie fallback behavior and Auth0 token validation.

## Provider interface documentation

### Vehicle lookup provider interface

Implemented at `apps/web/src/lib/providers/vehicle/types.ts`:

- `IVehicleLookupProvider`
  - `name: string`
  - `priority: number`
  - `isAvailable(): Promise<boolean>`
  - `lookupByVin(vin: string): Promise<VehicleProviderResult>`
  - `lookupByPlate?(plate: string, country: string): Promise<VehicleProviderResult>`

- `VehicleProviderResult`
  - `success: boolean`
  - `data?: VehicleSpec`
  - `error?: { code: string; message: string }`
  - `source: string`
  - `cached?: boolean`

- `VehicleSpec` defines the vehicle payload with VIN, make, model, year, body, engine, transmission, drivetrain, colors, and metadata.

### Parts fitment provider interface

Implemented at `apps/web/src/lib/providers/parts/types.ts`:

- `IPartsFitmentProvider`
  - `name: string`
  - `priority: number`
  - `isAvailable(): Promise<boolean>`
  - `lookupByPartNumber(partNumber: string): Promise<PartsFitmentResult>`
  - `searchByVehicle?(make: string, model: string, year: number): Promise<PartsFitmentResult>`

- `PartsFitmentResult`
  - `success: boolean`
  - `data?: { partNumber: string; description: string; compatibleVehicles: Array<{ make: string; model: string; year: number; notes?: string }> }`
  - `error?: { code: string; message: string }`
  - `source: string`
  - `cached?: boolean`

### Registry pattern

- The provider registries are in:
  - `apps/web/src/lib/providers/vehicle/registry.ts`
  - `apps/web/src/lib/providers/parts/registry.ts`
- Each registry resolves a prioritized provider list and routes lookups through the first available provider that returns success.
- Fallback order is:
  1. South Africa provider stub (future integration)
  2. External VIN/fitment provider adapters
  3. Manual catalog stubs
  4. Mock provider

### Current provider stubs

- `apps/web/src/lib/providers/vehicle/implementations/manualCatalog.ts`
- `apps/web/src/lib/providers/vehicle/implementations/southAfrica.ts`
- `apps/web/src/lib/providers/parts/implementations/manualCatalog.ts`
- `apps/web/src/lib/providers/parts/implementations/southAfrica.ts`

### Integration notes

- Environment flags in `apps/web/.env.example` now include provider feature flags and API keys.
- The South African provider stubs are intentionally `NOT_IMPLEMENTED` so the system can be wired without accidentally returning invalid fitment data.
- Manual catalog providers are available only when explicitly enabled with `MANUAL_VEHICLE_CATALOG_ENABLED=true` or `MANUAL_PARTS_CATALOG_ENABLED=true`.

### Future extension

- Add a new provider adapter for a South African registration/VIN source such as `TransUnion/eNatis`, `Car Registration API South Africa`, or `VerifyNow`.
- Add a parts fitment adapter for local supplier catalogs or a South African OEM fitment dataset.
- Keep provider adapters stateless and isolated behind the registry so the same service can switch between multiple data sources without changing business logic.
