import { beforeEach, describe, expect, it, vi } from 'vitest';

// 1. STUB ENV VARS FIRST (Must be before any route imports)
vi.hoisted(() => {
  process.env.AUTH0_DOMAIN = 'test.auth0.com';
  process.env.AUTH0_AUDIENCE = 'test-audience';
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/test';
});

import { jsonRequest, readJson } from '@/test/apiRouteTestUtils';

// --- Fixtures ---
const TENANT_A = '00000000-0000-0000-0000-000000000001';
const TENANT_A_CUSTOMER_ID = '00000000-0000-0000-0000-000000000002';
const TENANT_A_VEHICLE_ID = '00000000-0000-0000-0000-000000000003';
const TENANT_B_CUSTOMER_ID = '00000000-0000-0000-0000-000000000099';
const TENANT_B_VEHICLE_ID = '00000000-0000-0000-0000-000000000098';

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

// 2. Mock DB client
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

// 3. Mock auth verify
vi.mock('@/lib/auth/verify', () => ({
  verifyAuth0Token: vi.fn().mockResolvedValue({ payload: { sub: 'user-1' } }),
}));

// 4. Mock tenant context and services
vi.mock('@/lib/tenancy/tenantContext', () => tenantContextMock);
vi.mock('@/features/customers/services/customerService', () => customerServiceMock);
vi.mock('@/features/vehicles/services/vehicleService', () => vehicleServiceMock);

import {
  GET as getCustomer,
  PATCH as patchCustomer,
  DELETE as deleteCustomerRoute,
} from '@/app/api/customers/[id]/route';
import {
  GET as getVehicle,
  PATCH as patchVehicle,
  DELETE as deleteVehicleRoute,
} from '@/app/api/vehicles/[id]/route';

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe('BD-058: Cross-tenant negative tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantContextMock.requireTenantContext.mockResolvedValue({ tenantId: TENANT_A });
  });

  // ---------- /api/customers/[id] ----------
  describe('/api/customers/[id]', () => {
    it('rejects GET of another tenant\'s customer (404)', async () => {
      customerServiceMock.getCustomerById.mockResolvedValueOnce(null);

      const response = await getCustomer(
        new Request(`http://localhost/api/customers/${TENANT_B_CUSTOMER_ID}`),
        ctx(TENANT_B_CUSTOMER_ID),
      );

      expect(response.status).toBe(404);
      expect(customerServiceMock.getCustomerById).toHaveBeenCalledWith(
        TENANT_A,
        TENANT_B_CUSTOMER_ID,
      );
      const body = await readJson<{ success: boolean }>(response);
      expect(body.success).toBe(false);
    });

    it('rejects PATCH of another tenant\'s customer', async () => {
      // Service should throw or return null when tenant scoping fails.
      customerServiceMock.updateCustomer.mockRejectedValueOnce(
        new Error('Customer not found'),
      );

      const response = await patchCustomer(
        jsonRequest(`http://localhost/api/customers/${TENANT_B_CUSTOMER_ID}`, {
          firstName: 'Hacked',
        }),
        ctx(TENANT_B_CUSTOMER_ID),
      );

      // Error response (4xx/5xx), not success
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(customerServiceMock.updateCustomer).toHaveBeenCalledWith(
        TENANT_A,
        TENANT_B_CUSTOMER_ID,
        expect.anything(),
      );
    });

    it('rejects DELETE of another tenant\'s customer', async () => {
      customerServiceMock.deleteCustomer.mockRejectedValueOnce(
        new Error('Customer not found'),
      );

      const response = await deleteCustomerRoute(
        new Request(`http://localhost/api/customers/${TENANT_B_CUSTOMER_ID}`, {
          method: 'DELETE',
        }),
        ctx(TENANT_B_CUSTOMER_ID),
      );

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(customerServiceMock.deleteCustomer).toHaveBeenCalledWith(
        TENANT_A,
        TENANT_B_CUSTOMER_ID,
      );
    });

    it('ALLOWS GET of own-tenant customer (positive control)', async () => {
      customerServiceMock.getCustomerById.mockResolvedValueOnce({
        id: TENANT_A_CUSTOMER_ID,
        firstName: 'Own',
        tenantId: TENANT_A,
      });

      const response = await getCustomer(
        new Request(`http://localhost/api/customers/${TENANT_A_CUSTOMER_ID}`),
        ctx(TENANT_A_CUSTOMER_ID),
      );

      expect(response.status).toBe(200);
      const body = await readJson<{ success: boolean; data: { customer: { id: string } } }>(
        response,
      );
      expect(body.success).toBe(true);
      expect(body.data.customer.id).toBe(TENANT_A_CUSTOMER_ID);
    });
  });

  // ---------- /api/vehicles/[id] ----------
  describe('/api/vehicles/[id]', () => {
    it('rejects GET of another tenant\'s vehicle (404)', async () => {
      vehicleServiceMock.getVehicleById.mockResolvedValueOnce(null);

      const response = await getVehicle(
        new Request(`http://localhost/api/vehicles/${TENANT_B_VEHICLE_ID}`),
        ctx(TENANT_B_VEHICLE_ID),
      );

      expect(response.status).toBe(404);
      expect(vehicleServiceMock.getVehicleById).toHaveBeenCalledWith(
        TENANT_A,
        TENANT_B_VEHICLE_ID,
      );
      const body = await readJson<{ success: boolean }>(response);
      expect(body.success).toBe(false);
    });

    it('rejects PATCH of another tenant\'s vehicle', async () => {
      vehicleServiceMock.updateVehicle.mockRejectedValueOnce(
        new Error('Vehicle not found'),
      );

      const response = await patchVehicle(
        jsonRequest(`http://localhost/api/vehicles/${TENANT_B_VEHICLE_ID}`, {
          make: 'Hacked',
        }),
        ctx(TENANT_B_VEHICLE_ID),
      );

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(vehicleServiceMock.updateVehicle).toHaveBeenCalledWith(
        TENANT_A,
        TENANT_B_VEHICLE_ID,
        expect.anything(),
      );
    });

    it('rejects DELETE of another tenant\'s vehicle', async () => {
      vehicleServiceMock.deleteVehicle.mockRejectedValueOnce(
        new Error('Vehicle not found'),
      );

      const response = await deleteVehicleRoute(
        new Request(`http://localhost/api/vehicles/${TENANT_B_VEHICLE_ID}`, {
          method: 'DELETE',
        }),
        ctx(TENANT_B_VEHICLE_ID),
      );

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(vehicleServiceMock.deleteVehicle).toHaveBeenCalledWith(
        TENANT_A,
        TENANT_B_VEHICLE_ID,
      );
    });

    it('ALLOWS GET of own-tenant vehicle (positive control)', async () => {
      vehicleServiceMock.getVehicleById.mockResolvedValueOnce({
        id: TENANT_A_VEHICLE_ID,
        make: 'Toyota',
        tenantId: TENANT_A,
      });

      const response = await getVehicle(
        new Request(`http://localhost/api/vehicles/${TENANT_A_VEHICLE_ID}`),
        ctx(TENANT_A_VEHICLE_ID),
      );

      expect(response.status).toBe(200);
      const body = await readJson<{ success: boolean; data: { vehicle: { id: string } } }>(
        response,
      );
      expect(body.success).toBe(true);
      expect(body.data.vehicle.id).toBe(TENANT_A_VEHICLE_ID);
    });
  });
});