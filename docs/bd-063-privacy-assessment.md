# BD-063: Privacy, Retention, and Access Assessment

- **GitHub Issue:** #155
- **Squad:** Team 9: Cybersecurity Assurance
- **Suggested Level / Priority:** Y1/P1
- **Reference:** `docs/active/21-70-intern-task-register.md`

## 1. Executive Summary & Current Code Reality

An assessment of the `main` branch was conducted to catalog personal data flows, examine current access controls, and evaluate retention and deletion mechanisms across 18 distinct data elements in 7 core application domains.

- **Retention & Deletion Status:** Currently, "deletion" is handled strictly as a soft archive (`isArchived = true` on customer and vehicle records). There is currently **no** automated database retention, Time-To-Live (TTL), or automated anonymization mechanism in place.
- **Audit Logging:** Audit logs store before/after snapshots of personal data inside `JSONB` fields alongside IP addresses and user agents **indefinitely**, with no automated purging or masking policy.
- **Access & Tenant Scoping:** Access to records relies on application-level role checks; strict database-level tenant isolation and log redaction require ongoing verification.

## 2. Data Inventory & Retention Matrix

| Workflow / Domain | Data Field / Element (Code-Verified) | Data Owner | Collection Purpose | Permissions / Access Roles | Current Code State | Proposed Retention Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Customer Workflow** | Customer profile & contact records (`/api/customers`, `/api/customers/[id]`): `id`, `tenantId`, Zod-validated customer attributes; customer portal status timeline (`/api/customer/job-cards/[id]/status-events`) | Tenant (Workshop) | Manage customer records, link vehicles/service requests, and scope customer portal ownership (`Read (Self)`) | `Floor / Site Manager` (Read/Write), `Mechanic` (Read), `Platform Admin` (Global Read/Write), `Customer` (Read Self) | **Implemented:** Tenant-scoped CRUD via `requireTenantContext()`; cross-tenant GET/PATCH/DELETE blocked (`403`/`404`). Hard-delete & anonymization endpoints are **Proposed**. | Retain active customer relationship + 5 years (statutory SA tax/CPA record-keeping); hard-delete/anonymize on verified erasure request where no statutory hold applies (**Proposed**). |
| **Vehicle Workflow** | Vehicle records (`/api/vehicles`, `/api/vehicles/[id]`): `id`, `tenantId`, `customerId`, `updateVehicleSchema` fields; provider lookup payloads (`VehicleSpec`: VIN, make, model, year, body, engine, transmission, drivetrain, colors, metadata; `PartsFitmentResult`: part number, description, compatible vehicles) | Tenant (Workshop) | Track vehicles undergoing service/diagnosis, associate repair history with customers, and query VIN/plate/parts lookup providers | `Floor / Site Manager` (Read/Write), `Mechanic` (Read/Write), `Platform Admin` (Global Read/Write), `Customer` (Read Self) | **Implemented:** Tenant-scoped CRUD + legacy `/api/vehicle` aliases; provider registry implemented (SA provider stubs intentionally `NOT_IMPLEMENTED`). Auto-purge & encryption at rest are **Proposed**. | Retain for active vehicle/customer lifecycle + 5 years for service/warranty auditability; automated purge job **Proposed**. |
| **Messaging, Service & Labour Workflows** | Service requests & job cards (`/api/service-requests`, `/api/job-cards/[id]/status`, `status-events`): `customerId`, `vehicleId`, `requestedService`, `customerConcern`, `preferredDate`, `status`, `customer_status`, `reason`, `note`, `actorIdentity`, `createdByUserId`, `createdAt`, `updatedAt`<br>Job notes & labour (`job_labour_entries`, `/api/job-cards/[id]/notes`, `/labour`): `technicianId` (`mechanic` employee PII), `startedAt`, `endedAt`, `body`, `note`, `visibility` (`internal` \| `customer`), correction `reason`<br>Quotes, invoices & parts/supplier requests (`cents.ts`, `/api/supplier-responses`, `/api/quotes/[id]`, `/api/invoices/[id]`, `/api/parts-requests/[id]`): `numeric(12,2)` amounts, VAT (`15%`), approval status | Tenant (Workshop) | Intake customer requests, communicate customer-visible vs. internal status updates/notes, log technician labour hours, and process parts/supplier/billing workflows | `Floor / Site Manager` (Full Control; required with `jobs.update_status` to cancel/reopen/reverse jobs), `Mechanic` (Create/Update Status/Notes/Labour), `Parts Supplier` (`supplier.requests.read`, `supplier.requests.respond`, `parts.request`), `Customer` (`Read (Self)` on mapped `customer_status` and `visibility: 'customer'` notes; `quotes.approve`), `Platform Admin` (Full Control) | **Partially Implemented:** Service requests, job-card status events, internal/customer notes, labour entries, and supplier responses are live; `/api/quotes/[id]`, `/api/invoices/[id]`, and `/api/parts-requests/[id]` routes are **not yet implemented** in `main`. Automated note purging is **Proposed**. | Invoices & completed service records retained 5 years (SA tax/CPA compliance); technician labour logs retained 3–5 years (SA BCEA compliance); internal job notes archived/purged after 24 months (**Proposed**). |
| **Authentication & Audit Workflow** | Auth0 JWT / `auth0_session` cookie claims (`custom:tenant_id`, `custom:tenant_role`, `custom:permissions`, `custom:tenant_memberships`), `users` table & session subject (`actorIdentity`, `createdByUserId`), and audit logs (`writeAuditLog`: `actorUserId`, `tenantId`, `previousValue`, `newValue`, `timestamp`; `TenantAccessError` logs) | Platform / Tenant | Authenticate users, enforce fail-closed tenant/permission guards, and record audit trails for status transitions, feature flags, and denied access attempts | Server auth guards (`requireUser`, `requireTenantContext`, `requireTenantPermission`), `Floor / Site Manager` (`reports.view`), `Platform Admin` (`audit.read`, `platform.tenants.manage`) | **Implemented:** Auth0 JWT/cookie session validation and `writeAuditLog` are active (local dev fallback exists when Auth0 is unconfigured). Log masking, TTL auto-purging, and encryption at rest are **Proposed**. | Active sessions expire per Auth0 token lifetime; security/audit logs retained 12–24 months for incident investigation, with automated PII masking/purge **Proposed**. |

