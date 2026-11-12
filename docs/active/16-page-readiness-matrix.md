# Page Readiness Matrix

_Last updated: 2026-07-01_

## Purpose

Track which pages are present, which are demo-safe only, and what must happen before they can be treated as production-ready.

## Readiness legend

- `Present` - page exists and renders a basic surface.
- `Demo data` - page uses sample/static/local data and needs production services.
- `Needs persistence` - page needs database-backed reads/mutations.
- `Needs auth` - page needs real role/tenant guards.
- `Production candidate` - page can enter final QA after tests and review.

## Customer pages

| Page | Current state | Next required work |
|---|---|---|
| `/[locale]/customer` | Present | Connect to authenticated customer dashboard service. |
| `/[locale]/customer/vehicles` | Present, demo data | Load customer vehicles by authenticated customer. |
| `/[locale]/customer/services` | Present, demo data | Load active and historical service jobs. |
| `/[locale]/customer/quotes` | Present, demo data | Load active quotes and approval status. |
| `/[locale]/customer/invoices` | Present | Confirm API/data consistency and tenant/customer authorization. |
| `/[locale]/customer/invoices/[id]` | Present | Confirm invoice ownership guard and PDF/download flow. |
| `/[locale]/customer/messages` | Present, demo data | Connect to chat threads and notifications. |

## Station pages

| Page | Current state | Next required work |
|---|---|---|
| `/[locale]/station` | Present | Replace metrics with tenant-aware dashboard queries. |
| `/[locale]/station/customers` | Present | Confirm pagination, search, duplicate warnings, and API contract. |
| `/[locale]/station/customers/new` | Present | Persist customer + vehicle wizard to production services. |
| `/[locale]/station/customers/[id]` | Present after build fix | Connect detail components to production customer service and guard access. |
| `/[locale]/station/vehicles` | Present | Confirm vehicle search and filter UX. |
| `/[locale]/station/vehicles/[id]` | Present after build fix | Connect detail components to production vehicle service and guard access. |
| `/[locale]/station/job-cards` | Present, demo data; tenant-scoped create/list/detail API available, not UI-integrated | Integrate the API; status changes, assignment, and timeline remain separate workflow work. |
| `/[locale]/station/quotes` | Present | Standardize quote list and connect to database. |
| `/[locale]/station/quotes/new` | Present | Persist quote builder, revisions, and customer send flow. |
| `/[locale]/station/invoices` | Present, layout refined | Connect metrics/register to invoice services and payment state. |
| `/[locale]/station/invoices/[id]` | Present, layout refined | Connect actions to invoice services and branded document generation. |
| `/[locale]/station/parts` | Present, demo data | Implement parts requests, supplier comparison, and order status. |
| `/[locale]/station/reports` | Present, demo data | Build report query services and export options. |
| `/[locale]/station/settings/branding` | Present | Persist branding to database and add logo upload. |
| `/[locale]/station/showcase` | Demo page | Gate behind development flag or remove before production. |

## Supplier pages

| Page | Current state | Next required work |
|---|---|---|
| `/[locale]/supplier` | Present | Connect dashboard metrics to supplier account context. |
| `/[locale]/supplier/requests` | Present, demo data | Load supplier-specific parts requests and add response mutation. |
| `/[locale]/supplier/quotes` | Present, demo data | Persist supplier quotes and response history. |
| `/[locale]/supplier/orders` | Present, demo data | Implement supplier order status updates. |
| `/[locale]/supplier/deliveries` | Present, demo data | Implement ETA, delay, dispatch, and delivery confirmation updates. |
| `/[locale]/supplier/messages` | Present, demo data | Connect to supplier chat threads. |

## Platform pages

| Page | Current state | Next required work |
|---|---|---|
| `/[locale]/platform` | Present | Connect to platform metrics and guard platform-only access. |
| `/[locale]/platform/tenants` | Present, demo data | Implement tenant list, create, suspend, activate, and detail actions. |
| `/[locale]/platform/subscriptions` | Present, demo data | Implement subscription state and plan mapping. |
| `/[locale]/platform/feature-flags` | Present, demo data | Persist tenant feature flags. |
| `/[locale]/platform/usage` | Present, demo data | Build usage metrics pipeline. |
| `/[locale]/platform/audit-logs` | Present | Confirm audit query, filters, and platform access guard. |

## Page production checklist

Every page must satisfy this before release:

- [ ] Uses approved layout.
- [ ] Uses semantic theme tokens.
- [ ] Has mobile/tablet/desktop responsive behavior.
- [ ] Has empty/loading/error/success states.
- [ ] Uses centralized shared types.
- [ ] Calls services or APIs through standardized contracts.
- [ ] Resolves tenant/user access server-side.
- [ ] Does not expose internal data to customer or supplier roles.
- [ ] Has test coverage for the main workflow.
- [ ] Has documentation updated.
