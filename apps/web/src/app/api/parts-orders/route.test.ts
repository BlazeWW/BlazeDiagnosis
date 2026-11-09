import { beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonRequest, readJson } from '@/test/apiRouteTestUtils';

const tenantContextMock = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
}));
const serviceMock = vi.hoisted(() => ({
  createPurchaseOrder: vi.fn(),
  listPurchaseOrders: vi.fn(),
}));

vi.mock('@/db/client', () => ({ db: {} }));
vi.mock('@/lib/tenancy/tenantContext', () => tenantContextMock);
vi.mock('@/features/parts/services/purchaseOrderService', () => serviceMock);

import { GET, POST } from './route';

const supplierResponseId = '11111111-1111-4111-8111-111111111111';

describe('/api/parts-orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantContextMock.requireTenantContext.mockResolvedValue({
      tenantId: 'tenant-1',
    });
  });

  it('lists orders for the session tenant', async () => {
    serviceMock.listPurchaseOrders.mockResolvedValue([{ id: 'order-1' }]);

    const response = await GET(
      new Request('http://localhost/api/parts-orders'),
    );

    expect(response.status).toBe(200);
    expect(serviceMock.listPurchaseOrders).toHaveBeenCalledWith('tenant-1', {});
    await expect(readJson(response)).resolves.toEqual({
      data: { orders: [{ id: 'order-1' }] },
      meta: { count: 1 },
      success: true,
    });
  });

  it('creates an order from the session tenant and ignores a body tenant id', async () => {
    serviceMock.createPurchaseOrder.mockResolvedValue({
      id: 'order-1',
      status: 'pending_approval',
    });

    const response = await POST(
      jsonRequest('http://localhost/api/parts-orders', {
        supplierResponseId,
        tenantId: 'tenant-other',
      }),
    );

    expect(response.status).toBe(201);
    expect(serviceMock.createPurchaseOrder).toHaveBeenCalledWith(
      'tenant-1',
      supplierResponseId,
    );
  });

  it('rejects a create body without a supplier response id', async () => {
    const response = await POST(
      jsonRequest('http://localhost/api/parts-orders', {
        tenantId: 'tenant-other',
      }),
    );
    const payload = await readJson<{ error: { code: string } }>(response);

    expect(response.status).toBe(422);
    expect(payload.error.code).toBe('VALIDATION_ERROR');
    expect(serviceMock.createPurchaseOrder).not.toHaveBeenCalled();
  });
});