## 3. Access Roles, Retention, and Incident Handling

### Access Roles & Permissions (Verified Against `18-auth-tenant-provider-architecture.md`)
- **Customer (`customer`):** `Read (Self)` on own customer profile, vehicles, and mapped job-card status timeline (`/api/customer/job-cards/[id]/status-events`, notes with `visibility: 'customer'`); `Approve` (`quotes.approve`) on quotes. Blocked from internal notes, staff `actorIdentity`, and write/admin routes.
- **Mechanic (`mechanic`):** `Read` on tenant customers; `Read / Write` on tenant vehicles; `Read, Create, Update Status, Notes` on job cards and `job_labour_entries` (`technicianId`, `startedAt`, `endedAt`); `Request` on parts/supplier requests.
- **Floor / Site Manager (`site_manager`, `floor_manager`):** Tenant/user management (`tenant.settings.update`, `users.invite`, `users.manage`), `Read / Write` on customers and vehicles, `Full Control` on job cards (required alongside `jobs.update_status` to cancel, reopen, or reverse completed jobs), quotes/invoicing, quote approvals on supplier requests, and `reports.view`.
- **Parts Supplier:** Strictly isolated to `supplier.requests.read`, `supplier.requests.respond`, and `parts.request`; unauthorized cross-domain mutations throw `TenantAccessError` (`403 Forbidden`) and log an audit event.
- **Platform Admin:** Platform/tenant management (`platform.tenants.manage`, `tenant.manage`), global read/write access, and `audit.read`; platform-admin status alone does **not** bypass tenant role checks (`site_manager` / `floor_manager`) on workshop job-card transitions.

### Proposed Deletion & Retention Responsibilities (Not Yet Implemented)
- **Automated Purging (`Proposed`):** Scheduled background jobs are proposed to purge expired transient logs and internal notes once retention windows expire.
- **Hard Deletes & Data Subject Erasure (`Proposed`):** Automated hard-delete and anonymization workflows for verified POPIA Section 24 deletion requests are proposed, preserving only statutory tax/invoice records required under Section 14(1)(a).
- **Correction Requests (`Proposed`):** Data subject correction workflows (POPIA Section 24) are proposed to allow authorized tenant managers (`users.manage` / `customers.write`) to update inaccurate customer/vehicle records with audit logging.

