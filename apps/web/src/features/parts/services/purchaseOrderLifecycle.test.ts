import { describe, expect, it } from 'vitest';

import type { SystemRole } from '@/lib/constants/roles';

import {
  evaluatePurchaseOrderChange,
  evaluatePurchaseOrderCreation,
  findPurchaseOrderTransition,
  partsOrderStatuses,
  purchaseOrderTransitions,
  resolvePurchaseOrderActor,
  terminalPurchaseOrderStatuses,
  type PartsOrderStatus,
} from './purchaseOrderLifecycle';

const stationRole: SystemRole = 'site_manager';
const supplierRole: SystemRole = 'parts_supplier';

describe('purchase order actors', () => {
  it('maps station and supplier roles and rejects everyone else', () => {
    expect(resolvePurchaseOrderActor('site_manager')).toBe('station');
    expect(resolvePurchaseOrderActor('floor_manager')).toBe('station');
    expect(resolvePurchaseOrderActor('parts_supplier')).toBe('supplier');
    expect(resolvePurchaseOrderActor('mechanic')).toBeNull();
    expect(resolvePurchaseOrderActor('customer')).toBeNull();
    expect(resolvePurchaseOrderActor('platform_admin')).toBeNull();
    expect(resolvePurchaseOrderActor(null)).toBeNull();
  });
});

describe('purchase order transition matrix', () => {
  it('keeps delivered and cancelled terminal', () => {
    for (const status of terminalPurchaseOrderStatuses) {
      expect(
        purchaseOrderTransitions.filter(
          (transition) => transition.from === status,
        ),
      ).toEqual([]);
    }
  });

  it('does not move backward along the forward path', () => {
    const rank: Partial<Record<PartsOrderStatus, number>> = {
      awaiting_dispatch: 2,
      dispatched: 3,
      in_transit: 4,
      ordered: 1,
      partially_delivered: 5,
      pending_approval: 0,
      delivered: 6,
    };

    for (const transition of purchaseOrderTransitions) {
      const fromRank = rank[transition.from];
      const toRank = rank[transition.to];

      if (
        fromRank !== undefined &&
        toRank !== undefined &&
        transition.to !== 'cancelled'
      ) {
        expect(toRank).toBeGreaterThan(fromRank);
      }
    }
  });

  it('accepts only the actor named on each transition', () => {
    for (const currentStatus of partsOrderStatuses) {
      for (const targetStatus of partsOrderStatuses) {
        const transition = findPurchaseOrderTransition(
          currentStatus,
          targetStatus,
        );
        const station = evaluatePurchaseOrderChange({
          actorRole: stationRole,
          currentStatus,
          targetStatus,
        });
        const supplier = evaluatePurchaseOrderChange({
          actorRole: supplierRole,
          currentStatus,
          targetStatus,
        });
        const mechanic = evaluatePurchaseOrderChange({
          actorRole: 'mechanic',
          currentStatus,
          targetStatus,
        });

        expect(mechanic.ok).toBe(false);

        if (!transition) {
          expect(station.ok).toBe(false);
          expect(supplier.ok).toBe(false);
          continue;
        }

        if (transition.to === 'partially_delivered') {
          expect(station.ok).toBe(false);
          expect(supplier.ok).toBe(false);

          const withQuantity = evaluatePurchaseOrderChange({
            actorRole: supplierRole,
            currentStatus,
            fulfillment: { quantityOrdered: 4, quantityReceived: 1 },
            targetStatus,
          });

          expect(withQuantity.ok).toBe(true);
          continue;
        }

        if (transition.actor === 'station') {
          expect(station.ok).toBe(true);
          expect(supplier.ok).toBe(false);
        } else {
          expect(supplier.ok).toBe(true);
          expect(station.ok).toBe(false);
        }
      }
    }
  });

  it('rejects a reversal and says the stored order was not changed', () => {
    const decision = evaluatePurchaseOrderChange({
      actorRole: stationRole,
      currentStatus: 'delivered',
      targetStatus: 'partially_delivered',
    });

    expect(decision).toMatchObject({
      code: 'CONFLICT',
      ok: false,
    });

    if (!decision.ok) {
      expect(decision.reason).toContain(
        'The stored purchase order was not changed.',
      );
    }
  });

  it('rejects a duplicate status update', () => {
    const decision = evaluatePurchaseOrderChange({
      actorRole: supplierRole,
      currentStatus: 'dispatched',
      targetStatus: 'dispatched',
    });

    expect(decision).toMatchObject({
      code: 'CONFLICT',
      ok: false,
    });
  });
});

