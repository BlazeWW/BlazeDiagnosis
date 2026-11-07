# BD-015 — Job Card Persistence Implementation Plan

**Priority:** P0  
**Year:** Y2  
**Owner:** One intern  
**Status:** Planned  
**Issue:** BD-015 (link the reviewed PR to the GitHub issue ID when the issue is available)

## Objective

Deliver tenant-scoped job-card creation and retrieval for station workflows. Define the DTO and adapter boundary first so the feature can be implemented and tested independently of sibling tasks or a live database.

## Scope

### Included

- Fixed create and response DTOs for job cards.
- Local fixtures and an in-memory mock repository implementing the same contract as the database repository.
- Server-resolved tenant context and permission checks for every operation.
- Persist a service request and its job card as one unit, with the initial job status event.
- Tenant-scoped list and detail retrieval.
- Validation and rejection behavior for invalid customer, vehicle, request, and tenant relationships.
- Tests, implementation evidence, and updates to affected API/readiness documentation.

### Not included

- Job status transitions, assignment, notes, attachments, and timeline workflows; these belong to follow-up work such as BD-014 and BD-016.
- Replacing authentication or introducing a new tenant resolution mechanism.
- Building a new job-card UI. The existing station page may consume these APIs in a separate UI task.
- A new database schema or migration unless implementation reveals a specific schema constraint required for this contract.

## Fixed contract

### Create input

```ts
type CreateJobCardDTO = {
  customerId: string;
  vehicleId: string;
  requestedService: string;
  customerConcern?: string;
  preferredDate?: string;
};
```

The request is validated with a strict Zod schema. It does not accept a `tenantId`; tenant scope is resolved on the server. `preferredDate` is an ISO-compatible date string and is normalized at the API/service boundary.

### Response

Define `JobCardDTO` in `src/types/jobCards.ts`, containing the job-card identity, tenant/customer/vehicle/service-request IDs, job number, statuses, priority, assignments, and timestamps. Convert database date values to ISO strings in the database adapter so API consumers and mock-backed tests use the same representation.

### Repository boundary

Expose create, list, and get-by-ID operations through a typed `JobCardRepository` interface. Supply:

- A fixture-backed mock implementation for isolated tests and demos.
- A database implementation used by production service wiring.

The mock must apply the same tenant and relationship rules as the database implementation. It must not be selected implicitly by production runtime configuration.

## Delivery stages

### Stage 1 — Define and lock the contract

1. Add the create input and response DTOs to shared types.
2. Add strict Zod validation for required UUIDs, bounded service description/concern text, and optional preferred date.
3. Define the repository interface and a clear relationship-validation error.
4. Add local customer, vehicle, and job-card fixtures with at least two tenant IDs.

**Exit check:** DTO, schema, repository contract, and fixture types compile; payloads containing unknown fields such as `tenantId` are rejected.

### Stage 2 — Build the fixture-backed adapter

1. Implement create, list, and get-by-ID against the local fixture set.
2. Require the customer and vehicle to belong to the requested tenant; require the vehicle to be active and associated with the selected customer.
3. Scope every list and direct lookup to the requested tenant.
4. Return a clear relationship error when an entity is absent, archived, mismatched, or belongs to another tenant.

**Exit check:** Mock adapter tests prove valid creation/retrieval, rejection of mismatched relationships, and isolation of records between tenants.

### Stage 3 — Implement database persistence

1. Add a database repository behind the same interface.
2. Within a transaction, verify the active customer and vehicle using both entity ID and tenant ID, and verify that the vehicle belongs to the selected customer.
3. Insert the service request and linked job card with tenant ID derived from trusted server context.
4. Record the initial job status event in the same transaction so partial creation cannot leave inconsistent records.
5. Scope list and detail queries by tenant ID; map database results to the fixed DTO.

**Exit check:** Invalid relationships are rejected before writes; transaction failure rolls back the service request, job card, and status event. No new migration is added unless a reviewed schema gap makes it necessary.

### Stage 4 — Add authorized service and API routes

1. Keep business logic in the job-card service/repository, not route handlers.
2. Require `jobs.create` for creation and `jobs.read` for list/detail operations.
3. Resolve tenant context on the server for every request; reject client-supplied tenant IDs through the strict contract.
4. Implement:
   - `POST /api/job-cards` — create and return the standardized `201` envelope.
   - `GET /api/job-cards` — return the tenant’s list and count metadata.
   - `GET /api/job-cards/[id]` — return a tenant-scoped record or `404` for missing/foreign IDs.
5. Map validation, forbidden, relationship, and not-found failures to explicit standard API responses.

**Exit check:** Route tests verify tenant context and permission-protected service calls, response envelopes, invalid input rejection, and foreign-tenant non-disclosure.

### Stage 5 — Complete tests and demonstrate behavior

Add focused tests for:

- Valid create followed by retrieval of the same job card.
- Missing/invalid customer or vehicle.
- Customer and vehicle from different tenants.
- Vehicle associated with a different customer.
- Archived customer or vehicle.
- List and get-by-ID tenant isolation.
- Strict schema rejection of client-supplied tenant ID and unknown fields.
- Authorization denial preventing reads and writes.
- Atomic persistence behavior for transaction failure.

Demonstrate the API contract with the local fixture/mock adapter in tests; database integration tests should use the repository’s established disposable-database approach if one is available. Do not claim a live-database demonstration when only mocks were run.

**Exit check:** Tests exercise success and rejection cases and provide reproducible output as implementation evidence.

### Stage 6 — Documentation, quality gates, and review

1. Update `docs/active/09-api-and-data-contracts.md` with the routes and DTO contract.
2. Update the station page readiness entry to distinguish persistence API availability from UI integration and later workflow work.
3. Update current application state only after the implemented behavior is verified.
4. Run and record the exact commands and results:
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test`
   - `pnpm build`
5. Open a reviewed PR linked to the BD-015 GitHub issue ID; include test evidence and any validation blocked by environment limitations.

**Exit check:** All four quality gates pass, docs match shipped behavior, and the reviewed PR references the issue by ID.

## Security and tenant invariants

- Tenant ID comes only from the server-resolved tenant context.
- Create permission is checked before mutation; read permission is checked before retrieval.
- Customer and vehicle are each looked up with tenant scope and active-state checks.
- Vehicle/customer ownership must match; IDs from separate tenants cannot be combined.
- List and detail queries always include tenant scope.
- Foreign-tenant IDs return the same not-found behavior as unknown IDs.
- Service request, job card, and initial status event are committed atomically.
- Customer-facing serializers remain separate from internal job-card records if customer APIs are introduced later.

## Dependencies and boundaries

No sibling task is a prerequisite. Use local fixtures and the mock adapter as the independent contract during development. Existing auth and tenant-context services are integration points, not assumptions that can be bypassed; gaps in those shared services should be recorded as blockers or linked follow-up work rather than silently weakened.

The job-card page’s data binding, job status transitions, staff assignment, customer-visible notes, and timeline remain separate deliverables and should not be represented as complete by this task.

## Evidence to attach to the reviewed PR

- Link to BD-015 and the PR.
- Test command output for contract, service/repository, and API route cases.
- Exact lint, typecheck, full test, and build command results.
- Brief demonstration evidence showing creation followed by retrieval and a foreign-tenant rejection.
- Any schema/migration decision and the reason a migration was or was not required.
