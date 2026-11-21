# BD-016 — Job Lifecycle Status Model: Resolution Steps

**Issue:** [BD-016 #108](https://github.com/BlazeWW/BlazeDiagnosis/issues/108)  
**Team:** Team 3 — Diagnostics and Job Cards  
**Area:** Diagnostics  
**Suggested level:** Y2  
**Priority:** P0  
**Status:** In implementation; technical lead delegated remaining lifecycle details to implementation judgment

## Outcome

Enforce approved job-state transitions, record each successful transition with
its actor, time, and reason, reject illegal or stale updates, and expose
consistent station and customer timelines without disclosing internal-only
details.

## Existing implementation to verify

- [`apps/web/src/db/schema/enums.ts`](../../apps/web/src/db/schema/enums.ts)
  defines separate internal and customer status enums. These enum values do not
  by themselves define legal transitions.
- [`apps/web/src/db/schema/jobs.ts`](../../apps/web/src/db/schema/jobs.ts)
  defines `jobCards` and `jobStatusEvents`. Events already have `fromStatus`,
  `toStatus`, `statusType`, `note`, `createdByUserId`, and `createdAt` fields.
  A nullable `actorIdentity` field records the trusted session subject because
  the Auth0 subject is not the UUID referenced by `createdByUserId`.
- [`apps/web/src/features/job-cards/services/jobCardService.ts`](../../apps/web/src/features/job-cards/services/jobCardService.ts)
  contains existing job-card service operations and tenant permission checks.
- [`apps/web/src/features/audit/services/auditService.ts`](../../apps/web/src/features/audit/services/auditService.ts)
  writes generic audit records through the global database client. Ensure any
  audit write for a transition participates in the same transaction.
- No disposable-database test setup was found during the BD-015 work. Recheck
  before deciding whether an actual rollback integration test is available.

## Resolution steps

### 1. Confirm baseline and start isolated work

1. Read the BD-016 issue guide and test baseline; inspect the live issue and
   record current behavior, missing routes, and existing quality-gate failures.
2. Verify the current job-card service, schemas, permissions, audit/event
   tables, and timeline consumers before changing them.
3. Use a dedicated branch such as
   `feature/BD-016-job-lifecycle-status-model`; keep BD-016 changes separate
   from other issue branches.

**Exit check:** Baseline and scope are recorded; no existing transition or
timeline implementation is assumed complete without verification.

### 2. Define conservative states, transitions, and role ownership

1. Review the existing internal and customer status enums.
2. The technical lead delegated the remaining lifecycle details to
   implementation judgment. Use the conservative graph and customer-status
   mapping documented in
   [`09-api-and-data-contracts.md`](09-api-and-data-contracts.md); do not infer
   edges from enum ordering.
3. Use `jobs.update_status` for status edits. Require an active tenant
   `site_manager` or `floor_manager` for cancel, reopen, and reverse completion.
   Require reasons for cancel, reopen, reverse completion, and QC failure.
4. Derive customer status from internal status and only create customer
   timeline events when the mapped customer status changes.

**Exit check:** The chosen transition table, manager restrictions, exceptional
reason rules, and customer-safe mapping are documented and covered by tests.

### 3. Define the mutation and event contract

1. Use the strict DTO in `jobCardSchema.ts`: target state, expected status
   version, and optional reason.
2. Use `PATCH /api/job-cards/[id]/status` and the standard response envelope.
3. Store the reason in the internal event `note`; store the verified session
   subject in `actorIdentity`.
4. Resolve the actor and tenant from trusted server context; never accept
   client-provided `tenantId` or actor identity.

**Exit check:** DTO, route, conflict behavior, and event representation are
implemented and documented.

### 4. Implement authorized, tenant-scoped state transitions

1. Add the transition rules in the job-card service, not in the route handler.
2. Require the approved tenant permission and role before writing.
3. Load or update the job card by both its ID and server-resolved tenant ID.
4. Validate the requested edge against the approved transition graph.
5. Reject missing/foreign records without disclosing whether a foreign record
   exists.

**Exit check:** Unauthorized, cross-tenant, and illegal transitions reach no
state mutation.

### 5. Persist transition and audit event atomically

1. In one database transaction, update the job state and insert its status
   event, including previous and next state, actor, timestamp, and reason.
2. Prevent stale or concurrent updates with a row lock or conditional update
   against the expected current state/version. A competing stale request must
   return a safe conflict and must not create an event.
3. If using the generic audit service, make its write transaction-aware; its
   current global database write must not run outside the transition
   transaction.
4. Keep failures explicit. If the event insert fails, the state update must
   roll back as well.

**Exit check:** One valid transition produces one matching event; transaction
failure leaves neither a changed status nor a success-shaped response.

### 6. Expose consistent, visibility-safe timelines

1. Provide a tenant-scoped station timeline with the approved internal event
   detail.
2. Provide a customer timeline that selects only allowlisted customer-visible
   events and uses a separate customer DTO/serializer.
3. Do not expose internal notes, internal-only reasons, actor details, or
   supplier information in the customer response unless explicitly approved.
4. Order events deterministically, including a tie-breaker when timestamps are
   equal.

**Exit check:** Station and customer views agree on public progress while
customer responses exclude internal-only data.

### 7. Add focused tests and reproducible evidence

- Valid transition updates the state and records the matching actor, time,
  reason, and previous/next statuses.
- Illegal transition and unauthorized transition return safe errors without
  changing state or adding an event.
- Cross-tenant reads/writes are denied and tenant scoping is asserted.
- Stale and concurrent updates cannot both succeed or create duplicate events.
- Event-write failure rolls back the state change using a disposable database
  if the repository has an established approach; otherwise report mock-only
  transaction evidence clearly.
- Customer timeline excludes internal events and details.
- Fixture/mock adapter demonstrates the API contract independently of a live
  database.

**Exit check:** Tests cover both successful and rejected cases and produce
reproducible output. Do not claim live-database behavior from mocked tests.

### 8. Update documentation and submit for independent review

1. Update `docs/active/09-api-and-data-contracts.md` with the approved route,
   DTO, transition rules, and timeline visibility.
2. Update the relevant page readiness/current-state documentation only after
   behavior is verified.
3. Record exact commands and results for `pnpm lint`, `pnpm typecheck`,
   `pnpm test`, and `pnpm build`; include any environment or baseline blockers.
4. Open a PR linked to BD-016 issue #108 with the transition table, test output,
   and sanitized audit/timeline evidence.
5. Request review from the BlazeWebWorks technical lead or another designated
   independent reviewer. Do not self-approve.

**Exit check:** Documentation matches the shipped behavior, evidence is
reproducible, and the PR receives independent technical-lead approval.

## Boundaries

- Do not add status workflows, assignment, or unrelated job-card features.
- Do not change customer-facing status semantics, permissions, or database
  schema without technical-lead approval.
- Preserve tenant scoping and keep internal/customer serializers separate.
- Keep credentials, `.env` files, and personal/customer data out of commits,
  logs, screenshots, and PR descriptions.
