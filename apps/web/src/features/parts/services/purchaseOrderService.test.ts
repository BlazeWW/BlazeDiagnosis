import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SystemRole } from '@/lib/constants/roles';

const sessionMock = vi.hoisted(() => ({
  requireUser: vi.fn(),
}));
const authMock = vi.hoisted(() => ({
  requireTenantPermission: vi.fn(),
}));
const dbMock = vi.hoisted(() => ({
  select: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => sessionMock);
vi.mock('@/lib/authorization/guards', () => authMock);
vi.mock('@/db/client', () => ({ db: dbMock }));

import {
  changePurchaseOrderStatus,
  createPurchaseOrder,
  getPurchaseOrder,
  listPurchaseOrders,
} from './purchaseOrderService';

const userId = '22222222-2222-4222-8222-222222222222';

const user = {
  activeTenantId: 'tenant-1',
  id: userId,
  permissions: ['parts.approve_supplier_quote'] as const,
  tenantMemberships: [
    {
      permissions: ['parts.approve_supplier_quote'] as const,
      role: 'site_manager' as SystemRole,
      status: 'active' as const,
      tenantId: 'tenant-1',
    },
  ],
  tenantRole: 'site_manager' as SystemRole,
};

const responseRow = {
  eta: null,
  id: 'response-1',
  partsRequestId: 'request-1',
  status: 'submitted',
  supplierId: 'supplier-1',
  tenantId: 'tenant-1',
};

const requestRow = {
  id: 'request-1',
  jobCardId: 'job-1',
  status: 'response_received',
  tenantId: 'tenant-1',
};

function orderRow(status: string) {
  return {
    createdAt: new Date('2026-11-01T00:00:00.000Z'),
    deliveredAt: null,
    expectedDeliveryAt: null,
    id: 'order-1',
    jobCardId: 'job-1',
    orderedAt: null,
    status,
    supplierId: 'supplier-1',
    supplierResponseId: 'response-1',
    tenantId: 'tenant-1',
    updatedAt: new Date('2026-11-01T00:00:00.000Z'),
  };
}

type Harness = {
  inserts: unknown[];
  selects: unknown[][];
  updateRows: unknown[][];
  updates: unknown[];
};

function installHarness(harness: Harness) {
  const select = vi.fn(() => {
    const rows = harness.selects.shift() ?? [];
    return {
      from: () => ({
        where: () => ({
          limit: async () => rows,
          orderBy: async () => rows,
        }),
      }),
    };
  });
  const tx = {
    insert: vi.fn(() => ({
      values: (values: Record<string, unknown>) => ({
        returning: async () => {
          harness.inserts.push(values);
          return [
            {
              createdAt: new Date('2026-11-09T00:00:00.000Z'),
              deliveredAt: null,
              expectedDeliveryAt: values.expectedDeliveryAt ?? null,
              id: values.action ? 'audit-1' : 'order-1',
              orderedAt: null,
              updatedAt: new Date('2026-11-09T00:00:00.000Z'),
              ...values,
            },
          ];
        },
      }),
    })),
    select,
    update: vi.fn(() => ({
      set: (values: unknown) => ({
        where: () => ({
          returning: async () => {
            harness.updates.push(values);
            return harness.updateRows.shift() ?? [];
          },
        }),
      }),
    })),
  };

  dbMock.select.mockImplementation(select);
  dbMock.transaction.mockImplementation(
    async (callback: (transaction: typeof tx) => Promise<unknown>) =>
      callback(tx),
  );

  return tx;
}

function useRole(role: SystemRole, tenantId = 'tenant-1') {
  user.tenantRole = role;
  user.activeTenantId = tenantId;
  user.tenantMemberships[0].role = role;
  user.tenantMemberships[0].tenantId = tenantId;
}

describe('purchaseOrderService', () => {
  let harness: Harness;

  beforeEach(() => {
    vi.clearAllMocks();
    useRole('site_manager');
    sessionMock.requireUser.mockResolvedValue(user);
    authMock.requireTenantPermission.mockResolvedValue(user);
    harness = { inserts: [], selects: [], updateRows: [], updates: [] };
    installHarness(harness);
  });

  it('creates an order linked to the supplier response and parts request', async () => {
    harness.selects.push([responseRow], [requestRow], []);

    const order = await createPurchaseOrder('tenant-1', 'response-1');

    expect(order).toMatchObject({
      jobCardId: 'job-1',
      partsRequestId: 'request-1',
      status: 'pending_approval',
      supplierId: 'supplier-1',
      supplierResponseId: 'response-1',
      tenantId: 'tenant-1',
    });
    expect(harness.inserts[0]).toMatchObject({
      jobCardId: 'job-1',
      status: 'pending_approval',
      supplierId: 'supplier-1',
      supplierResponseId: 'response-1',
      tenantId: 'tenant-1',
    });
    expect(harness.inserts[1]).toMatchObject({
      action: 'parts_order.created',
      entityId: 'order-1',
      entityType: 'parts_order',
      newValue: expect.objectContaining({
        partsRequestId: 'request-1',
        supplierId: 'supplier-1',
      }),
      tenantId: 'tenant-1',
    });
    expect(authMock.requireTenantPermission).toHaveBeenCalledWith(
      'tenant-1',
      'parts.approve_supplier_quote',
    );
  });

  it('does not insert a second order for the same supplier response', async () => {
    harness.selects.push(
      [responseRow],
      [requestRow],
      [orderRow('pending_approval')],
    );

    await expect(
      createPurchaseOrder('tenant-1', 'response-1'),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
    });
    expect(harness.inserts).toEqual([]);
    expect(harness.updates).toEqual([]);
  });

  it('does not create an order when the supplier response is outside the tenant', async () => {
    harness.selects.push([]);

    await expect(
      createPurchaseOrder('tenant-1', 'response-9'),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(harness.inserts).toEqual([]);
    expect(dbMock.transaction).toHaveBeenCalled();
  });

  it('rejects supplier creation before opening a write', async () => {
    useRole('parts_supplier');

    await expect(
      createPurchaseOrder('tenant-1', 'response-1'),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(dbMock.transaction).not.toHaveBeenCalled();
  });

  it('leaves the stored status unchanged when the transition is invalid', async () => {
    const stored = orderRow('delivered');
    harness.selects.push([stored], [responseRow]);

    await expect(
      changePurchaseOrderStatus('tenant-1', 'order-1', { status: 'ordered' }),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      message: expect.stringContaining(
        'The stored purchase order was not changed.',
      ),
    });

    expect(stored.status).toBe('delivered');
    expect(harness.updates).toEqual([]);
    expect(harness.inserts).toEqual([]);
  });

  it('rejects a supplier attempt to approve an order without updating it', async () => {
    useRole('parts_supplier');
    const stored = orderRow('pending_approval');
    harness.selects.push([stored], [responseRow]);

    await expect(
      changePurchaseOrderStatus('tenant-1', 'order-1', { status: 'ordered' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    expect(stored.status).toBe('pending_approval');
    expect(harness.updates).toEqual([]);
    expect(authMock.requireTenantPermission).toHaveBeenCalledWith(
      'tenant-1',
      'supplier.requests.respond',
    );
  });

  it('rejects a station attempt to dispatch an order without updating it', async () => {
    const stored = orderRow('awaiting_dispatch');
    harness.selects.push([stored], [responseRow]);

    await expect(
      changePurchaseOrderStatus('tenant-1', 'order-1', {
        status: 'dispatched',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    expect(stored.status).toBe('awaiting_dispatch');
    expect(harness.updates).toEqual([]);
    expect(harness.inserts).toEqual([]);
  });

  it('rejects a mechanic or customer before reading the order', async () => {
    useRole('mechanic');

    await expect(
      changePurchaseOrderStatus('tenant-1', 'order-1', { status: 'cancelled' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(dbMock.transaction).not.toHaveBeenCalled();

    useRole('customer');
    await expect(listPurchaseOrders('tenant-1')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(dbMock.select).not.toHaveBeenCalled();
  });

  it('does not update an order that belongs to another tenant', async () => {
    harness.selects.push([]);

    await expect(
      changePurchaseOrderStatus('tenant-1', 'order-other', {
        status: 'cancelled',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(harness.updates).toEqual([]);
    expect(harness.inserts).toEqual([]);
  });

  it('rejects a duplicate status update without writing another audit row', async () => {
    const stored = orderRow('ordered');
    harness.selects.push([stored], [responseRow]);

    await expect(
      changePurchaseOrderStatus('tenant-1', 'order-1', { status: 'ordered' }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });

    expect(stored.status).toBe('ordered');
    expect(harness.updates).toEqual([]);
    expect(harness.inserts).toEqual([]);
  });

  it('approves a pending order and writes the audit relationship', async () => {
    harness.selects.push([orderRow('pending_approval')], [responseRow]);
    harness.updateRows.push([orderRow('ordered')]);

    const order = await changePurchaseOrderStatus('tenant-1', 'order-1', {
      note: 'Approved for the Hilux job',
      status: 'ordered',
    });

    expect(order.status).toBe('ordered');
    expect(harness.updates[0]).toMatchObject({
      orderedAt: expect.any(Date),
      status: 'ordered',
    });
    expect(harness.inserts[0]).toMatchObject({
      action: 'parts_order.status_changed',
      actorUserId: userId,
      entityType: 'parts_order',
      newValue: expect.objectContaining({
        actorRole: 'site_manager',
        note: 'Approved for the Hilux job',
        partsRequestId: 'request-1',
        status: 'ordered',
        supplierId: 'supplier-1',
      }),
      previousValue: expect.objectContaining({ status: 'pending_approval' }),
    });
  });

  it('records partial fulfillment and rejects the same quantities again', async () => {
    useRole('parts_supplier');
    harness.selects.push([orderRow('dispatched')], [responseRow], []);
    harness.updateRows.push([orderRow('partially_delivered')]);

    const partial = await changePurchaseOrderStatus('tenant-1', 'order-1', {
      quantityOrdered: 4,
      quantityReceived: 2,
      status: 'partially_delivered',
    });

    expect(partial.status).toBe('partially_delivered');
    expect(harness.inserts[0]).toMatchObject({
      action: 'parts_order.partially_fulfilled',
      newValue: expect.objectContaining({
        fulfillment: { quantityOrdered: 4, quantityReceived: 2 },
      }),
    });

    harness.inserts.length = 0;
    harness.updates.length = 0;
    harness.selects.push(
      [orderRow('partially_delivered')],
      [responseRow],
      [
        {
          entityId: 'order-1',
          entityType: 'parts_order',
          newValue: {
            fulfillment: { quantityOrdered: 4, quantityReceived: 2 },
          },
          tenantId: 'tenant-1',
        },
      ],
    );

    await expect(
      changePurchaseOrderStatus('tenant-1', 'order-1', {
        quantityOrdered: 4,
        quantityReceived: 2,
        status: 'partially_delivered',
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(harness.updates).toEqual([]);
    expect(harness.inserts).toEqual([]);
  });

  it('cancels from pending approval and records the previous status', async () => {
    harness.selects.push([orderRow('pending_approval')], [responseRow]);
    harness.updateRows.push([orderRow('cancelled')]);

    const order = await changePurchaseOrderStatus('tenant-1', 'order-1', {
      status: 'cancelled',
    });

    expect(order.status).toBe('cancelled');
    expect(harness.inserts[0]).toMatchObject({
      action: 'parts_order.cancelled',
      previousValue: expect.objectContaining({
        partsRequestId: 'request-1',
        status: 'pending_approval',
      }),
    });
  });

  it('does not write an audit row when a concurrent update wins', async () => {
    harness.selects.push([orderRow('ordered')], [responseRow]);
    harness.updateRows.push([]);

    await expect(
      changePurchaseOrderStatus('tenant-1', 'order-1', {
        status: 'cancelled',
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(harness.inserts).toEqual([]);
  });

  it('stores a non-uuid actor on the audit payload instead of the user foreign key', async () => {
    user.id = 'dev-user-id';
    harness.selects.push([orderRow('pending_approval')], [responseRow]);
    harness.updateRows.push([orderRow('ordered')]);

    await changePurchaseOrderStatus('tenant-1', 'order-1', {
      status: 'ordered',
    });

    expect(harness.inserts[0]).toMatchObject({
      actorUserId: null,
      newValue: expect.objectContaining({ actorUserId: 'dev-user-id' }),
    });
    user.id = userId;
  });

  it('hides an order whose supplier response is not in the tenant', async () => {
    harness.selects.push([orderRow('ordered')], []);

    await expect(getPurchaseOrder('tenant-1', 'order-1')).resolves.toBeNull();
  });

  it('returns an order with its parts request and audit history', async () => {
    harness.selects.push(
      [orderRow('ordered')],
      [responseRow],
      [
        {
          action: 'parts_order.created',
          actorUserId: userId,
          createdAt: new Date('2026-11-09T00:00:00.000Z'),
          entityId: 'order-1',
          entityType: 'parts_order',
          id: 'audit-1',
          newValue: { status: 'pending_approval' },
          previousValue: null,
          tenantId: 'tenant-1',
        },
      ],
    );

    const result = await getPurchaseOrder('tenant-1', 'order-1');

    expect(result?.order).toMatchObject({
      partsRequestId: 'request-1',
      status: 'ordered',
      tenantId: 'tenant-1',
    });
    expect(result?.history).toEqual([
      expect.objectContaining({
        action: 'parts_order.created',
        id: 'audit-1',
      }),
    ]);
  });

  it('lists tenant orders for an authorised station role', async () => {
    harness.selects.push([orderRow('ordered')]);

    await expect(
      listPurchaseOrders('tenant-1', { jobCardId: 'job-1' }),
    ).resolves.toEqual([
      expect.objectContaining({ id: 'order-1', tenantId: 'tenant-1' }),
    ]);
  });

  it('uses the membership role for the tenant being accessed', async () => {
    user.tenantRole = 'parts_supplier';
    user.tenantMemberships[0].role = 'site_manager';
    harness.selects.push([responseRow], [requestRow], []);

    await createPurchaseOrder('tenant-1', 'response-1');

    expect(authMock.requireTenantPermission).toHaveBeenCalledWith(
      'tenant-1',
      'parts.approve_supplier_quote',
    );
  });
});
