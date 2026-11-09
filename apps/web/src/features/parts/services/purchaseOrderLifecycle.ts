import type { Permission, SystemRole } from '@/lib/constants/roles';

/**
 * Purchase-order statuses stored in `parts_order_status`.
 * `delivered` and `cancelled` are terminal: nothing leaves them.
 * `delayed` is a hold. Resuming it is not a reversal of the forward path.
 */
export const partsOrderStatuses = [
  'pending_approval',
  'ordered',
  'awaiting_dispatch',
  'dispatched',
  'in_transit',
  'delivered',
  'partially_delivered',
  'delayed',
  'cancelled',
] as const;

export type PartsOrderStatus = (typeof partsOrderStatuses)[number];

export const terminalPurchaseOrderStatuses = [
  'delivered',
  'cancelled',
] as const;

export type PurchaseOrderActorKind = 'station' | 'supplier';

export const purchaseOrderPermissionByActor = {
  station: 'parts.approve_supplier_quote',
  supplier: 'supplier.requests.respond',
} as const satisfies Record<PurchaseOrderActorKind, Permission>;

const stationRoles = new Set<SystemRole>(['site_manager', 'floor_manager']);
const supplierRoles = new Set<SystemRole>(['parts_supplier']);

export type PurchaseOrderTransition = {
  actor: PurchaseOrderActorKind;
  from: PartsOrderStatus;
  to: PartsOrderStatus;
};

/**
 * Allowed status changes. A pair that is absent is rejected and must not be
 * written. Same-status calls are duplicates, except a later partial receipt
 * that increases the received quantity while it stays below the ordered quantity.
 */
export const purchaseOrderTransitions: readonly PurchaseOrderTransition[] = [
  { from: 'pending_approval', to: 'ordered', actor: 'station' },
  { from: 'pending_approval', to: 'cancelled', actor: 'station' },
  { from: 'ordered', to: 'cancelled', actor: 'station' },
  { from: 'ordered', to: 'awaiting_dispatch', actor: 'supplier' },
  { from: 'awaiting_dispatch', to: 'cancelled', actor: 'station' },
  { from: 'awaiting_dispatch', to: 'dispatched', actor: 'supplier' },
  { from: 'awaiting_dispatch', to: 'delayed', actor: 'supplier' },
  { from: 'dispatched', to: 'in_transit', actor: 'supplier' },
  { from: 'dispatched', to: 'partially_delivered', actor: 'supplier' },
  { from: 'dispatched', to: 'delivered', actor: 'supplier' },
  { from: 'dispatched', to: 'delayed', actor: 'supplier' },
  { from: 'in_transit', to: 'partially_delivered', actor: 'supplier' },
  { from: 'in_transit', to: 'delivered', actor: 'supplier' },
  { from: 'in_transit', to: 'delayed', actor: 'supplier' },
  { from: 'partially_delivered', to: 'delivered', actor: 'supplier' },
  { from: 'partially_delivered', to: 'delayed', actor: 'supplier' },
  { from: 'delayed', to: 'awaiting_dispatch', actor: 'supplier' },
  { from: 'delayed', to: 'dispatched', actor: 'supplier' },
  { from: 'delayed', to: 'in_transit', actor: 'supplier' },
  { from: 'delayed', to: 'partially_delivered', actor: 'supplier' },
  { from: 'delayed', to: 'delivered', actor: 'supplier' },
  { from: 'delayed', to: 'cancelled', actor: 'station' },
];

const creatableResponseStatuses = new Set(['submitted', 'accepted']);
const creatableRequestStatuses = new Set([
  'draft',
  'sent',
  'response_received',
  'accepted',
]);

export type FulfillmentSnapshot = {
  quantityOrdered: number;
  quantityReceived: number;
};

export type PurchaseOrderErrorCode =
  | 'BAD_REQUEST'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'NOT_FOUND';

export class PurchaseOrderError extends Error {
  readonly code: PurchaseOrderErrorCode;

  constructor(message: string, code: PurchaseOrderErrorCode) {
    super(message);
    this.name = 'PurchaseOrderError';
    this.code = code;
  }
}

export type PurchaseOrderChangeDecision =
  | {
      actor: PurchaseOrderActorKind;
      auditAction:
        | 'parts_order.cancelled'
        | 'parts_order.partially_fulfilled'
        | 'parts_order.status_changed';
      fulfillment?: FulfillmentSnapshot;
      ok: true;
    }
  | {
      code: PurchaseOrderErrorCode;
      ok: false;
      reason: string;
    };

