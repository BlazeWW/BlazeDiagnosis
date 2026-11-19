import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mutable mock user object to simulate different roles across test cases
let mockUser = {
  id: 'user-test-1',
  permissions: [] as string[],
  activeTenantId: '00000000-0000-0000-0000-000000000001',
  tenantMemberships: [
    { tenantId: '00000000-0000-0000-0000-000000000001', status: 'active' },
  ],
};

// Mock session authentication
vi.mock('@/lib/auth/session', () => ({
  requireUser: vi.fn().mockImplementation(() => Promise.resolve(mockUser)),
}));

// Mock audit logging to prevent database side effects during permission checks
vi.mock('@/lib/auth/audit', () => ({
  auditTenantPermissionCheck: vi.fn().mockResolvedValue(undefined),
}));

import { requireTenantPermission, TenantAccessError } from '@/lib/authorization/guards';

describe('BD-004: Role Permission Matrix & Authorization Guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('denies suppliers from mutating customer or platform-owned records', async () => {
    // Configure mock user with strict parts_supplier permissions
    mockUser.permissions = [
      'supplier.requests.read',
      'supplier.requests.respond',
      'parts.request',
    ];

    const tenantId = '00000000-0000-0000-0000-000000000001';

    // Suppliers must be blocked from writing customer records
    await expect(
      requireTenantPermission(tenantId, 'customers.write')
    ).rejects.toThrow(TenantAccessError);

    // Suppliers must be blocked from platform administrative actions
    await expect(
      requireTenantPermission(tenantId, 'platform.tenants.manage')
    ).rejects.toThrow(TenantAccessError);
  });

  it('denies read-only roles (e.g., customer) from invoking restricted write actions', async () => {
    // Configure mock user with read-only permissions
    mockUser.permissions = [
      'customers.read',
      'vehicles.read',
      'jobs.read',
    ];

    const tenantId = '00000000-0000-0000-0000-000000000001';

    // Read-only roles attempting to modify customer data must fail closed
    await expect(
      requireTenantPermission(tenantId, 'customers.write')
    ).rejects.toThrow(TenantAccessError);

    // Read-only roles attempting to create quotes must fail closed
    await expect(
      requireTenantPermission(tenantId, 'quotes.create')
    ).rejects.toThrow(TenantAccessError);
  });

  it('allows authorized roles to successfully execute permitted actions', async () => {
    // Configure mock user with site manager / floor manager privileges
    mockUser.permissions = [
      'customers.read',
      'customers.write',
      'quotes.create',
      'tenant.settings.update',
    ];

    const tenantId = '00000000-0000-0000-0000-000000000001';

    // Permitted action should resolve without throwing an error
    const result = await requireTenantPermission(tenantId, 'customers.write');
    expect(result).toBeDefined();
    expect(result.id).toBe('user-test-1');
  });
});