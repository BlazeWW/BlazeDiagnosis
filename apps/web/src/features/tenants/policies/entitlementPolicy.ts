export type SubscriptionPlanTier = 'starter' | 'growth' | 'enterprise';

export type SubscriptionLifecycleStatus =
  | 'trial'
  | 'active'
  | 'expired'
  | 'suspended';

export type EntitlementFeatureKey =
  | 'custom_branding'
  | 'advanced_reporting'
  | 'multi_site_dispatch'
  | 'api_integrations';

export type EntitlementLimitKey = 'max_staff_seats' | 'max_monthly_jobs';

export interface PlanEntitlementDefinition {
  tier: SubscriptionPlanTier;
  label: string;
  features: Record<EntitlementFeatureKey, boolean>;
  limits: Record<EntitlementLimitKey, number>;
}

export interface TenantSubscriptionState {
  tenantId: string;
  planTier: SubscriptionPlanTier;
  status: SubscriptionLifecycleStatus;
  expiresAt: string | null; 
  updatedAt: string;
}

export const ENTITLEMENT_MATRIX: Record<
  SubscriptionPlanTier,
  PlanEntitlementDefinition
> = {
  starter: {
    tier: 'starter',
    label: 'Starter',
    features: {
      custom_branding: false,
      advanced_reporting: false,
      multi_site_dispatch: false,
      api_integrations: false,
    },
    limits: {
      max_staff_seats: 5,
      max_monthly_jobs: 100,
    },
  },
  growth: {
    tier: 'growth',
    label: 'Growth',
    features: {
      custom_branding: true,
      advanced_reporting: true,
      multi_site_dispatch: false,
      api_integrations: false,
    },
    limits: {
      max_staff_seats: 25,
      max_monthly_jobs: 1000,
    },
  },
  enterprise: {
    tier: 'enterprise',
    label: 'Enterprise',
    features: {
      custom_branding: true,
      advanced_reporting: true,
      multi_site_dispatch: true,
      api_integrations: true,
    },
    limits: {
      max_staff_seats: 250,
      max_monthly_jobs: 10000,
    },
  },
};

export interface EffectiveEntitlements {
  active: boolean;
  effectiveStatus: SubscriptionLifecycleStatus;
  planTier: SubscriptionPlanTier;
  features: Record<EntitlementFeatureKey, boolean>;
  limits: Record<EntitlementLimitKey, number>;
  reason?: string;
}

export class SubscriptionEntitlementError extends Error {
  readonly code:
    | 'PLAN_EXPIRED'
    | 'PLAN_SUSPENDED'
    | 'FEATURE_NOT_ENTITLED'
    | 'LIMIT_EXCEEDED';
  readonly statusCode = 403;

  constructor(
    code:
      | 'PLAN_EXPIRED'
      | 'PLAN_SUSPENDED'
      | 'FEATURE_NOT_ENTITLED'
      | 'LIMIT_EXCEEDED',
    message: string,
  ) {
    super(message);
    this.name = 'SubscriptionEntitlementError';
    this.code = code;
  }
}

export function resolveEffectiveEntitlements(
  subscription: TenantSubscriptionState,
  now: Date = new Date(),
): EffectiveEntitlements {
  const isExpiredByDate =
    subscription.expiresAt !== null &&
    Date.parse(subscription.expiresAt) <= now.getTime();

  if (subscription.status === 'suspended') {
    return {
      active: false,
      effectiveStatus: 'suspended',
      planTier: subscription.planTier,
      features: {
        custom_branding: false,
        advanced_reporting: false,
        multi_site_dispatch: false,
        api_integrations: false,
      },
      limits: {
        max_staff_seats: 0,
        max_monthly_jobs: 0,
      },
      reason: 'Tenant subscription is suspended',
    };
  }

  if (subscription.status === 'expired' || isExpiredByDate) {
    return {
      active: false,
      effectiveStatus: 'expired',
      planTier: subscription.planTier,
      features: {
        custom_branding: false,
        advanced_reporting: false,
        multi_site_dispatch: false,
        api_integrations: false,
      },
      limits: {
        max_staff_seats: 0,
        max_monthly_jobs: 0,
      },
      reason: 'Tenant subscription has expired',
    };
  }

  const plan = ENTITLEMENT_MATRIX[subscription.planTier];
  return {
    active: true,
    effectiveStatus: subscription.status,
    planTier: subscription.planTier,
    features: { ...plan.features },
    limits: { ...plan.limits },
  };
}

export function assertFeatureEntitled(
  subscription: TenantSubscriptionState,
  feature: EntitlementFeatureKey,
  now: Date = new Date(),
): void {
  const effective = resolveEffectiveEntitlements(subscription, now);

  if (effective.effectiveStatus === 'suspended') {
    throw new SubscriptionEntitlementError(
      'PLAN_SUSPENDED',
      `Cannot access feature "${feature}": subscription is suspended`,
    );
  }

  if (effective.effectiveStatus === 'expired') {
    throw new SubscriptionEntitlementError(
      'PLAN_EXPIRED',
      `Cannot access feature "${feature}": subscription has expired`,
    );
  }

  if (!effective.features[feature]) {
    throw new SubscriptionEntitlementError(
      'FEATURE_NOT_ENTITLED',
      `Plan "${effective.planTier}" does not include feature "${feature}"`,
    );
  }
}

export function assertWithinPlanLimit(
  subscription: TenantSubscriptionState,
  limitKey: EntitlementLimitKey,
  currentCount: number,
  now: Date = new Date(),
): void {
  const effective = resolveEffectiveEntitlements(subscription, now);

  if (effective.effectiveStatus === 'suspended') {
    throw new SubscriptionEntitlementError(
      'PLAN_SUSPENDED',
      `Cannot exceed limit "${limitKey}": subscription is suspended`,
    );
  }

  if (effective.effectiveStatus === 'expired') {
    throw new SubscriptionEntitlementError(
      'PLAN_EXPIRED',
      `Cannot exceed limit "${limitKey}": subscription has expired`,
    );
  }

  const maxAllowed = effective.limits[limitKey];
  if (currentCount > maxAllowed) {
    throw new SubscriptionEntitlementError(
      'LIMIT_EXCEEDED',
      `Current usage (${currentCount}) exceeds "${effective.planTier}" limit (${maxAllowed}) for "${limitKey}"`,
    );
  }
}