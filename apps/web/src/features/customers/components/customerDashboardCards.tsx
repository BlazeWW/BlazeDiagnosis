import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { CustomerDashboard } from '@/types/customerDashboard';

const dateFormatter = new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium' });
const moneyFormatter = new Intl.NumberFormat('en-ZA', {
  currency: 'ZAR',
  style: 'currency',
});

const formatDate = (value: string) => dateFormatter.format(new Date(value));
const formatMoney = (value: string) => moneyFormatter.format(Number(value));
const label = (status: string) => status.replace(/_/g, ' ');

function SummaryCard({
  children,
  description,
  emptyMessage,
  href,
  hrefLabel,
  title,
  total,
}: {
  children: ReactNode;
  description: string;
  emptyMessage: string;
  href: string;
  hrefLabel: string;
  title: string;
  total: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-baseline justify-between gap-2 text-base">
          {title}
          <span className="text-2xl font-bold">{total}</span>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <>
            <ul className="divide-y divide-border text-sm">{children}</ul>
            <Button asChild size="sm" variant="outline">
              <Link href={href as Route}>{hrefLabel}</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function CustomerDashboardCards({
  basePath,
  dashboard,
}: {
  basePath: string;
  dashboard: CustomerDashboard;
}) {
  const { openInvoices, openQuotes, pendingRequests, vehicles } = dashboard;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        description="Vehicles linked to your profile"
        emptyMessage="No vehicles are linked to your profile yet."
        href={`${basePath}/vehicles`}
        hrefLabel="View all vehicles"
        title="Vehicles"
        total={vehicles.total}
      >
        {vehicles.items.map((vehicle) => (
          <li className="py-2" key={vehicle.id}>
            {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')}
            {vehicle.registrationNumber ? ` (${vehicle.registrationNumber})` : ''}
          </li>
        ))}
      </SummaryCard>

      <SummaryCard
        description="Quotes waiting for your decision"
        emptyMessage="No open quotes."
        href={`${basePath}/quotes`}
        hrefLabel="View all quotes"
        title="Open quotes"
        total={openQuotes.total}
      >
        {openQuotes.items.map((quote) => (
          <li className="py-2" key={quote.id}>
            <span className="font-medium">{quote.quoteNumber}</span> ·{' '}
            {formatMoney(quote.total)}
            <span className="block text-xs text-muted-foreground">
              {label(quote.status)}
              {quote.sentAt ? ` · sent ${formatDate(quote.sentAt)}` : ''}
            </span>
          </li>
        ))}
      </SummaryCard>

      <SummaryCard
        description="Invoices that still need payment"
        emptyMessage="No open invoices."
        href={`${basePath}/invoices`}
        hrefLabel="View all invoices"
        title="Open invoices"
        total={openInvoices.total}
      >
        {openInvoices.items.map((invoice) => (
          <li className="py-2" key={invoice.id}>
            <span className="font-medium">{invoice.invoiceNumber}</span> ·{' '}
            {formatMoney(invoice.total)}
            <span className="block text-xs text-muted-foreground">
              {label(invoice.status)}
              {invoice.dueAt ? ` · due ${formatDate(invoice.dueAt)}` : ''}
            </span>
          </li>
        ))}
      </SummaryCard>

      <SummaryCard
        description="Requests the workshop has not started yet"
        emptyMessage="No pending service requests."
        href={`${basePath}/services`}
        hrefLabel="View service history"
        title="Pending requests"
        total={pendingRequests.total}
      >
        {pendingRequests.items.map((request) => (
          <li className="py-2" key={request.id}>
            {request.requestedService}
            <span className="block text-xs text-muted-foreground">
              Requested {formatDate(request.createdAt)}
            </span>
          </li>
        ))}
      </SummaryCard>
    </div>
  );
}