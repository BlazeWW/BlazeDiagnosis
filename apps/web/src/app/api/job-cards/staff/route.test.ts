import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readJson } from '@/test/apiRouteTestUtils';

const tenantContextMock = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
}));
const jobCardServiceMock = vi.hoisted(() => ({
  getEligibleStaffMembers: vi.fn(),
}));

vi.mock('@/lib/tenancy/tenantContext', () => tenantContextMock);
vi.mock('@/features/job-cards/services/jobCardService', () => jobCardServiceMock);
vi.mock('@/db/client', () => ({ db: {} }));

import { TenantAccessError } from '@/lib/authorization/guards';

import { GET } from './route';

describe('/api/job-cards/staff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantContextMock.requireTenantContext.mockResolvedValue({
      tenantId: 'tenant-1',
    });
  });

  it('returns eligible staff for the session tenant', async () => {
    jobCardServiceMock.getEligibleStaffMembers.mockResolvedValue([
      {
        userId: '11111111-1111-4111-8111-111111111111',
        name: 'Sam',
        email: 's@x.co',
        role: 'mechanic',
        activeJobCount: 2,
      },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(jobCardServiceMock.getEligibleStaffMembers).toHaveBeenCalledWith(
      'tenant-1',
    );
    await expect(readJson(response)).resolves.toEqual({
      data: {
        staff: [
          expect.objectContaining({
            userId: '11111111-1111-4111-8111-111111111111',
            activeJobCount: 2,
          }),
        ],
      },
      meta: { count: 1 },
      success: true,
    });
  });

  it('returns 403 when the tenant context denies access', async () => {
    tenantContextMock.requireTenantContext.mockRejectedValue(
      new TenantAccessError('denied'),
    );

    const response = await GET();

    expect(response.status).toBe(403);
    expect(jobCardServiceMock.getEligibleStaffMembers).not.toHaveBeenCalled();
  });
});
