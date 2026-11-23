import {
  CircleDollarSign,
  FileClock,
  PackageSearch,
  Wrench,
} from 'lucide-react';
import type { Route } from 'next';

import { FeatureRecordList } from '@/components/common/featureDashboard';
import { StatCard } from '@/components/common/statCard';
import { EmptyState } from '@/components/data-display/emptyState';
import { Card, CardContent } from '@/components/ui/card';
import { getStationDashboard } from '@/features/reports/services/stationDashboardService';
import { TenantAccessError } from '@/lib/authorization/guards';
import type { FeatureRecord } from '@/types/featureDashboard';
import type {
  StationAttentionJob,
  StationDashboard,
  StationPartsQueueItem,
} from '@/types/stationDashboard';
import type { StatusTone } from '@/types/ui';

// Dates are shown in South African time (the tenant default timezone), so the
// day shown does not depend on the server's timezone.
const TIME_ZONE = 'Africa/Johannesburg';
const dateFormatter = new Intl.DateTimeFormat('en-ZA', {
  dateStyle: 'medium',
  timeZone: TIME_ZONE,
});
const dateTimeFormatter = new Intl.DateTimeFormat('en-ZA', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: TIME_ZONE,
});
const moneyFormatter = new Intl.NumberFormat('en-ZA', {
  currency: 'ZAR',
  style: 'currency',
});

const partsStatusDescriptions: Record<string, string> = {
  response_received: 'Supplier response received, ready for review.',
  sent: 'Sent to suppliers, waiting for a response.',
};

function humanize(value: string) {
  const text = value.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function jobTone(job: StationAttentionJob): StatusTone {
  if (job.isOverdue) {
    return 'danger';
  }

  if (
    job.internalStatus === 'awaiting_parts' ||
    job.internalStatus === 'awaiting_customer_approval'
  ) {
    return 'warning';
  }

  return 'info';
}

export function toAttentionRecord(
  job: StationAttentionJob,
  locale: string,
): FeatureRecord {
  const due = job.expectedCompletionAt
    ? `${job.isOverdue ? 'Overdue since' : 'Due'} ${dateFormatter.format(new Date(job.expectedCompletionAt))}`
    : 'No due date set';

  return {
    actionLabel: 'Open job cards',
    description: `${job.customerName} · ${job.vehicle}`,
    href: `/${locale}/station/job-cards` as Route,
    id: job.id,
    meta: `${due} · Priority: ${job.priority}`,
    status: job.isOverdue ? 'Overdue' : humanize(job.internalStatus),
    statusTone: jobTone(job),
    title: job.jobNumber,
  };
}

export function toPartsRecord(
  item: StationPartsQueueItem,
  locale: string,
): FeatureRecord {
  return {
    actionLabel: 'Open parts',
    description: partsStatusDescriptions[item.status] ?? humanize(item.status),
    href: `/${locale}/station/parts` as Route,
    id: item.id,
    meta: `Requested ${dateFormatter.format(new Date(item.requestedAt))}`,
    status: humanize(item.status),
    statusTone: 'warning',
    title: item.jobNumber,
  };
}

export function StationDashboardView({
  dashboard,
  locale,
}: {
  dashboard: StationDashboard;
  locale: string;
}) {
  const { attentionJobs, generatedAt, metrics, partsQueue } = dashboard;
  const invoices = metrics.outstandingInvoices;

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Live figures as of {dateTimeFormatter.format(new Date(generatedAt))}.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          description="Not completed or cancelled"
          icon={<Wrench className="size-4" />}
          label="Open jobs"
          value={String(metrics.openJobs)}
        />
        <StatCard
          description="Customer action required"
          icon={<FileClock className="size-4" />}
          label="Awaiting approval"
          value={String(metrics.awaitingApproval)}
        />
        <StatCard
          description="Supplier dependency"
          icon={<PackageSearch className="size-4" />}
          label="Awaiting parts"
          value={String(metrics.awaitingParts)}
        />
        <StatCard
          description={
            invoices
              ? `${invoices.count} issued, part-paid or overdue`
              : 'Not available for your role'
          }
          icon={<CircleDollarSign className="size-4" />}
          label="Outstanding invoices"
          value={invoices ? moneyFormatter.format(Number(invoices.total)) : '—'}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {attentionJobs.length > 0 ? (
          <FeatureRecordList
            description="Open job cards, overdue and soonest due first."
            items={attentionJobs.map((job) => toAttentionRecord(job, locale))}
            title="Workshop attention queue"
          />
        ) : (
          <EmptyState
            description="There are no open job cards right now."
            title="No open jobs"
          />
        )}
        {partsQueue.length > 0 ? (
          <FeatureRecordList
            description="Parts requests still waiting on a supplier, oldest first."
            items={partsQueue.map((item) => toPartsRecord(item, locale))}
            title="Parts attention queue"
          />
        ) : (
          <EmptyState
            description="No parts requests are waiting on suppliers."
            title="No parts blockers"
          />
        )}
      </div>
    </>
  );
}

function DashboardMessage({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <Card role="alert">
      <CardContent className="space-y-1 p-6">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

// Loads the dashboard on the server and handles access and error states.
export async function StationDashboardSections({ locale }: { locale: string }) {
  const result = await getStationDashboard().then(
    (dashboard) => ({ dashboard, error: null }),
    (error: unknown) => ({ dashboard: null, error }),
  );

  if (result.dashboard) {
    return (
      <StationDashboardView dashboard={result.dashboard} locale={locale} />
    );
  }

  if (result.error instanceof TenantAccessError) {
    return (
      <DashboardMessage
        description="Your role does not include access to this workshop's dashboard."
        title="Dashboard not available"
      />
    );
  }

  console.error('Station dashboard failed to load:', result.error);
  return (
    <DashboardMessage
      description="Live workshop figures could not be loaded. Refresh the page to try again."
      title="Dashboard data unavailable"
    />
  );
}

// Placeholder with the same layout as the loaded dashboard, so nothing jumps.
export function StationDashboardSkeleton() {
  const block = 'animate-pulse rounded-xl border border-border bg-muted';

  return (
    <div aria-busy="true" className="space-y-6" role="status">
      <span className="sr-only">Loading dashboard…</span>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div className={`h-32 ${block}`} key={index} />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className={`h-64 ${block}`} />
        <div className={`h-64 ${block}`} />
      </div>
    </div>
  );
}
