# Migration reset plan

## Goal
Prepare a safe reset path for local and shared database environments after schema churn during tenant isolation work.

## Recommended sequence
1. Capture the current migration state and confirm the latest applied revision.
2. Back up any local data that should be preserved before resetting.
3. Drop the development database, or recreate it from a known baseline if a full reset is acceptable.
4. Re-run the existing Drizzle migrations from scratch.
5. Re-seed the tenant fixtures and verify tenant-scoped access behavior.

## Operational notes
- Prefer resetting the dev database before applying new migration files when the local schema is in an inconsistent state.
- Keep the reset steps documented in the repo so contributors do not rely on ad hoc database cleanup.
- After a reset, run the tenant isolation regression tests and smoke-test a customer and vehicle read/write flow.

## Suggested commands
- `pnpm --filter @blaze-diagnostics/web db:generate`
- `pnpm --filter @blaze-diagnostics/web db:migrate`
- `pnpm --filter @blaze-diagnostics/web db:seed`
