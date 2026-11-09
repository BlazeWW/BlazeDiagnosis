# Feature Implementation Checklists

## Tenant branding

- [ ] Persist tenant branding to database.
- [ ] Support logo upload instead of URL-only input.
- [ ] Apply tenant colors to app shell.
- [ ] Apply tenant colors to customer portal.
- [ ] Apply tenant colors to quote preview.
- [ ] Apply tenant colors to invoice preview.
- [ ] Add contrast validation for selected colors.
- [ ] Add branding preview before save.
- [ ] Add audit log for branding changes.

## Customer and vehicle wizard

- [ ] Persist customer details.
- [ ] Persist vehicle details.
- [ ] Link customer and vehicle.
- [ ] Add duplicate detection for phone, email, VIN, and registration.
- [ ] Add optional registration/VIN lookup provider.
- [ ] Add review step before save.
- [ ] Add success page with next actions.
- [ ] Add automated audit event.
- [ ] Add tests.

## Job cards

- [ ] Create service request.
- [ ] Convert service request to job card.
- [ ] Assign mechanic.
- [ ] Assign floor manager.
- [ ] Add intake inspection.
- [ ] Add internal notes.
- [ ] Add customer-visible notes.
- [ ] Add diagnostics.
- [ ] Add status timeline.
- [ ] Add audit events.

## Quote builder

- [ ] Persist quote draft.
- [ ] Add line items.
- [ ] Edit line items.
- [ ] Delete line items.
- [ ] Duplicate line items.
- [ ] Categorize items as parts, labor, diagnostics, consumables, optional service.
- [ ] Mark items required, recommended, or optional.
- [ ] Calculate subtotal, tax, discount, and total.
- [ ] Add customer-visible notes.
- [ ] Send quote to customer.
- [ ] Lock sent quote version.
- [ ] Add approval history.
- [ ] Add quote PDF generation.

## Customer approval

- [ ] Mobile-first approval page.
- [ ] Approve line item.
- [ ] Decline line item.
- [ ] Capture rejection reason.
- [ ] Recalculate labor dependencies.
- [ ] Show final total before confirmation.
- [ ] Record IP/user-agent where appropriate.
- [ ] Add audit log.
- [ ] Notify station staff.

## Invoices

- [ ] Generate invoice from approved quote items only.
- [ ] Support partial invoice.
- [ ] Support final invoice.
- [ ] Calculate tax and discount.
- [ ] Add manual payment recording.
- [ ] Add invoice PDF generation.
- [ ] Add customer invoice history.
- [ ] Add station invoice history.
- [ ] Audit invoice changes.

## Parts and suppliers

- [ ] Create parts request from job card.
- [ ] Send request to suppliers.
- [ ] Supplier response with price, availability, ETA, and notes.
- [ ] Compare supplier responses.
- [ ] Approve supplier response.
- [x] Create parts order. Creation, cancellation, partial fulfillment, and status changes are enforced in the purchase order service. See `docs/active/purchase-order-lifecycle.md`. The supplier orders screen still shows demo records.
- [ ] Update delivery status.
- [ ] Show relevant customer delay status.
- [ ] Add supplier performance metrics.

## Basic page surfaces now present

The following are no longer placeholder-only screens, but most still require database-backed production services:

- [x] Station invoice list page inside `AppShell`.
- [x] Station invoice detail page inside `AppShell`.
- [x] Customer vehicles page.
- [x] Customer services page.
- [x] Customer quotes page.
- [x] Customer messages page.
- [x] Station job cards page.
- [x] Station parts page.
- [x] Station reports page.
- [x] Supplier requests page.
- [x] Supplier quotes page.
- [x] Supplier orders page.
- [x] Supplier deliveries page.
- [x] Supplier messages page.
- [x] Platform tenants page.
- [x] Platform subscriptions page.
- [x] Platform feature flags page.
- [x] Platform usage page.

Next work for these pages is tracked in `16-page-readiness-matrix.md`.
