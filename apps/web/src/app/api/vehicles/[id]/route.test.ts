import { beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonRequest, readJson, routeContext } from '@/test/apiRouteTestUtils';

const tenantContextMock = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
}));
const vehicleServiceMock = vi.hoisted(() => ({
  deleteVehicle: vi.fn(),
  getVehicleById: vi.fn(),
  updateVehicle: vi.fn(),
}));

vi.mock('@/lib/tenancy/tenantContext', () => tenantContextMock);
vi.mock('@/features/vehicles/services/vehicleService', () => vehicleServiceMock);

import { DELETE, GET, PATCH } from './route';

describe('/api/vehicles/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantContextMock.requireTenantContext.mockResolvedValue({ tenantId: 'tenant-1' });
  });

  it('returns one vehicle by ID', async () => {
    vehicleServiceMock.getVehicleById.mockResolvedValue({ id: 'vehicle-1' });

    const response = await GET(
      new Request('http://localhost/api/vehicles/vehicle-1'),
      routeContext({ id: 'vehicle-1' }),
    );

    expect(response.status).toBe(200);
    expect(vehicleServiceMock.getVehicleById).toHaveBeenCalledWith('tenant-1', 'vehicle-1');
  });

  it('returns not found for missing vehicles', async () => {
    vehicleServiceMock.getVehicleById.mockResolvedValue(undefined);

    const response = await GET(
      new Request('http://localhost/api/vehicles/missing'),
      routeContext({ id: 'missing' }),
    );

    expect(response.status).toBe(404);
    await expect(readJson(response)).resolves.toMatchObject({
      error: { code: 'NOT_FOUND' },
      success: false,
    });
  });

  it('updates a vehicle', async () => {
    vehicleServiceMock.updateVehicle.mockResolvedValue({ id: 'vehicle-1', make: 'Ford' });

    const response = await PATCH(
      jsonRequest('http://localhost/api/vehicles/vehicle-1', { make: 'Ford' }, { method: 'PATCH' }),
      routeContext({ id: 'vehicle-1' }),
    );

    expect(response.status).toBe(200);
    expect(vehicleServiceMock.updateVehicle).toHaveBeenCalledWith('tenant-1', 'vehicle-1', {
      make: 'Ford',
    });
  });

  it('archives a vehicle', async () => {
    vehicleServiceMock.deleteVehicle.mockResolvedValue(undefined);

    const response = await DELETE(
      new Request('http://localhost/api/vehicles/vehicle-1', { method: 'DELETE' }),
      routeContext({ id: 'vehicle-1' }),
    );

    expect(response.status).toBe(200);
    expect(vehicleServiceMock.deleteVehicle).toHaveBeenCalledWith('tenant-1', 'vehicle-1');
  });
});
