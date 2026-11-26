'use client';

import React from 'react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { TenantBrandMark } from '@/components/tenant/tenantBrandMark';
import { ThemeToggle } from '@/components/theme/themeToggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AppShellProps, AppSurface, NavItem } from '@/types/navigation';

const navItems: Record<AppSurface, NavItem[]> = {
  customer: [
    { href: '/en/customer' as Route, label: 'Dashboard' },
    { href: '/en/customer/vehicles' as Route, label: 'Vehicles' },
    { href: '/en/customer/services' as Route, label: 'Services' },
    { href: '/en/customer/quotes' as Route, label: 'Quotes' },
    { href: '/en/customer/invoices' as Route, label: 'Invoices' },
    { href: '/en/customer/messages' as Route, label: 'Messages' },
  ],

  station: [
    { href: '/en/station' as Route, label: 'Dashboard' },
    { href: '/en/station/showcase' as Route, label: 'Showcase' },
    { href: '/en/station/customers' as Route, label: 'Customers' },
    { href: '/en/station/vehicles' as Route, label: 'Vehicles' },
    { href: '/en/station/job-cards' as Route, label: 'Job cards' },
    { href: '/en/station/quotes' as Route, label: 'Quotes' },
    { href: '/en/station/invoices' as Route, label: 'Invoices' },
    { href: '/en/station/parts' as Route, label: 'Parts' },
    { href: '/en/station/reports' as Route, label: 'Reports' },
    { href: '/en/station/settings/branding' as Route, label: 'Branding' },
  ],

  supplier: [
    { href: '/en/supplier' as Route, label: 'Dashboard' },
    { href: '/en/supplier/requests' as Route, label: 'Requests' },
    { href: '/en/supplier/quotes' as Route, label: 'Quotes' },
    { href: '/en/supplier/orders' as Route, label: 'Orders' },
    { href: '/en/supplier/deliveries' as Route, label: 'Deliveries' },
    { href: '/en/supplier/messages' as Route, label: 'Messages' },
  ],

  platform: [
    { href: '/en/platform' as Route, label: 'Dashboard' },
    { href: '/en/platform/tenants' as Route, label: 'Tenants' },
    { href: '/en/platform/subscriptions' as Route, label: 'Subscriptions' },
    { href: '/en/platform/feature-flags' as Route, label: 'Feature flags' },
    { href: '/en/platform/usage' as Route, label: 'Usage' },
    { href: '/en/platform/audit-logs' as Route, label: 'Audit logs' },
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
  const items = navItems[surface];
  const pathname = usePathname();

  const isActive = (href: string) => {
    const dashboardPath = `/en/${surface}`;

    if (pathname === href) {
      return true;
    }

    if (href === dashboardPath) {
      return false;
    }

    return pathname.startsWith(`${href}/`);
  };

  return (
    <div className="min-h-screen overflow-x-clip">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-soft"
        href="#main-content"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-border/80 bg-card/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl min-w-0 items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">

          {/* Application branding */}
          <Link
            className="group inline-flex min-w-0 items-center gap-3"
            href={'/en' as Route}
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

            <details className="group relative">
              <summary
                aria-label="Open navigation menu"
                className="flex min-h-11 cursor-pointer list-none select-none items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden"
              >
                <span>Menu</span>

                <span
                  aria-hidden="true"
                  className="transition-transform group-open:rotate-180"
                >
                  ▼
                </span>
              </summary>

              {/* Mobile menu links */}
              <nav
                aria-label={`${surfaceLabels[surface]} mobile navigation`}
                className="absolute right-0 z-50 mt-2 grid max-h-[calc(100dvh-6rem)] w-[min(16rem,calc(100vw-2rem))] gap-1 overflow-y-auto overscroll-contain rounded-xl border border-border bg-card p-2 shadow-xl"
              >
                {items.map((item) => {
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex min-h-11 items-center rounded-lg px-3 py-2',
                        'text-sm font-medium transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2',
                        'focus-visible:ring-primary',
                        active
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </details>
          </div>
        </div>
      </header>

      {/* Main page content */}
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
      >
        <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border/80 bg-card/75 p-5 shadow-soft backdrop-blur sm:p-6 lg:flex-row lg:items-end lg:justify-between">

          {/* Page heading */}
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

          {/* Optional page actions */}
          {actions ? (
            <div className="flex flex-wrap gap-3">
              {actions}
            </div>
          ) : null}
        </div>

        {/* Dashboard content */}
        {children}
      </main>
    </div>
  );
}