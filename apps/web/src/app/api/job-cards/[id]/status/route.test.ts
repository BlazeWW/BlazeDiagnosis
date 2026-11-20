import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  JobCardNotFoundError,
  JobStatusConflictError,
} from '@/features/job-cards/services/jobStatusService';
import { jsonRequest, readJson, routeContext } from '@/test/apiRouteTestUtils';

const tenantContextMock = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
}));
const jobStatusServiceMock = vi.hoisted(() => ({
  getJobCardStatus: vi.fn(),
  transitionJobCardStatus: vi.fn(),
  JobCardNotFoundError: class JobCardNotFoundError extends Error {},
  JobStatusConflictError: class JobStatusConflictError extends Error {},
  JobStatusReasonRequiredError: class JobStatusReasonRequiredError extends Error {},
}));

vi.mock('@/lib/tenancy/tenantContext', () => tenantContextMock);
vi.mock('@/lib/authorization/guards', () => ({
  TenantAccessError: class TenantAccessError extends Error {},
}));
vi.mock(
  '@/features/job-cards/services/jobStatusService',
  () => jobStatusServiceMock,
);

import { GET, PATCH } from './route';

const tenantId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const jobCardId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const input = {
  targetInternalStatus: 'vehicle_received',
  expectedStatusVersion: 4,
};

describe('PATCH /api/job-cards/[id]/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantContextMock.requireTenantContext.mockResolvedValue({ tenantId });
  });

  it('returns the scoped status and version needed for optimistic updates', async () => {
    const jobCard = {
      id: jobCardId,
      internalStatus: 'request_received',
      customerStatus: 'request_received',
      statusVersion: 4,
      updatedAt: '2026-11-17T10:00:00.000Z',
    };
    jobStatusServiceMock.getJobCardStatus.mockResolvedValue(jobCard);

    const response = await GET(
      new Request(`http://localhost/api/job-cards/${jobCardId}/status`),
      routeContext({ id: jobCardId }),
    );

    expect(response.status).toBe(200);
    expect(jobStatusServiceMock.getJobCardStatus).toHaveBeenCalledWith(
      tenantId,
      jobCardId,
    );
    await expect(readJson(response)).resolves.toEqual({
      success: true,
      data: { jobCard },
    });
  });

  it('uses server tenant context and returns the status transition result', async () => {
    const result = {
      jobCard: { id: jobCardId, internalStatus: 'vehicle_received' },
      statusEvent: {
        fromStatus: 'request_received',
        toStatus: 'vehicle_received',
      },
    };
    jobStatusServiceMock.transitionJobCardStatus.mockResolvedValue(result);

    const response = await PATCH(
      jsonRequest(`http://localhost/api/job-cards/${jobCardId}/status`, input),
      routeContext({ id: jobCardId }),
    );

    expect(response.status).toBe(200);
    expect(jobStatusServiceMock.transitionJobCardStatus).toHaveBeenCalledWith(
      tenantId,
      jobCardId,
      input,
    );
    await expect(readJson(response)).resolves.toEqual({
      success: true,
      data: result,
    });
  });

  it('rejects unknown tenant or actor fields before calling the service', async () => {
    const response = await PATCH(
      jsonRequest(`http://localhost/api/job-cards/${jobCardId}/status`, {
        ...input,
        tenantId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        actorId: 'fake-actor',
      }),
      routeContext({ id: jobCardId }),
    );

    expect(response.status).toBe(422);
    expect(jobStatusServiceMock.transitionJobCardStatus).not.toHaveBeenCalled();
  });

  it('returns the same not-found response for absent and foreign records', async () => {
    jobStatusServiceMock.transitionJobCardStatus.mockRejectedValue(
      new JobCardNotFoundError(),
    );

    const response = await PATCH(
      jsonRequest(`http://localhost/api/job-cards/${jobCardId}/status`, input),
      routeContext({ id: jobCardId }),
    );

    expect(response.status).toBe(404);
    await expect(readJson(response)).resolves.toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Job card not found.' },
    });
  });

  it('returns a safe conflict for illegal or stale transitions', async () => {
    jobStatusServiceMock.transitionJobCardStatus.mockRejectedValue(
      new JobStatusConflictError(),
    );

    const response = await PATCH(
      jsonRequest(`http://localhost/api/job-cards/${jobCardId}/status`, input),
      routeContext({ id: jobCardId }),
    );

    expect(response.status).toBe(409);
    await expect(readJson(response)).resolves.toMatchObject({
      success: false,
      error: { code: 'CONFLICT' },
    });
  });
});
