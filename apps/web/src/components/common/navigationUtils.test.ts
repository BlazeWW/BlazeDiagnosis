import { describe, expect, it } from 'vitest';

import { getLocaleFromPathname, isNavigationItemActive } from './navigationUtils';

describe('navigation utilities', () => {
  it('reads the locale from the pathname', () => {
    expect(getLocaleFromPathname('/en/customer')).toBe('en');
    expect(getLocaleFromPathname('/af/station/job-cards')).toBe('af');
    expect(getLocaleFromPathname('/')).toBe('en');
  });

  it('marks an exact route as active', () => {
    expect(
      isNavigationItemActive('/af/customer/vehicles', '/af/customer/vehicles', '/af/customer'),
    ).toBe(true);
  });

  it('marks a parent navigation item active on nested routes', () => {
    expect(
      isNavigationItemActive(
        '/en/station/settings/branding',
        '/en/station/settings',
        '/en/station',
      ),
    ).toBe(true);
  });

  it('does not mark the dashboard active on child routes', () => {
    expect(
      isNavigationItemActive('/en/customer/vehicles', '/en/customer', '/en/customer'),
    ).toBe(false);
  });

  it('matches the dashboard on its exact route', () => {
    expect(
      isNavigationItemActive('/en/customer', '/en/customer', '/en/customer'),
    ).toBe(true);
  });
});
