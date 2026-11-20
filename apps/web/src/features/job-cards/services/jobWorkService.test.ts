import { beforeEach, describe, expect, it, vi } from 'vitest';

const authGuardMock = vi.hoisted(() => ({
  requireTenantPermission: vi.fn(),
  TenantAccessError: class TenantAccessError extends Error {},
}));
const auditMock = vi.hoisted(() => ({ createAuditLog: vi.fn() }));
const audienceMock = vi.hoisted(() => ({ findSessionCustomerId: vi.fn() }));
const dbMock = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@/lib/authorization/guards', () => authGuardMock);
vi.mock('@/lib/audit', () => auditMock);
vi.mock('@/db/client', () => ({ db: dbMock }));
vi.mock('@/server/sessionAudience', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/server/sessionAudience')>()),
  ...audienceMock,
}));

import {
  addJobNote,
  addLabourEntry,
  correctLabourEntry,
  getJobWork,
} from './jobWorkService';

const TENANT = 'tenant-1';
const JOB_ID = 'job-1';
const TECH_ID = '11111111-1111-4111-8111-111111111111';
const staffUser = {
  id: 'auth0|floor',
  email: 'floor@station.test',
  tenantRole: 'floor_manager',
};

// Each db.select() call returns the next row set, whether the query ends in limit() or orderBy().
function queueSelects(rowSets: unknown[][]) {
  dbMock.select.mockImplementation(() => {
    const rows = rowSets.shift() ?? [];
    const chain = {
      from: () => chain,
      where: () => chain,
      limit: () => Promise.resolve(rows),
      orderBy: () => Promise.resolve(rows),
    };
    return chain;
  });
}

function labourRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'entry-1',
    tenantId: TENANT,
    jobCardId: JOB_ID,
    technicianId: TECH_ID,
    startedAt: new Date('2026-11-18T08:00:00Z'),
    endedAt: new Date('2026-11-18T09:30:00Z'),
    minutes: 90,
    note: 'Replaced brake pads',
    visibility: 'internal',
    createdAt: new Date('2026-11-18T09:30:00Z'),
    updatedAt: new Date('2026-11-18T09:30:00Z'),
    ...overrides,
  };
}

const returning = (row: unknown) => ({
  values: vi.fn(() => ({ returning: () => Promise.resolve([row]) })),
  set: vi.fn(() => ({
    where: () => ({ returning: () => Promise.resolve([row]) }),
  })),
});

beforeEach(() => {
  vi.clearAllMocks();
  authGuardMock.requireTenantPermission.mockResolvedValue(staffUser);
  dbMock.transaction.mockImplementation((cb: (tx: unknown) => unknown) =>
    cb(dbMock),
  );
});

describe('addLabourEntry', () => {
  const input = {
    technicianId: TECH_ID,
    startedAt: '2026-11-18T08:00:00Z',
    endedAt: '2026-11-18T09:30:00Z',
    note: 'Replaced brake pads',
    visibility: 'internal' as const,
  };

  it('logs time with server-computed minutes and audits the actor', async () => {
    queueSelects([[{ id: JOB_ID }], [{ id: TECH_ID }], []]);
    const insert = returning(labourRow());
    dbMock.insert.mockReturnValue(insert);

    const entry = await addLabourEntry(TENANT, JOB_ID, input);

    expect(authGuardMock.requireTenantPermission).toHaveBeenCalledWith(
      TENANT,
      'jobs.update_status',
    );
    expect(insert.values).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT, minutes: 90 }),
    );
    expect(entry).toMatchObject({ minutes: 90, technicianId: TECH_ID });
    expect(auditMock.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'job_card.labour_added',
        newValue: expect.objectContaining({
          actor: { authUserId: 'auth0|floor', email: 'floor@station.test' },
        }),
      }),
    );
  });

  it.each([
    ['ends before it starts', '2026-11-18T09:00:00Z', '2026-11-18T08:00:00Z'],
    ['has zero length', '2026-11-18T09:00:00Z', '2026-11-18T09:00:00Z'],
  ])('rejects an entry that %s', async (_label, startedAt, endedAt) => {
    await expect(
      addLabourEntry(TENANT, JOB_ID, { ...input, startedAt, endedAt }),
    ).rejects.toMatchObject({ status: 422 });
    expect(dbMock.transaction).not.toHaveBeenCalled();
  });

  it('rejects time that overlaps the technician’s existing entry', async () => {
    queueSelects([[{ id: JOB_ID }], [{ id: TECH_ID }], [{ id: 'entry-0' }]]);

    await expect(addLabourEntry(TENANT, JOB_ID, input)).rejects.toMatchObject({
      status: 409,
    });
    expect(dbMock.insert).not.toHaveBeenCalled();
  });

  it('rejects a job card outside the tenant', async () => {
    queueSelects([[]]);

    await expect(addLabourEntry(TENANT, JOB_ID, input)).rejects.toMatchObject({
      status: 404,
    });
    expect(dbMock.insert).not.toHaveBeenCalled();
  });

  it('rejects a technician from another tenant or without the mechanic role', async () => {
    queueSelects([[{ id: JOB_ID }], []]);

    await expect(addLabourEntry(TENANT, JOB_ID, input)).rejects.toMatchObject({
      status: 422,
    });
    expect(dbMock.insert).not.toHaveBeenCalled();
  });

  it('enforces the permission before touching the database', async () => {
    authGuardMock.requireTenantPermission.mockRejectedValue(
      new Error('denied'),
    );

    await expect(addLabourEntry(TENANT, JOB_ID, input)).rejects.toThrow(
      'denied',
    );
    expect(dbMock.select).not.toHaveBeenCalled();
  });
});

