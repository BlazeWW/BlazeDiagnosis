'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { TenantBrandMark } from '@/components/tenant/tenantBrandMark';
import { ThemeToggle } from '@/components/theme/themeToggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AppShellProps, AppSurface, NavItem } from '@/types/navigation';

import { getLocaleFromPathname, isNavigationItemActive } from './navigationUtils';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const dashboardHref = `/${locale}/${surface}`;
  const items = useMemo<NavItem[]>(
    () => navItems[surface].map((item) => ({
      href: `/${locale}${item.href}` as Route,
      label: item.label,
    })),
    [locale, surface],
  );

  const closeMobileMenu = (restoreFocus = false) => {
    setMobileMenuOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  };

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const firstLink = mobileMenuRef.current?.querySelector<HTMLAnchorElement>('a');
    firstLink?.focus();
  }, [mobileMenuOpen]);

  const handleMobileMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMobileMenu(true);
      return;
    }

    if (event.key !== 'Tab') return;

    const focusableItems = mobileMenuRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusableItems?.length) return;

    const firstItem = focusableItems[0];
    const lastItem = focusableItems[focusableItems.length - 1];

    if (event.shiftKey && document.activeElement === firstItem) {
      event.preventDefault();
      lastItem.focus();
    } else if (!event.shiftKey && document.activeElement === lastItem) {
      event.preventDefault();
      firstItem.focus();
    }
  };

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

          <div className="hidden lg:block">
            <ThemeToggle />
          </div>

          <div className="flex shrink-0 items-center gap-2 lg:hidden">
            <ThemeToggle compact />
            <button
              ref={menuButtonRef}
              type="button"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-app-navigation"
              aria-haspopup="dialog"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <span>{mobileMenuOpen ? 'Close' : 'Menu'}</span>
              <span aria-hidden="true">{mobileMenuOpen ? '×' : '☰'}</span>
            </button>
          </div>
        </div>

        {mobileMenuOpen ? (
          <>
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={() => closeMobileMenu(true)}
              className="fixed inset-0 z-40 cursor-default bg-black/20 lg:hidden"
            />
            <div
              id="mobile-app-navigation"
              ref={mobileMenuRef}
              role="dialog"
              aria-modal="true"
              aria-label={`${surfaceLabels[surface]} menu`}
              onKeyDown={handleMobileMenuKeyDown}
              className="fixed inset-x-0 top-[4.25rem] z-50 border-b border-border bg-card p-3 shadow-xl sm:px-6 lg:hidden"
            >
              <nav
                aria-label={`${surfaceLabels[surface]} mobile navigation`}
                className="mx-auto grid max-h-[calc(100dvh-6rem)] w-full max-w-7xl gap-1 overflow-y-auto overscroll-contain"
              >
                {items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => closeMobileMenu()}
                      className={cn(
                        'flex min-h-11 items-center rounded-lg px-3 py-2',
                        'text-sm font-medium transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
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
            </div>
          </>
        ) : null}
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
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            {description ? (
              <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
