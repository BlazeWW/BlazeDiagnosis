# Issue: Link Auth0 login identity to `users` rows so audit logs record the actor

## Workstream

- [ ] Product UX
- [x] Backend/API
- [x] Database
- [ ] Cloud/DevOps
- [x] Cybersecurity
- [ ] Documentation
- [ ] QA

## Assigned group

- [x] Software Engineering 2
- [ ] Software Engineering 1
- [ ] Software Development 1
- [ ] Software Development 2
- [ ] Cloud Administration
- [ ] Cyber Security

## Description

Audit logs cannot say who made a change.

`audit_logs.actor_user_id` is a `uuid` that references `users.id`. The logged-in session (`getCurrentUser()` in `apps/web/src/lib/auth/session.ts`) only carries the Auth0 `sub` (for example `auth0|abc123`), or `dev-user-id` in local development. Nothing in the schema maps an Auth0 `sub` to a `users` row:

- `users` has no Auth0 id column.
- `tenant_members.user_id` stores the Auth0 id as text, but it is not linked to `users`.
- `permission_audits.user_id` stores the Auth0 id as text, so permission checks record the actor, but business audit rows do not.

As a result, no code path can fill `audit_logs.actor_user_id` correctly. If you pass the session id directly, the insert fails on the uuid type or the foreign key, and `createAuditLog` (`apps/web/src/lib/audit.ts`) hides the error, so the whole audit row is lost.

BD-014 (workshop staffing, branch `106-bd-014-workshop-staffing-interface`) uses a stopgap. It writes `actor: { authUserId, email }` into `newValue` and marks this with a `shortcut:` comment in `jobCardService.ts`. This issue replaces that stopgap.

The same mismatch affects `jobCards.assignedMechanicId` / `assignedFloorManagerId`. They point at `users.id`, so a logged-in mechanic cannot be matched to the jobs assigned to them, for example on a "my jobs" view.

Related, but none of them covers this: #97 BD-005 (schema audit), #94 BD-002 (production auth validation), #141 BD-049 (audit log browser, which needs this to show an actor).

## Acceptance criteria

- [ ] `users` has a nullable, unique `auth_user_id text` column (the Auth0 `sub`), added through a reviewed Drizzle migration.
- [ ] One server helper, for example `resolveActorUserId(tenantId)` in `src/server/` or `src/lib/auth/`, returns the `users.id` for the current session in that tenant, or `null` when there is no linked row. It never trusts a client-provided id.
- [ ] `assignJobStaff` sets `actorUserId` from the helper, and the `shortcut:` actor stopgap in `newValue` is removed.
- [ ] Other `audit_logs` writers (`features/audit/services/auditService.ts`, invoice flow) are checked and use the same helper where an actor is known.
- [ ] A plan exists for filling `auth_user_id` on existing staff: on first login, from `tenant_members` by tenant and email with lead review, or by hand. No guessing by email alone across tenants.
- [ ] The dev fallback user (`dev-user-id`) still works. The actor resolves to `null` and the audit insert still succeeds.

## Technical notes

- Lead approval is required: this is a database migration that changes identity data (see the "Constraints and dependencies" section in the issue guides).
- Keep `auth_user_id` nullable. Staff records can exist before the person first logs in.
- Do not match by email alone. Emails are not unique across tenants in `users`, and email is not a stable identity.
- Coordinate with the BD-005 (#97) owner before generating the migration. `apps/web/drizzle/` already has two `0000_` files.
- Consider whether `tenant_members` and `users` should merge later. Out of scope here, but write the decision down.
- Do not log the Auth0 token or claims, only the `sub`.

## Testing required

- [x] Lint
- [x] Typecheck
- [x] Unit tests: the helper returns the linked id, `null` for an unlinked user, and `null` for a user linked in another tenant
- [x] Unit tests: `assignJobStaff` writes `actorUserId` and no longer writes `newValue.actor`
- [ ] Manual test: assign staff while logged in, then check the `audit_logs` row has `actor_user_id` filled
- [ ] Screenshots for UI

## Documentation required

- [x] Active docs updated: `docs/active/18-auth-tenant-provider-architecture.md` (identity mapping section)
- [ ] API docs updated
- [ ] User guide updated
- [ ] No docs required
