import { beforeEach, describe, expect, it, vi } from 'vitest';

const authGuardMock = vi.hoisted(() => ({
  requireTenantPermission: vi.fn(),
}));
const dbMock = vi.hoisted(() => ({
  select: vi.fn(),
  transaction: vi.fn(),
}));
const auditMock = vi.hoisted(() => ({
  createAuditLog: vi.fn(),
}));

vi.mock('@/lib/authorization/guards', () => authGuardMock);
vi.mock('@/db/client', () => ({ db: dbMock }));
vi.mock('@/lib/audit', () => auditMock);

import {
  assignJobStaff,
  getEligibleStaffMembers,
} from './jobCardService';

const TENANT = 'tenant-1';
const JOB_ID = 'job-1';
const MECHANIC_ID = '11111111-1111-4111-8111-111111111111';
const MANAGER_ID = '22222222-2222-4222-8222-222222222222';

const jobRow = {
  id: JOB_ID,
  assignedMechanicId: null,
  assignedFloorManagerId: null,
};

function limitChain(rows: unknown[]) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve(rows)),
      })),
    })),
  };
}

function txWith(selectResults: unknown[][], updatedRow: unknown) {
  const select = vi.fn();
  for (const rows of selectResults) {
    select.mockImplementationOnce(() => limitChain(rows));
  }
  const update = vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([updatedRow])),
      })),
    })),
  }));
  return { select, update };
}

describe('assignJobStaff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authGuardMock.requireTenantPermission.mockResolvedValue(undefined);
    auditMock.createAuditLog.mockResolvedValue(undefined);
  });

  it('assigns a mechanic and floor manager and writes an audit log', async () => {
    const updated = {
      ...jobRow,
      assignedMechanicId: MECHANIC_ID,
      assignedFloorManagerId: MANAGER_ID,
    };
    const tx = txWith(
      [
        [jobRow],
        [{ id: MECHANIC_ID, role: 'mechanic' }],
        [{ id: MANAGER_ID, role: 'floor_manager' }],
      ],
      updated,
    );
    dbMock.transaction.mockImplementation((cb: (t: unknown) => unknown) =>
      cb(tx),
    );

    await expect(
      assignJobStaff(TENANT, JOB_ID, {
        mechanicId: MECHANIC_ID,
        floorManagerId: MANAGER_ID,
      }),
    ).resolves.toEqual(updated);

    expect(authGuardMock.requireTenantPermission).toHaveBeenCalledWith(
      TENANT,
      'jobs.assign',
    );
    expect(tx.update).toHaveBeenCalledTimes(1);
    expect(auditMock.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'job_card.staff_assigned',
        entityId: JOB_ID,
        tenantId: TENANT,
      }),
    );
  });

  it('reassigns staff by replacing existing assignments', async () => {
    const existing = {
      ...jobRow,
      assignedMechanicId: 'old-mechanic',
    };
    const updated = { ...existing, assignedMechanicId: MECHANIC_ID };
    const tx = txWith(
      [[existing], [{ id: MECHANIC_ID, role: 'mechanic' }]],
      updated,
    );
    dbMock.transaction.mockImplementation((cb: (t: unknown) => unknown) =>
      cb(tx),
    );

    await expect(
      assignJobStaff(TENANT, JOB_ID, { mechanicId: MECHANIC_ID }),
    ).resolves.toEqual(updated);
  });

  it('clears an assignment when null is provided', async () => {
    const existing = { ...jobRow, assignedMechanicId: MECHANIC_ID };
    const tx = txWith([[existing]], { ...existing, assignedMechanicId: null });
    dbMock.transaction.mockImplementation((cb: (t: unknown) => unknown) =>
      cb(tx),
    );

    await expect(
      assignJobStaff(TENANT, JOB_ID, { mechanicId: null }),
    ).resolves.toMatchObject({ assignedMechanicId: null });

    expect(tx.select).toHaveBeenCalledTimes(1);
  });

  it('rejects a job card outside the tenant', async () => {
    const tx = txWith([[]], jobRow);
    dbMock.transaction.mockImplementation((cb: (t: unknown) => unknown) =>
      cb(tx),
    );

    await expect(
      assignJobStaff(TENANT, JOB_ID, { mechanicId: MECHANIC_ID }),
    ).rejects.toThrow('Job not found');
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('rejects staff from another tenant or with the wrong role', async () => {
    const tx = txWith([[jobRow], []], jobRow);
    dbMock.transaction.mockImplementation((cb: (t: unknown) => unknown) =>
      cb(tx),
    );

    await expect(
      assignJobStaff(TENANT, JOB_ID, { mechanicId: MECHANIC_ID }),
    ).rejects.toThrow('mechanic role');
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('enforces jobs.assign permission before touching the database', async () => {
    authGuardMock.requireTenantPermission.mockRejectedValue(
      new Error('denied'),
    );

    await expect(
      assignJobStaff(TENANT, JOB_ID, { mechanicId: MECHANIC_ID }),
    ).rejects.toThrow('denied');
    expect(dbMock.transaction).not.toHaveBeenCalled();
  });
});

describe('getEligibleStaffMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authGuardMock.requireTenantPermission.mockResolvedValue(undefined);
  });

  function selectSequence(usersRows: unknown[], mechRows: unknown[], mgrRows: unknown[]) {
    dbMock.select
      .mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve(usersRows)),
        })),
      }))
      .mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            groupBy: vi.fn(() => Promise.resolve(mechRows)),
          })),
        })),
      }))
      .mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            groupBy: vi.fn(() => Promise.resolve(mgrRows)),
          })),
        })),
      }));
  }

  it('returns staff with combined active-job workload counts', async () => {
    selectSequence(
      [
        { userId: MECHANIC_ID, name: 'Sam', email: 's@x.co', role: 'mechanic' },
        { userId: MANAGER_ID, name: 'Jo', email: 'j@x.co', role: 'floor_manager' },
      ],
      [{ userId: MECHANIC_ID, count: 2 }],
      [{ userId: MANAGER_ID, count: 1 }],
    );

    const staff = await getEligibleStaffMembers(TENANT);

    expect(staff).toEqual([
      expect.objectContaining({ userId: MECHANIC_ID, activeJobCount: 2 }),
      expect.objectContaining({ userId: MANAGER_ID, activeJobCount: 1 }),
    ]);
  });

  it('returns an empty list without workload queries when no eligible staff exist', async () => {
    selectSequence([], [], []);

    await expect(getEligibleStaffMembers(TENANT)).resolves.toEqual([]);
    expect(dbMock.select).toHaveBeenCalledTimes(1);
  });

  it('requires jobs.read permission', async () => {
    authGuardMock.requireTenantPermission.mockRejectedValue(new Error('denied'));

    await expect(getEligibleStaffMembers(TENANT)).rejects.toThrow('denied');
    expect(dbMock.select).not.toHaveBeenCalled();
  });
});
