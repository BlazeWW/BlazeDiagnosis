import { beforeEach, describe, expect, it, vi } from 'vitest';

const authGuardMock = vi.hoisted(() => ({
  requireTenantPermission: vi.fn(),
  TenantAccessError: class TenantAccessError extends Error {},
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

const CUSTOMER_USER_ID = '44444444-4444-4444-8444-444444444444';
const staffUser = { id: 'auth0|mechanic', tenantRole: 'mechanic' };
const customerUser = { id: CUSTOMER_USER_ID, tenantRole: 'customer' };

describe('getVehicleServiceHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authGuardMock.requireTenantPermission.mockResolvedValue(staffUser);
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

  it('gives a customer session the customer view, found from the session', async () => {
    authGuardMock.requireTenantPermission.mockResolvedValue(customerUser);
    mockSelectSequence([
      [vehicleRow],
      [{ id: 'customer-1' }],
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

    const history = await getVehicleServiceHistory('tenant-1', 'vehicle-1');

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

  it.each([
    ['does not exist in the tenant', 'missing-vehicle'],
    ['is archived (deleted link)', 'archived-vehicle'],
  ])('returns 404 when the vehicle %s', async (_label, vehicleId) => {
    // The query filters on tenant and isArchived = false, so both cases return no row.
    mockSelectSequence([[]]);

    await expect(
      getVehicleServiceHistory('tenant-1', vehicleId),
    ).rejects.toMatchObject({ message: 'Vehicle not found.', status: 404 });
    expect(dbMock.select).toHaveBeenCalledTimes(1);
  });

  it('rejects a former co-owner whose vehicle link was removed', async () => {
    authGuardMock.requireTenantPermission.mockResolvedValue(customerUser);
    mockSelectSequence([
      [{ ...vehicleRow, primaryCustomerId: 'current-owner' }],
      [{ id: 'former-co-owner' }],
      [], // vehicle_customers link no longer exists
    ]);

    await expect(
      getVehicleServiceHistory('tenant-1', 'vehicle-1'),
    ).rejects.toThrow('does not belong');
    // Stops after the ownership check: no history queries run.
    expect(dbMock.select).toHaveBeenCalledTimes(3);
  });

  it('rejects a customer who does not own the vehicle', async () => {
    authGuardMock.requireTenantPermission.mockResolvedValue(customerUser);
    mockSelectSequence([
      [{ ...vehicleRow, primaryCustomerId: 'other-customer' }],
      [{ id: 'customer-2' }],
      [],
    ]);

    await expect(
      getVehicleServiceHistory('tenant-1', 'vehicle-1'),
    ).rejects.toThrow('does not belong');
  });

  it.each([
    [
      'a customer with no linked profile',
      { id: 'auth0|customer', tenantRole: 'customer' },
    ],
    ['a user with no role', { id: CUSTOMER_USER_ID, tenantRole: null }],
    ['a supplier', { id: CUSTOMER_USER_ID, tenantRole: 'parts_supplier' }],
  ])('never falls back to the staff view for %s', async (_label, user) => {
    authGuardMock.requireTenantPermission.mockResolvedValue(user);
    mockSelectSequence([[vehicleRow], [], []]);

    await expect(
      getVehicleServiceHistory('tenant-1', 'vehicle-1'),
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
