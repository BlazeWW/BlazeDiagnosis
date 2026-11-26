import { describe, expect, it } from 'vitest';

import {
  getOnboardingPreferenceKey,
  hasDismissedOnboarding,
  setOnboardingDismissed,
} from './onboardingPreferences';

describe('onboarding preferences', () => {
  it('keeps dismissal separate for customer and station portals', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    setOnboardingDismissed(storage, 'customer', true);

    expect(hasDismissedOnboarding(storage, 'customer')).toBe(true);
    expect(hasDismissedOnboarding(storage, 'station')).toBe(false);
    expect(getOnboardingPreferenceKey('customer')).not.toBe(
      getOnboardingPreferenceKey('station'),
    );
  });

  it('allows a dismissed guide to be redisplayed', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    setOnboardingDismissed(storage, 'station', true);
    expect(hasDismissedOnboarding(storage, 'station')).toBe(true);

    setOnboardingDismissed(storage, 'station', false);
    expect(hasDismissedOnboarding(storage, 'station')).toBe(false);
  });

  it('fails safely when browser storage is unavailable', () => {
    const unavailableStorage = {
      getItem: () => {
        throw new Error('Storage unavailable');
      },
      setItem: () => {
        throw new Error('Storage unavailable');
      },
    };

    expect(hasDismissedOnboarding(unavailableStorage, 'customer')).toBe(false);
    expect(() =>
      setOnboardingDismissed(unavailableStorage, 'customer', true),
    ).not.toThrow();
  });
});
