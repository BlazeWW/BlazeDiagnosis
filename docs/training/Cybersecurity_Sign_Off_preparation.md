### 1. Route Access Matrix (RBAC)
This matrix establishes the strict operational boundaries required across endpoints before deployment, operating under the Principle of Least Privilege.

| Route Path Component | System Admin | Internal Staff / Manager | Supplier / Vendor | Customer | Access Control Rationale |
| :--- | :---: | :---: | :---: | :---: | :--- |
| /api/v1/admin/* | **Allow** | Deny | Deny | Deny | Global platform config & tenant onboarding. |
| /api/v1/invoices/* | **Allow** | *Allow* | Deny | *Conditional* | Customers can only view their own invoices. |
| /api/v1/customers/* | **Allow** | *Allow* | Deny | *Conditional* | Profile management restricted to self-record. |
| /api/v1/vehicles/* | **Allow** | *Allow* | Deny | *Conditional* | System asset tracking; customer owns specific scope. |
| /api/v1/suppliers/* | **Allow** | *Allow* | *Allow* | Deny | B2B pipeline processing; zero customer exposure. |
| /api/v1/quotes/* | **Allow** | *Allow* | *Allow* | *Conditional* | High exposure risk (margins must be stripped). |

---

### 2. Micro-Service Route Access Control Risks

#### A. Invoice, Customer, and Vehicle Detail Routes
* *Access-Control Risk:* Broken Object Level Authorization (BOLA) / IDOR. Routes utilizing sequential or predictable resource IDs (e.g., /api/v1/invoices/104) allow malicious actors to brute-force URL parameters and view records belonging to other users.
* *Mitigation:* Implement cryptographically secure UUIDv4 tokens for external resource identifiers. Enforce an authorization hook in the controller layer that explicitly matches the session context (req.user.id) against the database record owner attribute.

#### B. Supplier Pages Risk Assessment
* *Customer Data Exposure Risk:* Supplier views that aggregate operational tracking details run a high risk of cross-pollinating customer data or PII across different vendor systems.
* *Mitigation:* Use dedicated Data Transfer Objects (DTOs) at the controller output layer. Supplier endpoints must run on data schemas strictly isolated to that vendor's parameters (WHERE item.supplier_id = current_user.supplier_id), stripping all unneeded client data out before network transit.

#### C. Platform Pages Risk Assessment
* *Tenant Data Exposure Risk:* Multi-tenant leakage at the analytical dashboard level. Failure to separate system environments could lead to data spill, violating compliance regulations.
* *Mitigation:* Implement strict Row-Level Security (RLS) or logical data layer filters. Abstract data access behind a repository class that implicitly appends the user's tenant scope identifier to every query, bypassing human developer error.

### Tenant Isolation QA Testing Criteria

- [ ] **Verify Authentication Token Scoping:** Ensure that a valid JWT generated for Tenant A is explicitly rejected with an HTTP `403 Forbidden` if executed against an endpoint scope for Tenant B.
- [ ] **Validate IDOR Resiliency:** Attempt direct URL parameter manipulation by executing requests against known resource keys across tenant boundaries. Ensure the application responds with a uniform error layout to prevent active resource discovery.
- [ ] **Confirm Database Leakage Defenses:** Execute a multi-tenant performance/stress test script simulating parallel writes. Review storage indexes to verify that no overlapping race conditions blend entity relations between discrete tenants.
- [ ] **Analyze Cache Key Segregation:** Verify that globally pooled caching components (e.g., Redis clusters) utilize distinct tenant-prefixed keys (e.g., `tenant_id:resource_id`) to block cross-organizational data delivery out of shared RAM.
##  Production Security Sign-Off Checklist

### 1. Access Control & Authorization (RBAC / ABAC)
- [ ] All critical endpoints (`/invoices`, `/customers`, `/vehicles`) validate session permissions server-side.
- [ ] Negative test cases demonstrating explicit `403 Forbidden` behavior for unauthorized roles pass successfully.
- [ ] Public routes containing resource identifiers utilize non-enumerable tokens (UUIDv4).

### 2. Multi-Tenant Cryptographic & Logical Isolation
- [ ] Database query boundaries append deterministic tenant scoping constraints.
- [ ] Cross-tenant API communication simulation yields 100% rejection metrics.
- [ ] Shared caching, background processing worker pools, and memory models use explicit namespace keys.

### 3. Data Leakage & Masking Compliance
- [ ] Supplier-facing endpoints are validated to filter out corporate client PII.
- [ ] Quote structures systematically strip out internal metadata fields (`supplier_margin`, `internal_notes`).
- [ ] Production logs run via automated data sanitization scripts to catch and obscure plaintext secrets.

### 4. Continuous Observability & Supply Chain Compliance
- [ ] Environment secrets, production tokens, and infrastructure certificates are hosted outside source trees.
- [ ] Vulnerability tooling checks clear during automated deployment compilation events.
- [ ] Immutable audit microservices capture all invoice operations, approval updates, and role modifications.

### Security Findings Log

| Risk Category | Identified Vulnerability | Practical Mitigation Strategy |
| :--- | :--- | :--- |
| *Access Control* | Broken Function Level Authorization (BFLA) on admin/staff routes. | Deploy role-checking middleware on all backend route definitions. |
| *Data Leakage* | Raw database objects exposing internal notes/margins to customers. | Enforce strict Data Transfer Objects (DTOs) to whitelist public fields. |
| *Tenant Isolation* | Potential cross-tenant data spill via un-scoped API queries. | Automate query scoping filters (WHERE tenant_id = current_tenant) at the repository layer. |
| *File Security* | Arbitrary file upload execution vectors. | Validate magic numbers, rename files to UUIDs, and host out-of-webroot. |

### Deliverable 2: Threat Model (STRIDE Framework)

| STRIDE Threat | Architectural Vulnerability | Specific System Impact | Practical Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Forged JWT signatures or compromised API keys. | Adversary impersonates a tenant manager, gaining malicious system entry. | Enforce strong asymmetric token signing algorithms and rotate signing keys regularly. |
| **Tampering** | Intercepting and manipulating invoice or quote parameter amounts in transit. | Unauthorized price adjustments or financial fraud. | Enforce TLS 1.3 across all platform connections; sign all critical state changes with localized server validation. |
| **Repudiation** | Missing trails or mutable app database history files. | Inability to track who approved a quote or altered an invoice during an audit. | Ship application events to an immutable, write-once-read-many (WORM) logging server or external SIEM platform. |
| **Information Disclosure** | Data spill via improper multi-tenant boundary checks. | Tenant A views financial records, PII, or vehicle data belonging to Tenant B. | Enforce row-level security (RLS) policies within the database engines based on session tenant metrics. |
| **Denial of Service** | Uncapped bulk file downloads or unbound resource query endpoints. | Exhausting system memory or database connection pools, crashing the service. | Implement aggressive rate-limiting layers (e.g., token bucket via Redis) mapped to distinct user and IP contexts. |
| **Elevation of Privilege** | Manipulating the user profile update payload (`role: 'Admin'`). | A regular client escalates privileges to achieve full host database control. | Restrict dynamic updates; explicitly isolate role configuration paths behind strict administrative-only routes. |
