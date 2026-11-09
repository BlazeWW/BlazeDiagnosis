# GitHub Issue Breakdown From Current State

_Last updated: 2026-07-01_

## Purpose

Use this file to create GitHub issues for the next production development phase. Each section can be converted into individual issues or epics.

## Labels to use

- `area:auth`
- `area:tenant`
- `area:customer`
- `area:vehicle`
- `area:job-cards`
- `area:quotes`
- `area:invoices`
- `area:parts`
- `area:supplier`
- `area:platform`
- `area:docs`
- `area:cloud`
- `area:security`
- `area:qa`
- `type:bug`
- `type:feature`
- `type:refactor`
- `type:test`
- `priority:p0`
- `priority:p1`
- `priority:p2`
- `group:software-engineering-1`
- `group:software-engineering-2`
- `group:software-development-1`
- `group:software-development-2`
- `group:cloud-administration`
- `group:cyber-security`

## P0 issues

### Build and validation

- [ ] Run clean install and log dependency warnings.
- [ ] Fix all lint errors.
- [ ] Fix all typecheck errors.
- [ ] Fix all build errors.
- [ ] Add CI for install, lint, typecheck, tests, and build.

### Auth and tenancy

- [ ] Select production auth provider.
- [ ] Replace mock session retrieval.
- [ ] Implement tenant membership lookup.
- [ ] Implement role and permission checks.
- [ ] Guard customer/station/supplier/platform route groups.
- [ ] Add cross-tenant access tests.

### Customer and vehicle

- [ ] Persist customer + vehicle wizard.
- [ ] Add duplicate detection for email, phone, registration, and VIN.
- [ ] Connect customer detail page to production service.
- [ ] Connect vehicle detail page to production service.
- [ ] Add vehicle lookup provider abstraction.

### Quotes and invoices

- [ ] Consolidate duplicate quote builder routes.
- [ ] Persist quote drafts.
- [ ] Persist quote line items.
- [ ] Add mobile customer approval flow.
- [ ] Generate invoices from approved quote items.
- [ ] Connect invoice register to production invoice query.
- [ ] Add branded quote/invoice PDF generation.

### Parts and suppliers

- [ ] Persist parts requests.
- [ ] Add supplier response mutation.
- [ ] Add supplier comparison service.
- [x] Add parts order status updates. Transition rules, partial fulfillment, and audit history are covered by `docs/active/purchase-order-lifecycle.md`. Delivery ETA updates remain open.
- [ ] Add delivery ETA/status updates.

## P1 issues

### UX and accessibility

- [ ] Add empty/loading/error states to all current pages.
- [ ] Review mobile customer approval UX.
- [ ] Review tablet workshop UX.
- [ ] Review light/dark theme across all pages.
- [ ] Add accessibility checklist results.
- [ ] Add low-technical-skill user walkthrough results.

### Reporting

- [ ] Add station dashboard metrics service.
- [ ] Add quote approval report.
- [ ] Add outstanding invoice report.
- [ ] Add delayed job report.
- [ ] Add supplier performance report.

### Documentation

- [ ] Complete route map.
- [ ] Complete API contract reference.
- [ ] Complete data dictionary.
- [ ] Complete tenant isolation design.
- [ ] Complete deployment runbook.
- [ ] Complete security threat model.

## P2 issues

- [ ] Add email notification adapter.
- [ ] Add payment links or payment gateway integration planning.
- [ ] Add CSV imports for customers, vehicles, and suppliers.
- [ ] Add TecDoc/TecAlliance fitment integration discovery spike.
- [ ] Add South African registration/VIN lookup provider discovery spike.
- [ ] Add custom domain planning.

## Issue quality checklist

Every issue should include:

- [ ] Business reason.
- [ ] User role affected.
- [ ] Route/API/service affected.
- [ ] Acceptance criteria.
- [ ] Test expectation.
- [ ] Documentation update expectation.
- [ ] Assigned intern group.
