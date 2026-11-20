# BD-019 — Diagnostic Evidence Attachments: Storage Policy, Visibility Matrix & Runbook

**GitHub Issue:** #111  
**Squad:** Diagnostics and Job Cards  
**Status:** Policy & Authorization Guard Implemented (Persistence/Storage Stubbed Pending Upstream Backend)

---

## 1. Private Storage & File Validation Policy

Diagnostic evidence attachments (photos, inspection reports, and short diagnostic clips) are treated as sensitive operational and customer records.

### Private Storage Rules
* **No Public Bucket URLs:** Evidence files must never be stored in publicly readable buckets or served via unauthenticated/public URLs.
* **Server-Mediated Access Only:** All reads, downloads, and deletions must pass through authenticated server context and authorization checks (`actor`, `tenant`, `job`, and `visibility`), issuing short-lived or scoped access only after verification.
* **Tenant & Job Scoping:** Every attachment record is bound to a `tenantId`, `jobId`, and `customerId`, and must be queried and verified within the active tenant boundary.

### Permitted File Types (MIME Allowlist)
Uploads are restricted to an explicit allowlist of diagnostic media formats:
* **Images:** `image/jpeg`, `image/png`, `image/webp`
* **Documents:** `application/pdf`
* **Video Clips:** `video/mp4`, `video/quicktime`

Any other MIME type (such as executables, scripts, archives, or arbitrary binaries) is rejected with `400` (`Unsupported file type`).

### Maximum File Size Limit
* **Limit:** **10 MB** (`10 * 1024 * 1024` bytes) per individual attachment.
* Files exceeding 10 MB are rejected with `413` (`File exceeds maximum allowed size of 10MB`).

---

## 2. File Visibility Matrix

Evidence items carry a `visibility` classification of either `internal` or `customer_visible`. Access is evaluated fail-closed across role, tenant ownership, customer ownership, and visibility:

| Actor / Role | `visibility: "customer_visible"` (Own Tenant / Own Job) | `visibility: "internal"` (Own Tenant / Job) | Another Customer in Same Tenant (ID Guess) | Another Tenant (Cross-Tenant Access) |
| :--- | :---: | :---: | :---: | :---: |
| **`customer`** | **Allowed** (only when `record.customerId === actor.customerId`) | **Denied (`403`)** | **Denied (`404`)** (avoids ID enumeration) | **Denied (`404`)** |
| **`mechanic`** | **Allowed** | **Allowed** | **Allowed** (within same tenant job scope) | **Denied (`404`)** |
| **`floor_manager`** | **Allowed** | **Allowed** | **Allowed** (within same tenant job scope) | **Denied (`404`)** |
| **`site_manager`** | **Allowed** | **Allowed** | **Allowed** (within same tenant job scope) | **Denied (`404`)** |
| **`parts_supplier`** | **Denied (`403`)** | **Denied (`403`)** | **Denied (`404`)** | **Denied (`404`)** |
| **`platform_admin`** | **Allowed** | **Allowed** | **Allowed** | **Allowed** (platform-wide scope) |

### Removal / Deletion Rules
* **Allowed Roles:** `mechanic`, `floor_manager`, and `platform_admin` within authorized tenant scope.
* **Restricted Roles:** `customer` and `parts_supplier` are denied deletion (`403`). Cross-tenant or nonexistent records fail closed (`404`).

---

## 3. Runbook Notes & Current Implementation State

### Current State (Stub & Policy Layer)
* Policy validation and authorization guards live in `apps/web/src/features/job-cards/policies/evidencePolicy.ts`:
  * `validateEvidenceUpload()`
  * `authorizeEvidenceRead()`
  * `authorizeEvidenceDelete()`
* Unit/integration policy tests live in `apps/web/src/test/diagnostic-evidence.test.ts` using typed mock fixtures so security behavior can be verified before database schema and object-storage routes are merged.

### Operational Runbook Steps
1. **Verify Policy & Tests Locally:**
   ```powershell
   pnpm --filter @blaze-diagnostics/web test diagnostic-evidence.test.ts


1. Wiring to Live Persistence & Storage (Follow-Up Integration):

Once the evidence table/schema and private storage adapter are available on main, call validateEvidenceUpload() prior to upload/persistence, fetch the persisted record scoped by tenantId, and pass it through authorizeEvidenceRead() or authorizeEvidenceDelete() before returning signed/streamed content or deleting objects.

Ensure audit logging (createAuditLog) records evidence creation and deletion with actor and tenant context once persistence routes are wired.

2. Incident / Security Triage:

If a customer reports seeing internal diagnostic notes/files or accessing another job's file ID, immediately audit authorizeEvidenceRead() call sites, confirm customerId and visibility checks are not bypassed, and rotate/revoke any exposed temporary access tokens.