describe('partial fulfillment', () => {
  it('accepts a short receipt and rejects a full receipt on the partial status', () => {
    expect(
      evaluatePurchaseOrderChange({
        actorRole: supplierRole,
        currentStatus: 'dispatched',
        fulfillment: { quantityOrdered: 4, quantityReceived: 2 },
        targetStatus: 'partially_delivered',
      }).ok,
    ).toBe(true);

    const full = evaluatePurchaseOrderChange({
      actorRole: supplierRole,
      currentStatus: 'dispatched',
      fulfillment: { quantityOrdered: 4, quantityReceived: 4 },
      targetStatus: 'partially_delivered',
    });

    expect(full.ok).toBe(false);
  });

  it('rejects a second partial report with the same quantities', () => {
    const decision = evaluatePurchaseOrderChange({
      actorRole: supplierRole,
      currentStatus: 'partially_delivered',
      fulfillment: { quantityOrdered: 4, quantityReceived: 2 },
      lastFulfillment: { quantityOrdered: 4, quantityReceived: 2 },
      targetStatus: 'partially_delivered',
    });

    expect(decision).toMatchObject({ code: 'CONFLICT', ok: false });
  });

  it('allows a later partial receipt that increases the received quantity', () => {
    const decision = evaluatePurchaseOrderChange({
      actorRole: supplierRole,
      currentStatus: 'partially_delivered',
      fulfillment: { quantityOrdered: 4, quantityReceived: 3 },
      lastFulfillment: { quantityOrdered: 4, quantityReceived: 2 },
      targetStatus: 'partially_delivered',
    });

    expect(decision).toMatchObject({
      auditAction: 'parts_order.partially_fulfilled',
      ok: true,
    });
  });

  it('rejects a decrease in the received quantity', () => {
    const decision = evaluatePurchaseOrderChange({
      actorRole: supplierRole,
      currentStatus: 'partially_delivered',
      fulfillment: { quantityOrdered: 4, quantityReceived: 1 },
      lastFulfillment: { quantityOrdered: 4, quantityReceived: 2 },
      targetStatus: 'partially_delivered',
    });

    expect(decision.ok).toBe(false);
  });

  it('does not let a station record a partial receipt', () => {
    const decision = evaluatePurchaseOrderChange({
      actorRole: stationRole,
      currentStatus: 'in_transit',
      fulfillment: { quantityOrdered: 4, quantityReceived: 1 },
      targetStatus: 'partially_delivered',
    });

    expect(decision).toMatchObject({ code: 'FORBIDDEN', ok: false });
  });
});

describe('purchase order creation rules', () => {
  it('allows an open response and request that do not already have an order', () => {
    expect(
      evaluatePurchaseOrderCreation({
        orderAlreadyExists: false,
        requestStatus: 'response_received',
        responseStatus: 'submitted',
      }),
    ).toEqual({ ok: true });
  });

  it('rejects a duplicate order, a closed request, and a closed response', () => {
    expect(
      evaluatePurchaseOrderCreation({
        orderAlreadyExists: true,
        requestStatus: 'accepted',
        responseStatus: 'accepted',
      }).ok,
    ).toBe(false);
    expect(
      evaluatePurchaseOrderCreation({
        orderAlreadyExists: false,
        requestStatus: 'cancelled',
        responseStatus: 'submitted',
      }).ok,
    ).toBe(false);
    expect(
      evaluatePurchaseOrderCreation({
        orderAlreadyExists: false,
        requestStatus: 'sent',
        responseStatus: 'expired',
      }).ok,
    ).toBe(false);
  });
});
