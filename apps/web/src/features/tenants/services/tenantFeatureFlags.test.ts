import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.AUTH0_DOMAIN = 'test.auth0.com';
  process.env.AUTH0_AUDIENCE = 'test-audience';
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/test';
});

const guardMock = vi.hoisted(() => ({
  requireTenantPermission: vi.fn(),
}));
const dbMock = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
}));
const auditMock = vi.hoisted(() => ({
  writeAuditLog: vi.fn().mockResolvedValue({ id: 'audit-1' }),
}));

vi.mock('@/lib/authorization/guards', () => guardMock);
vi.mock('@/db/client', () => ({ db: dbMock }));
vi.mock('@/features/audit/services/auditService', () => auditMock);

import { isFeatureEnabled, setTenantFeatureFlag } from './tenantService';

const TENANT_A = '00000000-0000-0000-0000-000000000001';
const ACTOR_A = 'user-123';
const FLAG = 'feature.newDashboard';

describe('tenant feature flags (BD-046)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isFeatureEnabled', () => {
    it('returns false for a missing flag (safe default)', async () => {
      dbMock.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve([])) })),
        })),
      });

      const enabled = await isFeatureEnabled(TENANT_A, FLAG);
      expect(enabled).toBe(false);
    });

    it('returns false when flag exists but is disabled', async () => {
      dbMock.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([{ enabled: false }])),
          })),
        })),
      });

      const enabled = await isFeatureEnabled(TENANT_A, FLAG);
      expect(enabled).toBe(false);
    });
  });

  describe('setTenantFeatureFlag', () => {
    it('rejects unauthorised caller and does not write or audit', async () => {
      guardMock.requireTenantPermission.mockRejectedValueOnce(
        new Error('Forbidden: missing platform.tenants.manage'),
      );

      await expect(
        setTenantFeatureFlag(TENANT_A, FLAG, true, ACTOR_A),
      ).rejects.toThrow(/Forbidden/i);

      expect(dbMock.insert).not.toHaveBeenCalled();
      expect(auditMock.writeAuditLog).not.toHaveBeenCalled();
    });

    it('writes the flag, then writes an audit record with previous/new value', async () => {
      guardMock.requireTenantPermission.mockResolvedValueOnce(undefined);

      // Existing value read
      dbMock.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([{ enabled: false }])),
          })),
        })),
      });

      // Upsert returning the new row
      dbMock.insert.mockReturnValue({
        values: vi.fn(() => ({
          onConflictDoUpdate: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([{ enabled: true }])),
          })),
        })),
      });

      await setTenantFeatureFlag(TENANT_A, FLAG, true, ACTOR_A);

      expect(guardMock.requireTenantPermission).toHaveBeenCalledWith(
        TENANT_A,
        'platform.tenants.manage',
      );
      expect(dbMock.insert).toHaveBeenCalled();
      expect(auditMock.writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_A,
          actorUserId: ACTOR_A,
          action: 'UPDATE',
          entityType: 'tenant_feature_flag',
          previousValue: { enabled: false },
          newValue: expect.objectContaining({ enabled: true, flagKey: FLAG }),
        }),
      );
    });
  });
});