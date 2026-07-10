import { beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonRequest, readJson } from '@/test/apiRouteTestUtils';

const tenantContextMock = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
}));
const customerServiceMock = vi.hoisted(() => ({
  createCustomerVehicleIntake: vi.fn(),
}));

vi.mock('@/lib/tenancy/tenantContext', () => tenantContextMock);
vi.mock('@/features/customers/services/customerService', () => customerServiceMock);

import { GET, POST } from './route';

const intakePayload = {
  customer: {
    firstName: 'Jane',
    lastName: 'Customer',
  },
  vehicle: {
    make: 'Toyota',
    model: 'Hilux',
    registrationNumber: 'CA123456',
  },
};

describe('/api/customer-intakes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantContextMock.requireTenantContext.mockResolvedValue({ tenantId: 'tenant-1' });
  });

  it('returns a customer intake history envelope for a customer', async () => {
    const response = await GET(
      new Request('http://localhost/api/customer-intakes?customerId=customer-1'),
    );

    expect(response.status).toBe(200);
    await expect(readJson(response)).resolves.toEqual({
      data: { intakes: [] },
      meta: { count: 0, customerId: 'customer-1' },
      success: true,
    });
  });

  it('requires customerId for GET', async () => {
    const response = await GET(new Request('http://localhost/api/customer-intakes'));

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toMatchObject({
      error: { code: 'BAD_REQUEST', details: { param: 'customerId' } },
      success: false,
    });
  });

  it('creates a customer and vehicle intake', async () => {
    customerServiceMock.createCustomerVehicleIntake.mockResolvedValue({
      customer: { id: 'customer-1' },
      vehicle: { id: 'vehicle-1' },
    });

    const response = await POST(
      jsonRequest('http://localhost/api/customer-intakes', intakePayload),
    );

    expect(response.status).toBe(201);
    expect(customerServiceMock.createCustomerVehicleIntake).toHaveBeenCalledWith(
      'tenant-1',
      intakePayload,
    );
  });
});