### Proposed Incident Handling Requirements
- **Detection & Containment:** Unauthorized access attempts trigger fail-closed `403 Forbidden` / `TenantAccessError` responses and `writeAuditLog` entries; compromised sessions require immediate Auth0 token/session revocation.
- **Reporting:** Suspected security compromises involving personal information must be escalated to the Information Officer / technical lead for assessment and notification to the Information Regulator (South Africa) and affected data subjects under POPIA Section 22.

## 4. Technical Control Gaps & Legal Review Questions

### Missing Technical Controls (Gaps — Status: `Proposed`)
1. **Automated Deletion / Auto-Purging (`Proposed`):** No scheduled database jobs or TTL policies exist yet to purge expired logs, internal notes, or closed records.
2. **Hard Deletes & Anonymization (`Proposed`):** No automated hard-delete or PII anonymization endpoint exists for data subject erasure requests.
3. **Encryption at Rest (`Proposed`):** Application-level field encryption for sensitive customer contact fields and stored tokens is not yet implemented.
4. **Audit Log Masking & Rotation (`Proposed`):** `writeAuditLog` snapshots (`previousValue` / `newValue`) lack automated PII redaction and TTL rotation.
5. **Unimplemented Billing & Parts Routes:** `/api/quotes/[id]`, `/api/invoices/[id]`, and `/api/parts-requests/[id]` endpoints are not yet implemented in `main` and will require tenant/privacy verification upon delivery.

### Legal Review Questions (Counsel Sign-Off Required)
1. **Lawful Basis for Vehicle & Diagnostic Data (POPIA Section 11):** Can vehicle identifiers (VIN, registration) and diagnostic/service history linked to a customer be processed under contractual necessity (Section 11(1)(b)) and legitimate interest (Section 11(1)(f)), or is explicit opt-in consent required for secondary analytics?
2. **Cross-Border Cloud Hosting & Sub-Processors (POPIA Section 72):** Where Auth0, database hosting, or external VIN/fitment lookup providers process data outside South Africa, do existing Data Processing Agreements (DPAs) and Standard Contractual Clauses satisfy Section 72 adequacy requirements?
3. **Statutory Retention vs. Erasure Exceptions (POPIA Sections 14 & 24):** Do our proposed retention periods (5 years for invoices/service records, 3–5 years for technician labour logs, 12–24 months for audit logs) satisfy South African tax (SARS), Consumer Protection Act (CPA), and BCEA requirements, and what minimum billing subset must be retained when a customer requests erasure?
4. **Operator Mandates (POPIA Sections 20–21):** Do contracts with third-party hosting, Auth0, and future South African vehicle/parts lookup providers include mandatory written Operator safeguards and breach notification SLAs?
5. **Security Compromise Notification Thresholds (POPIA Section 22):** Are internal escalation criteria and breach notification templates aligned with the Information Regulator (South Africa) reporting requirements?
6. **Privacy Notice Disclosures (POPIA Section 18):** Does the customer onboarding/intake flow disclose all mandatory Section 18 notice elements (purpose, voluntary vs. mandatory fields, consequences of non-provision, and cross-border transfers) before personal data is collected?

## 5. Baseline Verification Results 
 
* **Scope:** Documentation and gap analysis task.
* **Environment Check Observations:**
  * `pnpm install --frozen-lockfile` — Failed due to specifier drift in `packages/shared/package.json`.
  * `pnpm lint` — Failed (Exit code 2) due to pre-existing tooling incompatibility (`@typescript-eslint/typescript-estree@8.61.0` with `typescript@7.0.2`: `TypeError: Cannot read properties of undefined (reading 'Cjs')`).
  * `pnpm typecheck` — Failed due to missing permissions (`quotes.lock` / `quotes.view`).
  * `pnpm test` — Failed due to missing Auth0 environment variables.
  * `pnpm build` — Failed due to a missing module (`./vehicleForm` in `station/vehicles/page.tsx`).

