import { beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonRequest, routeContext } from '@/test/apiRouteTestUtils';

const tenantContextMock = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
}));
const jobWorkServiceMock = vi.hoisted(() => ({
  addLabourEntry: vi.fn(),
}));

vi.mock('@/lib/tenancy/tenantContext', () => tenantContextMock);
vi.mock(
  '@/features/job-cards/services/jobWorkService',
  () => jobWorkServiceMock,
);

import { POST } from './route';

const JOB_ID = '33333333-3333-4333-8333-333333333333';
const validBody = {
  technicianId: '11111111-1111-4111-8111-111111111111',
  startedAt: '2026-11-18T08:00:00Z',
  endedAt: '2026-11-18T09:30:00Z',
};

const post = (body: unknown) =>
  POST(
    jsonRequest(`http://localhost/api/job-cards/${JOB_ID}/labour`, body, {
      method: 'POST',
    }),
    routeContext({ id: JOB_ID }),
  );

describe('/api/job-cards/[id]/labour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantContextMock.requireTenantContext.mockResolvedValue({
      tenantId: 'tenant-1',
    });
  });

  it('logs labour for the session tenant, defaulting to internal visibility', async () => {
    jobWorkServiceMock.addLabourEntry.mockResolvedValue({ id: 'entry-1' });

    const response = await post(validBody);

    expect(response.status).toBe(201);
    expect(jobWorkServiceMock.addLabourEntry).toHaveBeenCalledWith(
      'tenant-1',
      JOB_ID,
      { ...validBody, visibility: 'internal' },
    );
  });

  it.each([
    ['a client-supplied tenantId', { ...validBody, tenantId: 'other-tenant' }],
    ['a non-ISO start time', { ...validBody, startedAt: 'yesterday' }],
    ['a missing technician', { ...validBody, technicianId: undefined }],
  ])('rejects %s with 422', async (_label, body) => {
    const response = await post(body);

    expect(response.status).toBe(422);
    expect(jobWorkServiceMock.addLabourEntry).not.toHaveBeenCalled();
  });
});
