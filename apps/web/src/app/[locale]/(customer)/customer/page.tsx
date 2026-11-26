import type { Route } from 'next';
import Link from 'next/link';

import { AppShell } from '@/components/common/appShell';
import { EmptyState } from '@/components/data-display/emptyState';
import { ErrorState } from '@/components/data-display/errorState';
import { ContextualHelp } from '@/components/onboarding/contextualHelp';
import { Button } from '@/components/ui/button';
import { CustomerDashboardCards } from '@/features/customers/components/customerDashboardCards';
import { getCustomerDashboard } from '@/features/customers/services/customerDashboardService';
import { CustomerProfileNotFoundError } from '@/features/customers/services/serviceHistoryService';
import { TenantAccessError } from '@/lib/authorization/guards';

export const dynamic = 'force-dynamic';

async function loadDashboard() {
  try {
    return { dashboard: await getCustomerDashboard(), problem: null };
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required.') {
      return { dashboard: null, problem: 'signed_out' as const };
    }

    if (
      error instanceof CustomerProfileNotFoundError ||
      error instanceof TenantAccessError
    ) {
      return { dashboard: null, problem: 'not_linked' as const };
    }

    console.error('Customer dashboard failed to load', error);
    return { dashboard: null, problem: 'failed' as const };
  }
}

export default async function CustomerDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { dashboard, problem } = await loadDashboard();

  return (
    <AppShell
      description="Your vehicles, open quotes, invoices and pending requests."
      surface="customer"
      title="Customer dashboard"
    >
      <ContextualHelp surface="customer" />

      {dashboard ? (
        <CustomerDashboardCards
          basePath={`/${locale}/customer`}
          dashboard={dashboard}
        />
      ) : problem === 'signed_out' ? (
        <EmptyState
          action={
            <Button asChild size="sm">
              <Link href={`/${locale}/login` as Route}>Sign in</Link>
            </Button>
          }
          description="Sign in to see your vehicles, quotes and invoices."
          title="Please sign in"
        />
      ) : problem === 'not_linked' ? (
        <EmptyState
          description="Your account is not linked to a customer profile yet. Ask the workshop to link it so your records can be shown."
          title="No customer profile linked"
        />
      ) : (
        <ErrorState message="We couldn't load your dashboard. Please refresh the page or try again shortly." />
      )}
    </AppShell>
  );
}