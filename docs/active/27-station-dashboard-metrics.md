# Station dashboard metrics (BD-008)

**Issue:** [#100](https://github.com/BlazeWW/BlazeDiagnosis/issues/100)  
**Page:** `/[locale]/station`  
**Code:** `apps/web/src/features/reports/services/stationDashboardService.ts`, `stationDashboardRepository.ts`, `apps/web/src/features/reports/components/stationDashboardSections.tsx`

## Access

- The tenant comes from the request context (`requireTenantContext`: session tenant, then tenant domain, then the development fallback). It is never read from the client.
- The dashboard requires `jobs.read` for that tenant (`requireTenantPermission`).
- The outstanding-invoice amount is only loaded for users with `invoices.create`, `invoices.update` or `reports.view`. Other roles see "Not available for your role".

## Metrics

| Metric | Source | Calculation |
|---|---|---|
| Open jobs | `job_cards` | `internal_status` not `completed` or `cancelled` |
| Awaiting approval | `job_cards` | `internal_status = 'awaiting_customer_approval'` |
| Awaiting parts | `job_cards` | `internal_status = 'awaiting_parts'` |
| Outstanding invoices | `invoices` | Count and sum of `total` where `status` is `issued`, `partially_paid` or `overdue` |
| Workshop attention queue | `job_cards` + `vehicles` + `customers` | 5 open jobs, earliest `expected_completion_at` first (no due date last); overdue when the due date is in the past |
| Parts attention queue | `parts_requests` + `job_cards` | 5 requests with `status` `sent` or `response_received`, oldest first |

## Calculation period

All figures are a **point-in-time snapshot** of the current state when the page loads. There is no date range, and nothing is cached (`dynamic = 'force-dynamic'`). The page shows the snapshot time ("Live figures as of …").

"Overdue" compares `expected_completion_at` with the current time. Dates are displayed in `Africa/Johannesburg` time (the default tenant timezone), not the server's timezone. Per-tenant timezones (`tenants.timezone`) are not applied yet.

**Known limitation:** partially paid invoices count at their full `total`. Payment status values are not yet defined in the codebase, so payments are not subtracted.

## Query cost

Each page load runs 4 dashboard read queries in parallel (3 when financial figures are hidden). Every one is filtered by `tenant_id`. On top of these, the existing shared checks run first: `requireTenantContext` (one `tenant_domains` lookup only when the session has no tenant) and `requireTenantPermission` (writes one `permission_audits` row).

- Job counts use one pass over the tenant's job cards with `count(*) filter (...)`, supported by the `job_cards_tenant_status_idx` index.
- Both queues are limited to 5 rows.
- Invoice totals filter on `tenant_id` and `status`. The existing `invoices_tenant_customer_idx` index starts with `tenant_id`. A `(tenant_id, status)` index can be added later if invoice volume grows; that needs a migration and lead approval.

## Verification

- `stationDashboardRepository.test.ts`: generated SQL is scoped to the tenant (including the joins) and filters the right statuses.
- `stationDashboardService.test.ts`: two tenants see different figures, an empty tenant sees zeros, `jobs.read` is required, money is hidden without financial permission, overdue flag.
- `stationDashboardSections.test.tsx`: empty, no-access and error states render messages instead of another tenant's data or a crash.
