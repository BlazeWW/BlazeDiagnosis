import { and, countDistinct, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/db/client';

import {
  auditLogs,
  tenantBranding,
  tenantFeatureFlags,
  tenantSettings,
  tenants,
} from '@/db/schema';

import {
  requirePermission,
  requireTenantPermission,
} from '@/lib/authorization/guards';

import { writeAuditLog } from '@/features/audit/services/auditService';

export async function createTenant(input: {
  name: string;
  slug: string;
  legalName?: string;
}) {
  await requirePermission('platform.tenants.manage');

  const [tenant] = await db.insert(tenants).values(input).returning();

  await db.insert(tenantBranding).values({ tenantId: tenant.id });

  return tenant;
}

export async function getTenantBySlug(slug: string) {
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);
  return tenant ?? null;
}

export async function setTenantSetting(
  tenantId: string,
  settingKey: string,
  settingValue: Record<string, unknown>,
) {
  await requireTenantPermission(tenantId, 'tenant.settings.update');

  const [setting] = await db
    .insert(tenantSettings)
    .values({ tenantId, settingKey, settingValue })
    .onConflictDoUpdate({
      target: [tenantSettings.tenantId, tenantSettings.settingKey],
      set: { settingValue, updatedAt: new Date() },
    })
    .returning();

  return setting;
}

export async function isFeatureEnabled(tenantId: string, flagKey: string) {
  const [flag] = await db
    .select()
    .from(tenantFeatureFlags)
    .where(
      and(
        eq(tenantFeatureFlags.tenantId, tenantId),
        eq(tenantFeatureFlags.flagKey, flagKey),
      ),
    )
    .limit(1);

  return Boolean(flag?.enabled);
}

export async function getTenantBrandingConfig(tenantId: string) {
  await requireTenantPermission(tenantId, 'tenant.settings.update');

  const [branding] = await db
    .select()
    .from(tenantBranding)
    .where(eq(tenantBranding.tenantId, tenantId))
    .limit(1);

  const [documentSettings] = await db
    .select()
    .from(tenantSettings)
    .where(
      and(
        eq(tenantSettings.tenantId, tenantId),
        eq(tenantSettings.settingKey, 'branding.document'),
      ),
    )
    .limit(1);

  return {
    branding,
    documentSettings: documentSettings?.settingValue ?? {},
  };
}

export async function updateTenantBrandingConfig(
  tenantId: string,
  input: {
    accentColor: string;
    businessEmail?: string;
    businessName: string;
    businessPhone?: string;
    invoicePrefix: string;
    legalName?: string;
    logoUrl?: string;
    primaryColor: string;
    quotePrefix: string;
    secondaryColor: string;
    taxNumber?: string;
    tradingAddress?: string;
  },
) {
  await requireTenantPermission(tenantId, 'tenant.settings.update');

  const [existingBranding] = await db
    .select()
    .from(tenantBranding)
    .where(eq(tenantBranding.tenantId, tenantId))
    .limit(1);

  const brandingValues = {
    accentColor: input.accentColor,
    logoUrl: input.logoUrl || null,
    primaryColor: input.primaryColor,
    secondaryColor: input.secondaryColor,
    updatedAt: new Date(),
  };

  const [branding] = existingBranding
    ? await db
        .update(tenantBranding)
        .set(brandingValues)
        .where(eq(tenantBranding.tenantId, tenantId))
        .returning()
    : await db
        .insert(tenantBranding)
        .values({ ...brandingValues, tenantId })
        .returning();

  const documentSettings = await setTenantSetting(tenantId, 'branding.document', {
    businessEmail: input.businessEmail,
    businessName: input.businessName,
    businessPhone: input.businessPhone,
    invoicePrefix: input.invoicePrefix,
    legalName: input.legalName,
    quotePrefix: input.quotePrefix,
    taxNumber: input.taxNumber,
    tradingAddress: input.tradingAddress,
  });

  return { branding, documentSettings };
}

export async function setTenantFeatureFlag(
  tenantId: string,
  flagKey: string,
  enabled: boolean,
  actorUserId: string,
) {
  await requireTenantPermission(tenantId, 'platform.tenants.manage');

  // Read previous value for audit
  const [existing] = await db
    .select()
    .from(tenantFeatureFlags)
    .where(
      and(
        eq(tenantFeatureFlags.tenantId, tenantId),
        eq(tenantFeatureFlags.flagKey, flagKey),
      ),
    )
    .limit(1);

  const previousValue = existing ? { enabled: existing.enabled } : null;

  const [flag] = await db
    .insert(tenantFeatureFlags)
    .values({ tenantId, flagKey, enabled })
    .onConflictDoUpdate({
      target: [tenantFeatureFlags.tenantId, tenantFeatureFlags.flagKey],
      set: { enabled, updatedAt: new Date() },
    })
    .returning();

  await writeAuditLog({
    tenantId,
    actorUserId,
    action: 'UPDATE',
    entityType: 'tenant_feature_flag',
    entityId: flag.id,
    previousValue,
    newValue: { flagKey, enabled: flag.enabled },
  });

  return flag;
}

export async function getTenantUsageMetrics(tenantId: string, days = 30) {
  if (!Number.isFinite(days) || days <= 0) {
    throw new Error('days must be a positive integer');
  }

  await requireTenantPermission(tenantId, 'platform.tenants.manage');

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [row] = await db
    .select({
      activeUsers: countDistinct(auditLogs.actorUserId),
      jobsCreated: sql<number>`count(*) filter (where ${auditLogs.entityType} = 'job' and ${auditLogs.action} = 'CREATE')`,
      quotesSent: sql<number>`count(*) filter (where ${auditLogs.entityType} = 'quote' and ${auditLogs.action} = 'SEND')`,
    })
    .from(auditLogs)
    .where(and(eq(auditLogs.tenantId, tenantId), gte(auditLogs.createdAt, since)));

  return {
    tenantId,
    days,
    activeUsers: Number(row?.activeUsers ?? 0),
    jobsCreated: Number(row?.jobsCreated ?? 0),
    quotesSent: Number(row?.quotesSent ?? 0),
  };
}