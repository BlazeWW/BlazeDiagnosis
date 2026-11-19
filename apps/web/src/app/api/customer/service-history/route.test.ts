import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';

import { readJson } from '@/test/apiRouteTestUtils';

const serviceMock = vi.hoisted(() => {
  class CustomerProfileNotFoundError extends Error {}
  return {
    CustomerProfileNotFoundError,
    getCustomerServiceHistory: vi.fn(),
  };
});

vi.mock(
  '@/features/customers/services/serviceHistoryService',
  () => serviceMock,
);

import { GET } from './route';

describe('/api/customer/service-history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the customer history with pagination meta', async () => {
    const pagination = {
      hasNextPage: false,
      page: 2,
      pageSize: 5,
      total: 6,
      totalPages: 2,
    };
    serviceMock.getCustomerServiceHistory.mockResolvedValue({
      items: [{ jobCardId: 'job-1' }],
      pagination,
    });

    const response = await GET(
      new Request(
        'http://localhost/api/customer/service-history?page=2&pageSize=5&tenantId=other',
      ),
    );

    expect(response.status).toBe(200);
    expect(serviceMock.getCustomerServiceHistory).toHaveBeenCalledWith({
      page: '2',
      pageSize: '5',
    });
    expect(await readJson(response)).toEqual({
      data: { items: [{ jobCardId: 'job-1' }] },
      meta: pagination,
      success: true,
    });
  });

  it('returns 404 when no customer profile is linked', async () => {
    serviceMock.getCustomerServiceHistory.mockRejectedValue(
      new serviceMock.CustomerProfileNotFoundError(
        'No customer profile is linked to this account.',
      ),
    );

    const response = await GET(
      new Request('http://localhost/api/customer/service-history'),
    );

    expect(response.status).toBe(404);
  });

  it('returns 401 when nobody is signed in', async () => {
    serviceMock.getCustomerServiceHistory.mockRejectedValue(
      new Error('Authentication required.'),
    );

    const response = await GET(
      new Request('http://localhost/api/customer/service-history'),
    );

    expect(response.status).toBe(401);
  });

  it('returns 422 for invalid paging values', async () => {
    serviceMock.getCustomerServiceHistory.mockRejectedValue(new ZodError([]));

    const response = await GET(
      new Request('http://localhost/api/customer/service-history?pageSize=500'),
    );

    expect(response.status).toBe(422);
  });
});
