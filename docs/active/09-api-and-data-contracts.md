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
- [ ] Parts request DTO.
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