const unchanged = 'The stored purchase order was not changed.';

export function resolvePurchaseOrderActor(
  role: SystemRole | null | undefined,
): PurchaseOrderActorKind | null {
  if (!role) {
    return null;
  }

  if (stationRoles.has(role)) {
    return 'station';
  }

  if (supplierRoles.has(role)) {
    return 'supplier';
  }

  return null;
}

export function findPurchaseOrderTransition(
  from: PartsOrderStatus,
  to: PartsOrderStatus,
) {
  return (
    purchaseOrderTransitions.find(
      (transition) => transition.from === from && transition.to === to,
    ) ?? null
  );
}

export function evaluatePurchaseOrderCreation(input: {
  orderAlreadyExists: boolean;
  requestStatus: string;
  responseStatus: string;
}): { ok: true } | { code: PurchaseOrderErrorCode; ok: false; reason: string } {
  if (input.orderAlreadyExists) {
    return {
      code: 'CONFLICT',
      ok: false,
      reason: 'A purchase order already exists for this supplier response.',
    };
  }

  if (!creatableResponseStatuses.has(input.responseStatus)) {
    return {
      code: 'CONFLICT',
      ok: false,
      reason: 'This supplier response cannot be turned into a purchase order.',
    };
  }

  if (!creatableRequestStatuses.has(input.requestStatus)) {
    return {
      code: 'CONFLICT',
      ok: false,
      reason: 'This parts request cannot be turned into a purchase order.',
    };
  }

  return { ok: true };
}

export function evaluatePurchaseOrderChange(input: {
  actorRole: SystemRole | null | undefined;
  currentStatus: PartsOrderStatus;
  fulfillment?: FulfillmentSnapshot;
  lastFulfillment?: FulfillmentSnapshot | null;
  targetStatus: PartsOrderStatus;
}): PurchaseOrderChangeDecision {
  const actor = resolvePurchaseOrderActor(input.actorRole);

  if (!actor) {
    return {
      code: 'FORBIDDEN',
      ok: false,
      reason: 'Only station managers or suppliers can change purchase orders.',
    };
  }

  if (input.targetStatus === input.currentStatus) {
    if (input.currentStatus === 'partially_delivered') {
      return evaluatePartialProgress(
        actor,
        input.fulfillment,
        input.lastFulfillment,
      );
    }

    return {
      code: 'CONFLICT',
      ok: false,
      reason: `Duplicate status update. ${unchanged}`,
    };
  }

  const transition = findPurchaseOrderTransition(
    input.currentStatus,
    input.targetStatus,
  );

  if (!transition) {
    return {
      code: 'CONFLICT',
      ok: false,
      reason: `Invalid purchase order transition from ${input.currentStatus} to ${input.targetStatus}. ${unchanged}`,
    };
  }

  if (transition.actor !== actor) {
    return {
      code: 'FORBIDDEN',
      ok: false,
      reason:
        transition.actor === 'station'
          ? 'Only a station manager can perform this purchase order action.'
          : 'Only the supplier can perform this purchase order action.',
    };
  }

  if (
    input.fulfillment &&
    input.targetStatus !== 'partially_delivered' &&
    input.targetStatus !== 'delivered'
  ) {
    return {
      code: 'BAD_REQUEST',
      ok: false,
      reason:
        'Fulfillment quantities are only recorded for partial or final delivery.',
    };
  }

  if (input.targetStatus === 'partially_delivered') {
    const partial = readFulfillment(input.fulfillment, 'partial');

    if (!partial.ok) {
      return partial;
    }

    const duplicate = rejectDuplicateFulfillment(
      partial.fulfillment,
      input.lastFulfillment,
    );

    if (duplicate) {
      return duplicate;
    }

    return {
      actor,
      auditAction: 'parts_order.partially_fulfilled',
      fulfillment: partial.fulfillment,
      ok: true,
    };
  }

  if (input.targetStatus === 'delivered' && input.fulfillment) {
    const finalDelivery = readFulfillment(input.fulfillment, 'final');

    if (!finalDelivery.ok) {
      return finalDelivery;
    }

    return {
      actor,
      auditAction: 'parts_order.status_changed',
      fulfillment: finalDelivery.fulfillment,
      ok: true,
    };
  }

  if (input.targetStatus === 'cancelled') {
    return {
      actor,
      auditAction: 'parts_order.cancelled',
      ok: true,
    };
  }

  return {
    actor,
    auditAction: 'parts_order.status_changed',
    ok: true,
  };
}

