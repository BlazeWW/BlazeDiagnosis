import { and, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { tenantSettings, tenants } from '@/db/schema';
import { writeAuditLog } from '@/features/audit/services/auditService';
import { requireTenantPermission } from '@/lib/authorization/guards';

import {
  assertFeatureEntitled,
  assertWithinPlanLimit,
  type EntitlementFeatureKey,
  type EntitlementLimitKey,
  type SubscriptionLifecycleStatus,
  type SubscriptionPlanTier,
  type TenantSubscriptionState,
} from '../policies/entitlementPolicy';

export const SUBSCRIPTION_SETTING_KEY = 'subscription.plan';

export interface AssignTenantPlanInput {
  planTier: SubscriptionPlanTier;
  status: SubscriptionLifecycleStatus;
  expiresAt: string | null;
}

function mapLifecycleToTenantDbStatus(
  status: SubscriptionLifecycleStatus,
): 'trial' | 'active' | 'suspended' {
  if (status === 'suspended') {
    return 'suspended';
  }
  if (status === 'trial') {
    return 'trial';
  }
  return 'active';
}

export async function getTenantSubscription(
  tenantId: string,
): Promise<TenantSubscriptionState> {
  const [row] = await db
    .select()
    .from(tenantSettings)
    .where(
      and(
        eq(tenantSettings.tenantId, tenantId),
        eq(tenantSettings.settingKey, SUBSCRIPTION_SETTING_KEY),
      ),
    )
    .limit(1);

  if (!row || !row.settingValue) {
    return {
      tenantId,
      planTier: 'starter',
      status: 'trial',
      expiresAt: null,
      updatedAt: new Date(0).toISOString(),
    };
  }

  const val = row.settingValue as Partial<TenantSubscriptionState>;
  return {
    tenantId,
    planTier: val.planTier ?? 'starter',
    status: val.status ?? 'trial',
    expiresAt: val.expiresAt ?? null,
    updatedAt:
      typeof val.updatedAt === 'string'
        ? val.updatedAt
        : new Date().toISOString(),
  };
}

export async function assignTenantPlan(
  tenantId: string,
  input: AssignTenantPlanInput,
  actorUserId: string,
): Promise<TenantSubscriptionState> {
  await requireTenantPermission(tenantId, 'platform.tenants.manage');

  const previous = await getTenantSubscription(tenantId);
  const nextValue: TenantSubscriptionState = {
    tenantId,
    planTier: input.planTier,
    status: input.status,
    expiresAt: input.expiresAt,
    updatedAt: new Date().toISOString(),
  };

  await db
    .insert(tenantSettings)
    .values({
      tenantId,
      settingKey: SUBSCRIPTION_SETTING_KEY,
      settingValue: nextValue as unknown as Record<string, unknown>,
    })
    .onConflictDoUpdate({
      target: [tenantSettings.tenantId, tenantSettings.settingKey],
      set: {
        settingValue: nextValue as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      },
    });

  await db
    .update(tenants)
    .set({
      status: mapLifecycleToTenantDbStatus(input.status),
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenantId));

  await writeAuditLog({
    tenantId,
    actorUserId,
    action: 'UPDATE',
    entityType: 'tenant_subscription',
    entityId: tenantId,
    previousValue: {
      planTier: previous.planTier,
      status: previous.status,
      expiresAt: previous.expiresAt,
    },
    newValue: {
      planTier: nextValue.planTier,
      status: nextValue.status,
      expiresAt: nextValue.expiresAt,
    },
  });

  return nextValue;
}

export async function enforceTenantFeature(
  tenantId: string,
  feature: EntitlementFeatureKey,
  now: Date = new Date(),
): Promise<void> {
  const subscription = await getTenantSubscription(tenantId);
  assertFeatureEntitled(subscription, feature, now);
}

export async function enforceTenantLimit(
  tenantId: string,
  limitKey: EntitlementLimitKey,
  currentCount: number,
  now: Date = new Date(),
): Promise<void> {
  const subscription = await getTenantSubscription(tenantId);
  assertWithinPlanLimit(subscription, limitKey, currentCount, now);
}