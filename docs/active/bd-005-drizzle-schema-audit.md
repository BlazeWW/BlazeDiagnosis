BD-005 – Drizzle Schema and Migration Audit Report

Overview
This audit was conducted against the current Blaze Diagnostics codebase to review the Drizzle schema, database migration structure, tenant isolation implementation, indexing strategy, migration risks, and current verification status.
The review focused on:
•	Schema integrity
•	Primary keys
•	Foreign key relationships
•	Tenant isolation controls
•	Unique constraints
•	Indexes
•	Migration inventory
•	Migration risks
•	Build and test verification
________________________________________

Schema Audit
Tables Reviewed
Tenant Domain
•	tenants
•	tenant_domains
•	tenant_branding
•	tenant_settings
•	tenant_feature_flags
•	tenant_members
•	permission_audits

Customer Domain
•	customers

Job Domain
•	service_requests
•	intake_inspections
•	job_cards
•	job_status_events
•	job_notes

Financial Domain
•	invoices
•	invoice_line_items
•	payments

________________________________________
Primary Key Verification
Result: PASS
•	All reviewed tables contain a primary key definition using:
	id: uuid('id').defaultRandom().primaryKey()
	No reviewed table was found without a primary key
________________________________________
Foreign Key Verification
Result: PASS
•	Reviewed entities correctly implement foreign key relationships.
•	Examples include:
	Invoices
	tenantId → tenants.id
	jobCardId → jobCards.id
	customerId → customers.id

	Invoice Line Items
	tenantId → tenants.id
	invoiceId → invoices.id
	quoteLineItemId → quoteLineItems.id

	Payments
	tenantId → tenants.id
	invoiceId → invoices.id

	Customers
	tenantId → tenants.id

	Job Cards
	tenantId → tenants.id
	customerId → customers.id
________________________________________
Tenant Isolation Review
Result: PASS WITH OBSERVATIONS
Tenant-owned entities consistently include a tenantId column and foreign key reference to the tenant’s table.
Examples:
•	customers
•	service_requests
•	job_cards
•	invoices
•	invoice_line_items
•	payments
This aligns with AGENTS.md requirements:
	Never trust a client-provided tenantId.
	Every tenant-owned query must include tenant scope.
Observation
	Cross-tenant relationship enforcement should be verified further.
Example:
	An invoice contains:
	tenantId
	customerId
	jobCardId
	Database constraints do not visibly enforce:
	invoice.tenantId = customer.tenantId
	invoice.tenantId = jobCard.tenantId
•	Risk Level: Medium
•	Recommendation:
	Review service-layer validation and query patterns to ensure cross-tenant references cannot be created.
________________________________________
Unique Constraint Review
Result: PASS
	Verified unique constraints include:
•	Tenants
	tenants_slug_idx
•	Tenant Settings
	tenant_settings_unique_idx
	(tenantId + settingKey)
•	Tenant Feature Flags
	tenant_feature_flags_unique_idx
	(tenantId + flagKey)
•	Tenant Members
	tenant_members_unique_idx
	(tenantId + userId)
________________________________________
Index Review
Existing Indexes Verified
Tenants
•	tenants_status_idx
Tenant Domains
•	tenant_doamains_tenant_idx
Tenant Members
•	tenant_members_tenant_idx
•	tenant_members_user_idx
•	tenant_members_status_idx
Permission Audits
•	permission_audits_tenant_idx
•	permission_audits_user_idx
•	permission_audits_created_idx
•	permission_audits_result_idx
Invoices
•	invoices_tenant_customer_idx
________________________________________
Index Observations
Finding BD-005-1
Payment table contains:
•	tenantId
•	invoiceId
No explicit indexes were observed.
Risk Level: Low to Medium
Recommendation:
•	Evaluate workload patterns and consider indexes if queries regularly filter by invoiceId or tenantId.

