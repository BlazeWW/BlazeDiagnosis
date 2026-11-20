import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  select: vi.fn(),
  transaction: vi.fn(),
}));
const authMock = vi.hoisted(() => ({
  requireTenantPermission: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock('@/db/client', () => ({ db: dbMock }));
vi.mock('@/lib/authorization/guards', () => ({
  TenantAccessError: class TenantAccessError extends Error {
    constructor() {
      super('Cross-tenant access denied or missing permission.');
    }
  },
  requireTenantPermission: authMock.requireTenantPermission,
}));
vi.mock('@/lib/auth/session', () => ({
  requireUser: authMock.requireUser,
}));

import {
  getStationJobStatusTimeline,
  getCustomerJobStatusTimeline,
  JobCardNotFoundError,
  JobStatusConflictError,
  JobStatusReasonRequiredError,
  transitionJobCardStatus,
} from './jobStatusService';

const tenantId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const jobCardId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const actorIdentity = 'auth0|trusted-user-id';
const currentTime = new Date('2026-11-17T10:00:00.000Z');
const jobCard = {
  id: jobCardId,
  tenantId,
  internalStatus: 'work_in_progress',
  customerStatus: 'service_in_progress',
  statusVersion: 4,
  updatedAt: currentTime,
  completedAt: null,
};

function createTransaction(
  selectResults: unknown[][],
  updatedRow: unknown = {
    ...jobCard,
    internalStatus: 'quote_preparation',
    customerStatus: 'quote_ready',
    statusVersion: 5,
    updatedAt: new Date('2026-11-17T10:01:00.000Z'),
  },
) {
  const insertedValues: unknown[] = [];
  const tx = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => selectResults.shift() ?? []),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(async () => (updatedRow ? [updatedRow] : [])),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((values: unknown) => {
        insertedValues.push(values);
        return {
          returning: vi.fn(async () => [
            { id: 'event-id', ...(values as object) },
          ]),
        };
      }),
    })),
    insertedValues,
  };
  dbMock.transaction.mockImplementation(
    (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx),
  );
  return tx;
}

