import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readJson, routeContext } from '@/test/apiRouteTestUtils';

const tenantContextMock = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
}));
const jobCardServiceMock = vi.hoisted(() => ({
  getServiceRequestById: vi.fn(),
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

describe('/api/job-cards/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantContextMock.requireTenantContext.mockResolvedValue({ tenantId });
  });

  it('returns a tenant-scoped service request', async () => {
    jobCardServiceMock.getServiceRequestById.mockResolvedValue({
      id: serviceRequestId,
    });

    const response = await GET(
      new Request(`http://localhost/api/job-cards/${serviceRequestId}`),
      routeContext({ id: serviceRequestId }),
    );

    expect(response.status).toBe(200);
    expect(jobCardServiceMock.getServiceRequestById).toHaveBeenCalledWith(
      tenantId,
      serviceRequestId,
    );
    await expect(readJson(response)).resolves.toEqual({
      data: { serviceRequest: { id: serviceRequestId } },
      success: true,
    });
  });

  it('returns not found for missing and foreign-tenant records', async () => {
    jobCardServiceMock.getServiceRequestById.mockResolvedValue(null);

    const response = await GET(
      new Request(`http://localhost/api/job-cards/${serviceRequestId}`),
      routeContext({ id: serviceRequestId }),
    );

    expect(response.status).toBe(404);
    await expect(readJson(response)).resolves.toMatchObject({
      error: { code: 'NOT_FOUND' },
      success: false,
    });
  });

  it('returns forbidden when the service denies read permission', async () => {
    jobCardServiceMock.getServiceRequestById.mockRejectedValue(
      new Error('Cross-tenant access denied or missing permission.'),
    );

    const response = await GET(
      new Request(`http://localhost/api/job-cards/${serviceRequestId}`),
      routeContext({ id: serviceRequestId }),
    );

    expect(response.status).toBe(403);
    await expect(readJson(response)).resolves.toMatchObject({
      error: { code: 'FORBIDDEN' },
      success: false,
    });
  });

  it('returns validation errors for malformed record IDs', async () => {
    const response = await GET(
      new Request('http://localhost/api/job-cards/not-a-uuid'),
      routeContext({ id: 'not-a-uuid' }),
    );

    expect(response.status).toBe(422);
    expect(tenantContextMock.requireTenantContext).toHaveBeenCalledOnce();
    expect(jobCardServiceMock.getServiceRequestById).not.toHaveBeenCalled();
  });
});
