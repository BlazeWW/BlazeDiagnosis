import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  customerFixtures,
  jobCardFixtureTenantIds,
  vehicleFixtures,
} from '@/features/job-cards/fixtures/jobCardFixtures';
import { MockServiceRequestRepository } from '@/features/job-cards/repositories/mockServiceRequestRepository';
import { ServiceRequestRelationshipValidationError } from '@/features/job-cards/repositories/serviceRequestRepository';
import { jsonRequest, readJson, routeContext } from '@/test/apiRouteTestUtils';

const tenantContextMock = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
}));
const jobCardServiceMock = vi.hoisted(() => ({
  createServiceRequest: vi.fn(),
  listServiceRequests: vi.fn(),
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

import { GET as GET_BY_ID } from './[id]/route';
import { GET, POST } from './route';

const tenantId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const serviceRequestId = '77777777-7777-4777-8777-777777777777';
const input = {
  customerId: '11111111-1111-4111-8111-111111111111',
  vehicleId: '33333333-3333-4333-8333-333333333333',
  requestedService: 'Brake inspection',
};

describe('/api/job-cards', () => {
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

  it('creates through the authorized service using server tenant context', async () => {
    jobCardServiceMock.createServiceRequest.mockResolvedValue({
      id: serviceRequestId,
    });

    const response = await POST(
      jsonRequest('http://localhost/api/job-cards', input),
    );

    expect(response.status).toBe(201);
    expect(jobCardServiceMock.createServiceRequest).toHaveBeenCalledWith(
      tenantId,
      input,
    );
    await expect(readJson(response)).resolves.toEqual({
      data: { serviceRequest: { id: serviceRequestId } },
      success: true,
    });
  });

  it('runs the API contract against the fixture adapter through create and retrieval', async () => {
    const repository = new MockServiceRequestRepository({
      customers: customerFixtures.map((customer) => ({ ...customer })),
      vehicles: vehicleFixtures.map((vehicle) => ({ ...vehicle })),
      serviceRequests: [],
    });
    jobCardServiceMock.createServiceRequest.mockImplementation(
      (requestedTenantId: string, serviceInput: typeof input) =>
        repository.create(requestedTenantId, serviceInput),
    );
    jobCardServiceMock.listServiceRequests.mockImplementation(
      (requestedTenantId: string) => repository.list(requestedTenantId),
    );
    jobCardServiceMock.getServiceRequestById.mockImplementation(
      (requestedTenantId: string, id: string) =>
        repository.getById(requestedTenantId, id),
    );

    const createdResponse = await POST(
      jsonRequest('http://localhost/api/job-cards', input),
    );
    expect(createdResponse.status).toBe(201);
    const createdBody = (await createdResponse.json()) as {
      data: { serviceRequest: { id: string } };
      success: boolean;
    };
    expect(createdBody.success).toBe(true);

    const ownListResponse = await GET();
    expect(ownListResponse.status).toBe(200);
    await expect(readJson(ownListResponse)).resolves.toMatchObject({
      data: {
        serviceRequests: [
          {
            id: createdBody.data.serviceRequest.id,
            requestedService: input.requestedService,
          },
        ],
      },
      meta: { count: 1 },
      success: true,
    });

    const detailResponse = await GET_BY_ID(
      new Request(
        `http://localhost/api/job-cards/${createdBody.data.serviceRequest.id}`,
      ),
      routeContext({ id: createdBody.data.serviceRequest.id }),
    );
    expect(detailResponse.status).toBe(200);
    await expect(readJson(detailResponse)).resolves.toMatchObject({
      data: {
        serviceRequest: {
          id: createdBody.data.serviceRequest.id,
          customerId: input.customerId,
          vehicleId: input.vehicleId,
          requestedService: input.requestedService,
        },
      },
      success: true,
    });

    tenantContextMock.requireTenantContext.mockResolvedValue({
      tenantId: jobCardFixtureTenantIds.southside,
    });
    const foreignListResponse = await GET();
    expect(foreignListResponse.status).toBe(200);
    await expect(readJson(foreignListResponse)).resolves.toEqual({
      data: { serviceRequests: [] },
      meta: { count: 0 },
      success: true,
    });

    const foreignDetailResponse = await GET_BY_ID(
      new Request(
        `http://localhost/api/job-cards/${createdBody.data.serviceRequest.id}`,
      ),
      routeContext({ id: createdBody.data.serviceRequest.id }),
    );
    expect(foreignDetailResponse.status).toBe(404);
  });

  it.each([
    {
      ...input,
      tenantId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    },
    {
      ...input,
      unknownField: true,
    },
  ])(
    'rejects client-supplied tenant ID and unknown fields',
    async (payload) => {
      const response = await POST(
        jsonRequest('http://localhost/api/job-cards', payload),
      );

      expect(response.status).toBe(422);
      expect(jobCardServiceMock.createServiceRequest).not.toHaveBeenCalled();
      await expect(readJson(response)).resolves.toMatchObject({
        error: { code: 'VALIDATION_ERROR' },
        success: false,
      });
    },
  );

  it('returns a bad request for malformed JSON', async () => {
    const response = await POST(
      new Request('http://localhost/api/job-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{',
      }),
    );

    expect(response.status).toBe(400);
    expect(jobCardServiceMock.createServiceRequest).not.toHaveBeenCalled();
    await expect(readJson(response)).resolves.toMatchObject({
      error: { code: 'BAD_REQUEST' },
      success: false,
    });
  });

  it('maps invalid customer/vehicle relationships to a conflict response', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    jobCardServiceMock.createServiceRequest.mockRejectedValue(
      new ServiceRequestRelationshipValidationError(),
    );

    const response = await POST(
      jsonRequest('http://localhost/api/job-cards', input),
    );

    expect(response.status).toBe(409);
    await expect(readJson(response)).resolves.toMatchObject({
      error: { code: 'CONFLICT' },
      success: false,
    });
    consoleError.mockRestore();
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
