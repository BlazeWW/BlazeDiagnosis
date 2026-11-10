import { beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonRequest, readJson, routeContext } from '@/test/apiRouteTestUtils';

const tenantContextMock = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
}));
const jobCardServiceMock = vi.hoisted(() => ({
  assignJobStaff: vi.fn(),
}));

vi.mock('@/lib/tenancy/tenantContext', () => tenantContextMock);
vi.mock('@/features/job-cards/services/jobCardService', () => jobCardServiceMock);
vi.mock('@/db/client', () => ({ db: {} }));

import { TenantAccessError } from '@/lib/authorization/guards';

import { PATCH } from './route';

const JOB_ID = '33333333-3333-4333-8333-333333333333';
const MECHANIC_ID = '11111111-1111-4111-8111-111111111111';

describe('/api/job-cards/[id]/staff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantContextMock.requireTenantContext.mockResolvedValue({
      tenantId: 'tenant-1',
    });
  });

  it('assigns staff using the session tenant, never a client tenantId', async () => {
    jobCardServiceMock.assignJobStaff.mockResolvedValue({
      id: JOB_ID,
      assignedMechanicId: MECHANIC_ID,
    });

    const response = await PATCH(
      jsonRequest(
        `http://localhost/api/job-cards/${JOB_ID}/staff`,
        { mechanicId: MECHANIC_ID },
        { method: 'PATCH' },
      ),
      routeContext({ id: JOB_ID }),
    );

    expect(response.status).toBe(200);
    expect(jobCardServiceMock.assignJobStaff).toHaveBeenCalledWith(
      'tenant-1',
      JOB_ID,
      { mechanicId: MECHANIC_ID },
    );
    await expect(readJson(response)).resolves.toEqual({
      data: {
        jobCard: { id: JOB_ID, assignedMechanicId: MECHANIC_ID },
      },
      success: true,
    });
  });

  it('rejects an empty assignment payload', async () => {
    const response = await PATCH(
      jsonRequest(`http://localhost/api/job-cards/${JOB_ID}/staff`, {}, {
        method: 'PATCH',
      }),
      routeContext({ id: JOB_ID }),
    );

    expect(response.status).toBe(422);
    expect(jobCardServiceMock.assignJobStaff).not.toHaveBeenCalled();
  });

  it('returns 403 when the tenant context denies access', async () => {
    tenantContextMock.requireTenantContext.mockRejectedValue(
      new TenantAccessError('denied'),
    );

    const response = await PATCH(
      jsonRequest(
        `http://localhost/api/job-cards/${JOB_ID}/staff`,
        { mechanicId: MECHANIC_ID },
        { method: 'PATCH' },
      ),
      routeContext({ id: JOB_ID }),
    );

    expect(response.status).toBe(403);
    expect(jobCardServiceMock.assignJobStaff).not.toHaveBeenCalled();
  });

  it('surfaces service failures', async () => {
    jobCardServiceMock.assignJobStaff.mockRejectedValue(
      new Error('Job not found'),
    );

    const response = await PATCH(
      jsonRequest(
        `http://localhost/api/job-cards/${JOB_ID}/staff`,
        { mechanicId: MECHANIC_ID },
        { method: 'PATCH' },
      ),
      routeContext({ id: JOB_ID }),
    );

    expect(response.status).toBe(500);
  });
});
