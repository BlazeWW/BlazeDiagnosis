# Year 1 (Y1) Task Priority List

Shareable summary of all Y1 tasks sorted by priority.

- **Source of truth:** `docs/active/21-70-intern-task-register.md`
- **Counts:** 31 Y1 tasks total — 1 × P0, 30 × P1, 0 × P2
- **Priority means launch relevance, not mandatory sequencing.**
- **Y1 scope:** first-year tasks are bounded (per the register); Y2 tasks are more service-intensive.
- **Shared acceptance bar (all tasks):** demo or verified audit, tests including rejection/tenant cases, pass lint/typecheck/test/build, evidence provided, docs updated, reviewed PR linked by issue ID.

## P0 — Launch critical (1 task)

| ID | Task | Squad | Delivery |
|---|---|---|---|
| BD-024 | Mobile item-level approvals | 4 Quotes & Invoices | Tested customer approval UX with mock adapter |

## P1 — Important (30 tasks)

| ID | Task | Squad | Delivery |
|---|---|---|---|
| BD-001 | Route and feature inventory | 1 Architecture & Identity | Inventory active routes and architecture; reconcile contradictory readiness claims |
| BD-006 | API response & Zod consistency | 1 Architecture & Identity | Normalize validation and API envelopes without changing external contracts |
| BD-007 | Reusable typed contracts & fixtures | 1 Architecture & Identity | Publish typed DTO fixtures and mock adapters for isolated work |
| BD-009 | Customer registration wizard UX | 2 Workshop & Vehicles | Refine steps, validation and duplicate warnings |
| BD-011 | Vehicle registration wizard | 2 Workshop & Vehicles | Make/model/year flow, VIN checks and manual fallback |
| BD-013 | Customer and vehicle search | 2 Workshop & Vehicles | Sorting, filters and paginated responsive results |
| BD-017 | Digital inspection checklist | 3 Diagnostics & Job Cards | Configurable inspection inputs and tested component |
| BD-018 | Defect severity classification | 3 Diagnostics & Job Cards | Clear normal/advisory/critical presentation |
| BD-021 | Customer inspection report | 3 Diagnostics & Job Cards | Legible customer-safe before/after report |
| BD-026 | Branded quote PDF | 4 Quotes & Invoices | Deterministic branded quote documents |
| BD-029 | Parts catalogue search | 5 Parts & Suppliers | Typed reusable parts search and filters |
| BD-032 | Supplier quote response UI | 5 Parts & Suppliers | Price, ETA and alternate-parts form |
| BD-035 | Delivery and receipt tracking | 5 Parts & Suppliers | Delivery milestones and confirmation workflow |
| BD-036 | Customer dashboard | 6 Customer Communications | Relevant vehicle, quote and invoice summaries |
| BD-038 | Repair progress timeline | 6 Customer Communications | Accessible status timeline |
| BD-040 | Notification preferences | 6 Customer Communications | User notification choice component |
| BD-042 | Customer document centre | 6 Customer Communications | Permitted reports, quotes and invoice downloads |
| BD-044 | Tenant onboarding | 7 SaaS Platform | Guided setup progress experience |
| BD-047 | Workshop branding | 7 SaaS Platform | Brand settings and reliable preview |
| BD-049 | Audit log browser | 7 SaaS Platform | Restricted filters and event display |
| BD-050 | Design tokens audit | 8 UX & Accessibility | Accessible typography, spacing and colour tokens |
| BD-051 | Responsive app navigation | 8 UX & Accessibility | Portal shells for small, medium and large displays |
| BD-052 | Forms and validation patterns | 8 UX & Accessibility | Unified errors, focus and help text |
| BD-053 | Loading, empty and error components | 8 UX & Accessibility | Tested reusable state components |
| BD-054 | Light and dark themes | 8 UX & Accessibility | Theme and contrast validation across portal components |
| BD-056 | Contextual help and onboarding | 8 UX & Accessibility | In-product hints and first-run walkthroughs |
| BD-061 | Dependency and secrets audit | 9 Cybersecurity Assurance | Run and triage dependency, token and secrets scans |
| BD-063 | Privacy and retention assessment | 9 Cybersecurity Assurance | Document POPIA-related retention, access and deletion controls |
| BD-065 | Local PostgreSQL reproducibility | 10 Cloud & Release | Pinned versions and disposable DB setup |
| BD-070 | Release acceptance and operations pack | 10 Cloud & Release | Backup, restore, monitoring, incident response and sign-off |

## Assignment notes

- Squad 8 (UX) is entirely Y1 except BD-055 — the heaviest Y1 concentration is there (6 tasks).
- Only one Y1 task is P0 (BD-024, mobile approvals); everything else is P1.
- Squad 1's Y1 tasks (BD-006, BD-007) publish shared contracts/fixtures other squads depend on — despite being P1, they unblock isolated work, so sequence them early.
- No Y1 task carries P2.
