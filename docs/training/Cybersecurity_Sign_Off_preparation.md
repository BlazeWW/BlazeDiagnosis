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
