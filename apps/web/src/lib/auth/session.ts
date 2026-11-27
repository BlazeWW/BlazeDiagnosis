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



function isTenantMembership(
  value: unknown,
): value is TenantMembership {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const membership = value as Record<string, unknown>;

  return (
    typeof membership.tenantId === 'string' &&
    membership.tenantId.length > 0 &&
    typeof membership.role === 'string' &&
    Array.isArray(membership.permissions) &&
    membership.permissions.every(
      (permission) => typeof permission === 'string',
    ) &&
    ['active', 'pending', 'suspended'].includes(
      membership.status as string,
    )
  );
}



export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const authHeader = (await headers()).get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const cookieToken = (await cookies()).get('auth0_session')?.value ?? null;
  const token = bearerToken ?? cookieToken;

 if (
  process.env.NODE_ENV === 'development' &&
  process.env.APP_ENV === 'development' &&
  process.env.ENABLE_DEV_AUTH_FALLBACK === 'true' &&
  (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_AUDIENCE)
)  {
      return {
        id: 'dev-user-id',
        email: 'dev@station.local',
        activeTenantId: process.env.MOCK_TENANT_ID ?? null,
        tenantRole: 'platform_admin',
        roles: ['platform_admin'],
        permissions: [
          'invoices.read',
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

  if (!token) {
    return null;
  }

  const verified = await verifyAuth0Token(token);
    const payload = verified.payload as Record<string, unknown>;

const rawMemberships = payload['custom:tenant_memberships'];

if (
  rawMemberships !== undefined &&
  !Array.isArray(rawMemberships)
) {
  throw new Error('Invalid tenant membership claims.');
}

const tenantMemberships: TenantMembership[] =
  (rawMemberships ?? []).filter(isTenantMembership);

const activeTenantId =
  typeof payload['custom:tenant_id'] === 'string'
    ? payload['custom:tenant_id']
    : null;

const activeMembership = tenantMemberships.find(
  (membership) =>
    membership.tenantId === activeTenantId &&
    membership.status === 'active',
);

if (activeTenantId && !activeMembership) {
  throw new Error('Active tenant membership is invalid.');
}


return {
  id: typeof payload.sub === 'string' ? payload.sub : '',
  email: typeof payload.email === 'string' ? payload.email : '',
  name:
    typeof payload.name === 'string'
      ? payload.name
      : undefined,
  activeTenantId: activeMembership?.tenantId ?? null,
  tenantRole: activeMembership?.role ?? null,
  permissions: activeMembership?.permissions ?? [],
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
