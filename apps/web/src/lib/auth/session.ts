import { cookies, headers } from 'next/headers';
import { verifyAuth0Token } from '@/lib/auth/verify';
import type { Permission, SystemRole } from '@/lib/constants/roles';

export type TenantMembership = {
  tenantId: string;
  role: SystemRole;
  permissions: Permission[];
  status: 'active' | 'pending' | 'suspended';
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  name?: string;
  activeTenantId: string | null;
  tenantRole: SystemRole | null;
  roles?: SystemRole[];
  permissions: Permission[];
  tenantMemberships: TenantMembership[];
};

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const authHeader = (await headers()).get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;
  const cookieToken = (await cookies()).get('auth0_session')?.value ?? null;
  const token = bearerToken ?? cookieToken;

  if (!token) {
    if (
      process.env.NODE_ENV === 'development' &&
      (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_AUDIENCE)
    ) {
      return {
        id: 'dev-user-id',
        email: 'dev@station.local',
        activeTenantId: process.env.MOCK_TENANT_ID ?? null,
        tenantRole: 'platform_admin',
        roles: ['platform_admin'],
        permissions: [
          'platform.tenants.manage',
          'customers.read',
          'customers.write',
          'customers.delete',
          'vehicles.read',
          'vehicles.write',
          'vehicles.delete',
          'jobs.read',
          'jobs.create',
          'jobs.assign',
          'jobs.update_status',
          'jobs.add_internal_note',
          'jobs.add_customer_note',
        ] as Permission[],
        tenantMemberships: [],
      };
    }

    return null;
  }

  const verified = await verifyAuth0Token(token);
  const payload = verified.payload as Record<string, unknown>;

  const tenantMemberships =
    (payload['custom:tenant_memberships'] as TenantMembership[]) || [];
  const activeTenantId = (payload['custom:tenant_id'] as string) || null;

  return {
    id: (payload.sub as string) || '',
    email: (payload.email as string) || '',
    name: (payload.name as string) || undefined,
    activeTenantId,
    tenantRole: (payload['custom:tenant_role'] as SystemRole) || null,
    permissions: (payload['custom:permissions'] as Permission[]) || [],
    tenantMemberships,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Authentication required.');
  }

  return user;
}
