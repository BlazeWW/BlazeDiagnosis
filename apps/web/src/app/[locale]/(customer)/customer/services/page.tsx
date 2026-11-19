import type { Route } from 'next';
import Link from 'next/link';

import { AppShell } from '@/components/common/appShell';
import {
  FeatureChecklist,
  FeatureMetricGrid,
} from '@/components/common/featureDashboard';
import { EmptyState } from '@/components/data-display/emptyState';
import { Button } from '@/components/ui/button';
import { ServiceHistoryList } from '@/features/customers/components/serviceHistoryList';
import {
  CustomerProfileNotFoundError,
  getCustomerServiceHistory,
} from '@/features/customers/services/serviceHistoryService';
import { TenantAccessError } from '@/lib/authorization/guards';
import { customerChecklist } from '@/lib/sampleWorkflows';

export const dynamic = 'force-dynamic';

// Invalid or missing ?page values fall back to the first page instead of erroring.
function toPageNumber(value: string | string[] | undefined) {
  const page = Number(typeof value === 'string' ? value : undefined);

  return Number.isInteger(page) && page >= 1 ? page : 1;
}

async function loadHistory(page: number) {
  try {
    return {
      history: await getCustomerServiceHistory({ page }),
      problem: null,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Authentication required.'
    ) {
      return { history: null, problem: 'signed_out' as const };
    }

    if (
      error instanceof CustomerProfileNotFoundError ||
      error instanceof TenantAccessError
    ) {
      return { history: null, problem: 'not_linked' as const };
    }

    throw error;
  }
}

export default async function CustomerServicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { locale } = await params;
  const { page } = await searchParams;
  const { history, problem } = await loadHistory(toPageNumber(page));

  return (
    <AppShell
      description="Customer-visible service milestones, collection readiness, and parts-related delays."
      surface="customer"
      title="Services"
    >
      {history ? (
        <>
          <FeatureMetricGrid
            items={[
              {
                description: 'All services on record with this workshop',
                label: 'Service records',
                value: String(history.pagination.total),
              },
              {
                description: 'Still in progress on this page',
                label: 'Ongoing',
                value: String(
                  history.items.filter((item) => item.isOngoing).length,
                ),
              },
            ]}
          />
          <ServiceHistoryList
            basePath={`/${locale}/customer/services`}
            history={history}
          />
        </>
      ) : problem === 'signed_out' ? (
        <EmptyState
          action={
            <Button asChild size="sm">
              <Link href={`/${locale}/login` as Route}>Sign in</Link>
            </Button>
          }
          description="Sign in to see your vehicles' service history."
          title="Please sign in"
        />
      ) : (
        <EmptyState
          description="Your account is not linked to a customer profile yet. Ask the workshop to link it so your service history can be shown."
          title="No customer profile linked"
        />
      )}

      <FeatureChecklist
        description="Keep customer statuses plain-language and separate from internal workshop statuses."
        items={customerChecklist}
        title="Service visibility checklist"
      />
    </AppShell>
  );
}
