import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  auditLogs,
  partsOrders,
  partsRequests,
  supplierResponses,
} from '@/db/schema';
import { requireUser } from '@/lib/auth/session';
import { requireTenantPermission } from '@/lib/authorization/guards';
import type { SystemRole } from '@/lib/constants/roles';

import type { PurchaseOrderTransitionInput } from '../schemas/purchaseOrderSchema';
import {
  evaluatePurchaseOrderChange,
  evaluatePurchaseOrderCreation,
  PurchaseOrderError,
  purchaseOrderPermissionByActor,
  resolvePurchaseOrderActor,
  type FulfillmentSnapshot,
  type PartsOrderStatus,
  type PurchaseOrderActorKind,
} from './purchaseOrderLifecycle';

const actorUserIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PurchaseOrderView = {
  createdAt: Date;
  deliveredAt: Date | null;
  expectedDeliveryAt: Date | null;
  id: string;
  jobCardId: string;
  orderedAt: Date | null;
  partsRequestId: string;
  status: PartsOrderStatus;
  supplierId: string;
  supplierResponseId: string;
  tenantId: string;
  updatedAt: Date;
};

export type PurchaseOrderHistoryEntry = {
  action: string;
  actorUserId: string | null;
  createdAt: Date;
  id: string;
  newValue: Record<string, unknown> | null;
  previousValue: Record<string, unknown> | null;
};

type OrderRow = typeof partsOrders.$inferSelect;

type Actor = {
  actor: PurchaseOrderActorKind;
  role: SystemRole;
  userId: string;
};

export async function createPurchaseOrder(
  tenantId: string,
  supplierResponseId: string,
) {
  const actor = await requireActor(tenantId);

  if (actor.actor !== 'station') {
    throw new PurchaseOrderError('Only a station manager can create a purchase order.','FORBIDDEN',);
  }

  return db.transaction(async (tx) => {
    const [response] = await tx
      .select()
      .from(supplierResponses)
      .where(
        and(
          eq(supplierResponses.tenantId, tenantId),
          eq(supplierResponses.id, supplierResponseId),
        ),
      )
      .limit(1);

    if (!response || response.tenantId !== tenantId) {
      throw new PurchaseOrderError('Supplier response not found.', 'NOT_FOUND');
    }

    const [request] = await tx
      .select()
      .from(partsRequests)
      .where(
        and(
          eq(partsRequests.tenantId, tenantId),
          eq(partsRequests.id, response.partsRequestId),
        ),
      )
      .limit(1);

    if (!request || request.tenantId !== tenantId) {
      throw new PurchaseOrderError('Parts request not found for this supplier response.','NOT_FOUND',);
    }

    const [existing] = await tx
      .select()
      .from(partsOrders)
      .where(
        and(
          eq(partsOrders.tenantId, tenantId),
          eq(partsOrders.supplierResponseId, response.id),
        ),
      )
      .limit(1);

    const decision = evaluatePurchaseOrderCreation({
      orderAlreadyExists: Boolean(existing),
      requestStatus: request.status,
      responseStatus: response.status,
    });

    if (!decision.ok) {
      throw new PurchaseOrderError(decision.reason, decision.code);
    }

    await tx
      .update(supplierResponses)
      .set({ status: 'accepted' })
      .where(
        and(
          eq(supplierResponses.tenantId, tenantId),
          eq(supplierResponses.id, response.id),
        ),
      )
      .returning();

    await tx
      .update(partsRequests)
      .set({ status: 'accepted', updatedAt: new Date() })
      .where(
        and(
          eq(partsRequests.tenantId, tenantId),
          eq(partsRequests.id, request.id),
        ),
      )
      .returning();

    const [created] = await tx
      .insert(partsOrders)
      .values({
        expectedDeliveryAt: response.eta,
        jobCardId: request.jobCardId,
        status: 'pending_approval',
        supplierId: response.supplierId,
        supplierResponseId: response.id,
        tenantId,
      })
      .returning();

    if (!created) {
      throw new PurchaseOrderError('Purchase order could not be saved.','CONFLICT',);
    }

    await writeOrderAudit(tx, {
      action: 'parts_order.created',
      actor,
      entityId: created.id,
      newValue: relationshipValue(created, request.id, {
        status: 'pending_approval',
      }),
      previousValue: null,
      tenantId,
    });

    return toView(created, request.id);
  });
}

export async function listPurchaseOrders(
  tenantId: string,
  filter?: { jobCardId?: string },
) {
  await requireActor(tenantId);

  const filters = [eq(partsOrders.tenantId, tenantId)];

  if (filter?.jobCardId) {
    filters.push(eq(partsOrders.jobCardId, filter.jobCardId));
  }

  return db
    .select()
    .from(partsOrders)
    .where(and(...filters))
    .orderBy(desc(partsOrders.createdAt));
}

