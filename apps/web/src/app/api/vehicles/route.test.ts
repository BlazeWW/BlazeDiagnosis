import { beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonRequest, readJson } from '@/test/apiRouteTestUtils';

const tenantContextMock = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
}));
const vehicleServiceMock = vi.hoisted(() => ({
  createVehicle: vi.fn(),
}));
const dbMock = vi.hoisted(() => ({
  select: vi.fn(),
}));

vi.mock('@/lib/tenancy/tenantContext', () => tenantContextMock);
vi.mock('@/features/vehicles/services/vehicleService', () => vehicleServiceMock);
vi.mock('@/db/client', () => ({ db: dbMock }));

import { GET, POST } from './route';

const customerId = '11111111-1111-4111-8111-111111111111';

describe('/api/vehicles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantContextMock.requireTenantContext.mockResolvedValue({ tenantId: 'tenant-1' });
  });

  it('returns tenant vehicles', async () => {
    dbMock.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ id: 'vehicle-1' }])),
      })),
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(readJson(response)).resolves.toEqual({
      data: { vehicles: [{ id: 'vehicle-1' }] },
      meta: { count: 1 },
      success: true,
    });
  });

  it('creates a vehicle', async () => {
    vehicleServiceMock.createVehicle.mockResolvedValue({ id: 'vehicle-1' });

    const response = await POST(
      jsonRequest('http://localhost/api/vehicles', {
        make: 'Toyota',
        model: 'Hilux',
        primaryCustomerId: customerId,
      }),
    );

    expect(response.status).toBe(201);
    expect(vehicleServiceMock.createVehicle).toHaveBeenCalledWith('tenant-1', {
      make: 'Toyota',
      model: 'Hilux',
      primaryCustomerId: customerId,
    });
    await expect(readJson(response)).resolves.toEqual({
      data: { vehicle: { id: 'vehicle-1' } },
      success: true,
    });
  });
});
