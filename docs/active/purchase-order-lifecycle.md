# Purchase order lifecycle

Issue: [BD-034 / #126](https://github.com/BlazeWW/BlazeDiagnosis/issues/126)

A station manager creates one purchase order from a supplier response. Later changes follow the matrix below. Invalid transitions and repeated updates do not write a new status. Every successful create or change appends an `audit_logs` row with `entity_type = parts_order`.

The supplier orders page still renders demo records. The behaviour lives in the service and API so it can be reviewed without that screen.

## Actors

| Actor | Roles | Permission |
| --- | --- | --- |
| Station | `site_manager`, `floor_manager` | `parts.approve_supplier_quote` |
| Supplier | `parts_supplier` | `supplier.requests.respond` |

`customer`, `mechanic`, and `platform_admin` cannot create or change purchase orders through this API. The tenant id comes from the session. Queries include that tenant id. A body field named `tenantId` is ignored.

## Creation

`POST /api/parts-orders` with `{ "supplierResponseId": "<uuid>" }`.

- Station only.
- The supplier response and its parts request must belong to the session tenant.
- The response status must be `submitted` or `accepted`.
- The request status must be `draft`, `sent`, `response_received`, or `accepted`.
- The order stores `supplier_id` and `supplier_response_id` from that response, and `job_card_id` from the parts request.
- The first status is `pending_approval`.
- A second order for the same supplier response is rejected.
- Audit action: `parts_order.created`. The payload includes `supplierId`, `supplierResponseId`, `partsRequestId`, and `jobCardId`.

`approveSupplierResponse` uses this same create path.

## Transition matrix

`delivered` and `cancelled` have no onward transition. Moving back along pending → ordered → awaiting dispatch → dispatched → in transit → partially delivered → delivered is rejected. `delayed` is a hold: the supplier can resume from it, and a station manager can cancel it.

| From | To | Actor |
| --- | --- | --- |
| `pending_approval` | `ordered` | Station |
| `pending_approval` | `cancelled` | Station |
| `ordered` | `cancelled` | Station |
| `ordered` | `awaiting_dispatch` | Supplier |
| `awaiting_dispatch` | `cancelled` | Station |
| `awaiting_dispatch` | `dispatched` | Supplier |
| `awaiting_dispatch` | `delayed` | Supplier |
| `dispatched` | `in_transit` | Supplier |
| `dispatched` | `partially_delivered` | Supplier |
| `dispatched` | `delivered` | Supplier |
| `dispatched` | `delayed` | Supplier |
| `in_transit` | `partially_delivered` | Supplier |
| `in_transit` | `delivered` | Supplier |
| `in_transit` | `delayed` | Supplier |
| `partially_delivered` | `delivered` | Supplier |
| `partially_delivered` | `delayed` | Supplier |
| `partially_delivered` | `partially_delivered` | Supplier, only when the received quantity increases and stays below the ordered quantity |
| `delayed` | `awaiting_dispatch`, `dispatched`, `in_transit`, `partially_delivered`, or `delivered` | Supplier |
| `delayed` | `cancelled` | Station |

`POST /api/parts-orders/{id}/transitions` with `{ "status": "<status>" }`.

- The same status again is a duplicate and returns 409. The stored status stays as it was.
- A station action by a supplier, or a supplier action by a station, returns 403. The stored status stays as it was.
- The update matches the current status, so a concurrent writer does not get overwritten. No audit row is written for that rejected attempt.
- Audit action: `parts_order.status_changed`, `parts_order.cancelled`, or `parts_order.partially_fulfilled`.
- `previous_value` and `new_value` include the status and the supplier / parts-request relationship. `new_value` also includes the actor role and user id.

Partial fulfillment sends `quantityOrdered` and `quantityReceived`. The received quantity must be greater than zero and less than the ordered quantity. A full receipt uses `delivered`. Repeating the same quantities is a duplicate. A later receipt may increase the received quantity. It cannot decrease it, and it cannot change the ordered quantity.

## Read

- `GET /api/parts-orders` lists orders for the session tenant. Optional `jobCardId`.
- `GET /api/parts-orders/{id}` returns the order, the linked `partsRequestId`, and the audit history.

Both reads require a station or supplier actor in that tenant.

## Verification

```bash
pnpm --filter @blaze-diagnostics/web exec vitest run src/features/parts/services/purchaseOrderLifecycle.test.ts src/features/parts/services/purchaseOrderService.test.ts src/features/parts/services/request.test.ts src/app/api/parts-orders
```

The service tests cover an invalid transition, a duplicate update, partial fulfillment, and a station/supplier action performed by the other role. Each of those leaves the in-memory order status untouched and writes no audit row.
