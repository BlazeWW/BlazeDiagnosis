import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readJson, routeContext } from '@/test/apiRouteTestUtils';

const tenantContextMock = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
}));
const vehicleServiceMock = vi.hoisted(() => ({
  listVehiclesForCustomer: vi.fn(),
}));

vi.mock('@/lib/tenancy/tenantContext', () => tenantContextMock);
vi.mock('@/features/vehicles/services/vehicleService', () => vehicleServiceMock);

import { GET } from './route';

describe('/api/vehicles/customer/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantContextMock.requireTenantContext.mockResolvedValue({ tenantId: 'tenant-1' });
  });

  it('lists vehicles for one customer', async () => {
    vehicleServiceMock.listVehiclesForCustomer.mockResolvedValue([{ id: 'vehicle-1' }]);

    const response = await GET(
      new Request('http://localhost/api/vehicles/customer/customer-1'),
      routeContext({ id: 'customer-1' }),
    );

    expect(response.status).toBe(200);
    expect(vehicleServiceMock.listVehiclesForCustomer).toHaveBeenCalledWith('tenant-1', 'customer-1');
    await expect(readJson(response)).resolves.toMatchObject({
      data: { vehicles: [{ id: 'vehicle-1' }] },
      meta: { count: 1 },
      success: true,
    });
  });
});
