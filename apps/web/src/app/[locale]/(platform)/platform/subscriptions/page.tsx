'use client';

import { useMemo, useState } from 'react';

import { AppShell } from '@/components/common/appShell';
import {
  ENTITLEMENT_MATRIX,
  resolveEffectiveEntitlements,
  type EntitlementFeatureKey,
  type EntitlementLimitKey,
  type SubscriptionLifecycleStatus,
  type SubscriptionPlanTier,
  type TenantSubscriptionState,
} from '@/features/tenants/policies/entitlementPolicy';

const FEATURE_LABELS: Record<EntitlementFeatureKey, string> = {
  custom_branding: 'Custom Branding',
  advanced_reporting: 'Advanced Reporting',
  multi_site_dispatch: 'Multi-Site Dispatch',
  api_integrations: 'API Integrations',
};

const LIMIT_LABELS: Record<EntitlementLimitKey, string> = {
  max_staff_seats: 'Max Staff Seats',
  max_monthly_jobs: 'Max Monthly Jobs',
};

const TIERS: SubscriptionPlanTier[] = ['starter', 'growth', 'enterprise'];
const FEATURES: EntitlementFeatureKey[] = [
  'custom_branding',
  'advanced_reporting',
  'multi_site_dispatch',
  'api_integrations',
];
const LIMITS: EntitlementLimitKey[] = ['max_staff_seats', 'max_monthly_jobs'];

interface EnforcementCheckResult {
  allowed: boolean;
  statusCode: 200 | 403;
  code?: string;
  message: string;
  customerDataPreserved: boolean;
}

function evaluateDemoAction(
  subscription: TenantSubscriptionState,
  actionType: 'feature' | 'limit',
  targetKey: EntitlementFeatureKey | EntitlementLimitKey,
  currentUsage: number,
): EnforcementCheckResult {
  const effective = resolveEffectiveEntitlements(subscription);

  if (effective.effectiveStatus === 'suspended') {
    return {
      allowed: false,
      statusCode: 403,
      code: 'PLAN_SUSPENDED',
      message: `Blocked server-side (403): Tenant subscription is suspended.`,
      customerDataPreserved: true,
    };
  }

  if (effective.effectiveStatus === 'expired') {
    return {
      allowed: false,
      statusCode: 403,
      code: 'PLAN_EXPIRED',
      message: `Blocked server-side (403): Tenant subscription has expired.`,
      customerDataPreserved: true,
    };
  }

  if (actionType === 'feature') {
    const featureKey = targetKey as EntitlementFeatureKey;
    const entitled = effective.features[featureKey];
    if (!entitled) {
      return {
        allowed: false,
        statusCode: 403,
        code: 'FEATURE_NOT_ENTITLED',
        message: `Blocked server-side (403): Plan "${effective.planTier}" does not include "${FEATURE_LABELS[featureKey]}".`,
        customerDataPreserved: true,
      };
    }

    return {
      allowed: true,
      statusCode: 200,
      message: `Allowed (200): "${FEATURE_LABELS[featureKey]}" is active on "${effective.planTier}".`,
      customerDataPreserved: true,
    };
  }

  const limitKey = targetKey as EntitlementLimitKey;
  const maxAllowed = effective.limits[limitKey];
  if (currentUsage > maxAllowed) {
    return {
      allowed: false,
      statusCode: 403,
      code: 'LIMIT_EXCEEDED',
      message: `Blocked server-side (403): Usage (${currentUsage}) exceeds "${effective.planTier}" limit (${maxAllowed}) for ${LIMIT_LABELS[limitKey]}.`,
      customerDataPreserved: true,
    };
  }

  return {
    allowed: true,
    statusCode: 200,
    message: `Allowed (200): Usage (${currentUsage}) is within "${effective.planTier}" limit (${maxAllowed}) for ${LIMIT_LABELS[limitKey]}.`,
    customerDataPreserved: true,
  };
}

