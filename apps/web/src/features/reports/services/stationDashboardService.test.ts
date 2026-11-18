import { beforeEach, describe, expect, it, vi } from 'vitest';

const tenantContextMock = vi.hoisted(() => ({ requireTenantContext: vi.fn() }));
const guardsMock = vi.hoisted(() => ({ requireTenantPermission: vi.fn() }));

vi.mock('@/lib/tenancy/tenantContext', () => tenantContextMock);
vi.mock('@/lib/authorization/guards', () => guardsMock);
vi.mock('@/db/client', () => ({ db: {} }));

import type { StationDashboardQueries } from './stationDashboardRepository';
import { getStationDashboard } from './stationDashboardService';

const NOW = new Date('2026-11-18T10:00:00.000Z');

type TenantData = {
  attentionJobs: Array<{
    expectedCompletionAt: Date | null;
    jobNumber: string;
  }>;
  counts: { awaitingApproval: number; awaitingParts: number; openJobs: number };
  invoices: { count: number; total: string };
  parts: Array<{ jobNumber: string }>;
};

const tenants: Record<string, TenantData> = {
  'tenant-a': {
    attentionJobs: [
      {
        expectedCompletionAt: new Date('2026-11-17T08:00:00.000Z'),
        jobNumber: 'A-1',
      },
      { expectedCompletionAt: null, jobNumber: 'A-2' },
    ],
    counts: { awaitingApproval: 1, awaitingParts: 2, openJobs: 4 },
    invoices: { count: 2, total: '3500.00' },
    parts: [{ jobNumber: 'A-1' }],
  },
  'tenant-b': {
    attentionJobs: [{ expectedCompletionAt: null, jobNumber: 'B-1' }],
    counts: { awaitingApproval: 0, awaitingParts: 0, openJobs: 1 },
    invoices: { count: 1, total: '100.00' },
    parts: [],
  },
};

// Fake data access that returns each tenant's own rows, like the real queries.
function fakeQueries() {
  return {
    attentionJobs: vi.fn(async (tenantId: string) =>
      (tenants[tenantId]?.attentionJobs ?? []).map((job, index) => ({
        customerFirstName: 'Test',
        customerLastName: `Customer ${index}`,
        expectedCompletionAt: job.expectedCompletionAt,
        id: `${tenantId}-job-${index}`,
        internalStatus: 'work_in_progress',
        jobNumber: job.jobNumber,
        priority: 'normal',
        vehicleMake: 'VW',
        vehicleModel: 'Polo',
        vehicleRegistrationNumber: null,
      })),
    ),
    jobCounts: vi.fn(async (tenantId: string) =>
      tenants[tenantId] ? [tenants[tenantId].counts] : [],
    ),
    outstandingInvoices: vi.fn(async (tenantId: string) => [
      tenants[tenantId]?.invoices ?? { count: 0, total: '0.00' },
    ]),
    partsQueue: vi.fn(async (tenantId: string) =>
      (tenants[tenantId]?.parts ?? []).map((part, index) => ({
        id: `${tenantId}-parts-${index}`,
        jobNumber: part.jobNumber,
        requestedAt: new Date('2026-11-16T09:00:00.000Z'),
        status: 'sent',
      })),
    ),
  } as unknown as StationDashboardQueries &
    Record<string, ReturnType<typeof vi.fn>>;
}

function signIn(tenantId: string, permissions: string[]) {
  tenantContextMock.requireTenantContext.mockResolvedValue({
    source: 'session',
    tenantId,
  });
  guardsMock.requireTenantPermission.mockResolvedValue({
    id: 'user-1',
    permissions,
  });
}

describe('getStationDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows different metrics for two tenants with different records', async () => {
    const queries = fakeQueries();

    signIn('tenant-a', ['jobs.read', 'reports.view']);
    const dashboardA = await getStationDashboard({ now: NOW }, queries);
    signIn('tenant-b', ['jobs.read', 'reports.view']);
    const dashboardB = await getStationDashboard({ now: NOW }, queries);

    expect(dashboardA.metrics).toEqual({
      awaitingApproval: 1,
      awaitingParts: 2,
      openJobs: 4,
      outstandingInvoices: { count: 2, total: '3500.00' },
    });
    expect(dashboardB.metrics.openJobs).toBe(1);
    expect(dashboardB.attentionJobs.map((job) => job.jobNumber)).toEqual([
      'B-1',
    ]);
    expect(queries.jobCounts).toHaveBeenNthCalledWith(1, 'tenant-a');
    expect(queries.jobCounts).toHaveBeenNthCalledWith(2, 'tenant-b');
  });

  it('shows zeros and empty lists for a tenant with no records', async () => {
    signIn('tenant-empty', ['jobs.read', 'reports.view']);

    const dashboard = await getStationDashboard({ now: NOW }, fakeQueries());

    expect(dashboard).toEqual({
      attentionJobs: [],
      generatedAt: NOW.toISOString(),
      metrics: {
        awaitingApproval: 0,
        awaitingParts: 0,
        openJobs: 0,
        outstandingInvoices: { count: 0, total: '0.00' },
      },
      partsQueue: [],
    });
  });

  it('requires jobs.read for the tenant from the session', async () => {
    signIn('tenant-a', ['jobs.read']);

    await getStationDashboard({ now: NOW }, fakeQueries());

    expect(guardsMock.requireTenantPermission).toHaveBeenCalledWith(
      'tenant-a',
      'jobs.read',
    );
  });

  it('does not load or return invoice money for roles without financial access', async () => {
    const queries = fakeQueries();
    signIn('tenant-a', ['jobs.read']);

    const dashboard = await getStationDashboard({ now: NOW }, queries);

    expect(dashboard.metrics.outstandingInvoices).toBeNull();
    expect(queries.outstandingInvoices).not.toHaveBeenCalled();
  });

  it('propagates access denial without querying', async () => {
    const queries = fakeQueries();
    tenantContextMock.requireTenantContext.mockResolvedValue({
      source: 'session',
      tenantId: 'tenant-a',
    });
    guardsMock.requireTenantPermission.mockRejectedValue(
      new Error('Cross-tenant access denied or missing permission.'),
    );

    await expect(getStationDashboard({ now: NOW }, queries)).rejects.toThrow(
      'Cross-tenant',
    );
    expect(queries.jobCounts).not.toHaveBeenCalled();
  });

  it('flags jobs past their expected completion as overdue', async () => {
    signIn('tenant-a', ['jobs.read']);

    const dashboard = await getStationDashboard({ now: NOW }, fakeQueries());

    expect(
      dashboard.attentionJobs.map((job) => [job.jobNumber, job.isOverdue]),
    ).toEqual([
      ['A-1', true],
      ['A-2', false],
    ]);
    expect(dashboard.partsQueue).toEqual([
      {
        id: 'tenant-a-parts-0',
        jobNumber: 'A-1',
        requestedAt: '2026-11-16T09:00:00.000Z',
        status: 'sent',
      },
    ]);
  });
});
