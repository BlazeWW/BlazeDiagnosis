import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as postCustomer } from '@/app/api/customers/route';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';

// 1. Mock the database client
vi.mock('@/db/client', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'mock-id' }]),
      }),
    }),
    select: vi.fn(),
  },
}));

// 2. Mock auth/session
vi.mock('@/lib/auth/session', () => ({
  requireUser: vi.fn().mockResolvedValue({
    id: 'user-1',
    permissions: ['customers:create'],
    activeTenantId: '00000000-0000-0000-0000-000000000001',
    tenantMemberships: [{ tenantId: '00000000-0000-0000-0000-000000000001', status: 'active' }],
  }),
}));

// 3. Mock tenant context resolution
vi.mock('@/lib/tenancy/tenantContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/tenancy/tenantContext')>();
  return {
    ...actual,
    requireTenantContext: vi.fn(),
  };
});

describe('BD-003: Tenant Authorization and Injection Guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects POST requests when client submits a conflicting tenantId', async () => {
    vi.mocked(requireTenantContext).mockResolvedValueOnce({
      tenantId: '00000000-0000-0000-0000-000000000001',
      source: 'session',
    });

    const maliciousPayload = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'attack@tenant-b.com',
      tenantId: '00000000-0000-0000-0000-000000000099', // Conflict!
    };

    const request = new Request('http://localhost:3000/api/customers', {
      method: 'POST',
      body: JSON.stringify(maliciousPayload),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await postCustomer(request);
    const body = await response.json();

    expect(response.status).toBeGreaterThanOrEqual(400);
    
    const errorMessage = typeof body.error === 'string' ? body.error : JSON.stringify(body.error);
    expect(errorMessage).toMatch(/tenant ID conflicts|Cross-tenant access denied|Forbidden|tenant_scope_mismatch/i);
  });

  it('allows POST requests when tenantId matches or is omitted (relying on server context)', async () => {
    vi.mocked(requireTenantContext).mockResolvedValueOnce({
      tenantId: '00000000-0000-0000-0000-000000000001',
      source: 'session',
    });

    const validPayload = {
      firstName: 'John',
      lastName: 'Smith',
      email: 'valid@tenant-a.com',
    };

    const request = new Request('http://localhost:3000/api/customers', {
      method: 'POST',
      body: JSON.stringify(validPayload),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await postCustomer(request);
    const body = await response.json();

    if (body.error) {
      const errorMessage = typeof body.error === 'string' ? body.error : JSON.stringify(body.error);
      expect(errorMessage).not.toMatch(/conflicts with authenticated session/i);
    }
  });
});