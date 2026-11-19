import { and, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { customers } from '@/db/schema';
import type { SystemRole } from '@/lib/constants/roles';

// Only these roles see internal data. Every other role must prove ownership as a customer.
const STAFF_ROLES: readonly SystemRole[] = [
  'site_manager',
  'floor_manager',
  'mechanic',
  'platform_admin',
];

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isStaffRole(role: SystemRole | null | undefined) {
  return Boolean(role && STAFF_ROLES.includes(role));
}

// The customer is found from the signed-in user (customers.user_id), never from a client-supplied id.
export async function findSessionCustomerId(tenantId: string, userId: string) {
  // customers.user_id is a UUID; identities that are not UUIDs (e.g. Auth0 ids) cannot be linked.
  if (!uuidPattern.test(userId)) {
    return null;
  }

  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.tenantId, tenantId), eq(customers.userId, userId)))
    .limit(1);

  return customer?.id ?? null;
}
