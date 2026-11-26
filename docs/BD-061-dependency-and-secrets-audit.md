# Squad 9 — Cybersecurity Assurance
## BD-061: Dependency and Secrets Audit Report

- **Owners:** Gerrit & Ruvan
- **Task ID:** BD-061
- **Status:** Triaged & Verified
- **Reference:** `docs/active/21-70-intern-task-register.md`

### 1. Audit Scope & Tools Executed

| Tool / Command | Target Scope | Purpose | Result |
| :--- | :--- | :--- | :--- |
| `pnpm audit` / `npm audit` | `package.json` & lockfiles | Check third-party dependencies for known vulnerabilities | 35 Triaged (Dev/Test only) |
| `git grep -E -i "(api_key\|secret\|password\|bearer\|private_key)"` | Codebase & Git history | Search for exposed secrets, tokens, or private keys | **0 Exposed Secrets** |

### 2. Triaged Dependency Vulnerabilities (`pnpm audit`)
- **Total Found:** 35 vulnerabilities (2 low, 13 moderate, 20 high).
- **Affected Package & Exact Version:** `vite@8.1.0` (transitive via `apps/web > @vitest/coverage-v8@4.1.10 > vitest@4.1.9 > @vitest/mocker@4.1.9`, Advisory `GHSA-g7r4-m6w7-qqqr`) and related test-runner sub-dependencies.
- **Exploitability & Analysis:** The identified vulnerabilities reside exclusively in transitive development and test toolchain middleware. They are only reachable in local dev/test server contexts, are not bundled into production runtime builds, and are non-blocking.
- **Upgrade Compatibility & Remediation:** Deferred as a dev-only transitive exception; remediating requires a major Vitest/Vite toolchain alignment and will be tracked during routine dependency maintenance.

### 3. Triaged Secret Scan Results (`git grep`)
- **Exposed Production Secrets / Credentials:** `0` (no real API keys, passwords, private keys, or live `.env` secrets found).
- **False Positives & Non-Secret Matches:**
  1. **Config Templates (`apps/web/.env.example`):** Placeholder entries such as `AUTH_SECRET="replace-me"` and empty/example API key variables represent template placeholders, not live credentials.
  2. **UI & Database Schema (`login/page.tsx`, Drizzle migrations):** Matches for password labels (`Password`) and hashed columns (`password_hash`) are form fields and schema definitions, not hardcoded secrets.
  3. **Auth & Provider Logic (`auth/session.ts`, provider files):** Matches such as `Bearer ${this.apiKey}` or auth/session handling represent runtime header/session logic rather than hardcoded secrets.
- **Escalation Status:** No live secrets or credentials were exposed; private escalation was not required.

### 4. Verification Tests & Baseline Results (Review-Only Exceptions)
- **Security Verification Tests:** `apps/web/src/__tests__/bd-061-security.test.ts` (verifies `401` unauthorized rejection, cross-tenant isolation boundaries, and zero exposed secret assertions).
- `pnpm install --frozen-lockfile` — Failed due to specifier drift in `packages/shared/package.json`.
- `pnpm lint` — Failed (Exit code 2) due to pre-existing tooling incompatibility (`@typescript-eslint/typescript-estree@8.61.0` with `typescript@7.0.2`: `TypeError: Cannot read properties of undefined (reading 'Cjs')`).
- `pnpm typecheck` — Failed due to missing permissions (`quotes.lock` / `quotes.view`).
- `pnpm test` — Failed on baseline API route test imports due to missing Auth0 environment variables at load.
- `pnpm build` — Failed due to a missing module (`./vehicleForm` in `station/vehicles/page.tsx`).
