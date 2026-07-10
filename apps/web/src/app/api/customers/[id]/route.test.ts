import { beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonRequest, readJson, routeContext } from '@/test/apiRouteTestUtils';

const tenantContextMock = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
}));
const customerServiceMock = vi.hoisted(() => ({
  deleteCustomer: vi.fn(),
  getCustomerById: vi.fn(),
  updateCustomer: vi.fn(),
}));

vi.mock('@/lib/tenancy/tenantContext', () => tenantContextMock);
vi.mock('@/features/customers/services/customerService', () => customerServiceMock);

import { DELETE, GET, PATCH } from './route';

describe('/api/customers/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantContextMock.requireTenantContext.mockResolvedValue({ tenantId: 'tenant-1' });
  });

  it('returns one customer by ID', async () => {
    customerServiceMock.getCustomerById.mockResolvedValue({ id: 'customer-1' });

    const response = await GET(
      new Request('http://localhost/api/customers/customer-1'),
      routeContext({ id: 'customer-1' }),
    );

    expect(response.status).toBe(200);
    expect(customerServiceMock.getCustomerById).toHaveBeenCalledWith('tenant-1', 'customer-1');
    await expect(readJson(response)).resolves.toEqual({
      data: { customer: { id: 'customer-1' } },
      success: true,
    });
  });

  it('returns not found for missing customers', async () => {
    customerServiceMock.getCustomerById.mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/customers/missing'),
      routeContext({ id: 'missing' }),
    );

    expect(response.status).toBe(404);
    await expect(readJson(response)).resolves.toMatchObject({
      error: { code: 'NOT_FOUND' },
      success: false,
    });
  });

  it('updates a customer', async () => {
    customerServiceMock.updateCustomer.mockResolvedValue({ firstName: 'Updated', id: 'customer-1' });

    const response = await PATCH(
      jsonRequest('http://localhost/api/customers/customer-1', { firstName: 'Updated' }, { method: 'PATCH' }),
      routeContext({ id: 'customer-1' }),
    );

    expect(response.status).toBe(200);
    expect(customerServiceMock.updateCustomer).toHaveBeenCalledWith('tenant-1', 'customer-1', {
      firstName: 'Updated',
    });
  });

  it('archives a customer', async () => {
    customerServiceMock.deleteCustomer.mockResolvedValue(undefined);

    const response = await DELETE(
      new Request('http://localhost/api/customers/customer-1', { method: 'DELETE' }),
      routeContext({ id: 'customer-1' }),
    );

    expect(response.status).toBe(200);
    expect(customerServiceMock.deleteCustomer).toHaveBeenCalledWith('tenant-1', 'customer-1');
    await expect(readJson(response)).resolves.toMatchObject({
      data: { id: 'customer-1' },
      success: true,
    });
  });
});
