import type { Route } from 'next';
import Link from 'next/link';

import { FeatureRecordList } from '@/components/common/featureDashboard';
import { EmptyState } from '@/components/data-display/emptyState';
import { Button } from '@/components/ui/button';
import type { FeatureRecord } from '@/types/featureDashboard';
import type {
  CustomerServiceHistoryItem,
  CustomerServiceHistoryPage,
} from '@/types/serviceHistory';

const dateFormatter = new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium' });
const moneyFormatter = new Intl.NumberFormat('en-ZA', {
  currency: 'ZAR',
  style: 'currency',
});

function formatDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : null;
}

function describeVehicle(item: CustomerServiceHistoryItem) {
  const { make, model, registrationNumber, year } = item.vehicle;
  const name = [year, make, model].filter(Boolean).join(' ');

  return registrationNumber ? `${name} (${registrationNumber})` : name;
}

export function toServiceHistoryRecord(
  item: CustomerServiceHistoryItem,
): FeatureRecord {
  const documents = item.documents.map(
    (document) =>
      `${document.type === 'quote' ? 'Quote' : 'Invoice'} ${document.number} (${document.status.replace(/_/g, ' ')}, ${moneyFormatter.format(Number(document.total))})`,
  );
  const latestNote = item.notes.at(-1)?.body;
  const description =
    [documents.join(' · '), latestNote ? `Latest update: ${latestNote}` : null]
      .filter(Boolean)
      .join(' — ') || 'No documents shared yet.';
  const meta = [
    `Opened ${formatDate(item.openedAt)}`,
    item.completedAt ? `Completed ${formatDate(item.completedAt)}` : null,
    item.isOngoing && item.expectedCompletionAt
      ? `Expected ${formatDate(item.expectedCompletionAt)}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return {
    description,
    id: item.jobCardId,
    meta,
    status: item.statusLabel,
    statusTone: item.isOngoing ? 'info' : 'success',
    title: `${item.jobNumber} — ${describeVehicle(item)}`,
  };
}

export function ServiceHistoryList({
  basePath,
  history,
}: {
  basePath: string;
  history: CustomerServiceHistoryPage;
}) {
  const { items, pagination } = history;

  if (items.length === 0) {
    return (
      <EmptyState
        description={
          pagination.total === 0
            ? 'When the workshop opens a job for one of your vehicles, it will appear here.'
            : 'There are no services on this page.'
        }
        title="No service history yet"
      />
    );
  }

  return (
    <div className="space-y-4">
      <FeatureRecordList
        description="Your current and past services, newest first, with the quotes and invoices shared with you."
        items={items.map(toServiceHistoryRecord)}
        title="Service history"
      />

      {pagination.totalPages > 1 ? (
        <nav
          aria-label="Service history pages"
          className="flex items-center justify-between gap-4"
        >
          {pagination.page > 1 ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`${basePath}?page=${pagination.page - 1}` as Route}>
                Previous
              </Link>
            </Button>
          ) : (
            <span />
          )}
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          {pagination.hasNextPage ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`${basePath}?page=${pagination.page + 1}` as Route}>
                Next
              </Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
