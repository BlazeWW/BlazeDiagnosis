import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  select: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@/db/client', () => ({ db: dbMock }));

import { DatabaseServiceRequestRepository } from './databaseServiceRequestRepository';
import { ServiceRequestRelationshipValidationError } from './serviceRequestRepository';

const tenantId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const customerId = '11111111-1111-4111-8111-111111111111';
const vehicleId = '33333333-3333-4333-8333-333333333333';
const requestId = '77777777-7777-4777-8777-777777777777';
const jobCardId = '88888888-8888-4888-8888-888888888888';
const createdAt = new Date('2026-11-10T07:00:00.000Z');
const customer = { id: customerId };
const vehicle = { id: vehicleId, primaryCustomerId: customerId };
const request = {
  id: requestId,
  tenantId,
  customerId,
  vehicleId,
  requestedService: 'Brake inspection',
  customerConcern: null,
  preferredDate: null,
  status: 'received' as const,
  createdAt,
  updatedAt: createdAt,
};

function createTransaction(
  selectResults: unknown[][] = [[customer], [vehicle]],
  failStatusEvent = false,
) {
  const tx = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve(selectResults.shift() ?? [])),
        })),
      })),
    })),
    insert: vi
      .fn()
      .mockReturnValueOnce({
        values: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([request])),
        })),
      })
      .mockReturnValueOnce({
        values: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: jobCardId }])),
        })),
      })
      .mockReturnValueOnce({
        values: vi.fn(() =>
          failStatusEvent
            ? Promise.reject(new Error('event insert failed'))
            : Promise.resolve(),
        ),
      }),
  };
  dbMock.transaction.mockImplementation(
    (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx),
  );
  return tx;
}

describe('DatabaseServiceRequestRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates the request, linked job card, and initial event in one transaction', async () => {
    const tx = createTransaction();
    const repository = new DatabaseServiceRequestRepository();

    await expect(
      repository.create(tenantId, {
        customerId,
        vehicleId,
        requestedService: 'Brake inspection',
      }),
    ).resolves.toEqual({
      id: requestId,
      customerId,
      vehicleId,
      requestedService: 'Brake inspection',
      status: 'received',
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    });

    expect(dbMock.transaction).toHaveBeenCalledOnce();
    expect(tx.select).toHaveBeenCalledTimes(2);
    expect(tx.insert).toHaveBeenCalledTimes(3);
    expect(tx.insert.mock.calls[0][0]).toBeDefined();
    expect(tx.insert.mock.results[0].value.values).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId, customerId, vehicleId }),
    );
    expect(tx.insert.mock.results[1].value.values).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        serviceRequestId: requestId,
        customerId,
        vehicleId,
      }),
    );
    expect(tx.insert.mock.results[2].value.values).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        jobCardId,
        toStatus: 'request_received',
        statusType: 'internal',
      }),
    );
  });

  it.each([
    ['missing or inactive customer', [[], [vehicle]]],
    ['missing or inactive vehicle', [[customer], []]],
    [
      'vehicle belonging to another customer',
      [[customer], [{ ...vehicle, primaryCustomerId: 'other-customer' }]],
    ],
  ])('rejects %s before writing', async (_case, selectResults) => {
    const tx = createTransaction(selectResults);
    const repository = new DatabaseServiceRequestRepository();

    await expect(
      repository.create(tenantId, {
        customerId,
        vehicleId,
        requestedService: 'Brake inspection',
      }),
    ).rejects.toBeInstanceOf(ServiceRequestRelationshipValidationError);

    expect(tx.insert).not.toHaveBeenCalled();
  });

  it('propagates status-event errors from the transaction', async () => {
    const tx = createTransaction([[customer], [vehicle]], true);
    const repository = new DatabaseServiceRequestRepository();

    await expect(
      repository.create(tenantId, {
        customerId,
        vehicleId,
        requestedService: 'Brake inspection',
      }),
    ).rejects.toThrow('event insert failed');
    expect(dbMock.transaction).toHaveBeenCalledOnce();
    expect(tx.insert).toHaveBeenCalledTimes(3);
  });

  it('maps tenant-scoped list and detail results to the DTO', async () => {
    const queryResult = (rows: unknown[]) => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => Promise.resolve(rows)),
          limit: vi.fn(() => Promise.resolve(rows)),
        })),
      })),
    });
    dbMock.select
      .mockReturnValueOnce(queryResult([request]))
      .mockReturnValueOnce(queryResult([request]));
    const repository = new DatabaseServiceRequestRepository();
    const expected = {
      id: requestId,
      customerId,
      vehicleId,
      requestedService: 'Brake inspection',
      status: 'received',
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    };

    await expect(repository.list(tenantId)).resolves.toEqual([expected]);
    await expect(repository.getById(tenantId, requestId)).resolves.toEqual(
      expected,
    );
    expect(dbMock.select).toHaveBeenCalledTimes(2);
  });
});
