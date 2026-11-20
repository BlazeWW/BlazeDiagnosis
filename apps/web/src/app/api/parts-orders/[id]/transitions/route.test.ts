import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PurchaseOrderError } from '@/features/parts/services/purchaseOrderLifecycle';
import { jsonRequest, readJson, routeContext } from '@/test/apiRouteTestUtils';

const tenantContextMock = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
}));
const serviceMock = vi.hoisted(() => ({
  changePurchaseOrderStatus: vi.fn(),
}));

vi.mock('@/db/client', () => ({ db: {} }));
vi.mock('@/lib/tenancy/tenantContext', () => tenantContextMock);
vi.mock('@/features/parts/services/purchaseOrderService', () => serviceMock);

import { POST } from './route';

describe('/api/parts-orders/[id]/transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantContextMock.requireTenantContext.mockResolvedValue({
      tenantId: 'tenant-1',
    });
  });

  it('returns 409 when the service rejects an invalid transition', async () => {
    serviceMock.changePurchaseOrderStatus.mockRejectedValue(
      new PurchaseOrderError(
        'Invalid purchase order transition from delivered to ordered. The stored purchase order was not changed.',
        'CONFLICT',
      ),
    );

    const response = await POST(
      jsonRequest('http://localhost/api/parts-orders/order-1/transitions', {
        status: 'ordered',
        tenantId: 'tenant-other',
      }),
      routeContext({ id: 'order-1' }),
    );

    expect(response.status).toBe(409);
    expect(serviceMock.changePurchaseOrderStatus).toHaveBeenCalledWith(
      'tenant-1',
      'order-1',
      { status: 'ordered' },
    );
    await expect(readJson(response)).resolves.toMatchObject({
      error: { code: 'CONFLICT' },
      success: false,
    });
  });

  it('returns 403 when the actor cannot perform the action', async () => {
    serviceMock.changePurchaseOrderStatus.mockRejectedValue(
      new PurchaseOrderError(
        'Only the supplier can perform this purchase order action.',
        'FORBIDDEN',
      ),
    );

    const response = await POST(
      jsonRequest('http://localhost/api/parts-orders/order-1/transitions', {
        status: 'dispatched',
      }),
      routeContext({ id: 'order-1' }),
    );

    expect(response.status).toBe(403);
  });

  it('requires quantities for a partial delivery', async () => {
    const response = await POST(
      jsonRequest('http://localhost/api/parts-orders/order-1/transitions', {
        status: 'partially_delivered',
      }),
      routeContext({ id: 'order-1' }),
    );
    const payload = await readJson<{ error: { code: string } }>(response);

    expect(response.status).toBe(422);
    expect(payload.error.code).toBe('VALIDATION_ERROR');
    expect(serviceMock.changePurchaseOrderStatus).not.toHaveBeenCalled();
  });
});
