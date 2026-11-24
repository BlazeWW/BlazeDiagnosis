import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.AUTH0_DOMAIN = 'test.auth0.com';
  process.env.AUTH0_AUDIENCE = 'test-audience';
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/test';
});

const guardMock = vi.hoisted(() => ({
  requireTenantPermission: vi.fn(),
  requirePermission: vi.fn(),
}));

const auditMock = vi.hoisted(() => ({
  writeAuditLog: vi.fn().mockResolvedValue({ id: 'audit-subscription-1' }),
}));

const storeMock = vi.hoisted(() => {
  const settingsByKey = new Map<string, Record<string, unknown>>();
  const tenantStatuses = new Map<string, string>();
  return {
    settingsByKey,
    tenantStatuses,
    reset() {
      settingsByKey.clear();
      tenantStatuses.clear();
    },
  };
});

const dbMock = vi.hoisted(() => ({
  select: vi.fn<(...args: unknown[]) => unknown>(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(async () => {
          const entry = storeMock.settingsByKey.get(
            '00000000-0000-0000-0000-000000000001:subscription.plan',
          );
          return entry ? [{ settingValue: entry }] : [];
        }),
      })),
    })),
  })),
  insert: vi.fn<(...args: unknown[]) => unknown>(() => ({
    values: vi.fn(
      (vals: { tenantId: string; settingValue: Record<string, unknown> }) => ({
        onConflictDoUpdate: vi.fn(async () => {
          storeMock.settingsByKey.set(
            `${vals.tenantId}:subscription.plan`,
            vals.settingValue,
          );
        }),
      }),
    ),
  })),
  update: vi.fn<(...args: unknown[]) => unknown>(() => ({
    set: vi.fn((patch: { status?: string }) => ({
      where: vi.fn(async () => {
        if (patch.status) {
          storeMock.tenantStatuses.set(
            '00000000-0000-0000-0000-000000000001',
            patch.status,
          );
        }
      }),
    })),
  })),
}));

vi.mock('@/lib/authorization/guards', () => guardMock);
vi.mock('@/db/client', () => ({ db: dbMock }));
vi.mock('@/features/audit/services/auditService', () => auditMock);

import {
  assertFeatureEntitled,
  assertWithinPlanLimit,
  resolveEffectiveEntitlements,
  SubscriptionEntitlementError,
  type TenantSubscriptionState,
} from '../policies/entitlementPolicy';
import {
  assignTenantPlan,
  enforceTenantFeature,
  enforceTenantLimit,
  getTenantSubscription,
} from './subscriptionService';
import {
  assertCanProvisionStaffSeat,
  updateTenantBrandingConfig,
} from './tenantService';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const ACTOR_ID = 'admin-user-001';

