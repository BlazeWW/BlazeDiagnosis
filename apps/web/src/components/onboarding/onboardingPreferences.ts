export type OnboardingSurface = 'customer' | 'station';

export function getOnboardingPreferenceKey(surface: OnboardingSurface) {
  return `blaze-diagnostics:onboarding-dismissed:${surface}`;
}

export function hasDismissedOnboarding(
  storage: Pick<Storage, 'getItem'>,
  surface: OnboardingSurface,
) {
  try {
    return storage.getItem(getOnboardingPreferenceKey(surface)) === 'true';
  } catch {
    return false;
  }
}

export function setOnboardingDismissed(
  storage: Pick<Storage, 'setItem'>,
  surface: OnboardingSurface,
  dismissed: boolean,
) {
  try {
    const key = getOnboardingPreferenceKey(surface);

    if (dismissed) {
      storage.setItem(key, 'true');
    } else {
      storage.setItem(key, 'false');
    }
  } catch {
    // The guide remains usable for this session when browser storage is unavailable.
  }
}
