import { beforeEach, describe, expect, it, vi } from 'vitest';

const sessionMock = vi.hoisted(() => ({ requireUser: vi.fn() }));

vi.mock('@/lib/auth/session', () => sessionMock);
vi.mock('@/db/client', () => ({ db: {} }));

import { TenantAccessError } from '@/lib/authorization/guards';

import type { CustomerDashboardQueries } from './customerDashboardRepository';
import { getCustomerDashboard } from './customerDashboardService';
import { CustomerProfileNotFoundError } from './serviceHistoryService';

const USER_A = '0b7c6a4e-1111-4a4a-8a8a-000000000001';
const USER_B = '0b7c6a4e-2222-4b4b-8b8b-000000000002';

type Scope = { customerId: string };
type Rows = {
  invoices: string[];
  quotes: string[];
  requests: string[];
  vehicles: string[];
};

// Fake data access that behaves like the real tenant/customer-scoped queries.
function fakeQueries(data: {
  customersByUser: Record<string, { customerId: string; tenantId: string }>;
  rowsByCustomer: Record<string, Rows>;
}) {
  const rows = (s: Scope) =>
    data.rowsByCustomer[s.customerId] ?? {
      invoices: [],
      quotes: [],
      requests: [],
      vehicles: [],
    };

  return {
    countOpenInvoices: vi.fn(async (s: Scope) => [{ total: rows(s).invoices.length }]),
    countOpenQuotes: vi.fn(async (s: Scope) => [{ total: rows(s).quotes.length }]),
    countPendingRequests: vi.fn(async (s: Scope) => [{ total: rows(s).requests.length }]),
    countVehicles: vi.fn(async (s: Scope) => [{ total: rows(s).vehicles.length }]),
    findLinkedCustomer: vi.fn(async (tenantId: string, userId: string) => {
      const link = data.customersByUser[userId];
      return link && link.tenantId === tenantId ? [{ id: link.customerId }] : [];
    }),
    listOpenInvoices: vi.fn(async (s: Scope) =>
      rows(s).invoices.map((id) => ({
        dueAt: null,
        id,
        invoiceNumber: `INV-${id}`,
        status: 'issued',
        total: '100.00',
      })),
    ),
    listOpenQuotes: vi.fn(async (s: Scope) =>
      rows(s).quotes.map((id) => ({
        id,
        quoteNumber: `Q-${id}`,
        sentAt: new Date('2026-11-01T08:00:00.000Z'),
        status: 'sent',
        total: '250.00',
      })),
    ),
    listPendingRequests: vi.fn(async (s: Scope) =>
      rows(s).requests.map((id) => ({
        createdAt: new Date('2026-11-20T08:00:00.000Z'),
        id,
        requestedService: 'Full service',
      })),
    ),
    listVehicles: vi.fn(async (s: Scope) =>
      rows(s).vehicles.map((id) => ({
        id,
        make: 'VW',
        model: 'Polo',
        registrationNumber: null,
        year: 2020,
      })),
    ),
  } as unknown as CustomerDashboardQueries & Record<string, ReturnType<typeof vi.fn>>;
}

const data = {
  customersByUser: {
    [USER_A]: { customerId: 'customer-a', tenantId: 'tenant-1' },
    // Same tenant as A: the leak test that matters for this issue.
    [USER_B]: { customerId: 'customer-b', tenantId: 'tenant-1' },
  },
  rowsByCustomer: {
    'customer-a': {
      invoices: ['ia1'],
      quotes: ['qa1', 'qa2'],
      requests: ['ra1'],
      vehicles: ['va1', 'va2'],
    },
    'customer-b': { invoices: [], quotes: ['qb1'], requests: [], vehicles: ['vb1'] },
  },
};

function signIn(id: string, activeTenantId: string | null) {
  sessionMock.requireUser.mockResolvedValue({ activeTenantId, id, permissions: [] });
}

describe('getCustomerDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows only the signed-in customer’s records when two customers share a tenant', async () => {
    const queries = fakeQueries(data);

    signIn(USER_A, 'tenant-1');
    const a = await getCustomerDashboard(queries);
    signIn(USER_B, 'tenant-1');
    const b = await getCustomerDashboard(queries);

    expect(a.vehicles.items.map((v) => v.id)).toEqual(['va1', 'va2']);
    expect(a.openQuotes.items.map((q) => q.id)).toEqual(['qa1', 'qa2']);
    expect(a.openInvoices.total).toBe(1);
    expect(a.pendingRequests.total).toBe(1);

    expect(b.vehicles.items.map((v) => v.id)).toEqual(['vb1']);
    expect(b.openQuotes.items.map((q) => q.id)).toEqual(['qb1']);
    expect(b.openInvoices).toEqual({ items: [], total: 0 });
    expect(b.pendingRequests).toEqual({ items: [], total: 0 });

    expect(queries.listVehicles).toHaveBeenNthCalledWith(
      1,
      { customerId: 'customer-a', tenantId: 'tenant-1' },
      3,
    );
    expect(queries.listVehicles).toHaveBeenNthCalledWith(
      2,
      { customerId: 'customer-b', tenantId: 'tenant-1' },
      3,
    );
  });

  it('returns real zero counts and empty lists for a customer with no records', async () => {
    const queries = fakeQueries({
      customersByUser: { [USER_A]: { customerId: 'customer-new', tenantId: 'tenant-1' } },
      rowsByCustomer: {},
    });
    signIn(USER_A, 'tenant-1');

    const dashboard = await getCustomerDashboard(queries);
    const empty = { items: [], total: 0 };

    expect(dashboard).toEqual({
      openInvoices: empty,
      openQuotes: empty,
      pendingRequests: empty,
      vehicles: empty,
    });
  });

  it('serialises dates to ISO strings', async () => {
    signIn(USER_A, 'tenant-1');
    const dashboard = await getCustomerDashboard(fakeQueries(data));

    expect(dashboard.openQuotes.items[0]?.sentAt).toBe('2026-11-01T08:00:00.000Z');
    expect(dashboard.pendingRequests.items[0]?.createdAt).toBe('2026-11-20T08:00:00.000Z');
  });

  it('does not find a customer from another tenant', async () => {
    const queries = fakeQueries(data);
    signIn(USER_A, 'tenant-2');

    await expect(getCustomerDashboard(queries)).rejects.toBeInstanceOf(
      CustomerProfileNotFoundError,
    );
    expect(queries.listVehicles).not.toHaveBeenCalled();
  });

  it('requires an active tenant on the session', async () => {
    signIn(USER_A, null);

    await expect(getCustomerDashboard(fakeQueries(data))).rejects.toBeInstanceOf(
      TenantAccessError,
    );
  });

  it('does not query with identities that cannot be linked to a customer', async () => {
    const queries = fakeQueries(data);
    signIn('auth0|abc123', 'tenant-1');

    await expect(getCustomerDashboard(queries)).rejects.toBeInstanceOf(
      CustomerProfileNotFoundError,
    );
    expect(queries.findLinkedCustomer).not.toHaveBeenCalled();
  });
});