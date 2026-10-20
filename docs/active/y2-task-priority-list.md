# Year 2 (Y2) Task Priority List

Shareable summary of all Y2 tasks sorted by priority.

- **Source of truth:** `docs/active/21-70-intern-task-register.md`
- **Counts:** 39 Y2 tasks total — 21 × P0, 18 × P1, 0 × P2
- **Priority means launch relevance, not mandatory sequencing.**
- **Shared acceptance bar (all tasks):** demo or verified audit, tests including rejection/tenant cases, pass lint/typecheck/test/build, evidence provided, docs updated, reviewed PR linked by issue ID.

## P0 — Launch critical (21 tasks)

| ID | Task | Squad | Delivery |
|---|---|---|---|
| BD-002 | Production authentication validation | 1 Architecture & Identity | Verify real sessions, logout, expiry, provider config, deployment secrets |
| BD-003 | Tenant authorization guards | 1 Architecture & Identity | Enforce server-side tenant membership + denial tests on protected resources |
| BD-004 | Role permission matrix | 1 Architecture & Identity | Specify and test permissions for customer, station, supplier, platform roles |
| BD-005 | Drizzle schema & migration audit | 1 Architecture & Identity | Audit schema, migration integrity, keys, indexes, cross-tenant constraints |
| BD-015 | Job card persistence | 3 Diagnostics & Job Cards | Tenant-scoped creation and retrieval |
| BD-016 | Job lifecycle status model | 3 Diagnostics & Job Cards | Enforce valid state transitions with audit events |
| BD-022 | Quote draft persistence | 4 Quotes & Invoices | Quote builder persistence + status transitions |
| BD-023 | Quote revisions | 4 Quotes & Invoices | Immutable sent versions and revision history |
| BD-025 | Tax pricing & rounding tests | 4 Quotes & Invoices | Verify decimals, VAT, discounts, totals |
| BD-027 | Invoice issuance & numbering | 4 Quotes & Invoices | Transactional, unique, tenant-scoped numbering |
| BD-031 | Parts request persistence | 5 Parts & Suppliers | Save and authorize supplier parts requests |
| BD-043 | Tenant management | 7 SaaS Platform | Guarded tenant lifecycle operations |
| BD-057 | Application threat model | 9 Cybersecurity Assurance | Model assets, threat boundaries, mitigations |
| BD-058 | Cross-tenant negative tests | 9 Cybersecurity Assurance | Authorization tests with independent tenant fixtures |
| BD-059 | Session security suite | 9 Cybersecurity Assurance | Test auth expiration + CSRF mitigations |
| BD-060 | API authorization & validation audit | 9 Cybersecurity Assurance | Inspect IDOR/BOLA, reject unauthorized queries |
| BD-062 | Private uploads & data exposure | 9 Cybersecurity Assurance | Test files + customer vs internal data segregation |
| BD-064 | CI quality gates | 10 Cloud & Release | Mandatory clean install, lint, typecheck, unit, build checks |
| BD-066 | Browser end-to-end tests | 10 Cloud & Release | Representative journeys for each portal |
| BD-068 | Staging deployment automation | 10 Cloud & Release | Secure, reproducible staging deployment checks |
| BD-069 | Automated migration safety gates | 10 Cloud & Release | Disposable-DB migration tests, rollback rehearsal, approval before promotion |

## P1 — Important (18 tasks)

| ID | Task | Squad | Delivery |
|---|---|---|---|
| BD-008 | Station dashboard metrics | 2 Workshop & Vehicles | Tenant-scoped live dashboard data |
| BD-010 | Customer profile persistence | 2 Workshop & Vehicles | Authorized detail and editing service |
| BD-012 | Vehicle service history | 2 Workshop & Vehicles | Authorized vehicle history + relevant records |
| BD-014 | Workshop staffing interface | 2 Workshop & Vehicles | Secure staff assignment and workload selection |
| BD-019 | Diagnostic evidence attachments | 3 Diagnostics & Job Cards | Authorized private file upload/download |
| BD-020 | Labour tracking & technician notes | 3 Diagnostics & Job Cards | Record durations + role-protected notes |
| BD-028 | Payment events & invoice states | 4 Quotes & Invoices | Manual payments, balances, corrections |
| BD-030 | Vehicle fitment logic | 5 Parts & Suppliers | Confidence levels, filtering, logged manual override |
| BD-033 | Supplier offer comparison | 5 Parts & Suppliers | Normalize supplier offers for comparison |
| BD-034 | Purchase order lifecycle | 5 Parts & Suppliers | Order changes + audit history |
| BD-037 | Customer service history | 6 Customer Communications | Authorized historic jobs and documents |
| BD-039 | Persistent messaging threads | 6 Customer Communications | Private messages + unread state |
| BD-041 | Email notification adapter | 6 Customer Communications | Templates, retries, delivery logs |
| BD-045 | Subscriptions & entitlements | 7 SaaS Platform | Persist and enforce plan limits |
| BD-046 | Tenant feature flag administration | 7 SaaS Platform | Auditable flags with safe defaults |
| BD-048 | Usage analytics | 7 SaaS Platform | Tenant-safe aggregated usage reports |
| BD-055 | WCAG 2.2 AA remediation | 8 UX & Accessibility | Accessibility tests + fix critical issues |
| BD-067 | Performance & load validation | 10 Cloud & Release | Baseline response and DB performance |

## Assignment notes

- Squads 1, 9 and 10 carry the heaviest P0 load (security/identity + release gates) — assign those first.
- Squad 8 (UX) has only one Y2 task (BD-055); the rest of that squad is Y1.
- No Y2 task carries P2.