Finding BD-005-2
Invoice line items contain:
•	tenantId
•	InvoiceId
No explicit indexes were observed.
Risk Level: Low to Medium
Recommendation:
•	Review expected query volume and consider indexing invoiceId if performance requirements justify it.

Finding BD-005-3
Invoice numbers are not currently protected by a unique constraint.
Current Schema:
•	invoiceNumber: varchar('invoice_number', { length: 80 }).notNull()
Risk Level: Medium
Recommendation:
•	Confirm business requirements and consider a tenant-scoped unique index where appropriate.
________________________________________
Migration Audit
Migration Inventory
The following migration files were identified:
•	0000_omniscient_azazel.sql
•	0000_square_pestilence.sql
•	0000_unique_micromax.sql
•	0001_graceful_tag.sql
•	0002_smooth_ravenous.sql

Migration Risk Table
ID	Observation	Risk
M1	Three migration files share version prefix 0000	Medium
M2	Initial review indicates duplicated opening content between baseline migrations	Medium
M3	Migration metadata/journal was not located during initial inspection	Medium

Finding M1
Three migration files were discovered using the same version prefix:
•	
•	0000_omniscient_azazel.sql
•	0000_square_pestilence.sql
•	0000_unique_micromax.sql
Potential Concern:
•	Migration ordering and authoritative baseline sequence should be validated before execution in shared environments.

Finding M2
Initial comparison of:
•	0000_omniscient_azazel.sql
•	0000_square_pestilence.sql
	Showed substantially identical opening schema definitions.
Recommendation:
Confirm whether these represent duplicate baseline generations or intentional migration history.
________________________________________
Verification Results
Command: 
•	Pnpm install
•	node -V
Result: FAIL
Error:
	'node' is not recognized as the name of a cmdlet, function, script file, or operable program.
	'pnpm' is not recognized as the name of a cmdlet, function, script file, or operable program.
Root Cause:
	Node.js not installed on current workstation.
	pnpm unavailable because Node.js is not installed

Command: 
•	pnpm lint
Result: FAILED
Summary: 29 problems identified
	9 errors
	20 warnings
Example findings: apps/web/src/lib/providers/vehicle/implementations/southAfrica.ts
	'vin' defined but never used
	'plate' defined but never used
	'country' defined but never used
apps/web/src/lib/providers/vehicle/implementations/vindecoder.ts
	'error' defined but never used
 

Command: 
•	pnpm typecheck
Result: Failed
Findings:
	File name casing mismatch: vehicleForm.tsx vs VehicleForm.tsx
	Permission type mismatches: quotes.view , quotes.update , quotes.lock
Files affected:
	src/components/vehicles/index.ts
	src/features/quotes/services/quoteService.ts
Total: 7 TypeScript errors in 2 files.
 
 
 

Command: 
•	pnpm test
Result: Failed
Summary:
	47 tests passed
	1 test failed
	14 test files passed
	13 test files failed
Environment-Related Failures:
	Multiple API test suites failed due to missing AUTH0_DOMAIN and AUTH0_AUDIENCE environment variables.
Functional Test Failure:
	src/components/forms/formField.test.tsx
Failure: 
	Expected rendered markup to contain: aria-invalid="true"
Actual output did not contain the expected accessibility attribute.

 
 
 
 

Command: 
•	pnpm build
Result: FAIL
Build Error:
•	Module not found - Can't resolve './vehicleForm'
File:
•	src/components/vehicles/index.ts

Likely related to the casing mismatch identified during type checking

 
 
________________________________________
Conclusion
The reviewed schema demonstrates consistent primary key usage, foreign key relationships, tenant ownership patterns and unique constraint implementation.
Key areas recommended for further review include:
•	Cross-tenant reference enforcement
•	Invoice number uniqueness requirements
•	Payments indexing strategy
•	Invoice line item indexing strategy
•	Migration history consistency
•	Duplicate baseline migration investigation
Current repository verification commands indicate unresolved lint, type checking, testing and build issues which should be tracked independently from this audit where appropriate.

________________________________________