function evaluatePartialProgress(
  actor: PurchaseOrderActorKind,
  fulfillment: FulfillmentSnapshot | undefined,
  lastFulfillment: FulfillmentSnapshot | null | undefined,
): PurchaseOrderChangeDecision {
  if (actor !== 'supplier') {
    return {
      code: 'FORBIDDEN',
      ok: false,
      reason: 'Only the supplier can record partial fulfillment.',
    };
  }

  if (!fulfillment) {
    return {
      code: 'CONFLICT',
      ok: false,
      reason: `Duplicate status update. ${unchanged}`,
    };
  }

  const partial = readFulfillment(fulfillment, 'partial');

  if (!partial.ok) {
    return partial;
  }

  if (!lastFulfillment) {
    return {
      actor,
      auditAction: 'parts_order.partially_fulfilled',
      fulfillment: partial.fulfillment,
      ok: true,
    };
  }

  if (lastFulfillment.quantityOrdered !== partial.fulfillment.quantityOrdered) {
    return {
      code: 'CONFLICT',
      ok: false,
      reason: 'Ordered quantity cannot change after fulfillment has started.',
    };
  }

  if (
    partial.fulfillment.quantityReceived === lastFulfillment.quantityReceived
  ) {
    return {
      code: 'CONFLICT',
      ok: false,
      reason: `Duplicate fulfillment update. ${unchanged}`,
    };
  }

  if (partial.fulfillment.quantityReceived < lastFulfillment.quantityReceived) {
    return {
      code: 'CONFLICT',
      ok: false,
      reason: `Received quantity cannot decrease. ${unchanged}`,
    };
  }

  return {
    actor,
    auditAction: 'parts_order.partially_fulfilled',
    fulfillment: partial.fulfillment,
    ok: true,
  };
}

function rejectDuplicateFulfillment(
  fulfillment: FulfillmentSnapshot,
  lastFulfillment: FulfillmentSnapshot | null | undefined,
): PurchaseOrderChangeDecision | null {
  if (!lastFulfillment) {
    return null;
  }

  if (lastFulfillment.quantityOrdered !== fulfillment.quantityOrdered) {
    return {
      code: 'CONFLICT',
      ok: false,
      reason: 'Ordered quantity cannot change after fulfillment has started.',
    };
  }

  if (lastFulfillment.quantityReceived === fulfillment.quantityReceived) {
    return {
      code: 'CONFLICT',
      ok: false,
      reason: `Duplicate fulfillment update. ${unchanged}`,
    };
  }

  if (fulfillment.quantityReceived < lastFulfillment.quantityReceived) {
    return {
      code: 'CONFLICT',
      ok: false,
      reason: `Received quantity cannot decrease. ${unchanged}`,
    };
  }

  return null;
}

function readFulfillment(
  fulfillment: FulfillmentSnapshot | undefined,
  mode: 'final' | 'partial',
):
  | { fulfillment: FulfillmentSnapshot; ok: true }
  | { code: 'BAD_REQUEST'; ok: false; reason: string } {
  if (!fulfillment) {
    return {
      code: 'BAD_REQUEST',
      ok: false,
      reason:
        mode === 'partial'
          ? 'Partial fulfillment requires quantityOrdered and quantityReceived.'
          : 'Fulfillment quantities are incomplete.',
    };
  }

  const { quantityOrdered, quantityReceived } = fulfillment;

  if (!Number.isFinite(quantityOrdered) || !Number.isFinite(quantityReceived)) {
    return {
      code: 'BAD_REQUEST',
      ok: false,
      reason: 'Fulfillment quantities must be finite numbers.',
    };
  }

  if (quantityOrdered <= 0 || quantityReceived <= 0) {
    return {
      code: 'BAD_REQUEST',
      ok: false,
      reason: 'Fulfillment quantities must be greater than zero.',
    };
  }

  if (mode === 'partial' && quantityReceived > quantityOrdered) {
    return {
      code: 'BAD_REQUEST',
      ok: false,
      reason: 'Received quantity cannot exceed the ordered quantity.',
    };
  }

  if (mode === 'partial' && quantityReceived === quantityOrdered) {
    return {
      code: 'BAD_REQUEST',
      ok: false,
      reason:
        'Receive the full quantity by marking the purchase order delivered.',
    };
  }

  if (mode === 'final' && quantityReceived !== quantityOrdered) {
    return {
      code: 'BAD_REQUEST',
      ok: false,
      reason:
        'Final delivery requires the received quantity to match the ordered quantity.',
    };
  }

  return {
    fulfillment: { quantityOrdered, quantityReceived },
    ok: true,
  };
}
