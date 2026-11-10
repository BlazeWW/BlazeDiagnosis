import type { Route } from 'next';
import Link from 'next/link';
import { ArrowRight, Building2, CarFront, ShieldCheck, Truck } from 'lucide-react';

import { ThemeToggle } from '@/components/theme/themeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardLink } from '@/types/navigation';

const dashboardLinks: DashboardLink[] = [
  {
    description: 'Customer vehicles, service status, approvals, invoices, and messages.',
    href: '/en/customer' as Route,
    label: 'Customer portal',
  },
  {
    description: 'Workshop jobs, customers, vehicles, parts, reports, and operational queues.',
    href: '/en/station' as Route,
    label: 'Service-station workspace',
  },
  {
    description: 'Component showcase for week 1-3 MVP panels and demo workflows.',
    href: '/en/station/showcase' as Route,
    label: 'MVP showcase',
  },
  {
    description: 'Supplier requests, quotes, orders, delivery ETA, and messages.',
    href: '/en/supplier' as Route,
    label: 'Supplier portal',
  },
  {
    description: 'Tenant, subscription, feature flag, usage, and audit-log operations.',
    href: '/en/platform' as Route,
    label: 'Platform admin',
  },
];

const capabilities = [
  { icon: CarFront, label: 'Vehicle service lifecycle' },
  { icon: Building2, label: 'Tenant-first SaaS operations' },
  { icon: Truck, label: 'Supplier and parts workflow' },
  { icon: ShieldCheck, label: 'Audit-ready approval model' },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>

      <section className="grid min-h-176 items-center gap-8 rounded-3xl border border-border/80 bg-card/80 p-6 shadow-soft backdrop-blur lg:grid-cols-[1.1fr_0.9fr] lg:p-10">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Blaze Diagnostics MVP
          </div>
          <div className="space-y-4">
            <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Service-station diagnostics, approvals, parts, and invoicing in one SaaS workspace.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              This scaffold now centralizes the intern work into a responsive Next.js app with reusable components, theme tokens, and surface-specific navigation for customer, station, supplier, and platform users.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" variant="accent">
              <Link href={'/en/station' as Route}>
                Open station dashboard
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={'/en/station/showcase' as Route}>View MVP showcase</Link>
            </Button>
          </div>
        </div>

        {/* Formats a perfectly balanced 2x2 grid layout block */}
        <div className="mx-auto grid w-full max-w-xl gap-4 grid-cols-2">
          {capabilities.map((item) => {
            const Icon = item.icon;

            return (
              <div 
                className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/80 bg-muted/40 p-6 text-center min-h-36 transition-colors" 
                key={item.label}
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shrink-0">
                  <Icon className="size-5" />
                </span>
                <span className="text-sm font-semibold text-foreground tracking-tight max-w-40">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dashboardLinks.map((item) => (
          <Card className="transition hover:-translate-y-0.5 hover:border-primary/30" key={item.href}>
            <CardHeader>
              <CardTitle>{item.label}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href={item.href}>
                  Open workspace
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