describe('correctLabourEntry', () => {
  it('updates in place and records the old values and reason in the audit log', async () => {
    const before = labourRow();
    const after = labourRow({
      endedAt: new Date('2026-11-18T10:00:00Z'),
      minutes: 120,
    });
    queueSelects([[before], []]);
    dbMock.update.mockReturnValue(returning(after));

    const entry = await correctLabourEntry(TENANT, JOB_ID, 'entry-1', {
      endedAt: '2026-11-18T10:00:00Z',
      reason: 'Forgot to clock out',
    });

    expect(entry.minutes).toBe(120);
    expect(auditMock.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'job_card.labour_corrected',
        previousValue: expect.objectContaining({ minutes: 90 }),
        newValue: expect.objectContaining({
          minutes: 120,
          reason: 'Forgot to clock out',
        }),
      }),
    );
  });

  it('rejects a correction that makes the entry end before it starts', async () => {
    queueSelects([[labourRow()]]);

    await expect(
      correctLabourEntry(TENANT, JOB_ID, 'entry-1', {
        endedAt: '2026-11-18T07:00:00Z',
        reason: 'Typo',
      }),
    ).rejects.toMatchObject({ status: 422 });
    expect(dbMock.update).not.toHaveBeenCalled();
  });

  it('returns 404 for an entry outside the tenant or job card', async () => {
    queueSelects([[]]);

    await expect(
      correctLabourEntry(TENANT, JOB_ID, 'entry-x', {
        note: 'x',
        reason: 'Typo',
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe('getJobWork', () => {
  const internalNote = {
    id: 'note-1',
    body: 'Customer was rude, check brakes again',
    visibility: 'internal',
    createdAt: new Date('2026-11-18T10:00:00Z'),
  };
  const customerNote = {
    id: 'note-2',
    body: 'Brake pads replaced',
    visibility: 'customer',
    createdAt: new Date('2026-11-18T11:00:00Z'),
  };
  const customerEntry = labourRow({ id: 'entry-2', visibility: 'customer' });

  it('gives staff every entry and note', async () => {
    queueSelects([
      [{ id: JOB_ID, customerId: 'customer-1' }],
      [labourRow(), customerEntry],
      [internalNote, customerNote],
    ]);

    const work = await getJobWork(TENANT, JOB_ID);

    expect(work.audience).toBe('staff');
    expect(work.labourEntries).toHaveLength(2);
    expect(work.notes).toHaveLength(2);
  });

  it('never sends internal notes, internal labour or technician ids to a customer', async () => {
    authGuardMock.requireTenantPermission.mockResolvedValue({
      id: '44444444-4444-4444-8444-444444444444',
      tenantRole: 'customer',
    });
    audienceMock.findSessionCustomerId.mockResolvedValue('customer-1');
    queueSelects([
      [{ id: JOB_ID, customerId: 'customer-1' }],
      [labourRow(), customerEntry],
      [internalNote, customerNote],
    ]);

    const work = await getJobWork(TENANT, JOB_ID);
    const json = JSON.stringify(work);

    expect(work.audience).toBe('customer');
    expect(work.notes).toEqual([
      {
        id: 'note-2',
        body: 'Brake pads replaced',
        createdAt: expect.any(String),
      },
    ]);
    expect(work.labourEntries.map((entry) => entry.id)).toEqual(['entry-2']);
    expect(json).not.toContain('Customer was rude');
    expect(json).not.toContain('technicianId');
    expect(json).not.toContain('visibility');
  });

  it.each([
    ['another customer’s job card', 'customer-2'],
    ['an account with no linked customer', null],
  ])('rejects a customer viewing %s', async (_label, sessionCustomerId) => {
    authGuardMock.requireTenantPermission.mockResolvedValue({
      id: '44444444-4444-4444-8444-444444444444',
      tenantRole: 'customer',
    });
    audienceMock.findSessionCustomerId.mockResolvedValue(sessionCustomerId);
    queueSelects([[{ id: JOB_ID, customerId: 'customer-1' }]]);

    await expect(getJobWork(TENANT, JOB_ID)).rejects.toThrow('does not belong');
    expect(dbMock.select).toHaveBeenCalledTimes(1);
  });
});

describe('addJobNote', () => {
  it('checks the job card belongs to the tenant before inserting', async () => {
    queueSelects([[]]);

    await expect(
      addJobNote(TENANT, JOB_ID, { body: 'Hi', visibility: 'internal' }),
    ).rejects.toMatchObject({ status: 404 });
    expect(dbMock.insert).not.toHaveBeenCalled();
  });

  it('requires the customer-note permission for customer notes', async () => {
    queueSelects([[{ id: JOB_ID }]]);
    dbMock.insert.mockReturnValue(
      returning({
        ...{ id: 'note-2', visibility: 'customer', body: 'Done' },
        createdAt: new Date(),
      }),
    );

    await addJobNote(TENANT, JOB_ID, { body: 'Done', visibility: 'customer' });

    expect(authGuardMock.requireTenantPermission).toHaveBeenCalledWith(
      TENANT,
      'jobs.add_customer_note',
    );
  });
});
