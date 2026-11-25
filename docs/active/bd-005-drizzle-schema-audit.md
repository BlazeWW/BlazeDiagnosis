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
Updated Verification Results
Type Checking Verification
Command:
•	pnpm typecheck
Result: Failed
Findings:
	TypeScript compilation failed due to unresolved module references. References like:
•	Cannot find module '@blaze-diagnostics/shared'
	Affected files include:
•	src/features/job-cards/repositories/databaseServiceRequestRepository.ts
•	src/features/job-cards/repositories/mockServiceRequestRepository.ts
•	src/features/job-cards/repositories/serviceRequestRepository.ts
•	src/features/job-cards/schemas/jobCardSchema.ts
Observation:
The previously reported filename casing and permission-definition issues were no longer present after synchronisation with the latest main branch.

Test Verification
Command:
•	pnpm test
Result: Failed
Summary of errors:
	Test Files:
•	48 passed
•	12 failed
	Tests:
•	274 passed
•	1 todo

Root Cause:
Test execution failed because the database client requires a configured database connection.
Errors:
	DATABASE_URL is required to initialize the database client.
	It originates from: src/db/client.ts
Affected suites:
•	src/lib/api/response.test.ts
•	src/app/api/customer-intakes/route.test.ts
•	src/app/api/customers/route.test.ts
•	src/app/api/quotes/route.test.ts
•	src/app/api/tenant-branding/route.test.ts
Observation:
Previous AUTH0-related test failures were not reproduced after synchronisation with the latest version of main.

Build Verification
Command:
•	pnpm build
Result: Failed
Build Behaviour:
	Application compilation completed successfully.
	The build subsequently failed during TypeScript validation.
Root Cause:
	Cannot find module '@blaze-diagnostics/shared'

Observation:
The build failure aligns with the module-resolution issue observed during type checking.
________________________________________
Disposable PostgreSQL Migration Rehearsal
Objective:
The reviewer requested validation of migrations against a disposable PostgreSQL environment.
A local PostgreSQL 16 container was provisioned using Docker.
Environment:
•	Image: postgres:16
•	Database: blaze_pos
•	Host: localhost
•	Port: 5432
Migration Command:
•	pnpm --filter @blaze-diagnostics/web db:migrate
Result: Failed
Observed Behaviour:
The migration process successfully:
•	Loaded drizzle.config.ts
•	Loaded .env.local
•	Established PostgreSQL connectivity
•	Entered migration execution
Output included:
•	Using 'pg' driver for database querying
•	applying migrations...
•	The migration process then terminated with: Exit Status 1

Risk:
A clean migration of a new database instance could not be successfully validated.
Further investigation is required to determine the exact migration failure mechanism.
________________________________________
Schema-to-Migration Consistency Review
Migration Rehearsal Findings
A schema-to-migration consistency review was performed after synchronising with the latest main branch.
Finding MR-001
The schema defines a table named:
•	permission_audits
•	It is found within apps/web/src/db/schema/tenants.ts
Searches across committed migration SQL files did not identify a corresponding CREATE TABLE statement for permission_audits.
Risk: Fresh database deployments may not contain the table expected by the current schema.

Finding MR-002
The current schema defines:
•	tenant_members
However, committed migration files reference:
•	tenant_memberships
	Instances identified:
•	CREATE TABLE tenant_memberships
•	CREATE UNIQUE INDEX tenant_memberships_unique_idx
•	DROP TABLE tenant_memberships CASCADE
Including creation, indexing and later deletion statements.This indicates a potential schema-to-migration divergence.
Risk: Schema definitions and migration history may no longer describe the same database structure.

Finding MR-003
Drizzle Migration Journal Excluded.
The repository .gitignore file contains:
•	**/drizzle/meta/
Risk: Migration metadata may not be reproducible across environments because the migration journal is excluded from source control.
Potential Impact:
•	Migration ordering ambiguity
•	Environment drift
•	Difficult migration troubleshooting
•	Reduced migration traceability
________________________________________
Migration Remediation Plan