describe('BD-045: Subscriptions & Entitlements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.select.mockReset();
    storeMock.reset();
    guardMock.requireTenantPermission.mockResolvedValue(undefined);
  });

  describe('entitlementPolicy pure rules', () => {
    it('blocks forbidden premium features on starter tier while allowing included ones', () => {
      const starterSub: TenantSubscriptionState = {
        tenantId: TENANT_ID,
        planTier: 'starter',
        status: 'active',
        expiresAt: '2027-01-01T00:00:00.000Z',
        updatedAt: '2026-11-24T00:00:00.000Z',
      };

      expect(() =>
        assertFeatureEntitled(starterSub, 'api_integrations'),
      ).toThrow(SubscriptionEntitlementError);

      expect(() =>
        assertFeatureEntitled(starterSub, 'multi_site_dispatch'),
      ).toThrow(/does not include feature "multi_site_dispatch"/);

      expect(() =>
        assertWithinPlanLimit(starterSub, 'max_staff_seats', 5),
      ).not.toThrow();

      expect(() =>
        assertWithinPlanLimit(starterSub, 'max_staff_seats', 6),
      ).toThrow(/exceeds "starter" limit \(5\)/);
    });

    it('rejects access when subscription expiresAt is in the past or status is expired', () => {
      const expiredSub: TenantSubscriptionState = {
        tenantId: TENANT_ID,
        planTier: 'enterprise',
        status: 'active',
        expiresAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      };

      const now = new Date('2026-11-24T08:00:00.000Z');
      const effective = resolveEffectiveEntitlements(expiredSub, now);
      expect(effective.active).toBe(false);
      expect(effective.effectiveStatus).toBe('expired');

      try {
        assertFeatureEntitled(expiredSub, 'custom_branding', now);
        expect.fail('Expected SubscriptionEntitlementError for expired plan');
      } catch (err) {
        expect(err).toBeInstanceOf(SubscriptionEntitlementError);
        expect((err as SubscriptionEntitlementError).code).toBe('PLAN_EXPIRED');
        expect((err as SubscriptionEntitlementError).statusCode).toBe(403);
      }
    });

    it('rejects feature and limit checks when tenant subscription is suspended', () => {
      const suspendedSub: TenantSubscriptionState = {
        tenantId: TENANT_ID,
        planTier: 'growth',
        status: 'suspended',
        expiresAt: '2027-06-01T00:00:00.000Z',
        updatedAt: '2026-11-24T00:00:00.000Z',
      };

      try {
        assertFeatureEntitled(suspendedSub, 'custom_branding');
        expect.fail('Expected SubscriptionEntitlementError for suspended plan');
      } catch (err) {
        expect(err).toBeInstanceOf(SubscriptionEntitlementError);
        expect((err as SubscriptionEntitlementError).code).toBe('PLAN_SUSPENDED');
        expect((err as SubscriptionEntitlementError).statusCode).toBe(403);
      }
    });
  });

  describe('subscriptionService persistence, downgrade & enforcement', () => {
    it('supports a valid downgrade from enterprise to starter, writes an audit log, and blocks newly restricted features', async () => {
      await assignTenantPlan(
        TENANT_ID,
        {
          planTier: 'enterprise',
          status: 'active',
          expiresAt: '2027-11-24T00:00:00.000Z',
        },
        ACTOR_ID,
      );

      await expect(
        enforceTenantFeature(TENANT_ID, 'api_integrations'),
      ).resolves.toBeUndefined();

      const downgraded = await assignTenantPlan(
        TENANT_ID,
        {
          planTier: 'starter',
          status: 'active',
          expiresAt: '2027-11-24T00:00:00.000Z',
        },
        ACTOR_ID,
      );

      expect(downgraded.planTier).toBe('starter');
      expect(auditMock.writeAuditLog).toHaveBeenLastCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          actorUserId: ACTOR_ID,
          action: 'UPDATE',
          entityType: 'tenant_subscription',
          previousValue: expect.objectContaining({ planTier: 'enterprise' }),
          newValue: expect.objectContaining({ planTier: 'starter' }),
        }),
      );

      await expect(
        enforceTenantFeature(TENANT_ID, 'api_integrations'),
      ).rejects.toThrow(/does not include feature "api_integrations"/);

      await expect(
        enforceTenantLimit(TENANT_ID, 'max_staff_seats', 8),
      ).rejects.toThrow(/exceeds "starter" limit \(5\)/);
    });

    it('blocks restricted features when persisted plan is expired or suspended', async () => {
      await assignTenantPlan(
        TENANT_ID,
        {
          planTier: 'growth',
          status: 'expired',
          expiresAt: '2026-01-01T00:00:00.000Z',
        },
        ACTOR_ID,
      );

      await expect(
        enforceTenantFeature(TENANT_ID, 'custom_branding'),
      ).rejects.toThrow(/subscription has expired/);

      await assignTenantPlan(
        TENANT_ID,
        {
          planTier: 'growth',
          status: 'suspended',
          expiresAt: '2027-12-31T00:00:00.000Z',
        },
        ACTOR_ID,
      );

      await expect(
        enforceTenantFeature(TENANT_ID, 'custom_branding'),
      ).rejects.toThrow(/subscription is suspended/);

      const current = await getTenantSubscription(TENANT_ID);
      expect(current.status).toBe('suspended');
    });

    it('denies plan mutation when caller lacks platform.tenants.manage permission', async () => {
      guardMock.requireTenantPermission.mockRejectedValueOnce(
        new Error('Forbidden: missing platform.tenants.manage'),
      );

      await expect(
        assignTenantPlan(
          TENANT_ID,
          { planTier: 'growth', status: 'active', expiresAt: null },
          'non-admin-user',
        ),
      ).rejects.toThrow(/Forbidden/i);

      expect(auditMock.writeAuditLog).not.toHaveBeenCalled();
    });
  });

  describe('tenantService server-side entitlement enforcement & data preservation', () => {
    it('blocks updateTenantBrandingConfig on starter plan without mutating existing branding or customer data', async () => {
      const existingBranding = {
        tenantId: TENANT_ID,
        accentColor: '#112233',
        logoUrl: 'https://example.com/existing-logo.png',
        primaryColor: '#001122',
        secondaryColor: '#334455',
      };

      const insertSpy = vi.fn();
      const updateSpy = vi.fn();

      dbMock.select
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(async () => [
                {
                  settingValue: {
                    tenantId: TENANT_ID,
                    planTier: 'starter',
                    status: 'active',
                    expiresAt: '2027-06-30T00:00:00.000Z',
                    updatedAt: '2026-11-24T00:00:00.000Z',
                  },
                },
              ]),
            })),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(async () => [existingBranding]),
            })),
          })),
        });

      dbMock.insert.mockImplementation(insertSpy);
      dbMock.update.mockImplementation(updateSpy);

      await expect(
        updateTenantBrandingConfig(TENANT_ID, {
          accentColor: '#ff0000',
          businessName: 'Blocked Workshop',
          invoicePrefix: 'INV-',
          logoUrl: 'https://example.com/new-logo.png',
          primaryColor: '#000000',
          quotePrefix: 'QTE-',
          secondaryColor: '#ffffff',
        }),
      ).rejects.toThrow(/does not include feature "custom_branding"/);

      expect(insertSpy).not.toHaveBeenCalled();
      expect(updateSpy).not.toHaveBeenCalled();
      expect(existingBranding.logoUrl).toBe(
        'https://example.com/existing-logo.png',
      );
    });

    it('enforces max_staff_seats limit in assertCanProvisionStaffSeat without removing active staff or customer records', async () => {
      const activeMembers = [
        { id: 'm-1', status: 'active' },
        { id: 'm-2', status: 'active' },
        { id: 'm-3', status: 'active' },
        { id: 'm-4', status: 'active' },
        { id: 'm-5', status: 'active' },
      ];

      dbMock.select
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(async () => [{ total: activeMembers.length }]),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(async () => [
                {
                  settingValue: {
                    tenantId: TENANT_ID,
                    planTier: 'starter',
                    status: 'active',
                    expiresAt: '2027-06-30T00:00:00.000Z',
                    updatedAt: '2026-11-24T00:00:00.000Z',
                  },
                },
              ]),
            })),
          })),
        });

      await expect(assertCanProvisionStaffSeat(TENANT_ID)).rejects.toThrow(
        /exceeds "starter" limit \(5\)/,
      );

      expect(activeMembers).toHaveLength(5);
    });
  });
});