describe('transitionJobCardStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.requireTenantPermission.mockResolvedValue({ id: actorIdentity });
  });

  it('updates both statuses and writes internal and customer events atomically', async () => {
    const tx = createTransaction([[jobCard]], {
      ...jobCard,
      internalStatus: 'quality_control',
      customerStatus: 'final_checks',
      statusVersion: 5,
      updatedAt: new Date('2026-11-17T10:01:00.000Z'),
    });

    await expect(
      transitionJobCardStatus(tenantId, jobCardId, {
        targetInternalStatus: 'quality_control',
        expectedStatusVersion: 4,
      }),
    ).resolves.toMatchObject({
      jobCard: {
        internalStatus: 'quality_control',
        customerStatus: 'final_checks',
      },
      statusEvent: {
        fromStatus: 'work_in_progress',
        toStatus: 'quality_control',
        actorIdentity,
      },
    });

    expect(authMock.requireTenantPermission).toHaveBeenCalledWith(
      tenantId,
      'jobs.update_status',
    );
    expect(dbMock.transaction).toHaveBeenCalledOnce();
    expect(tx.update).toHaveBeenCalledOnce();
    expect(tx.insertedValues).toEqual([
      expect.objectContaining({
        tenantId,
        jobCardId,
        fromStatus: 'work_in_progress',
        toStatus: 'quality_control',
        statusType: 'internal',
        note: null,
        actorIdentity,
      }),
      expect.objectContaining({
        tenantId,
        jobCardId,
        fromStatus: 'service_in_progress',
        toStatus: 'final_checks',
        statusType: 'customer',
        note: null,
        actorIdentity,
      }),
    ]);
  });

  it('does not write for an illegal transition', async () => {
    const tx = createTransaction([[jobCard]]);

    await expect(
      transitionJobCardStatus(tenantId, jobCardId, {
        targetInternalStatus: 'completed',
        expectedStatusVersion: 4,
      }),
    ).rejects.toBeInstanceOf(JobStatusConflictError);

    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.insertedValues).toHaveLength(0);
  });

  it('requires reasons for cancel, reopen, reverse-completed, and QC failure', async () => {
    const tx = createTransaction([
      [{ ...jobCard, internalStatus: 'quality_control' }],
    ]);

    await expect(
      transitionJobCardStatus(tenantId, jobCardId, {
        targetInternalStatus: 'work_in_progress',
        expectedStatusVersion: 4,
      }),
    ).rejects.toBeInstanceOf(JobStatusReasonRequiredError);

    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.insertedValues).toHaveLength(0);
  });

  it('requires a tenant-scoped approved quote before leaving customer approval', async () => {
    const awaitingApproval = {
      ...jobCard,
      internalStatus: 'awaiting_customer_approval',
      customerStatus: 'awaiting_approval',
    };
    const tx = createTransaction([[awaitingApproval], []]);

    await expect(
      transitionJobCardStatus(tenantId, jobCardId, {
        targetInternalStatus: 'work_in_progress',
        expectedStatusVersion: 4,
      }),
    ).rejects.toBeInstanceOf(JobStatusConflictError);

    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.insertedValues).toHaveLength(0);
  });

  it('rejects stale requests before mutation', async () => {
    const tx = createTransaction([[jobCard]]);

    await expect(
      transitionJobCardStatus(tenantId, jobCardId, {
        targetInternalStatus: 'quality_control',
        expectedStatusVersion: 3,
      }),
    ).rejects.toBeInstanceOf(JobStatusConflictError);

    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.insertedValues).toHaveLength(0);
  });

  it('rejects a race after the initial read when the conditional update affects no row', async () => {
    const tx = createTransaction([[jobCard]], null);

    await expect(
      transitionJobCardStatus(tenantId, jobCardId, {
        targetInternalStatus: 'quality_control',
        expectedStatusVersion: 4,
      }),
    ).rejects.toBeInstanceOf(JobStatusConflictError);

    expect(tx.update).toHaveBeenCalledOnce();
    expect(tx.insertedValues).toHaveLength(0);
  });

  it('does not disclose or mutate missing and foreign-tenant job cards', async () => {
    const tx = createTransaction([[]]);

    await expect(
      transitionJobCardStatus(tenantId, jobCardId, {
        targetInternalStatus: 'quote_preparation',
        expectedStatusVersion: 4,
      }),
    ).rejects.toBeInstanceOf(JobCardNotFoundError);

    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.insertedValues).toHaveLength(0);
  });

  it('denies a manager-only transition unless the active tenant role is a manager', async () => {
    const tx = createTransaction([
      [{ ...jobCard, internalStatus: 'request_received' }],
      [{ role: 'mechanic' }],
    ]);

    await expect(
      transitionJobCardStatus(tenantId, jobCardId, {
        targetInternalStatus: 'cancelled',
        expectedStatusVersion: 4,
        reason: 'Customer cancelled the service.',
      }),
    ).rejects.toThrow('Cross-tenant access denied');

    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.insertedValues).toHaveLength(0);
  });

  it('allows an active tenant manager to cancel with a reason and records the actor', async () => {
    const tx = createTransaction(
      [
        [
          {
            ...jobCard,
            internalStatus: 'request_received',
            customerStatus: 'request_received',
          },
        ],
        [{ role: 'site_manager' }],
      ],
      {
        ...jobCard,
        internalStatus: 'cancelled',
        customerStatus: 'cancelled',
        statusVersion: 5,
        updatedAt: new Date('2026-11-17T10:01:00.000Z'),
      },
    );

    await transitionJobCardStatus(tenantId, jobCardId, {
      targetInternalStatus: 'cancelled',
      expectedStatusVersion: 4,
      reason: 'Customer cancelled the service.',
    });

    expect(tx.insertedValues).toEqual([
      expect.objectContaining({
        fromStatus: 'request_received',
        toStatus: 'cancelled',
        statusType: 'internal',
        note: 'Customer cancelled the service.',
        actorIdentity,
      }),
      expect.objectContaining({
        fromStatus: 'request_received',
        toStatus: 'cancelled',
        statusType: 'customer',
        note: null,
        actorIdentity,
      }),
    ]);
  });

  it('does not open a transaction when status permission is denied', async () => {
    authMock.requireTenantPermission.mockRejectedValue(new Error('denied'));

    await expect(
      transitionJobCardStatus(tenantId, jobCardId, {
        targetInternalStatus: 'quote_preparation',
        expectedStatusVersion: 4,
      }),
    ).rejects.toThrow('denied');

    expect(dbMock.transaction).not.toHaveBeenCalled();
  });

  it('propagates event insertion failures so the database transaction can roll back', async () => {
    const tx = createTransaction([[jobCard]]);
    tx.insert.mockImplementation(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() =>
          Promise.reject(new Error('event insert failed')),
        ),
      })),
    }));

    await expect(
      transitionJobCardStatus(tenantId, jobCardId, {
        targetInternalStatus: 'quality_control',
        expectedStatusVersion: 4,
      }),
    ).rejects.toThrow('event insert failed');

    expect(dbMock.transaction).toHaveBeenCalledOnce();
    expect(tx.update).toHaveBeenCalledOnce();
  });
});

