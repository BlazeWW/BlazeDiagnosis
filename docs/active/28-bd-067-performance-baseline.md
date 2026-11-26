# BD-067: Performance and load baseline

Issue: #159. Status: first baseline, one improvement applied and re-measured. Synthetic data only.

## Summary

- The station job-card board (`GET /api/job-cards`) returned **every job card with every column**: 11.8 MB per request for a workshop with 20,000 job cards. Under load this payload blocked the single Node.js process, so **every** endpoint slowed down, even tiny ones.
- Selecting only the 5 fields the screens use cut the payload to 3.7 MB. **Throughput doubled (7.8 → 16.9 req/s) and p95 latency fell 68% (2.01 s → 0.64 s).**
- The board still returns all rows. Paging is the next fix (see recommendations). Four endpoints remain above the 500 ms p95 budget at 10 concurrent users on the dev server.
- The database is not the bottleneck: apart from the board query, every query averages 2–16 ms.

## Environment

| Item | Value |
| --- | --- |
| Machine | AMD Ryzen 7 5700 (16 logical cores), 32 GB RAM, Windows 11 |
| App | Next.js 16.2.9 **dev server** (`next dev --turbo`), Node 24.15, single process |
| Database | PostgreSQL 16.14 in Docker (`postgres:16-alpine`, limited to 2 CPUs / 1 GB), `pg_stat_statements` enabled |
| Load tool | k6 2.4.0 via Docker (`grafana/k6`), no new dependency |
| Auth | Dev login fallback (platform admin, tenant = workshop A) |

The dev server is used because the dev login only works in development mode; a production build needs a real Auth0 token. Dev mode is slower than `next start`, so absolute numbers are pessimistic. Before/after comparisons are like-for-like.

## Dataset (`perf/seed.sql`)

| | Workshop A (load target) | Workshop B (isolation check) |
| --- | --- | --- |
| Customers | 5,000 | 50 |
| Vehicles | 6,000 | 50 |
| Job cards (spread over 12 months) | 20,000 | 200 |
| Invoices | 4,000 | 0 |
| Staff | 20 mechanics, 3 floor managers | 2 mechanics |

All data is generated (`generate_series` + `md5` ids). No customer data is used.

## Workload (`perf/load.js`)

10 virtual users for 2 minutes, 0–0.5 s think time, weighted random mix of what station staff do:

| Share | Request | Tag |
| --- | --- | --- |
| 35% | `GET /api/job-cards` (staffing, labour and overview panels) | `job_card_board` |
| 20% | `GET /api/customers?q=<term>` | `customer_search` |
| 10% | `GET /api/customers` (empty search) | `customer_list_all` |
| 10% | `GET /api/job-cards/staff` | `staff_workload` |
| 15% | `GET /api/vehicles/{id}/history` | `vehicle_history` |
| 10% | `GET /en/station` (dashboard page) | `station_dashboard` |

Budget used for thresholds: **p95 < 500 ms per endpoint, error rate < 1%**.

## Results

| Endpoint | p95 before | p95 after | Budget |
| --- | --- | --- | --- |
| `job_card_board` | 2.13 s | 674 ms | ❌ |
| `station_dashboard` | 2.49 s | 799 ms | ❌ |
| `vehicle_history` | 1.91 s | 677 ms | ❌ |
| `customer_list_all` | 1.21 s | 505 ms | ❌ (just over) |
| `staff_workload` | 1.34 s | 448 ms | ✅ |
| `customer_search` | 1.12 s | 375 ms | ✅ |
| **All requests** | **2.01 s** | **637 ms** | |
| Throughput | 7.8 req/s | 16.9 req/s | |
| Errors | 0% | 0% | ✅ |
| Data received in 2 min | 4.1 GB | 3.0 GB (2.2× the requests) | |

Resources during the runs: database container 20–65% of its 2 CPUs and ~120 MB; the app process grew to ~1.4–1.6 GB working set.

### Database timings (`pg_stat_statements`, before the fix)

