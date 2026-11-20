import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.AUTH0_DOMAIN = 'test.auth0.com';
  process.env.AUTH0_AUDIENCE = 'test-audience';
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/test';
});

const guardMock = vi.hoisted(() => ({
  requireTenantPermission: vi.fn(),
}));
const dbMock = vi.hoisted(() => ({
  select: vi.fn(),
}));

vi.mock('@/lib/authorization/guards', () => guardMock);
vi.mock('@/db/client', () => ({ db: dbMock }));

import { getTenantUsageMetrics } from './tenantService';

const TENANT_A = '00000000-0000-0000-0000-000000000001';

function mockAggregate(rows: { activeUsers: number; jobsCreated: number; quotesSent: number }[]) {
  dbMock.select.mockReturnValueOnce({
    from: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve(rows)),
    })),
  });
}

describe('getTenantUsageMetrics (BD-048)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardMock.requireTenantPermission.mockResolvedValue(undefined);
  });

  it('returns aggregated metrics for the tenant', async () => {
    mockAggregate([{ activeUsers: 5, jobsCreated: 12, quotesSent: 3 }]);

    const metrics = await getTenantUsageMetrics(TENANT_A, 30);

    expect(guardMock.requireTenantPermission).toHaveBeenCalledWith(
      TENANT_A,
      'platform.tenants.manage',
    );
    expect(metrics).toEqual({
      tenantId: TENANT_A,
      days: 30,
      activeUsers: 5,
      jobsCreated: 12,
      quotesSent: 3,
    });
  });

  it('returns zero-valued metrics when no audit logs exist (safe empty state)', async () => {
    mockAggregate([]);

    const metrics = await getTenantUsageMetrics(TENANT_A, 30);

    expect(metrics).toEqual({
      tenantId: TENANT_A,
      days: 30,
      activeUsers: 0,
      jobsCreated: 0,
      quotesSent: 0,
    });
  });

  it('rejects callers without platform.tenants.manage', async () => {
    guardMock.requireTenantPermission.mockRejectedValueOnce(
      new Error('Forbidden: missing platform.tenants.manage'),
    );

    await expect(getTenantUsageMetrics(TENANT_A, 30)).rejects.toThrow(/Forbidden/i);
    expect(dbMock.select).not.toHaveBeenCalled();
  });

  it('rejects invalid days values (<= 0)', async () => {
    await expect(getTenantUsageMetrics(TENANT_A, 0)).rejects.toThrow(/days/i);
    await expect(getTenantUsageMetrics(TENANT_A, -7)).rejects.toThrow(/days/i);
    expect(dbMock.select).not.toHaveBeenCalled();
  });
});