describe('getCustomerJobStatusTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.requireUser.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
    });
  });

  describe('getStationJobStatusTimeline', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      authMock.requireTenantPermission.mockResolvedValue({ id: actorIdentity });
    });

    it('returns tenant-scoped internal events with their audit details', async () => {
      const statusEvent = {
        id: 'internal-event',
        fromStatus: 'work_in_progress',
        toStatus: 'quality_control',
        note: 'Internal inspection note.',
        actorIdentity,
        createdAt: currentTime,
      };
      dbMock.select
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(async () => [{ id: jobCardId }]),
            })),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(async () => [statusEvent]),
            })),
          })),
        });

      await expect(
        getStationJobStatusTimeline(tenantId, jobCardId),
      ).resolves.toEqual([statusEvent]);
      expect(authMock.requireTenantPermission).toHaveBeenCalledWith(
        tenantId,
        'jobs.read',
      );
      expect(dbMock.select).toHaveBeenCalledTimes(2);
    });
  });

  it('returns only allowlisted customer event fields', async () => {
    const eventRows = [
      {
        id: 'event-1',
        fromStatus: 'inspection_in_progress',
        toStatus: 'quote_ready',
        createdAt: currentTime,
        note: 'Internal reason must not be exposed',
        actorIdentity: 'private-actor',
      },
    ];
    dbMock.select
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [{ id: 'customer-id' }]),
          })),
        })),
      })
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(async () => [{ id: jobCardId }]),
            })),
          })),
        })),
      })
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(async () => eventRows),
          })),
        })),
      });

    await expect(
      getCustomerJobStatusTimeline(tenantId, jobCardId),
    ).resolves.toEqual([
      {
        id: 'event-1',
        fromStatus: 'inspection_in_progress',
        toStatus: 'quote_ready',
        createdAt: currentTime.toISOString(),
      },
    ]);
  });

  it('returns not found when the customer does not own the job card', async () => {
    dbMock.select.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => []),
        })),
      })),
    });

    await expect(
      getCustomerJobStatusTimeline(tenantId, jobCardId),
    ).rejects.toBeInstanceOf(JobCardNotFoundError);

    expect(dbMock.select).toHaveBeenCalledOnce();
  });

  it('resolves Auth0 customer identities through an active tenant customer membership', async () => {
    authMock.requireUser.mockResolvedValue({ id: 'auth0|customer-id' });
    dbMock.select
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [{ email: 'customer@example.com' }]),
          })),
        })),
      })
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [{ id: 'customer-id' }]),
          })),
        })),
      })
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(async () => [{ id: jobCardId }]),
            })),
          })),
        })),
      })
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(async () => []),
          })),
        })),
      });

    await expect(
      getCustomerJobStatusTimeline(tenantId, jobCardId),
    ).resolves.toEqual([]);
    expect(dbMock.select).toHaveBeenCalledTimes(4);
  });
});
