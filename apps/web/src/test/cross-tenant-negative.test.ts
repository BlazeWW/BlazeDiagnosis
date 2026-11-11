import { beforeEach, describe, expect, it, vi } from 'vitest';

// 1. STUB ENV VARS FIRST (Must be before any route imports)
vi.hoisted(() => {
  process.env.AUTH0_DOMAIN = 'test.auth0.com';
  process.env.AUTH0_AUDIENCE = 'test-audience';
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/test';
});

import { readJson } from '@/test/apiRouteTestUtils';

// --- Tenant A (attacker) context ---
const TENANT_A = '00000000-0000-0000-0000-000000000001';
const CUSTOMER_B_ID = '00000000-0000-0000-0000-000000000099';
const VEHICLE_B_ID = '00000000-0000-0000-0000-000000000098';

const tenantContextMock = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
}));
const customerServiceMock = vi.hoisted(() => ({
  getCustomerById: vi.fn(),
  updateCustomer: vi.fn(),
  deleteCustomer: vi.fn(),
}));
const vehicleServiceMock = vi.hoisted(() => ({
  getVehicleById: vi.fn(),
  updateVehicle: vi.fn(),
  deleteVehicle: vi.fn(),
}));

// 2. Mock DB client to prevent real connection attempts
vi.mock('@/db/client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
    query: {},
  },
}));

// 3. Mock auth verify to prevent Auth0 calls
vi.mock('@/lib/auth/verify', () => ({
  verifyAuth0Token: vi.fn().mockResolvedValue({ payload: { sub: 'user-1' } }),
}));

// 4. Mock tenant context and services
vi.mock('@/lib/tenancy/tenantContext', () => tenantContextMock);
vi.mock('@/features/customers/services/customerService', () => customerServiceMock);
vi.mock('@/features/vehicles/services/vehicleService', () => vehicleServiceMock);

import { GET as getCustomer } from '@/app/api/customers/[id]/route';
import { GET as getVehicle } from '@/app/api/vehicles/[id]/route';

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe('BD-058: Cross-tenant negative tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Every test runs as Tenant A
    tenantContextMock.requireTenantContext.mockResolvedValue({ tenantId: TENANT_A });
  });

  describe('/api/customers/[id]', () => {
    it('rejects read of another tenant\'s customer (returns 404)', async () => {
      customerServiceMock.getCustomerById.mockResolvedValueOnce(null);

      const response = await getCustomer(
        new Request(`http://localhost/api/customers/${CUSTOMER_B_ID}`),
        ctx(CUSTOMER_B_ID),
      );

      expect(response.status).toBe(404);
      expect(customerServiceMock.getCustomerById).toHaveBeenCalledWith(
        TENANT_A,
        CUSTOMER_B_ID,
      );
      const body = await readJson<{ success: boolean }>(response);
      expect(body.success).toBe(false);
    });
  });

  describe('/api/vehicles/[id]', () => {
    it('rejects read of another tenant\'s vehicle (returns 404)', async () => {
      vehicleServiceMock.getVehicleById.mockResolvedValueOnce(null);

      const response = await getVehicle(
        new Request(`http://localhost/api/vehicles/${VEHICLE_B_ID}`),
        ctx(VEHICLE_B_ID),
      );

      expect(response.status).toBe(404);
      expect(vehicleServiceMock.getVehicleById).toHaveBeenCalledWith(
        TENANT_A,
        VEHICLE_B_ID,
      );
      const body = await readJson<{ success: boolean }>(response);
      expect(body.success).toBe(false);
    });
  });
});