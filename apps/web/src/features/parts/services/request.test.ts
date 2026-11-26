import { beforeEach, describe, expect, it, vi } from 'vitest';

const createPurchaseOrder = vi.hoisted(() => vi.fn());

vi.mock('@/db/client', () => ({ db: {} }));
vi.mock('@/lib/authorization/guards', () => ({
  requireTenantPermission: vi.fn(),
}));
vi.mock('./purchaseOrderService', () => ({
  createPurchaseOrder,
}));

import { approveSupplierResponse } from './request';

describe('approveSupplierResponse', () => {
  beforeEach(() => {
    createPurchaseOrder.mockReset();
    createPurchaseOrder.mockResolvedValue({
      id: 'order-1',
      status: 'pending_approval',
    });
  });

  it('opens a pending purchase order for the supplier response', async () => {
    await expect(
      approveSupplierResponse('tenant-1', 'response-1'),
    ).resolves.toMatchObject({
      id: 'order-1',
      status: 'pending_approval',
    });
    expect(createPurchaseOrder).toHaveBeenCalledWith('tenant-1', 'response-1');
  });
});
