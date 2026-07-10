import { beforeEach, describe, expect, it, vi } from 'vitest';

const authGuardMock = vi.hoisted(() => ({
  requireTenantPermission: vi.fn(),
}));
const vehicleServiceMock = vi.hoisted(() => ({
  createVehicle: vi.fn(),
}));
const dbMock = vi.hoisted(() => ({
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/lib/authorization/guards', () => authGuardMock);
vi.mock('@/features/vehicles/services/vehicleService', () => vehicleServiceMock);
vi.mock('@/db/client', () => ({ db: dbMock }));

import {
  createCustomer,
  createCustomerVehicleIntake,
  deleteCustomer,
  getCustomerById,
  updateCustomer,
} from './customerService';

function mockSelectLimitSequence(rows: unknown[][]) {
  dbMock.select.mockImplementation(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve(rows.shift() ?? [])),
      })),
    })),
  }));
}

describe('customerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authGuardMock.requireTenantPermission.mockResolvedValue(undefined);
  });

  it('creates a customer when duplicate checks pass', async () => {
    mockSelectLimitSequence([[], []]);
    dbMock.insert.mockReturnValue({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 'customer-1' }])),
      })),
    });

    await expect(
      createCustomer('tenant-1', {
        email: 'ben@example.com',
        firstName: 'Ben',
        lastName: 'Henning',
        phone: '0820000000',
        preferredLocale: 'en',
      }),
    ).resolves.toEqual({ id: 'customer-1' });

    expect(authGuardMock.requireTenantPermission).toHaveBeenCalledWith('tenant-1', 'customers.write');
  });

  it('rejects duplicate phone numbers before inserting', async () => {
    mockSelectLimitSequence([[{ id: 'existing-customer' }]]);

    await expect(
      createCustomer('tenant-1', {
        firstName: 'Ben',
        lastName: 'Henning',
        phone: '0820000000',
        preferredLocale: 'en',
      }),
    ).rejects.toThrow('same phone number');

    expect(dbMock.insert).not.toHaveBeenCalled();
  });

  it('returns null when a customer is not found', async () => {
    mockSelectLimitSequence([[]]);

    await expect(getCustomerById('tenant-1', 'missing')).resolves.toBeNull();
  });

  it('updates customer records with tenant scoping', async () => {
    dbMock.update.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: 'customer-1', firstName: 'Updated' }])),
        })),
      })),
    });

    await expect(
      updateCustomer('tenant-1', 'customer-1', { firstName: 'Updated' }),
    ).resolves.toMatchObject({ firstName: 'Updated' });
  });

  it('archives customers instead of hard deleting them', async () => {
    const where = vi.fn(() => Promise.resolve());
    const set = vi.fn(() => ({ where }));
    dbMock.update.mockReturnValue({ set });

    await deleteCustomer('tenant-1', 'customer-1');

    expect(set).toHaveBeenCalledWith(expect.objectContaining({ isArchived: true }));
  });

  it('creates customer and vehicle records through the intake workflow', async () => {
    mockSelectLimitSequence([[], []]);
    dbMock.insert.mockReturnValue({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 'customer-1' }])),
      })),
    });
    vehicleServiceMock.createVehicle.mockResolvedValue({ id: 'vehicle-1' });

    await expect(
      createCustomerVehicleIntake('tenant-1', {
        customer: {
          firstName: 'Jane',
          lastName: 'Customer',
        },
        vehicle: {
          make: 'Toyota',
          model: 'Hilux',
          registrationNumber: 'CA123456',
        },
      }),
    ).resolves.toEqual({
      customer: { id: 'customer-1' },
      vehicle: { id: 'vehicle-1' },
    });

    expect(vehicleServiceMock.createVehicle).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ primaryCustomerId: 'customer-1' }),
    );
  });
});
