import { beforeEach, describe, expect, it, vi } from 'vitest';

import { routeContext } from '@/test/apiRouteTestUtils';

const tenantContextMock = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
}));
const historyServiceMock = vi.hoisted(() => ({
  getVehicleServiceHistory: vi.fn(),
}));

vi.mock('@/lib/tenancy/tenantContext', () => tenantContextMock);
vi.mock(
  '@/features/vehicles/services/vehicleHistoryService',
  () => historyServiceMock,
);

import { ApiRequestError } from '@/lib/api/response';
import { TenantAccessError } from '@/lib/authorization/guards';

import { GET } from './route';

describe('/api/vehicles/[id]/history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantContextMock.requireTenantContext.mockResolvedValue({
      tenantId: 'tenant-1',
    });
  });

  it('ignores client-supplied audience and customerId query params', async () => {
    historyServiceMock.getVehicleServiceHistory.mockResolvedValue({
      vehicleId: 'vehicle-1',
    });

    const response = await GET(
      new Request(
        'http://localhost/api/vehicles/vehicle-1/history?audience=staff&customerId=someone-else',
      ),
      routeContext({ id: 'vehicle-1' }),
    );

    expect(response.status).toBe(200);
    expect(historyServiceMock.getVehicleServiceHistory).toHaveBeenCalledWith(
      'tenant-1',
      'vehicle-1',
    );
  });

  it('returns 403 when the customer does not own the vehicle', async () => {
    historyServiceMock.getVehicleServiceHistory.mockRejectedValue(
      new TenantAccessError('Vehicle does not belong to this customer.'),
    );

    const response = await GET(
      new Request('http://localhost/api/vehicles/vehicle-1/history'),
      routeContext({ id: 'vehicle-1' }),
    );

    expect(response.status).toBe(403);
  });

  it('returns 404 when the vehicle is missing, archived or in another tenant', async () => {
    historyServiceMock.getVehicleServiceHistory.mockRejectedValue(
      new ApiRequestError('NOT_FOUND', 404, 'Vehicle not found.'),
    );

    const response = await GET(
      new Request('http://localhost/api/vehicles/vehicle-1/history'),
      routeContext({ id: 'vehicle-1' }),
    );

    expect(response.status).toBe(404);
  });
});
