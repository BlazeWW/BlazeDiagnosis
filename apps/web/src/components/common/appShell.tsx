
'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { TenantBrandMark } from '@/components/tenant/tenantBrandMark';
import { ThemeToggle } from '@/components/theme/themeToggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AppShellProps, AppSurface, NavItem } from '@/types/navigation';

import {
  getLocaleFromPathname,
  isNavigationItemActive,
} from './navigationUtils';

const navItems: Record<AppSurface, { href: string; label: string }[]> = {
  customer: [
    { href: '/customer', label: 'Dashboard' },
    { href: '/customer/vehicles', label: 'Vehicles' },
    { href: '/customer/services', label: 'Services' },
    { href: '/customer/quotes', label: 'Quotes' },
    { href: '/customer/invoices', label: 'Invoices' },
    { href: '/customer/messages', label: 'Messages' },
  ],
  station: [
    { href: '/station', label: 'Dashboard' },
    { href: '/station/showcase', label: 'Showcase' },
    { href: '/station/customers', label: 'Customers' },
    { href: '/station/vehicles', label: 'Vehicles' },
    { href: '/station/job-cards', label: 'Job cards' },
    { href: '/station/quotes', label: 'Quotes' },
    { href: '/station/invoices', label: 'Invoices' },
    { href: '/station/parts', label: 'Parts' },
    { href: '/station/reports', label: 'Reports' },
    { href: '/station/settings/branding', label: 'Branding' },
  ],
  supplier: [
    { href: '/supplier', label: 'Dashboard' },
    { href: '/supplier/requests', label: 'Requests' },
    { href: '/supplier/quotes', label: 'Quotes' },
    { href: '/supplier/orders', label: 'Orders' },
    { href: '/supplier/deliveries', label: 'Deliveries' },
    { href: '/supplier/messages', label: 'Messages' },
  ],
  platform: [
    { href: '/platform', label: 'Dashboard' },
    { href: '/platform/tenants', label: 'Tenants' },
    { href: '/platform/subscriptions', label: 'Subscriptions' },
    { href: '/platform/feature-flags', label: 'Feature flags' },
    { href: '/platform/usage', label: 'Usage' },
    { href: '/platform/audit-logs', label: 'Audit logs' },
  ],
};

const surfaceLabels: Record<AppSurface, string> = {
  customer: 'Customer portal',
  platform: 'Platform admin',
  station: 'Service station',
  supplier: 'Supplier portal',
};

export function AppShell({
  actions,
  children,
  description,
  surface,
  title,
}: AppShellProps) {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const dashboardHref = `/${locale}/${surface}`;

  const items: NavItem[] = navItems[surface].map((item) => ({
    href: `/${locale}${item.href}` as Route,
    label: item.label,
  }));

  const isActive = (href: string) =>
    isNavigationItemActive(pathname, href, dashboardHref);

  return (
    <div className="min-h-screen min-w-0 overflow-x-clip">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-soft"
        href="#main-content"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-border/80 bg-card/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl min-w-0 items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
          <Link
            className="group inline-flex min-w-0 items-center gap-3"
            href={`/${locale}` as Route}
          >
            <TenantBrandMark surfaceLabel={surfaceLabels[surface]} />
          </Link>

          {/* Desktop navigation */}
          <nav
            aria-label={`${surfaceLabels[surface]} navigation`}
            className="hidden min-w-0 items-center gap-1 overflow-x-auto rounded-full border border-border/70 bg-muted/50 p-1 lg:flex"
          >
            {items.map((item) => {
              const active = isActive(item.href);

              return (
                <Button
                  asChild
                  key={item.href}
                  size="sm"
                  variant={active ? 'secondary' : 'ghost'}
                >
                  <Link
                    className="whitespace-nowrap rounded-full px-3"
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </nav>

          {/* Desktop theme toggle */}
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>

          {/* Mobile navigation */}
          <div className="flex shrink-0 items-center gap-2 lg:hidden">
            <ThemeToggle compact />

            <details key={pathname} className="group relative">
              <summary className="min-h-11 list-none cursor-pointer select-none rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2">
                  Menu
                  <span aria-hidden="true">☰</span>
                </span>
              </summary>

              <div className="absolute right-0 z-50 mt-2 grid max-h-[calc(100dvh-6rem)] min-w-56 gap-1 overflow-y-auto overscroll-contain rounded-xl border border-border bg-card p-2 shadow-xl">
                <nav
                  aria-label={`${surfaceLabels[surface]} mobile navigation`}
                  className="grid gap-1"
                >
                  {items.map((item) => {
                    const active = isActive(item.href);

                    return (
                      <Link
                        className={cn(
                          'flex min-h-11 items-center rounded-lg px-3 py-2',
                          'text-sm font-medium transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                          active
                            ? 'bg-muted text-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                        href={item.href}
                        key={item.href}
                        aria-current={active ? 'page' : undefined}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
      >
        <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border/80 bg-card/75 p-5 shadow-soft backdrop-blur sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {surfaceLabels[surface]}
            </p>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {title}
            </h1>

            {description ? (
              <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                {description}
              </p>
            ) : null}
          </div>

          {actions ? (
            <div className="flex flex-wrap gap-3">{actions}</div>
          ) : null}
        </div>

        {children}
      </main>
    </div>
  );
}
