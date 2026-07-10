import { describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  insert: vi.fn(),
  select: vi.fn(),
}));
const tenantContextMock = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
}));
const vehicleServiceMock = vi.hoisted(() => ({
  createVehicle: vi.fn(),
}));

vi.mock('@/db/client', () => ({ db: dbMock }));
vi.mock('@/lib/tenancy/tenantContext', () => tenantContextMock);
vi.mock('@/features/vehicles/services/vehicleService', () => vehicleServiceMock);

import * as partsAlias from './parts-request/route';
import * as partsCanonical from './parts-requests/route';
import * as supplierAlias from './supplier-response/route';
import * as supplierCanonical from './supplier-responses/route';
import * as vehicleAlias from './vehicle/route';
import * as vehicleCanonical from './vehicles/route';

describe('legacy API route aliases', () => {
  it('re-exports canonical vehicle handlers', () => {
    expect(vehicleAlias.GET).toBe(vehicleCanonical.GET);
    expect(vehicleAlias.POST).toBe(vehicleCanonical.POST);
  });

  it('re-exports canonical parts request handlers', () => {
    expect(partsAlias.GET).toBe(partsCanonical.GET);
    expect(partsAlias.POST).toBe(partsCanonical.POST);
  });

  it('re-exports canonical supplier response handlers', () => {
    expect(supplierAlias.GET).toBe(supplierCanonical.GET);
    expect(supplierAlias.POST).toBe(supplierCanonical.POST);
  });
});