export default function PlatformSubscriptionsPage() {
  const [planTier, setPlanTier] = useState<SubscriptionPlanTier>('growth');
  const [lifecycleStatus, setLifecycleStatus] =
    useState<SubscriptionLifecycleStatus>('active');
  const [expiresAtInput, setExpiresAtInput] = useState<string>('2027-06-30');
  const [selectedFeature, setSelectedFeature] =
    useState<EntitlementFeatureKey>('api_integrations');
  const [selectedLimit, setSelectedLimit] =
    useState<EntitlementLimitKey>('max_staff_seats');
  const [currentUsage, setCurrentUsage] = useState<number>(8);
  const [auditEntries, setAuditEntries] = useState<string[]>([
    'Initialized demo tenant on growth plan (active) — customer & job records intact.',
  ]);

  const subscriptionState = useMemo<TenantSubscriptionState>(
    () => ({
      tenantId: '00000000-0000-0000-0000-000000000001',
      planTier,
      status: lifecycleStatus,
      expiresAt: expiresAtInput
        ? new Date(`${expiresAtInput}T23:59:59.000Z`).toISOString()
        : null,
      updatedAt: new Date().toISOString(),
    }),
    [planTier, lifecycleStatus, expiresAtInput],
  );

  const effective = useMemo(
    () => resolveEffectiveEntitlements(subscriptionState),
    [subscriptionState],
  );

  const featureResult = useMemo(
    () =>
      evaluateDemoAction(
        subscriptionState,
        'feature',
        selectedFeature,
        currentUsage,
      ),
    [subscriptionState, selectedFeature, currentUsage],
  );

  const limitResult = useMemo(
    () =>
      evaluateDemoAction(
        subscriptionState,
        'limit',
        selectedLimit,
        currentUsage,
      ),
    [subscriptionState, selectedLimit, currentUsage],
  );

  const recordAudit = (note: string) => {
    setAuditEntries((prev) => [
      `[${new Date().toISOString().slice(11, 19)}] ${note}`,
      ...prev.slice(0, 7),
    ]);
  };

  const applyPlanChange = (
    nextTier: SubscriptionPlanTier,
    nextStatus: SubscriptionLifecycleStatus,
  ) => {
    const prevTier = planTier;
    const prevStatus = lifecycleStatus;
    setPlanTier(nextTier);
    setLifecycleStatus(nextStatus);
    recordAudit(
      `Plan updated: ${prevTier} (${prevStatus}) -> ${nextTier} (${nextStatus}). Customer, vehicle, and job-card data preserved.`,
    );
  };

  const simulateExpiredDate = () => {
    setExpiresAtInput('2025-01-01');
    setLifecycleStatus('expired');
    recordAudit(
      `Expiry simulated: expiresAt set to 2025-01-01 (status: expired). Paid features fail closed with 403.`,
    );
  };

  return (
    <AppShell
      description="Tenant plan tiers, entitlement matrix, expiry/suspension states, and server-side enforcement demo."
      surface="platform"
      title="Subscriptions & Entitlements"
    >
      <div className="space-y-6">
        {/* Active Plan State & Quick Simulation Controls */}
        <section className="rounded-lg border p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold">
                Tenant Subscription State & Lifecycle Controls
              </h2>
              <p className="text-sm text-muted-foreground">
                Stored in tenant_settings under subscription.plan; plan changes
                preserve customer and job records.
              </p>
            </div>
            <div className="text-sm font-medium">
              Effective State:{' '}
              <span className="uppercase">{effective.effectiveStatus}</span> (
              {effective.planTier}) —{' '}
              <span>{effective.active ? 'Entitled' : 'Restricted'}</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-xs font-medium mb-1">
                Assigned Plan Tier
              </label>
              <select
                className="w-full rounded border px-3 py-2 text-sm bg-background"
                value={planTier}
                onChange={(e) =>
                  applyPlanChange(
                    e.target.value as SubscriptionPlanTier,
                    lifecycleStatus,
                  )
                }
              >
                {TIERS.map((tier) => (
                  <option key={tier} value={tier}>
                    {ENTITLEMENT_MATRIX[tier].label} ({tier})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                Subscription Status
              </label>
              <select
                className="w-full rounded border px-3 py-2 text-sm bg-background"
                value={lifecycleStatus}
                onChange={(e) =>
                  applyPlanChange(
                    planTier,
                    e.target.value as SubscriptionLifecycleStatus,
                  )
                }
              >
                <option value="trial">trial</option>
                <option value="active">active</option>
                <option value="expired">expired</option>
                <option value="suspended">suspended</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                Expiration Date (expiresAt)
              </label>
              <input
                className="w-full rounded border px-3 py-2 text-sm bg-background"
                type="date"
                value={expiresAtInput}
                onChange={(e) => setExpiresAtInput(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded border px-3 py-1.5 text-xs font-medium"
              type="button"
              onClick={() => applyPlanChange('starter', 'active')}
            >
              Downgrade to Starter
            </button>
            <button
              className="rounded border px-3 py-1.5 text-xs font-medium"
              type="button"
              onClick={simulateExpiredDate}
            >
              Simulate Expired Plan
            </button>
            <button
              className="rounded border px-3 py-1.5 text-xs font-medium"
              type="button"
              onClick={() => applyPlanChange(planTier, 'suspended')}
            >
              Suspend Subscription
            </button>
            <button
              className="rounded border px-3 py-1.5 text-xs font-medium"
              type="button"
              onClick={() => {
                setExpiresAtInput('2027-06-30');
                applyPlanChange('growth', 'active');
              }}
            >
              Restore Growth (Active)
            </button>
          </div>
        </section>

        {/* Entitlement Matrix */}
        <section className="rounded-lg border p-4 space-y-3">
          <h2 className="text-base font-semibold">Entitlement Matrix</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4">Capability / Limit</th>
                  {TIERS.map((tier) => (
                    <th key={tier} className="py-2 px-4">
                      {ENTITLEMENT_MATRIX[tier].label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((feature) => (
                  <tr key={feature} className="border-b">
                    <td className="py-2 pr-4 font-medium">
                      {FEATURE_LABELS[feature]}
                    </td>
                    {TIERS.map((tier) => (
                      <td key={tier} className="py-2 px-4">
                        {ENTITLEMENT_MATRIX[tier].features[feature]
                          ? 'Included'
                          : 'Not included'}
                      </td>
                    ))}
                  </tr>
                ))}
                {LIMITS.map((limit) => (
                  <tr key={limit} className="border-b">
                    <td className="py-2 pr-4 font-medium">
                      {LIMIT_LABELS[limit]}
                    </td>
                    {TIERS.map((tier) => (
                      <td key={tier} className="py-2 px-4">
                        {ENTITLEMENT_MATRIX[tier].limits[limit]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Enforcement Simulator */}
        <section className="rounded-lg border p-4 space-y-4">
          <h2 className="text-base font-semibold">
            Server-Side Guard Enforcement Preview
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-xs font-medium mb-1">
                Feature Check
              </label>
              <select
                className="w-full rounded border px-3 py-2 text-sm bg-background"
                value={selectedFeature}
                onChange={(e) =>
                  setSelectedFeature(e.target.value as EntitlementFeatureKey)
                }
              >
                {FEATURES.map((f) => (
                  <option key={f} value={f}>
                    {FEATURE_LABELS[f]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                Quota Limit Metric
              </label>
              <select
                className="w-full rounded border px-3 py-2 text-sm bg-background"
                value={selectedLimit}
                onChange={(e) =>
                  setSelectedLimit(e.target.value as EntitlementLimitKey)
                }
              >
                {LIMITS.map((l) => (
                  <option key={l} value={l}>
                    {LIMIT_LABELS[l]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                Current Usage Count: {currentUsage}
              </label>
              <input
                className="w-full"
                max={300}
                min={1}
                type="range"
                value={currentUsage}
                onChange={(e) => setCurrentUsage(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded border p-3 text-sm space-y-1">
              <div className="font-medium">
                Feature Guard Result ({featureResult.statusCode})
              </div>
              <p>{featureResult.message}</p>
            </div>
            <div className="rounded border p-3 text-sm space-y-1">
              <div className="font-medium">
                Quota Guard Result ({limitResult.statusCode})
              </div>
              <p>{limitResult.message}</p>
            </div>
          </div>
        </section>

        {/* Audit & Data Preservation Log */}
        <section className="rounded-lg border p-4 space-y-2">
          <h2 className="text-base font-semibold">
            Plan Change & Audit Trail (Demo)
          </h2>
          <ul className="list-disc pl-5 text-xs space-y-1">
            {auditEntries.map((entry, idx) => (
              <li key={`${idx}-${entry}`}>{entry}</li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}