export async function getPurchaseOrder(tenantId: string, orderId: string) {
  await requireActor(tenantId);

  const [order] = await db
    .select()
    .from(partsOrders)
    .where(and(eq(partsOrders.tenantId, tenantId), eq(partsOrders.id, orderId)))
    .limit(1);

  if (!order || order.tenantId !== tenantId) {
    return null;
  }

  const [response] = await db
    .select()
    .from(supplierResponses)
    .where(
      and(
        eq(supplierResponses.tenantId, tenantId),
        eq(supplierResponses.id, order.supplierResponseId),
      ),
    )
    .limit(1);

  if (!response || response.tenantId !== tenantId) {
    return null;
  }

  const history = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.tenantId, tenantId),
        eq(auditLogs.entityType, 'parts_order'),
        eq(auditLogs.entityId, order.id),
      ),
    )
    .orderBy(desc(auditLogs.createdAt));

  return {
    history: history
      .filter(
        (entry) =>
          entry.tenantId === tenantId &&
          entry.entityId === order.id &&
          entry.entityType === 'parts_order',
      )
      .map(
        (entry): PurchaseOrderHistoryEntry => ({
          action: entry.action,
          actorUserId: entry.actorUserId,
          createdAt: entry.createdAt,
          id: entry.id,
          newValue: entry.newValue,
          previousValue: entry.previousValue,
        }),
      ),
    order: toView(order, response.partsRequestId),
  };
}

export async function changePurchaseOrderStatus(
  tenantId: string,
  orderId: string,
  input: PurchaseOrderTransitionInput,
) {
  const actor = await requireActor(tenantId);

  return db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(partsOrders)
      .where(
        and(eq(partsOrders.tenantId, tenantId), eq(partsOrders.id, orderId)),
      )
      .limit(1);

    if (!order || order.tenantId !== tenantId) {
      throw new PurchaseOrderError('Purchase order not found.', 'NOT_FOUND');
    }

    const [response] = await tx
      .select()
      .from(supplierResponses)
      .where(
        and(
          eq(supplierResponses.tenantId, tenantId),
          eq(supplierResponses.id, order.supplierResponseId),
        ),
      )
      .limit(1);

    if (!response || response.tenantId !== tenantId) {
      throw new PurchaseOrderError(
        'Purchase order is not linked to a supplier response in this tenant.',
        'NOT_FOUND',
      );
    }

    const currentStatus = asOrderStatus(order.status);
    const needsFulfillmentHistory =
      currentStatus === 'partially_delivered' ||
      input.status === 'partially_delivered';
    const lastFulfillment = needsFulfillmentHistory
      ? await findLatestFulfillment(tx, tenantId, order.id)
      : null;
    const decision = evaluatePurchaseOrderChange({
      actorRole: actor.role,
      currentStatus,
      fulfillment: fulfillmentFromInput(input),
      lastFulfillment,
      targetStatus: input.status,
    });

    if (!decision.ok) {
      throw new PurchaseOrderError(decision.reason, decision.code);
    }

    const timestamps = timestampsForStatus(input.status, order);
    // The status predicate keeps a losing concurrent update from writing a reversal.
    const [updated] = await tx
      .update(partsOrders)
      .set({
        deliveredAt: timestamps.deliveredAt,
        orderedAt: timestamps.orderedAt,
        status: input.status,
        updatedAt: timestamps.updatedAt,
      })
      .where(
        and(
          eq(partsOrders.id, order.id),
          eq(partsOrders.tenantId, tenantId),
          eq(partsOrders.status, order.status),
        ),
      )
      .returning();

    if (!updated) {
      throw new PurchaseOrderError('Purchase order changed concurrently. The stored purchase order was not changed.','CONFLICT',);
    }

    const saved = {
      ...order,
      ...updated,
      id: order.id,
      status: input.status,
      tenantId,
    };

    await writeOrderAudit(tx, {
      action: decision.auditAction,
      actor,
      entityId: saved.id,
      newValue: relationshipValue(saved, response.partsRequestId, {
        fulfillment: decision.fulfillment,
        note: blankToUndefined(input.note),
        status: input.status,
      }),
      previousValue: relationshipValue(order, response.partsRequestId, {
        fulfillment: lastFulfillment,
        status: currentStatus,
      }),
      tenantId,
    });

    return toView(saved, response.partsRequestId);
  });
}

async function requireActor(tenantId: string): Promise<Actor> {
  const user = await requireUser();
  const role = roleForTenant(user, tenantId);
  const actor = resolvePurchaseOrderActor(role);

  if (!role || !actor) {
    throw new PurchaseOrderError('Only station managers or suppliers can access purchase orders.','FORBIDDEN',);
  }

  const authorized = await requireTenantPermission(
    tenantId,
    purchaseOrderPermissionByActor[actor],
  );

  return {
    actor,
    role,
    userId: authorized.id,
  };
}

function roleForTenant(
  user: {
    activeTenantId: string | null;
    tenantMemberships?: {
      role: SystemRole;
      status: string;
      tenantId: string;
    }[];
    tenantRole: SystemRole | null;
  },
  tenantId: string,
) {
  const membership = user.tenantMemberships?.find(
    (item) => item.tenantId === tenantId && item.status === 'active',
  );

  if (membership) {
    return membership.role;
  }

  if (user.activeTenantId === tenantId) {
    return user.tenantRole;
  }

  return null;
}