R1 - Restore migration traceability
Review whether Drizzle migration metadata should be tracked in source control.
Current state:
•	**/drizzle/meta/
•	Is ignored by Git.
Expected outcome:
Migration ordering and execution history must be reproducible across development environments.

R2 - Resolve schema-to-migration divergence
Review discrepancies between current schema definitions and committed migration files.
Identified examples:
•	permission_audits exists in schema but was not identified in committed migrations.
•	tenantmembers exists in schema while migrations reference tenantmemberships.
Expected outcome:
Schema definitions and migration history should describe the same database structure.

R3 - Investigate migration execution failure
Migration rehearsal against disposable PostgreSQL exits during migration execution.
Observed command:
•	pnpm --filter @blaze-diagnostics/web db:migrate
Expected outcome:
Clean-database migration should complete successfully on a fresh PostgreSQL instance.

R4 - Establish authoritative migration baseline
Multiple baseline migration files were identified:
•	0000_omniscient_azazel.sql
•	0000_square_pestilence.sql
•	0000_unique_micromax.sql
Expected outcome:
Confirm authoritative baseline migration sequence and remove ambiguity in migration ordering.
________________________________________
Evidence Summary Table
Evidence ID	Activity	Command/Source	Result	Supporting Evidence
EV-001	Schema Review	apps/web/src/db/schema/tenants.ts
	Reviewed tenant schema, indexes, constraints and tenant-owned entities	Schema inspection

EV-002	Schema Review	apps/web/src/db/schema/invoices.ts
	Reviewed invoices, payments and invoice line-item structures	Schema inspection

EV-003	Schema Review	apps/web/src/db/schema/customers.ts
	Verified tenant ownership and customer relationships	Schema inspection

EV-004	Schema Review	apps/web/src/db/schema/jobs.ts
	Verified job card, service request and customer relationships	Schema inspection

EV-005	Migration Inventory	apps/web/drizzle
	Identified five committed migration files	Repository review
EV-006	Migration Risk Review	0000_omniscient_azazel.sql, 0000_square_pestilence.sql, 0000_unique_micromax.sql
	Multiple baseline (0000) migrations identified	Migration inventory
EV-007	Type Checking	pnpm typecheck	Failed due to unresolved module @blaze-diagnostics/shared	Verification log
EV-008	Test Execution	pnpm test	48 test files passed, 12 test files failed	Verification log
EV-009	Database Test Result	pnpm test	Failure caused by missing DATABASE_URL configuration during test execution	Verification log
EV-010	Build Verification	pnpm build	Compilation completed but type validation failed	Verification log
EV-011	Build Root Cause	pnpm build	Build failure caused by unresolved module @blaze-diagnostics/shared	Verification log
EV-012	Disposable PostgreSQL
Rehearsal	Docker PostgreSQL 16 container
	PostgreSQL successfully provisioned and reachable on localhost:5432	Docker execution logs
EV-013	Migration Rehearsal	pnpm --filter @blaze-diagnostics/web db:migrate	Migration process started, connected to PostgreSQL, then exited with status 1	Migration execution log
EV-014	Schema-to-Migration 
Review	Repository-wide search for permission_audits	Table exists in schema but not identified in committed migrations	Repository search evidence
EV-015	Schema-to-Migration 
Review	Repository-wide search for tenant_members	Schema defines tenant_members while migrations reference tenant_memberships	Repository search evidence
EV-016	Migration Metadata Review	.gitignore	Verified exclusion of **/drizzle/meta/ migration journal metadata	Repository inspection



________________________________________
Conclusion
The schema review confirms widespread use of primary keys, foreign keys, tenant ownership patterns and indexing. However, additional investigation performed after reviewer feedback identified several migration-management concerns.
Most notably:
•	Migration rehearsal against a disposable PostgreSQL instance could not be completed successfully.
•	The schema contains entities not clearly represented in committed migration files.
•	Current schema definitions and migration history appear to diverge in places.
•	Drizzle migration metadata is excluded from source control.
•	Current build, typecheck and test execution remain unsuccessful on the reviewed environment.
These findings increase confidence that the remaining migration concerns are reproducible and warrant remediation before relying on the current migration set for fresh database deployment.


________________________________________
