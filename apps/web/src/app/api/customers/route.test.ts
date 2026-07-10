import { beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonRequest, readJson } from '@/test/apiRouteTestUtils';

const tenantContextMock = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
}));
const customerServiceMock = vi.hoisted(() => ({
  createCustomer: vi.fn(),
  searchCustomers: vi.fn(),
}));

vi.mock('@/lib/tenancy/tenantContext', () => tenantContextMock);
vi.mock('@/features/customers/services/customerService', () => customerServiceMock);

import { GET, POST } from './route';

describe('/api/customers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantContextMock.requireTenantContext.mockResolvedValue({ tenantId: 'tenant-1' });
  });

  it('returns customers using tenant context and search query', async () => {
    customerServiceMock.searchCustomers.mockResolvedValue([
      { firstName: 'Ben', id: 'customer-1' },
    ]);

    const response = await GET(new Request('http://localhost/api/customers?q=ben'));
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(customerServiceMock.searchCustomers).toHaveBeenCalledWith('tenant-1', 'ben');
    expect(payload).toEqual({
      data: { customers: [{ firstName: 'Ben', id: 'customer-1' }] },
      meta: { count: 1 },
      success: true,
    });
  });

  it('creates a customer and returns the standardized created envelope', async () => {
    customerServiceMock.createCustomer.mockResolvedValue({ id: 'customer-1' });

    const response = await POST(
      jsonRequest('http://localhost/api/customers', {
        email: 'ben@example.com',
        firstName: 'Ben',
        lastName: 'Henning',
      }),
    );
    const payload = await readJson(response);

    expect(response.status).toBe(201);
    expect(customerServiceMock.createCustomer).toHaveBeenCalledWith('tenant-1', {
      email: 'ben@example.com',
      firstName: 'Ben',
      lastName: 'Henning',
      preferredLocale: 'en',
    });
    expect(payload).toEqual({
      data: { customer: { id: 'customer-1' } },
      success: true,
    });
  });

  it('returns validation errors for invalid payloads', async () => {
    const response = await POST(
      jsonRequest('http://localhost/api/customers', { firstName: '' }),
    );
    const payload = await readJson<{ error: { code: string }; success: boolean }>(response);

    expect(response.status).toBe(422);
    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe('VALIDATION_ERROR');
  });
});
