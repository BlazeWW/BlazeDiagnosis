# BlazeDiagnosis — Intern issue documentation and start-here index

**Prepared:** 2026-11-03  
**Coverage:** BD-001 through BD-070 (70 existing GitHub issues, #93–#162).  
**Purpose:** Replace vague instructions with a task-specific path to implementation, testing and supervisor review.

## How an intern should begin

1. Open the **individual issue** in GitHub. Verify the assignee, priority and current comment history; avoid duplicating work already merged.
2. Open the **matching BD guide** below. The guide identifies source files that were present in the inspected `main` tree, concrete steps, verification scenarios and expected evidence.
3. Read the **live code**, not just a checklist. The docs reflect a starting snapshot and do not certify which functionality is complete.
4. Run the verified project commands from the repository root. Configure a **disposable development database**, never use production credentials or data.
5. Create a narrow feature branch, write reproducible tests/evidence, open a PR and request independent review. Use the exact BD number in branch and PR.

## Existing central documents (all present in the reviewed repository)

- [Coding rules — AGENTS.md](../../AGENTS.md)
- [Current application state](./13-current-application-state.md)
- [Forward development plan](./14-forward-development-plan.md)
- [Page readiness matrix](./16-page-readiness-matrix.md)
- [API and data contracts](./09-api-and-data-contracts.md)
- [Test baseline and quality plan](./18-test-baseline-and-quality-plan.md)
- [70-task register](./21-70-intern-task-register.md)
- [Existing expectations guide](./25-issue-expectations-y1-y2-se1-se2.md)
- [Cloud migration safety requirements](./22-cloud-migration-quality-gate.md)
- [Release and assessment](./23-release-and-assessment.md)

**Missing or inaccessible links:** The current issues previously referred to the central register using an unlinked path, which is easy to miss. These guides use navigable relative links or direct GitHub file links. If a link still fails, check that the documentation PR is merged into `main`, that you are on the expected branch, and that your GitHub account has repository access. Source modules may change after this snapshot; record renamed/missing files in the issue instead of inventing replacements.

## Issue-specific briefs

### Architecture and Identity (7 assignments)

| Issue | Level | Priority | Direct guide |
|---|---|---|---|
| [#93 — BD-001: Route and feature inventory](https://github.com/BlazeWW/BlazeDiagnosis/issues/93) | Y1 | P1 | [Open BD-001 brief](./issue-guides/BD-001.md) |
| [#94 — BD-002: Production authentication validation](https://github.com/BlazeWW/BlazeDiagnosis/issues/94) | Y2 | P0 | [Open BD-002 brief](./issue-guides/BD-002.md) |
| [#95 — BD-003: Tenant authorization guards](https://github.com/BlazeWW/BlazeDiagnosis/issues/95) | Y2 | P0 | [Open BD-003 brief](./issue-guides/BD-003.md) |
| [#96 — BD-004: Role permission matrix](https://github.com/BlazeWW/BlazeDiagnosis/issues/96) | Y2 | P0 | [Open BD-004 brief](./issue-guides/BD-004.md) |
| [#97 — BD-005: Drizzle schema and migration audit](https://github.com/BlazeWW/BlazeDiagnosis/issues/97) | Y2 | P0 | [Open BD-005 brief](./issue-guides/BD-005.md) |
| [#98 — BD-006: API response and Zod consistency](https://github.com/BlazeWW/BlazeDiagnosis/issues/98) | Y1 | P1 | [Open BD-006 brief](./issue-guides/BD-006.md) |
| [#99 — BD-007: Reusable typed contracts and fixtures](https://github.com/BlazeWW/BlazeDiagnosis/issues/99) | Y1 | P1 | [Open BD-007 brief](./issue-guides/BD-007.md) |

### Workshop and Vehicles (7 assignments)

| Issue | Level | Priority | Direct guide |
|---|---|---|---|
| [#100 — BD-008: Station dashboard metrics](https://github.com/BlazeWW/BlazeDiagnosis/issues/100) | Y2 | P1 | [Open BD-008 brief](./issue-guides/BD-008.md) |
| [#101 — BD-009: Customer registration wizard UX](https://github.com/BlazeWW/BlazeDiagnosis/issues/101) | Y1 | P1 | [Open BD-009 brief](./issue-guides/BD-009.md) |
| [#102 — BD-010: Customer profile persistence](https://github.com/BlazeWW/BlazeDiagnosis/issues/102) | Y2 | P1 | [Open BD-010 brief](./issue-guides/BD-010.md) |
| [#103 — BD-011: Vehicle registration wizard](https://github.com/BlazeWW/BlazeDiagnosis/issues/103) | Y1 | P1 | [Open BD-011 brief](./issue-guides/BD-011.md) |
| [#104 — BD-012: Vehicle service history](https://github.com/BlazeWW/BlazeDiagnosis/issues/104) | Y2 | P1 | [Open BD-012 brief](./issue-guides/BD-012.md) |
| [#105 — BD-013: Customer and vehicle search](https://github.com/BlazeWW/BlazeDiagnosis/issues/105) | Y1 | P1 | [Open BD-013 brief](./issue-guides/BD-013.md) |
| [#106 — BD-014: Workshop staffing interface](https://github.com/BlazeWW/BlazeDiagnosis/issues/106) | Y2 | P1 | [Open BD-014 brief](./issue-guides/BD-014.md) |

### Diagnostics and Job Cards (7 assignments)

| Issue | Level | Priority | Direct guide |
|---|---|---|---|
| [#107 — BD-015: Job card persistence](https://github.com/BlazeWW/BlazeDiagnosis/issues/107) | Y2 | P0 | [Open BD-015 brief](./issue-guides/BD-015.md) |
| [#108 — BD-016: Job lifecycle status model](https://github.com/BlazeWW/BlazeDiagnosis/issues/108) | Y2 | P0 | [Open BD-016 brief](./issue-guides/BD-016.md) |
| [#109 — BD-017: Digital inspection checklist](https://github.com/BlazeWW/BlazeDiagnosis/issues/109) | Y1 | P1 | [Open BD-017 brief](./issue-guides/BD-017.md) |
| [#110 — BD-018: Defect severity classification](https://github.com/BlazeWW/BlazeDiagnosis/issues/110) | Y1 | P1 | [Open BD-018 brief](./issue-guides/BD-018.md) |
| [#111 — BD-019: Diagnostic evidence attachments](https://github.com/BlazeWW/BlazeDiagnosis/issues/111) | Y2 | P1 | [Open BD-019 brief](./issue-guides/BD-019.md) |
| [#112 — BD-020: Labour tracking and technician notes](https://github.com/BlazeWW/BlazeDiagnosis/issues/112) | Y2 | P1 | [Open BD-020 brief](./issue-guides/BD-020.md) |
| [#113 — BD-021: Customer inspection report](https://github.com/BlazeWW/BlazeDiagnosis/issues/113) | Y1 | P1 | [Open BD-021 brief](./issue-guides/BD-021.md) |

### Quotes and Invoices (7 assignments)

| Issue | Level | Priority | Direct guide |
|---|---|---|---|
| [#114 — BD-022: Quote draft persistence](https://github.com/BlazeWW/BlazeDiagnosis/issues/114) | Y2 | P0 | [Open BD-022 brief](./issue-guides/BD-022.md) |
| [#115 — BD-023: Quote revisions](https://github.com/BlazeWW/BlazeDiagnosis/issues/115) | Y2 | P0 | [Open BD-023 brief](./issue-guides/BD-023.md) |
| [#116 — BD-024: Mobile item-level approvals](https://github.com/BlazeWW/BlazeDiagnosis/issues/116) | Y1 | P0 | [Open BD-024 brief](./issue-guides/BD-024.md) |
| [#117 — BD-025: Tax pricing and rounding tests](https://github.com/BlazeWW/BlazeDiagnosis/issues/117) | Y2 | P0 | [Open BD-025 brief](./issue-guides/BD-025.md) |
| [#118 — BD-026: Branded quote PDF](https://github.com/BlazeWW/BlazeDiagnosis/issues/118) | Y1 | P1 | [Open BD-026 brief](./issue-guides/BD-026.md) |
| [#119 — BD-027: Invoice issuance and numbering](https://github.com/BlazeWW/BlazeDiagnosis/issues/119) | Y2 | P0 | [Open BD-027 brief](./issue-guides/BD-027.md) |
| [#120 — BD-028: Payment events and invoice states](https://github.com/BlazeWW/BlazeDiagnosis/issues/120) | Y2 | P1 | [Open BD-028 brief](./issue-guides/BD-028.md) |

### Parts and Suppliers (7 assignments)

| Issue | Level | Priority | Direct guide |
|---|---|---|---|
| [#121 — BD-029: Parts catalogue search](https://github.com/BlazeWW/BlazeDiagnosis/issues/121) | Y1 | P1 | [Open BD-029 brief](./issue-guides/BD-029.md) |
| [#122 — BD-030: Vehicle fitment logic](https://github.com/BlazeWW/BlazeDiagnosis/issues/122) | Y2 | P1 | [Open BD-030 brief](./issue-guides/BD-030.md) |
| [#123 — BD-031: Parts request persistence](https://github.com/BlazeWW/BlazeDiagnosis/issues/123) | Y2 | P0 | [Open BD-031 brief](./issue-guides/BD-031.md) |
| [#124 — BD-032: Supplier quote response UI](https://github.com/BlazeWW/BlazeDiagnosis/issues/124) | Y1 | P1 | [Open BD-032 brief](./issue-guides/BD-032.md) |
| [#125 — BD-033: Supplier offer comparison](https://github.com/BlazeWW/BlazeDiagnosis/issues/125) | Y2 | P1 | [Open BD-033 brief](./issue-guides/BD-033.md) |
| [#126 — BD-034: Purchase order lifecycle](https://github.com/BlazeWW/BlazeDiagnosis/issues/126) | Y2 | P1 | [Open BD-034 brief](./issue-guides/BD-034.md) |
| [#127 — BD-035: Delivery and receipt tracking](https://github.com/BlazeWW/BlazeDiagnosis/issues/127) | Y1 | P1 | [Open BD-035 brief](./issue-guides/BD-035.md) |

### Customer Communications (7 assignments)

| Issue | Level | Priority | Direct guide |
|---|---|---|---|
| [#128 — BD-036: Customer dashboard](https://github.com/BlazeWW/BlazeDiagnosis/issues/128) | Y1 | P1 | [Open BD-036 brief](./issue-guides/BD-036.md) |
| [#129 — BD-037: Customer service history](https://github.com/BlazeWW/BlazeDiagnosis/issues/129) | Y2 | P1 | [Open BD-037 brief](./issue-guides/BD-037.md) |
| [#130 — BD-038: Repair progress timeline](https://github.com/BlazeWW/BlazeDiagnosis/issues/130) | Y1 | P1 | [Open BD-038 brief](./issue-guides/BD-038.md) |
| [#131 — BD-039: Persistent messaging threads](https://github.com/BlazeWW/BlazeDiagnosis/issues/131) | Y2 | P1 | [Open BD-039 brief](./issue-guides/BD-039.md) |
| [#132 — BD-040: Notification preferences](https://github.com/BlazeWW/BlazeDiagnosis/issues/132) | Y1 | P1 | [Open BD-040 brief](./issue-guides/BD-040.md) |
| [#133 — BD-041: Email notification adapter](https://github.com/BlazeWW/BlazeDiagnosis/issues/133) | Y2 | P1 | [Open BD-041 brief](./issue-guides/BD-041.md) |
| [#134 — BD-042: Customer document centre](https://github.com/BlazeWW/BlazeDiagnosis/issues/134) | Y1 | P1 | [Open BD-042 brief](./issue-guides/BD-042.md) |

### SaaS Platform (7 assignments)

| Issue | Level | Priority | Direct guide |
|---|---|---|---|
| [#135 — BD-043: Tenant management](https://github.com/BlazeWW/BlazeDiagnosis/issues/135) | Y2 | P0 | [Open BD-043 brief](./issue-guides/BD-043.md) |
| [#136 — BD-044: Tenant onboarding](https://github.com/BlazeWW/BlazeDiagnosis/issues/136) | Y1 | P1 | [Open BD-044 brief](./issue-guides/BD-044.md) |
| [#137 — BD-045: Subscriptions and entitlements](https://github.com/BlazeWW/BlazeDiagnosis/issues/137) | Y2 | P1 | [Open BD-045 brief](./issue-guides/BD-045.md) |
| [#138 — BD-046: Tenant feature flag administration](https://github.com/BlazeWW/BlazeDiagnosis/issues/138) | Y2 | P1 | [Open BD-046 brief](./issue-guides/BD-046.md) |
| [#139 — BD-047: Workshop branding](https://github.com/BlazeWW/BlazeDiagnosis/issues/139) | Y1 | P1 | [Open BD-047 brief](./issue-guides/BD-047.md) |
| [#140 — BD-048: Usage analytics](https://github.com/BlazeWW/BlazeDiagnosis/issues/140) | Y2 | P1 | [Open BD-048 brief](./issue-guides/BD-048.md) |
| [#141 — BD-049: Audit log browser](https://github.com/BlazeWW/BlazeDiagnosis/issues/141) | Y1 | P1 | [Open BD-049 brief](./issue-guides/BD-049.md) |

### UX and Accessibility (7 assignments)

| Issue | Level | Priority | Direct guide |
|---|---|---|---|
| [#142 — BD-050: Design tokens audit](https://github.com/BlazeWW/BlazeDiagnosis/issues/142) | Y1 | P1 | [Open BD-050 brief](./issue-guides/BD-050.md) |
| [#143 — BD-051: Responsive app navigation](https://github.com/BlazeWW/BlazeDiagnosis/issues/143) | Y1 | P1 | [Open BD-051 brief](./issue-guides/BD-051.md) |
| [#144 — BD-052: Forms and validation patterns](https://github.com/BlazeWW/BlazeDiagnosis/issues/144) | Y1 | P1 | [Open BD-052 brief](./issue-guides/BD-052.md) |
| [#145 — BD-053: Loading empty and error components](https://github.com/BlazeWW/BlazeDiagnosis/issues/145) | Y1 | P1 | [Open BD-053 brief](./issue-guides/BD-053.md) |
| [#146 — BD-054: Light and dark themes](https://github.com/BlazeWW/BlazeDiagnosis/issues/146) | Y1 | P1 | [Open BD-054 brief](./issue-guides/BD-054.md) |
| [#147 — BD-055: WCAG 2.2 AA remediation](https://github.com/BlazeWW/BlazeDiagnosis/issues/147) | Y2 | P1 | [Open BD-055 brief](./issue-guides/BD-055.md) |
| [#148 — BD-056: Contextual help and onboarding](https://github.com/BlazeWW/BlazeDiagnosis/issues/148) | Y1 | P1 | [Open BD-056 brief](./issue-guides/BD-056.md) |

### Cybersecurity Assurance (7 assignments)

| Issue | Level | Priority | Direct guide |
|---|---|---|---|
| [#149 — BD-057: Application threat model](https://github.com/BlazeWW/BlazeDiagnosis/issues/149) | Y2 | P0 | [Open BD-057 brief](./issue-guides/BD-057.md) |
| [#150 — BD-058: Cross-tenant negative tests](https://github.com/BlazeWW/BlazeDiagnosis/issues/150) | Y2 | P0 | [Open BD-058 brief](./issue-guides/BD-058.md) |
| [#151 — BD-059: Session security suite](https://github.com/BlazeWW/BlazeDiagnosis/issues/151) | Y2 | P0 | [Open BD-059 brief](./issue-guides/BD-059.md) |
| [#152 — BD-060: API authorization and validation audit](https://github.com/BlazeWW/BlazeDiagnosis/issues/152) | Y2 | P0 | [Open BD-060 brief](./issue-guides/BD-060.md) |
| [#153 — BD-061: Dependency and secrets audit](https://github.com/BlazeWW/BlazeDiagnosis/issues/153) | Y1 | P1 | [Open BD-061 brief](./issue-guides/BD-061.md) |
| [#154 — BD-062: Private uploads and data exposure](https://github.com/BlazeWW/BlazeDiagnosis/issues/154) | Y2 | P0 | [Open BD-062 brief](./issue-guides/BD-062.md) |
| [#155 — BD-063: Privacy and retention assessment](https://github.com/BlazeWW/BlazeDiagnosis/issues/155) | Y1 | P1 | [Open BD-063 brief](./issue-guides/BD-063.md) |

### Cloud Architecture and Release (7 assignments)

| Issue | Level | Priority | Direct guide |
|---|---|---|---|
| [#156 — BD-064: Continuous integration quality gates](https://github.com/BlazeWW/BlazeDiagnosis/issues/156) | Y2 | P0 | [Open BD-064 brief](./issue-guides/BD-064.md) |
| [#157 — BD-065: Local PostgreSQL reproducibility](https://github.com/BlazeWW/BlazeDiagnosis/issues/157) | Y1 | P1 | [Open BD-065 brief](./issue-guides/BD-065.md) |
| [#158 — BD-066: Browser end-to-end tests](https://github.com/BlazeWW/BlazeDiagnosis/issues/158) | Y2 | P0 | [Open BD-066 brief](./issue-guides/BD-066.md) |
| [#159 — BD-067: Performance and load validation](https://github.com/BlazeWW/BlazeDiagnosis/issues/159) | Y2 | P1 | [Open BD-067 brief](./issue-guides/BD-067.md) |
| [#160 — BD-068: Staging deployment automation](https://github.com/BlazeWW/BlazeDiagnosis/issues/160) | Y2 | P0 | [Open BD-068 brief](./issue-guides/BD-068.md) |
| [#161 — BD-069: Automated migration safety gates](https://github.com/BlazeWW/BlazeDiagnosis/issues/161) | Y2 | P0 | [Open BD-069 brief](./issue-guides/BD-069.md) |
| [#162 — BD-070: Release acceptance and operations pack](https://github.com/BlazeWW/BlazeDiagnosis/issues/162) | Y1 | P1 | [Open BD-070 brief](./issue-guides/BD-070.md) |

## Definition of done for a student

A task is not complete because the PR exists. It is complete when its specific behavior or assessment has been demonstrated, its relevant positive/negative tests have run, its docs are accurate, and an independent reviewer has approved it. Use the release checklist to distinguish student completion from production authorization.

## For team leads

The 70 issues do not automatically correspond to 70 confirmed named contributors. Assign ownership separately and reconcile outdated issues. Do not automatically close an issue or change existing labels, assignees or milestones when adding guidance. Formal production release follows the documented security, tenancy, migration and recovery gates.
