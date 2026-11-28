import { beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonRequest, readJson } from '@/test/apiRouteTestUtils';

import { TenantAccessError } from '@/lib/authorization/guards';

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
vi.mock(
  '@/features/vehicles/services/vehicleService',
  () => vehicleServiceMock,
);
vi.mock('@/db/client', () => ({ db: dbMock }));

import { GET, POST } from './route';

const customerId = '11111111-1111-4111-8111-111111111111';

describe('/api/vehicles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantContextMock.requireTenantContext.mockResolvedValue({
      tenantId: 'tenant-1',
    });
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

  it('returns validation errors for invalid payloads', async () => {
    const response = await POST(
      jsonRequest('http://localhost/api/vehicles', {
        make: '',
        model: 'Hilux',
        primaryCustomerId: customerId,
      }),
    );

    expect(response.status).toBe(422);
    await expect(readJson(response)).resolves.toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
      success: false,
    });
  });

  it('rejects requests when tenant access is denied', async () => {
    tenantContextMock.requireTenantContext.mockRejectedValue(
      new TenantAccessError(),
    );

    const response = await GET();

    expect(response.status).toBe(403);
    await expect(readJson(response)).resolves.toMatchObject({
      error: { code: 'FORBIDDEN' },
      success: false,
    });
  });

  it('returns a safe error for malformed JSON', async () => {
    const response = await POST(
      new Request('http://localhost/api/vehicles', {
        body: '{"make":',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
    );

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toMatchObject({
      error: {
        code: 'BAD_REQUEST',
        message: 'Malformed JSON request body.',
      },
      success: false,
    });
  });
});
