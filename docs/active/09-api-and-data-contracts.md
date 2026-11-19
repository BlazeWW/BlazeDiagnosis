# API and Data Contracts

## Standard response envelope

Success:

```ts
{
  success: true,
  data: unknown,
  meta?: Record<string, unknown>
}
```

Failure:

```ts
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: unknown
  }
}
```

## API rules

- [ ] Use plural resource names for canonical routes.
- [ ] Keep compatibility aliases temporary and documented.
- [ ] Validate request body/query params with Zod.
- [ ] Resolve tenant context server-side.
- [ ] Never trust client-supplied `tenantId`.
- [ ] Return the standard response envelope.
- [ ] Avoid leaking internal stack traces.
- [ ] Add request IDs to logs.
- [x] **Reject cross-tenant job card references in parts requests (BD-031).**
- [x] **Validate parts request item quantities must be > 0 (BD-031).**

## Cross-tenant test coverage (BD-058)

| Endpoint | Cross-tenant GET | Cross-tenant PATCH | Cross-tenant DELETE | Positive control |
|---|---|---|---|---|
| `/api/customers/[id]` | ✅ | ✅ | ✅ | ✅ |
| `/api/vehicles/[id]` | ✅ | ✅ | ✅ | ✅ |
| `/api/quotes/[id]` | — (route not implemented) | — | — | — |
| `/api/invoices/[id]` | — (route not implemented) | — | — | — |
| `/api/parts-requests/[id]` | — (route not implemented) | — | — | — |

Tests: `apps/web/src/test/cross-tenant-negative.test.ts`.
Scope note: Quote, invoice, and parts-request `[id]` routes do not yet exist in `main`. Cross-tenant tests will be added when those routes are implemented.

## Canonical routes to keep

- [ ] `/api/customers`
- [ ] `/api/customers/[id]`
- [ ] `/api/vehicles`
- [ ] `/api/vehicles/[id]`
- [ ] `/api/customer-intakes`
- [ ] `/api/quotes`
- [ ] `/api/parts-requests`
- [ ] `/api/supplier-responses`
- [ ] `/api/tenant-branding`
- [ ] `/api/job-cards/[id]/work`
- [ ] `/api/job-cards/[id]/labour`
- [ ] `/api/job-cards/[id]/labour/[entryId]`
- [ ] `/api/job-cards/[id]/notes`

## Temporary aliases to remove later

- [ ] `/api/vehicle`
- [ ] `/api/vehicle/[id]`
- [ ] `/api/parts-request`
- [ ] `/api/supplier-response`

## Data contract documentation required

- [ ] Customer DTO.
- [ ] Vehicle DTO.
- [ ] Customer intake DTO.
- [ ] Job card DTO.
- [ ] Quote DTO.
- [ ] Quote line item DTO.
- [ ] Quote approval DTO.
- [ ] Invoice DTO.
- [x] Parts request DTO (Validated in `createPartsRequestDraft`).
- [ ] Supplier response DTO.
- [ ] Tenant branding DTO.
- [ ] Audit event DTO.

## Money, VAT and rounding rules

_Added for BD-025 (#117). Status: these rules follow the assumptions stated in PR #166 and are
pending product-lead confirmation._

- **One implementation.** All quote and invoice totals are calculated by
  `apps/web/src/lib/money/cents.ts`. Do not calculate money anywhere else.
- **Units.** Amounts are calculated in whole cents (integers), never in floating-point rand.
  Quantities may have two decimals (for example 1.5 labour hours). Tax rates are percentages
  with up to two decimals (15 means 15%).
- **Prices.** Unit prices exclude VAT. VAT-inclusive pricing is not supported yet (pending a
  product decision).
- **Discounts.** A line discount is a rand amount, capped at the line subtotal. VAT is charged
  after the discount.
- **VAT.** Each line has its own VAT rate; the default is `DEFAULT_VAT_RATE` (15). VAT is
  rounded per line. If VAT should instead be rounded once on the document total, only
  `calculateDocumentTotals` changes.
- **Rounding.** Half a cent rounds up (half-up), using integer arithmetic only.
- **Invalid input.** Missing, invalid or negative values count as 0. Amounts too large to
  calculate exactly throw a `RangeError` instead of losing cents.
- **Storage.** Amounts are saved as `numeric(12,2)` strings produced by `centsToString`
  (for example `'218.50'`). The maximum is R9,999,999,999.99.
- **Quote line totals.** A saved quote line's `total` is the amount after discount, excluding
  VAT. New quote lines are saved with `DEFAULT_VAT_RATE`.
- **Approvals.** Invoices include only `approved` and `not_required` lines. Whether a quote's
  saved total should drop when a line is declined is pending a product decision.
- **Never** use `* 0.15`, `toFixed` or `Math.round` on rand amounts in new code. Use the
  functions in `cents.ts`.

## Labour tracking and technician notes (BD-020)

Table `job_labour_entries` (schema in `db/schema/jobs.ts`; **migration pending lead approval**).

| Route | Method | Permission | Notes |
| --- | --- | --- | --- |
| `/api/job-cards/[id]/work` | GET | `jobs.read` | Labour entries + notes. Staff vs customer view decided from the session role. |
| `/api/job-cards/[id]/labour` | POST | `jobs.update_status` | Log time: `technicianId`, `startedAt`, `endedAt` (ISO), optional `note`, `visibility` (default `internal`). |
| `/api/job-cards/[id]/labour/[entryId]` | PATCH | `jobs.update_status` | Correct an entry; `reason` required plus at least one changed field. |
| `/api/job-cards/[id]/notes` | POST | `jobs.add_internal_note` / `jobs.add_customer_note` | `body`, `visibility` (default `internal`). |

Rules:

- Job card and technician (`mechanic` role) must belong to the session tenant: 404 / 422 otherwise.
- `endedAt` must be at least one minute after `startedAt` (422); minutes are calculated on the server.
- A technician cannot have overlapping time across job cards (409). Checked in code; add a Postgres exclusion constraint with the migration to also stop simultaneous saves.
- Corrections update the row in place. `audit_logs` (`job_card.labour_corrected`) keeps the previous values, new values and the reason. This is the correction history.
- Customers only receive items marked `customer` on their own job card. No internal notes, internal labour or technician ids (`jobWorkSerializers.ts`). Other non-staff users get 403.
- The audit actor is stored in `newValue.actor` (Auth0 id + email) until Auth0 ids are linked to `users`.
