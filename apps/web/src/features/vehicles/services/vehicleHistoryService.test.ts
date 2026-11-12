import { beforeEach, describe, expect, it, vi } from 'vitest';

const authGuardMock = vi.hoisted(() => ({
  requireTenantPermission: vi.fn(),
}));
const dbMock = vi.hoisted(() => ({
  select: vi.fn(),
}));

vi.mock('@/lib/authorization/guards', () => authGuardMock);
vi.mock('@/db/client', () => ({ db: dbMock }));

import { getVehicleServiceHistory } from './vehicleHistoryService';

function mockSelectSequence(rowSets: unknown[][]) {
  dbMock.select.mockImplementation(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => {
        const rows = rowSets.shift() ?? [];
        const limit = vi.fn(() => Promise.resolve(rows));
        const orderBy = vi.fn(() =>
          Object.assign(Promise.resolve(rows), { limit }),
        );
        return { limit, orderBy };
      }),
    })),
  }));
}

const vehicleRow = {
  id: 'vehicle-1',
  isArchived: false,
  primaryCustomerId: 'customer-1',
  tenantId: 'tenant-1',
};

const jobRow = {
  completedAt: null,
  createdAt: new Date('2026-01-10T08:00:00Z'),
  customerStatus: 'in_progress',
  id: 'job-1',
  internalStatus: 'diagnosis',
  jobNumber: 'JOB-1',
  priority: 'normal',
};

describe('getVehicleServiceHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authGuardMock.requireTenantPermission.mockResolvedValue(undefined);
  });

  it('returns staff history including internal status and notes', async () => {
    mockSelectSequence([
      [vehicleRow],
      [jobRow],
      [
        {
          body: 'Internal note',
          createdAt: new Date('2026-01-10T09:00:00Z'),
          jobCardId: 'job-1',
          visibility: 'internal',
        },
        {
          body: 'Customer note',
          createdAt: new Date('2026-01-10T09:30:00Z'),
          jobCardId: 'job-1',
          visibility: 'customer',
        },
      ],
      [],
      [],
      [],
    ]);

    const history = await getVehicleServiceHistory('tenant-1', 'vehicle-1');

    expect(authGuardMock.requireTenantPermission).toHaveBeenCalledWith(
      'tenant-1',
      'vehicles.read',
    );
    expect(history.jobs).toHaveLength(1);
    expect(history.jobs[0].internalStatus).toBe('diagnosis');
    expect(history.jobs[0].notes).toHaveLength(2);
  });

  it('strips internal fields for the customer audience', async () => {
    mockSelectSequence([
      [vehicleRow],
      [jobRow],
      [
        {
          body: 'Internal note',
          createdAt: new Date('2026-01-10T09:00:00Z'),
          jobCardId: 'job-1',
          visibility: 'internal',
        },
        {
          body: 'Customer note',
          createdAt: new Date('2026-01-10T09:30:00Z'),
          jobCardId: 'job-1',
          visibility: 'customer',
        },
      ],
      [],
      [
        {
          completedAt: new Date('2026-01-10T10:00:00Z'),
          conditionNotes: 'Internal-only observation',
          fuelLevel: 'half',
          id: 'inspection-1',
          mileage: 120000,
        },
      ],
      [],
    ]);

    const history = await getVehicleServiceHistory(
      'tenant-1',
      'vehicle-1',
      'customer',
      'customer-1',
    );

    expect(history.jobs[0].internalStatus).toBeUndefined();
    expect(history.jobs[0].notes).toHaveLength(1);
    expect(history.jobs[0].notes[0].body).toBe('Customer note');
    expect(history.inspections[0].conditionNotes).toBeUndefined();
  });

  it('returns empty sections for a vehicle with no history', async () => {
    mockSelectSequence([[vehicleRow], [], [], [], []]);

    const history = await getVehicleServiceHistory('tenant-1', 'vehicle-1');

    expect(history.jobs).toEqual([]);
    expect(history.serviceRequests).toEqual([]);
    expect(history.inspections).toEqual([]);
    expect(history.odometerReadings).toEqual([]);
  });

  it('throws when the vehicle does not exist in the tenant', async () => {
    mockSelectSequence([[]]);

    await expect(
      getVehicleServiceHistory('tenant-1', 'missing-vehicle'),
    ).rejects.toThrow('Vehicle not found.');
  });

  it('rejects customer audience without a matching owner', async () => {
    mockSelectSequence([[{ ...vehicleRow, primaryCustomerId: 'other-customer' }], []]);

    await expect(
      getVehicleServiceHistory(
        'tenant-1',
        'vehicle-1',
        'customer',
        'customer-2',
      ),
    ).rejects.toThrow('does not belong');
  });

  it('enforces vehicles.read permission before querying', async () => {
    authGuardMock.requireTenantPermission.mockRejectedValue(
      new Error('denied'),
    );

    await expect(
      getVehicleServiceHistory('tenant-1', 'vehicle-1'),
    ).rejects.toThrow('denied');

    expect(dbMock.select).not.toHaveBeenCalled();
  });
});