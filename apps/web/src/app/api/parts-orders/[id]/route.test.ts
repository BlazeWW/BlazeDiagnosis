import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readJson, routeContext } from '@/test/apiRouteTestUtils';

const tenantContextMock = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
}));
const serviceMock = vi.hoisted(() => ({
  getPurchaseOrder: vi.fn(),
}));

vi.mock('@/db/client', () => ({ db: {} }));
vi.mock('@/lib/tenancy/tenantContext', () => tenantContextMock);
vi.mock('@/features/parts/services/purchaseOrderService', () => serviceMock);

import { GET } from './route';

describe('/api/parts-orders/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantContextMock.requireTenantContext.mockResolvedValue({
      tenantId: 'tenant-1',
    });
  });

  it('returns the order and its audit history', async () => {
    serviceMock.getPurchaseOrder.mockResolvedValue({
      history: [{ action: 'parts_order.created', id: 'audit-1' }],
      order: { id: 'order-1', status: 'pending_approval' },
    });

    const response = await GET(
      new Request('http://localhost/api/parts-orders/order-1'),
      routeContext({ id: 'order-1' }),
    );

    expect(response.status).toBe(200);
    expect(serviceMock.getPurchaseOrder).toHaveBeenCalledWith(
      'tenant-1',
      'order-1',
    );
    await expect(readJson(response)).resolves.toEqual({
      data: {
        history: [{ action: 'parts_order.created', id: 'audit-1' }],
        order: { id: 'order-1', status: 'pending_approval' },
      },
      success: true,
    });
  });

  it('returns 404 when the order is outside the session tenant', async () => {
    serviceMock.getPurchaseOrder.mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/parts-orders/order-9'),
      routeContext({ id: 'order-9' }),
    );

    expect(response.status).toBe(404);
    await expect(readJson(response)).resolves.toMatchObject({
      error: { code: 'NOT_FOUND' },
      success: false,
    });
  });
});
