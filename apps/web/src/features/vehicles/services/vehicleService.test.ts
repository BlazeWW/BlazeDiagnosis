import { beforeEach, describe, expect, it, vi } from 'vitest';

const authGuardMock = vi.hoisted(() => ({
  requireTenantPermission: vi.fn(),
}));
const dbMock = vi.hoisted(() => ({
  select: vi.fn(),
  transaction: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/lib/authorization/guards', () => authGuardMock);
vi.mock('@/db/client', () => ({ db: dbMock }));

import {
  createVehicle,
  deleteVehicle,
  getVehicleById,
  listVehiclesForCustomer,
  updateVehicle,
} from './vehicleService';

function mockSelectLimitSequence(rows: unknown[][]) {
  dbMock.select.mockImplementation(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve(rows.shift() ?? [])),
      })),
    })),
  }));
}

describe('vehicleService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authGuardMock.requireTenantPermission.mockResolvedValue(undefined);
  });

  it('creates a vehicle, owner link, and odometer reading in a transaction', async () => {
    mockSelectLimitSequence([[], []]);
    const tx = {
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: 'vehicle-1' }])),
        })),
      })),
    };
    dbMock.transaction.mockImplementation((callback) => callback(tx));

    await expect(
      createVehicle('tenant-1', {
        make: 'Toyota',
        mileage: 125000,
        model: 'Hilux',
        primaryCustomerId: 'customer-1',
        registrationNumber: 'CA123456',
      }),
    ).resolves.toEqual({ id: 'vehicle-1' });

    expect(tx.insert).toHaveBeenCalledTimes(3);
  });

  it('rejects duplicate VIN records', async () => {
    mockSelectLimitSequence([[{ id: 'existing-vehicle' }]]);

    await expect(
      createVehicle('tenant-1', {
        make: 'Toyota',
        model: 'Hilux',
        primaryCustomerId: 'customer-1',
        vin: 'VIN123',
      }),
    ).rejects.toThrow('same VIN');
  });

  it('lists vehicles for a customer', async () => {
    dbMock.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ id: 'vehicle-1' }])),
      })),
    });

    await expect(listVehiclesForCustomer('tenant-1', 'customer-1')).resolves.toEqual([
      { id: 'vehicle-1' },
    ]);
  });

  it('returns one non-archived vehicle by ID', async () => {
    mockSelectLimitSequence([[{ id: 'vehicle-1' }]]);

    await expect(getVehicleById('tenant-1', 'vehicle-1')).resolves.toEqual({ id: 'vehicle-1' });
  });

  it('updates a vehicle and writes mileage history when mileage is supplied', async () => {
    const tx = {
      insert: vi.fn(() => ({ values: vi.fn(() => Promise.resolve()) })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([{ id: 'vehicle-1', mileage: 130000 }])),
          })),
        })),
      })),
    };
    dbMock.transaction.mockImplementation((callback) => callback(tx));

    await expect(
      updateVehicle('tenant-1', 'vehicle-1', { mileage: 130000 }),
    ).resolves.toMatchObject({ mileage: 130000 });

    expect(tx.insert).toHaveBeenCalledTimes(1);
  });

  it('archives vehicles instead of hard deleting them', async () => {
    const where = vi.fn(() => Promise.resolve());
    const set = vi.fn(() => ({ where }));
    dbMock.update.mockReturnValue({ set });

    await deleteVehicle('tenant-1', 'vehicle-1');

    expect(set).toHaveBeenCalledWith(expect.objectContaining({ isArchived: true }));
  });
});
