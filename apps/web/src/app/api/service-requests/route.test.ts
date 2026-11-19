import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readJson } from '@/test/apiRouteTestUtils';

const tenantContextMock = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
}));
const jobCardServiceMock = vi.hoisted(() => ({
  listServiceRequests: vi.fn(),
}));

vi.mock('@/lib/tenancy/tenantContext', () => tenantContextMock);
vi.mock('@/lib/authorization/guards', () => ({
  TenantAccessError: class TenantAccessError extends Error {},
}));
vi.mock(
  '@/features/job-cards/services/jobCardService',
  () => jobCardServiceMock,
);

import { GET } from './route';

const tenantId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const serviceRequestId = '77777777-7777-4777-8777-777777777777';

describe('/api/service-requests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantContextMock.requireTenantContext.mockResolvedValue({ tenantId });
  });

  it('returns tenant service requests and count metadata', async () => {
    jobCardServiceMock.listServiceRequests.mockResolvedValue([
      { id: serviceRequestId },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(tenantContextMock.requireTenantContext).toHaveBeenCalledOnce();
    expect(jobCardServiceMock.listServiceRequests).toHaveBeenCalledWith(
      tenantId,
    );
    await expect(readJson(response)).resolves.toEqual({
      data: { serviceRequests: [{ id: serviceRequestId }] },
      meta: { count: 1 },
      success: true,
    });
  });

  it('maps permission failures to forbidden', async () => {
    jobCardServiceMock.listServiceRequests.mockRejectedValue(
      new Error('Cross-tenant access denied or missing permission.'),
    );

    const response = await GET();

    expect(response.status).toBe(403);
    await expect(readJson(response)).resolves.toMatchObject({
      error: { code: 'FORBIDDEN' },
      success: false,
    });
  });
});
