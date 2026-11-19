import { beforeEach, describe, expect, it, vi } from 'vitest';

const authGuardMock = vi.hoisted(() => ({
  requireTenantPermission: vi.fn(),
}));
const repositoryMock = vi.hoisted(() => ({
  create: vi.fn(),
  getById: vi.fn(),
  list: vi.fn(),
}));
const dbMock = vi.hoisted(() => ({
  insert: vi.fn(),
  select: vi.fn(),
  transaction: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/lib/authorization/guards', () => authGuardMock);
vi.mock('@/db/client', () => ({ db: dbMock }));
vi.mock('../repositories/databaseServiceRequestRepository', () => ({
  DatabaseServiceRequestRepository: class {
    create(...args: Parameters<typeof repositoryMock.create>) {
      return repositoryMock.create(...args);
    }

    getById(...args: Parameters<typeof repositoryMock.getById>) {
      return repositoryMock.getById(...args);
    }

    list(...args: Parameters<typeof repositoryMock.list>) {
      return repositoryMock.list(...args);
    }
  },
}));

import {
  createServiceRequest,
  getServiceRequestById,
  listServiceRequests,
} from './jobCardService';

const tenantId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const input = {
  customerId: '11111111-1111-4111-8111-111111111111',
  vehicleId: '33333333-3333-4333-8333-333333333333',
  requestedService: 'Brake inspection',
};

describe('jobCardService service-request operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authGuardMock.requireTenantPermission.mockResolvedValue(undefined);
  });

  it('requires jobs.create before delegating creation to the repository', async () => {
    repositoryMock.create.mockResolvedValue({ id: 'request-1' });

    await expect(createServiceRequest(tenantId, input)).resolves.toEqual({
      id: 'request-1',
    });

    expect(authGuardMock.requireTenantPermission).toHaveBeenCalledWith(
      tenantId,
      'jobs.create',
    );
    expect(repositoryMock.create).toHaveBeenCalledWith(tenantId, input);
  });

  it('requires jobs.read for list and detail retrieval', async () => {
    repositoryMock.list.mockResolvedValue([]);
    repositoryMock.getById.mockResolvedValue(null);

    await expect(listServiceRequests(tenantId)).resolves.toEqual([]);
    await expect(
      getServiceRequestById(tenantId, 'request-1'),
    ).resolves.toBeNull();

    expect(authGuardMock.requireTenantPermission).toHaveBeenNthCalledWith(
      1,
      tenantId,
      'jobs.read',
    );
    expect(authGuardMock.requireTenantPermission).toHaveBeenNthCalledWith(
      2,
      tenantId,
      'jobs.read',
    );
    expect(repositoryMock.list).toHaveBeenCalledWith(tenantId);
    expect(repositoryMock.getById).toHaveBeenCalledWith(tenantId, 'request-1');
  });

  it('does not access the repository when permission is denied', async () => {
    authGuardMock.requireTenantPermission.mockRejectedValue(
      new Error('Permission denied.'),
    );

    await expect(createServiceRequest(tenantId, input)).rejects.toThrow(
      'Permission denied.',
    );
    expect(repositoryMock.create).not.toHaveBeenCalled();
  });
});