| Query | Calls | Mean | Share of DB time | Rows per call |
| --- | --- | --- | --- | --- |
| Job-card board (`SELECT *`) | 327 | 105 ms | **83%** | 20,000 |
| Customer search (`ILIKE '%q%'`) | 188 | 13 ms | 6% | ~500 |
| Dashboard attention list | 101 | 16 ms | 4% | 5 |
| Customer list (empty search) | 92 | 13 ms | 3% | 5,000 |
| Staff workload counts | 224 | 3–4 ms | 2% | ≤ 14 |

After the fix the board query averages 35 ms. In isolation (`EXPLAIN ANALYZE`) it is a 10 ms sequential scan plus sort; the rest of the time under load is sending 20,000 rows.

Tenant isolation: every board row returned belonged to workshop A; workshop B's rows never appeared.

## Bottlenecks

1. **Unbounded job-card board** (`getWorkshopBoard`): returns all job cards of a tenant, so the response grows forever. *Partly fixed* (5 columns instead of 17); rows are still unbounded.
2. **Customer list/search without a limit** (`searchCustomers`): an empty search returns every customer (1.7 MB for 5,000). `ILIKE '%q%'` cannot use a B-tree index and scans all customers (5 ms at 5,000 rows, grows linearly).
3. **Single Node process blocked by large JSON**: one big response slows every other request, which is why even small endpoints failed the budget before the fix.

No N+1 query patterns were seen in the measured endpoints: each request ran a fixed, small number of queries.

## Change made

`features/job-cards/services/jobCardService.ts`: `getWorkshopBoard` selects only `id`, `jobNumber`, `internalStatus`, `assignedMechanicId`, `assignedFloorManagerId`, the fields in the `JobCardRecord` type that the staffing panel, labour panel and job-card overview use. No API or behaviour change.

## Recommendations and thresholds

| # | Recommendation | Why |
| --- | --- | --- |
| 1 | Page the job-card board (e.g. active jobs first, `limit` 100–200) and compute overview counts on the server | Removes the remaining unbounded payload; overview metrics currently count rows client-side |
| 2 | Add a `limit` (e.g. 50) and paging to `GET /api/customers` | An empty search returns every customer |
| 3 | When a tenant passes ~50,000 customers, add a `pg_trgm` GIN index for name/email/phone search | `ILIKE '%q%'` scans the table (needs a migration) |
| 4 | Re-run this baseline against `next start` once a test login exists for production builds | Dev mode inflates absolute latency |

Proposed thresholds for future runs (10 concurrent users, this dataset): **p95 < 500 ms per endpoint, error rate < 1%, no single response > 1 MB**.

## How to reproduce

```bash
# 1. Throwaway database (never point this at a shared database)
docker run -d --name blaze-perf-db -e POSTGRES_USER=blaze -e POSTGRES_PASSWORD=blaze -e POSTGRES_DB=blaze_perf \
  -p 55432:5432 postgres:16-alpine -c shared_preload_libraries=pg_stat_statements
# 2. Tables, then extension, then data (from apps/web)
DATABASE_URL=postgres://blaze:blaze@localhost:55432/blaze_perf npx drizzle-kit push --force
docker exec blaze-perf-db psql -U blaze -d blaze_perf -c "create extension pg_stat_statements"
docker exec -i blaze-perf-db psql -U blaze -d blaze_perf < ../../perf/seed.sql
# 3. App on the perf data, tenant = workshop A
DATABASE_URL=postgres://blaze:blaze@localhost:55432/blaze_perf MOCK_TENANT_ID=00000000-0000-4000-8000-0000000000a1 npx next dev --turbo -p 3100
# 4. Load (repo root)
docker run --rm -i -e BASE_URL=http://host.docker.internal:3100 -e VUS=10 -e DURATION=2m grafana/k6 run - < perf/load.js
# 5. Slowest queries
docker exec blaze-perf-db psql -U blaze -d blaze_perf -c "select calls, mean_exec_time, left(query, 80) from pg_stat_statements order by total_exec_time desc limit 10"
# 6. Clean up
docker rm -f blaze-perf-db
```

Warm up each route once before measuring: the dev server compiles routes on first request.
