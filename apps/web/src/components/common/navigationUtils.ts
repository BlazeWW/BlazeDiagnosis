/** Return the locale segment from a Next.js pathname, defaulting to English. */
export function getLocaleFromPathname(pathname: string): string {
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  return firstSegment || 'en';
}

/** Match a navigation item without treating the portal dashboard as active on every child route. */
export function isNavigationItemActive(
  pathname: string,
  href: string,
  dashboardHref: string,
): boolean {
  const normalizedPath = pathname.replace(/\/$/, '') || '/';
  const normalizedHref = href.replace(/\/$/, '') || '/';

  if (normalizedPath === normalizedHref) {
    return true;
  }

  if (normalizedHref === dashboardHref.replace(/\/$/, '')) {
    return false;
  }

  return normalizedPath.startsWith(`${normalizedHref}/`);
}
