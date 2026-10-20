# SE 1 & SE 2 Student Task List

Shareable summary of the Software Engineering 1 and Software Engineering 2 student tasks.

- **Source of truth:** `docs/active/03-intern-task-allocation.md`
- **Counts:** SE 1 — 19 open, 0 done. SE 2 — 6 open, 10 done.
- **Note on priority:** this source document has **no P0/P1 labels** — only open/done checkboxes. Tasks are sorted by wave (current work first, then the next assignment wave). The "Indicative BD priority" column is a mapping to `docs/active/21-70-intern-task-register.md` where tasks clearly overlap — it is a reading aid, not from the source doc.
- **Shared acceptance bar:** PRs with tests, evidence, updated docs, reviewed PR linked by issue ID.

---

## Software Engineering 1 (SE 1)

**Primary focus:** backend foundations and core domain services.
**Status:** 11 open (current wave) + 8 open (next wave) = 19 open

### Current wave — open tasks

| Task | Indicative BD priority |
|---|---|
| Review Drizzle schema and document missing tables/columns | BD-005 (P0) |
| Implement customer service persistence | BD-010 (P1) |
| Implement vehicle service persistence | — |
| Implement job card service persistence | BD-015 (P0) |
| Implement quote service persistence | BD-022 (P0) |
| Implement invoice service persistence | BD-027 (P0) |
| Add service-level validation with Zod | BD-006 (P1) |
| Add audit logging to quote, invoice, job, and tenant-setting mutations | BD-016 (P0) |
| Add unit tests for quote totals | BD-025 (P0) |
| Add unit tests for invoice totals | BD-025 (P0) |
| Add unit tests for tenant guard failures | BD-058 (P0) |

**Deliverables:** pull requests with tests; API/data contract notes in `docs/active/09-api-and-data-contracts.md`; updated feature checklists.

### Next assignment wave — persistence and data services (open)

| Task | Indicative BD priority |
|---|---|
| Convert customer list/detail pages from demo/API fallback data to database-backed services | BD-010 (P1) |
| Convert vehicle list/detail pages from demo/API fallback data to database-backed services | BD-012 (P1) |
| Implement invoice query service for station invoice register | BD-027 (P0) |
| Implement invoice detail query service with tenant and customer ownership guards | BD-003 (P0) |
| Add Zod schemas for customer, vehicle, quote, invoice, and parts mutations | BD-006 (P1) |
| Add unit tests for customer duplicate detection | BD-025 (P0) |
| Add unit tests for vehicle duplicate detection | BD-025 (P0) |
| Add unit tests for invoice total calculations | BD-025 (P0) |

---

## Software Engineering 2 (SE 2)

**Primary focus:** SaaS architecture, tenant isolation, auth, permissions, and integrations.
**Status:** 10 done (current wave) + 6 open (next wave)

### Current wave — completed tasks ✅

- [x] Replace mock auth/session layer with selected production auth implementation
- [x] Implement tenant memberships and role checks
- [x] Build central `requireTenantPermission` usage audit
- [x] Standardize API error handling
- [x] Build vehicle lookup provider abstraction
- [x] Build parts fitment provider abstraction
- [x] Add provider stubs for manual catalog and future South African lookup APIs
- [x] Review database indexes
- [x] Prepare migration reset plan
- [x] Add integration tests for cross-tenant access prevention

**Deliverables (produced):** auth architecture note; tenant isolation test results; provider interface documentation.

### Next assignment wave — auth, tenancy, and route protection (open)

| Task | Indicative BD priority |
|---|---|
| Add route group protection plan for `(customer)`, `(station)`, `(supplier)`, and `(platform)` areas | BD-003 (P0) |
| Replace temporary session helpers with the selected production auth implementation | BD-002 (P0) |
| Audit all API routes for client-supplied `tenantId` usage | BD-003 (P0) |
| Remove singular alias API routes once the UI uses canonical plural routes | — |
| Add tenant isolation integration tests for customer, vehicle, invoice, quote, and supplier routes | BD-058 (P0) |
| Document the RBAC matrix in the active docs | BD-004 (P0) |

---

## Assignment notes

- **SE 2's current wave is fully complete** — SE 2 owners are free to start the next wave (route protection, tenantId audit, RBAC matrix); nearly all of it maps to P0 security work in the BD register.
- **SE 1 is the bottleneck:** all 19 tasks open, and most map to P0 persistence work (job cards, quotes, invoices, schema audit).
- "AE 2" does not exist in any document. The remaining groups in the same source file are **Software Development 1 & 2**, **Cloud Administration**, and **Cyber Security**.
- Tasks marked "—" have no clear counterpart in the BD register.
