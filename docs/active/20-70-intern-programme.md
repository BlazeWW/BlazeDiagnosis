# Blaze Diagnostics — 70-Intern Production Completion Programme

Status: proposed replacement planning baseline (2026-10-11). Scope: complete and verify the existing multi-tenant automotive SaaS for production. Do not assume checklist completion means runtime verification.

## Source of truth and repository policy
Read `AGENTS.md`, `docs/active/13-current-application-state.md`, `14-forward-development-plan.md`, `16-page-readiness-matrix.md`, and `18-test-baseline-and-quality-plan.md` before development. This programme supersedes earlier task allocation and sequential sprint assumptions for new assignments. Existing API and coding standards continue to apply. Existing GitHub issues must be reconciled rather than duplicated.

## Staffing and accountability
70 individually assessed interns in 10 squads of seven, with mixed Y1/Y2 competence. Each numbered BD task has one owner, its own issue and PR, test evidence, documentation, and recorded review. A squad coordinator may help unblock work but does not sign off their own work. Independent technical and security reviews are required. Score: acceptance 35%, quality/tests 25%, individual evidence 20%, security/maintainability 10%, demo/handover 10%.

## Independence contract
All teams start in week 1. Publish stable DTOs, Zod schemas, route contracts, permission conventions and fixture factories. Build feature components against mocks / in-memory adapters, then connect implementations behind interfaces. Assign one migration coordinator to serialize DB migrations. No intern may rely on another student completing a feature before beginning their own deliverable. Use feature branches `feature/BD-NNN-description`, small PRs, required CI and reviews; no direct release branch commits. Hidden unfinished features use disabled feature flags. Contracts and migration changes require technical-lead approval.

## Eight-week milestone proposal
- Week 1: baseline inventory, assignment, freeze initial contracts, determine factual implementation status.
- Weeks 1–5: parallel independent implementations and tests; early continuous PR review.
- Weeks 2–7: integration, defensive security assessment, CI and staging verification.
- Weeks 5–7: end-to-end journeys, migration rehearsals, regression and operational drills.
- Weeks 7–8: UAT, high-priority fixes, evidence and independent launch authorization.
Schedule is a goal, never an exception to launch gates.

## Issue acceptance standard
Each issue must include scope, user story, existing state verified, bounded outputs, owner, difficulty, tests, negative auth/tenant case where relevant, docs, screenshot/demo or logs, and independent mocked contract/fixture. Definition of done: clean PR, lint/typecheck/build/test pass, authorized review, updated docs, no test data in production, correct visibility and tenant checks. Every sensitive mutation is validated and audited.

## Production gate
No pilot/prod launch while mock auth/tenant fallback remains, tenant isolation unproven, core workflows rely on localStorage, quote and invoice calculations lack deterministic tests, critical/high exploitable security findings remain, backups/restore unproven, migrations fail rehearsal, or required CI is red. Prove functional user journeys for customer/station/supplier/platform, responsive accessibility review, monitoring, incident and rollback runbooks, and UAT acceptance. BlazeWebWorks owns the final release decision.

## Scope control
P0/P1 existing workflows first. Defer optional AI diagnosis, native apps, OBD-II, WhatsApp, advanced analytics and automated payments unless necessary for explicitly approved launch requirements. Existing tenant onboarding and manual payment tracking are in scope; provider integrations use adapters and must have fallback.

## Documents
- `20-70-intern-programme.md` (this file)
- `21-70-intern-task-register.md` (70 individually scoped issues)
- `22-cloud-migration-quality-gate.md` (cloud architecture controls)
- `23-release-and-assessment.md` (assessment and release sign-off)
- `github-issues.csv` at package root can be imported with GitHub CLI/API by a write-authorized maintainer.