function fulfillmentFromInput(
  input: PurchaseOrderTransitionInput,
): FulfillmentSnapshot | undefined {
  if (
    input.quantityOrdered === undefined &&
    input.quantityReceived === undefined
  ) {
    return undefined;
  }

  return {
    quantityOrdered: input.quantityOrdered ?? Number.NaN,
    quantityReceived: input.quantityReceived ?? Number.NaN,
  };
}

function timestampsForStatus(
  status: PartsOrderStatus,
  current: { deliveredAt: Date | null; orderedAt: Date | null },
) {
  const now = new Date();

  return {
    deliveredAt:
      status === 'delivered'
        ? (current.deliveredAt ?? now)
        : current.deliveredAt,
    orderedAt:
      status === 'ordered' ? (current.orderedAt ?? now) : current.orderedAt,
    updatedAt: now,
  };
}

function asOrderStatus(status: string): PartsOrderStatus {
  if (
    status === 'pending_approval' ||
    status === 'ordered' ||
    status === 'awaiting_dispatch' ||
    status === 'dispatched' ||
    status === 'in_transit' ||
    status === 'delivered' ||
    status === 'partially_delivered' ||
    status === 'delayed' ||
    status === 'cancelled'
  ) {
    return status;
  }

  throw new PurchaseOrderError(`Unsupported purchase order status "${status}". The stored purchase order was not changed.`,'CONFLICT',);
}

type AuditReader = {
  select: typeof db.select;
};

async function findLatestFulfillment(
  tx: AuditReader,
  tenantId: string,
  orderId: string,
) {
  const rows = await tx
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.tenantId, tenantId),
        eq(auditLogs.entityType, 'parts_order'),
        eq(auditLogs.entityId, orderId),
      ),
    )
    .orderBy(desc(auditLogs.createdAt));

  for (const row of rows) {
    if (
      row.tenantId !== tenantId ||
      row.entityId !== orderId ||
      row.entityType !== 'parts_order'
    ) {
      continue;
    }

    const snapshot = readStoredFulfillment(row.newValue);

    if (snapshot) {
      return snapshot;
    }
  }

  return null;
}

function readStoredFulfillment(value: unknown): FulfillmentSnapshot | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const fulfillment = (value as { fulfillment?: unknown }).fulfillment;

  if (!fulfillment || typeof fulfillment !== 'object') {
    return null;
  }

  const snapshot = fulfillment as {
    quantityOrdered?: unknown;
    quantityReceived?: unknown;
  };
  const quantityOrdered = Number(snapshot.quantityOrdered);
  const quantityReceived = Number(snapshot.quantityReceived);

  if (!Number.isFinite(quantityOrdered) || !Number.isFinite(quantityReceived)) {
    return null;
  }

  return { quantityOrdered, quantityReceived };
}

type AuditWriter = {
  insert: typeof db.insert;
};

async function writeOrderAudit(
  tx: AuditWriter,
  input: {
    action: string;
    actor: Actor;
    entityId: string;
    newValue: Record<string, unknown>;
    previousValue: Record<string, unknown> | null;
    tenantId: string;
  },
) {
  await tx
    .insert(auditLogs)
    .values({
      action: input.action,
      actorUserId: actorUserIdPattern.test(input.actor.userId)
        ? input.actor.userId
        : null,
      entityId: input.entityId,
      entityType: 'parts_order',
      newValue: {
        ...input.newValue,
        actorRole: input.actor.role,
        actorUserId: input.actor.userId,
      },
      previousValue: input.previousValue,
      tenantId: input.tenantId,
    })
    .returning();
}

function relationshipValue(
  order: Pick<OrderRow, 'jobCardId' | 'supplierId' | 'supplierResponseId'>,
  partsRequestId: string,
  extra: {
    fulfillment?: FulfillmentSnapshot | null;
    note?: string;
    status: string;
  },
) {
  const value: Record<string, unknown> = {
    jobCardId: order.jobCardId,
    partsRequestId,
    status: extra.status,
    supplierId: order.supplierId,
    supplierResponseId: order.supplierResponseId,
  };

  if (extra.fulfillment) {
    value.fulfillment = extra.fulfillment;
  }

  if (extra.note) {
    value.note = extra.note;
  }

  return value;
}

function toView(order: OrderRow, partsRequestId: string): PurchaseOrderView {
  return {
    createdAt: order.createdAt,
    deliveredAt: order.deliveredAt,
    expectedDeliveryAt: order.expectedDeliveryAt,
    id: order.id,
    jobCardId: order.jobCardId,
    orderedAt: order.orderedAt,
    partsRequestId,
    status: asOrderStatus(order.status),
    supplierId: order.supplierId,
    supplierResponseId: order.supplierResponseId,
    tenantId: order.tenantId,
    updatedAt: order.updatedAt,
  };
}

function blankToUndefined(note: string | undefined) {
  const trimmed = note?.trim();
  return trimmed ? trimmed : undefined;
}
