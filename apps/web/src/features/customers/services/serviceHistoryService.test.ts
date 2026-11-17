import { beforeEach, describe, expect, it, vi } from 'vitest';

const sessionMock = vi.hoisted(() => ({ requireUser: vi.fn() }));

vi.mock('@/lib/auth/session', () => sessionMock);
vi.mock('@/db/client', () => ({ db: {} }));

import { TenantAccessError } from '@/lib/authorization/guards';

import type { ServiceHistoryQueries } from './serviceHistoryRepository';
import {
  CustomerProfileNotFoundError,
  getCustomerServiceHistory,
} from './serviceHistoryService';

const USER_A = '0b7c6a4e-1111-4a4a-8a8a-000000000001';
const USER_B = '0b7c6a4e-2222-4b4b-8b8b-000000000002';

const jobRow = (jobCardId: string) => ({
  completedAt: null,
  createdAt: new Date('2026-10-01T08:00:00.000Z'),
  customerStatus: 'service_in_progress' as const,
  expectedCompletionAt: null,
  jobCardId,
  jobNumber: `JOB-${jobCardId}`,
  vehicleMake: 'VW',
  vehicleModel: 'Polo',
  vehicleRegistrationNumber: null,
  vehicleYear: 2020,
});

// Fake data access that behaves like the real tenant/customer-scoped queries.
function fakeQueries(data: {
  customersByUser: Record<string, { customerId: string; tenantId: string }>;
  jobsByCustomer: Record<string, string[]>;
}) {
  return {
    countJobs: vi.fn(async (scope: { customerId: string }) => [
      { total: (data.jobsByCustomer[scope.customerId] ?? []).length },
    ]),
    findLinkedCustomer: vi.fn(async (tenantId: string, userId: string) => {
      const link = data.customersByUser[userId];
      return link && link.tenantId === tenantId
        ? [{ id: link.customerId }]
        : [];
    }),
    listCustomerNotes: vi.fn(async () => []),
    listInvoices: vi.fn(async () => []),
    listJobs: vi.fn(
      async (
        scope: { customerId: string },
        page: { limit: number; offset: number },
      ) =>
        (data.jobsByCustomer[scope.customerId] ?? [])
          .slice(page.offset, page.offset + page.limit)
          .map(jobRow),
    ),
    listQuotes: vi.fn(async () => []),
  } as unknown as ServiceHistoryQueries &
    Record<string, ReturnType<typeof vi.fn>>;
}

const data = {
  customersByUser: {
    [USER_A]: { customerId: 'customer-a', tenantId: 'tenant-1' },
    [USER_B]: { customerId: 'customer-b', tenantId: 'tenant-2' },
  },
  jobsByCustomer: {
    'customer-a': ['a1', 'a2', 'a3'],
    'customer-b': ['b1'],
  },
};

function signIn(id: string, activeTenantId: string | null) {
  sessionMock.requireUser.mockResolvedValue({
    activeTenantId,
    id,
    permissions: [],
  });
}

describe('getCustomerServiceHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only the signed-in customer's jobs (two-account isolation)", async () => {
    const queries = fakeQueries(data);

    signIn(USER_A, 'tenant-1');
    const historyA = await getCustomerServiceHistory({}, queries);
    signIn(USER_B, 'tenant-2');
    const historyB = await getCustomerServiceHistory({}, queries);

    expect(historyA.items.map((item) => item.jobCardId)).toEqual([
      'a1',
      'a2',
      'a3',
    ]);
    expect(historyB.items.map((item) => item.jobCardId)).toEqual(['b1']);
    expect(queries.listJobs).toHaveBeenNthCalledWith(
      1,
      { customerId: 'customer-a', tenantId: 'tenant-1' },
      { limit: 10, offset: 0 },
    );
    expect(queries.listJobs).toHaveBeenNthCalledWith(
      2,
      { customerId: 'customer-b', tenantId: 'tenant-2' },
      { limit: 10, offset: 0 },
    );
  });

  it('ignores tenant or customer ids supplied by the client', async () => {
    const queries = fakeQueries(data);
    signIn(USER_A, 'tenant-1');

    const history = await getCustomerServiceHistory(
      { customerId: 'customer-b', tenantId: 'tenant-2' } as never,
      queries,
    );

    expect(history.items.map((item) => item.jobCardId)).toEqual([
      'a1',
      'a2',
      'a3',
    ]);
    expect(queries.findLinkedCustomer).toHaveBeenCalledWith('tenant-1', USER_A);
  });

  it('does not find a customer from another tenant', async () => {
    const queries = fakeQueries(data);
    signIn(USER_A, 'tenant-2');

    await expect(getCustomerServiceHistory({}, queries)).rejects.toBeInstanceOf(
      CustomerProfileNotFoundError,
    );
    expect(queries.listJobs).not.toHaveBeenCalled();
  });

  it('paginates with page and pageSize', async () => {
    const queries = fakeQueries(data);
    signIn(USER_A, 'tenant-1');

    const history = await getCustomerServiceHistory(
      { page: '2', pageSize: '2' },
      queries,
    );

    expect(queries.listJobs).toHaveBeenCalledWith(expect.anything(), {
      limit: 2,
      offset: 2,
    });
    expect(history.items.map((item) => item.jobCardId)).toEqual(['a3']);
    expect(history.pagination).toEqual({
      hasNextPage: false,
      page: 2,
      pageSize: 2,
      total: 3,
      totalPages: 2,
    });
  });

  it('rejects page sizes above the maximum', async () => {
    signIn(USER_A, 'tenant-1');

    await expect(
      getCustomerServiceHistory({ pageSize: 500 }, fakeQueries(data)),
    ).rejects.toThrow();
  });

  it('returns an empty history without loading documents', async () => {
    const queries = fakeQueries({
      customersByUser: {
        [USER_A]: { customerId: 'customer-new', tenantId: 'tenant-1' },
      },
      jobsByCustomer: {},
    });
    signIn(USER_A, 'tenant-1');

    const history = await getCustomerServiceHistory({}, queries);

    expect(history).toEqual({
      items: [],
      pagination: {
        hasNextPage: false,
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
      },
    });
    expect(queries.listQuotes).not.toHaveBeenCalled();
    expect(queries.listInvoices).not.toHaveBeenCalled();
    expect(queries.listCustomerNotes).not.toHaveBeenCalled();
  });

  it('requires an active tenant on the session', async () => {
    signIn(USER_A, null);

    await expect(
      getCustomerServiceHistory({}, fakeQueries(data)),
    ).rejects.toBeInstanceOf(TenantAccessError);
  });

  it('does not query with identities that cannot be linked to a customer', async () => {
    const queries = fakeQueries(data);
    signIn('auth0|abc123', 'tenant-1');

    await expect(getCustomerServiceHistory({}, queries)).rejects.toBeInstanceOf(
      CustomerProfileNotFoundError,
    );
    expect(queries.findLinkedCustomer).not.toHaveBeenCalled();
  });
});
