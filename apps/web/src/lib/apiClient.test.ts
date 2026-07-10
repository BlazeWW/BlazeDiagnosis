import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createCustomer,
  deleteCustomer,
  fetchCustomerById,
  fetchCustomers,
  fetchCustomerIntakeHistory,
  requestJson,
  updateCustomer,
} from './apiClient';

function mockFetchResponse(payload: unknown, ok = true, status = ok ? 200 : 500) {
  return vi.fn().mockResolvedValue({
    json: vi.fn().mockResolvedValue(payload),
    ok,
    status,
  });
}

describe('apiClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('unwraps successful standardized API responses', async () => {
    vi.stubGlobal('fetch', mockFetchResponse({ data: { id: 'record-1' }, success: true }));

    await expect(requestJson<{ id: string }>('/api/demo')).resolves.toEqual({ id: 'record-1' });
  });

  it('throws standardized API errors', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetchResponse(
        {
          error: { code: 'NOT_FOUND', message: 'Missing record.' },
          success: false,
        },
        false,
        404,
      ),
    );

    await expect(requestJson('/api/demo')).rejects.toThrow('Missing record.');
  });

  it('calls customer list and detail endpoints', async () => {
    const fetchMock = mockFetchResponse({
      data: { customer: { id: 'customer-1' }, customers: [] },
      success: true,
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchCustomers('ben henning');
    await fetchCustomerById('customer-1');

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/customers?q=ben%20henning', {});
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/customers/customer-1', {});
  });

  it('unwraps created and updated customers', async () => {
    const fetchMock = mockFetchResponse({
      data: { customer: { id: 'customer-1' } },
      success: true,
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(createCustomer({ firstName: 'Ben' })).resolves.toEqual({ id: 'customer-1' });
    await expect(updateCustomer('customer-1', { firstName: 'Updated' })).resolves.toEqual({ id: 'customer-1' });
  });

  it('encodes customer intake lookup params and deletes customers', async () => {
    const fetchMock = mockFetchResponse({ data: { id: 'customer-1', intakes: [] }, success: true });
    vi.stubGlobal('fetch', fetchMock);

    await fetchCustomerIntakeHistory('customer 1');
    await deleteCustomer('customer-1');

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/customer-intakes?customerId=customer%201', {});
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/customers/customer-1', {
      method: 'DELETE',
    });
  });
});
