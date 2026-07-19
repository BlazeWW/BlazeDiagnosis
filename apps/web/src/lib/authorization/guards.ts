import type { Permission } from '@/lib/constants/roles';

import { requireUser } from '../auth/session';
import { auditTenantPermissionCheck } from '@/lib/auth/audit';

export class TenantAccessError extends Error {
  constructor(message = 'Cross-tenant access denied or missing permission.') {
    super(message);
    this.name = 'TenantAccessError';
  }
}

export async function requirePermission(permission: Permission) {
  const user = await requireUser();

  if (!user.permissions.includes(permission)) {
    throw new Error(`Missing permission: ${permission}`);
  }

  return user;
}

export async function requireAnyPermission(requiredPermissions: Permission[]) {
  const user = await requireUser();
  const allowed = requiredPermissions.some((permission) =>
    user.permissions.includes(permission),
  );

  if (!allowed) {
    throw new Error(
      `Missing one of permissions: ${requiredPermissions.join(', ')}`,
    );
  }

  return user;
}

export async function requireTenantPermission(
  tenantId: string,
  permission: Permission,
) {
  const user = await requireUser();
  const hasPermission = user.permissions.includes(permission);
  const isPlatformAdmin = user.permissions.includes('platform.tenants.manage');
  const membership = user.tenantMemberships?.find(
    (item) => item.tenantId === tenantId,
  );
  const isTenantMember = membership?.status === 'active';
  const hasTenantScope = isPlatformAdmin || user.activeTenantId === tenantId || isTenantMember;

  if (!hasPermission || !hasTenantScope) {
    await auditTenantPermissionCheck({
      tenantId,
      userId: user.id,
      resource: 'unknown',
      action: 'unknown',
      permission,
      result: 'denied',
      reason: !hasPermission
        ? 'missing_permission'
        : 'tenant_scope_mismatch',
    });

    throw new TenantAccessError('Cross-tenant access denied or missing permission.');
  }

  await auditTenantPermissionCheck({
    tenantId,
    userId: user.id,
    resource: 'unknown',
    action: 'unknown',
    permission,
    result: 'allowed',
    reason: 'permission_granted',
  });

  return user;
}
