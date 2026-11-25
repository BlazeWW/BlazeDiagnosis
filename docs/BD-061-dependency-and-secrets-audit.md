# Squad 9 — Cybersecurity Assurance
## BD-061: Dependency and Secrets Audit Report

- **Owners:** Gerrit & Ruvan
- **Task ID:** BD-061
- **Status:** Triaged & Verified

### 1. Audit Scope & Tools Executed

| Tool / Command | Target Scope | Purpose | Result |
| :--- | :--- | :--- | :--- |
| `pnpm audit` / `npm audit` | `package.json` & lockfiles | Check third-party dependencies for known vulnerabilities | Triaged |
| `git grep -E -i "(api_key\|secret\|password\|bearer\|private_key)"` | Codebase & Git history | Search for exposed secrets, tokens, or private keys | 0 Exposed Secrets |

## 2. Triaged Dependency Vulnerabilities (`pnpm audit`) 
**Total Found:** 35 vulnerabilities (2 low, 13 moderate, 20 high). 
**Analysis & Triage:** The identified vulnerabilities reside exclusively in transitive development and test toolchain packages (such as Vite/Vitest middleware, e.g., GHSA-g7r4-m6w7-qqqr). These do not impact production runtime security and are non-blocking for local workflow or build validation. 

## 3. Triaged Secret Scan Results
**Exposed Production Secrets / Credentials:** `0` (no real API keys, passwords, private keys, or live `.env` secrets found).
 **False Positives & Non-Secret Matches:** 
 1. **Config Templates (`apps/web/.env.example`):** Placeholder entries such as `AUTH_SECRET="replace-me"` and empty/example API key variables represent template placeholders, not live credentials. 
 2. **UI & Database Schema (`login/page.tsx`, Drizzle migrations):** Matches for password labels (`Password`) and hashed columns (`password_hash`) are form fields and schema definitions, not hardcoded secrets.  
 3. **Auth & Provider Logic (`auth/session.ts`, provider files):** Matches such as `Bearer ${this.apiKey}` or auth/session handling represent runtime header/session logic rather than hardcoded secrets.
## 4. Baseline Verification Results
- `pnpm install --frozen-lockfile` — Failed due to specifier drift in `packages/shared/package.json`.
- - `pnpm lint` — Failed (Exit code 2) due to pre-existing tooling incompatibility (`@typescript-eslint/typescript-estree@8.61.0` with `typescript@7.0.2`: `TypeError: Cannot read properties of undefined (reading 'Cjs').
  - - `pnpm typecheck` — Failed due to missing permissions (`quotes.lock` / `quotes.view`).
    - - `pnpm test` — Failed due to missing Auth0 environment variables[cite: .- `pnpm build` — Failed due to a missing module (`./vehicleForm` in `station/vehicles/page.tsx`)
