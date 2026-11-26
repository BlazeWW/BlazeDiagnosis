import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readJson } from '@/test/apiRouteTestUtils';

const tenantContextMock = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
}));
const jobCardServiceMock = vi.hoisted(() => ({
  getWorkshopBoard: vi.fn(),
}));

vi.mock('@/lib/tenancy/tenantContext', () => tenantContextMock);
vi.mock(
  '@/features/job-cards/services/jobCardService',
  () => jobCardServiceMock,
);
vi.mock('@/db/client', () => ({ db: {} }));

import { GET } from './route';

describe('/api/job-cards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantContextMock.requireTenantContext.mockResolvedValue({
      tenantId: 'tenant-1',
    });
  });

  it('returns the tenant workshop board as jobCards with count metadata', async () => {
    jobCardServiceMock.getWorkshopBoard.mockResolvedValue([
      { id: 'job-1' },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(jobCardServiceMock.getWorkshopBoard).toHaveBeenCalledWith(
      'tenant-1',
    );
    await expect(readJson(response)).resolves.toEqual({
      data: { jobCards: [{ id: 'job-1' }] },
      meta: { count: 1 },
      success: true,
    });
  });
});
