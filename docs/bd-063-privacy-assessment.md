# BD-063: Privacy, Retention, and Access Assessment

- **GitHub Issue:** #155
- **Squad:** Team 9: Cybersecurity Assurance
- **Suggested Level / Priority:** Y1 / P1
- **Reference:** `docs/active/21-70-intern-task-register.md`
- **Compliance Boundary Notice:** *This document represents an engineering assessment and gap analysis of current code behavior on the `main` branch. It does NOT constitute a formal legal POPIA certification or legal-compliance claim.*

## 1. Executive Summary & Current Code Reality

An assessment of the `main` branch was conducted to catalog personal data flows, examine current access controls, and evaluate retention and deletion mechanisms across 18 distinct data elements in 7 core application domains.

- **Retention & Deletion Status:** Currently, "deletion" is handled strictly as a soft archive (`isArchived = true` on customer and vehicle records). There is currently **no** automated database retention, Time-To-Live (TTL), or automated anonymization mechanism in place.
- **Audit Logging:** Audit logs store before/after snapshots of personal data inside `JSONB` fields alongside IP addresses and user agents **indefinitely**, with no automated purging or masking policy.
- **Access & Tenant Scoping:** Access to records relies on application-level role checks; strict database-level tenant isolation and log redaction require ongoing verification.

## 2. Data Inventory & Retention Matrix

| Workflow / Domain | Data Field / Element | Data Owner | Collection Purpose | Permissions / Access Roles | Current Code State | Proposed Retention Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Authentication** | Passwords (hashed), emails, MFA tokens | User / Admin | Identity verification & session management | Auth Service, User | Stored in Auth0 / DB until account deletion | Retain while account is active; delete 30 days post-cancellation |
| **Customer** | Names, contact info, billing addresses | Customer | Account management & invoicing | Customer Support, Billing | Stored in DB with soft-delete (`isArchived = true`) | Retain 5 years post-account closure (tax compliance) |
| **Vehicle** | VINs, registration numbers, telematics | Vehicle Owner | Service scheduling & diagnostic history | Fleet Manager, Mechanics | Stored in DB with soft-delete (`isArchived = true`) | Retain for full operational life + 1 year |
| **Messaging / Chat** | Direct messages, notification logs | Sender / Recipient | In-room communication & audit logging | System Admin, Parties | Logged to database without automated TTL | Retain logs for 90 days; purge automatically |
| **Audit Logs** | `JSONB` before/after snapshots, IP addresses, user agents | System | Security monitoring & compliance tracing | Security Team, System Admin | Stored indefinitely in audit tables | Mask PII after 90 days; purge raw logs after 1 year |
| **Invoice** | Billing details, line items, tax numbers | Finance / Customer | Financial record-keeping & tax reporting | Billing, Finance | Stored in DB indefinitely | Retain for 5 years per local financial regulations |
| **Files / Attachments** | Uploaded documents, images, diagnostic reports | User / Mechanic | Service documentation & file sharing | Authorized Users, Mechanics | Stored in storage bucket without lifecycle rules | Retain matching parent entity lifecycle |

**Here**

## 5. Baseline Verification Results (2026-11-04)
 
* **Scope:** Documentation and gap analysis task (`BD-063`).
* **Environment Check Observations:**
  * `pnpm install --frozen-lockfile` — Failed due to specifier drift in `packages/shared/package.json`.
  * `pnpm lint` — Failed (Exit code 2) due to pre-existing tooling incompatibility (`@typescript-eslint/typescript-estree@8.61.0` with `typescript@7.0.2`: `TypeError: Cannot read properties of undefined (reading 'Cjs')`).
  * `pnpm typecheck` — Failed due to missing permissions (`quotes.lock` / `quotes.view`).
  * `pnpm test` — Failed due to missing Auth0 environment variables.
  * `pnpm build` — Failed due to a missing module (`./vehicleForm` in `station/vehicles/page.tsx`).
* **Note:** As this is a review-and-assessment task, code compilation failures on `main` are recorded as pre-existing exceptions and do not block this documentation deliverable.
