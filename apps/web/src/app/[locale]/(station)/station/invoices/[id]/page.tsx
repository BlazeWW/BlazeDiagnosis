import { notFound } from 'next/navigation';

import { AppShell } from '@/components/common/appShell';
import { StatusBadge } from '@/components/common/statusBadge';
import { BrandedDocumentPreview } from '@/components/tenant/brandedDocumentPreview';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatCurrencyFromCents, stationInvoiceRows } from '@/lib/sampleWorkflows';
import type { IdPageProps } from '@/types/routes';
import { StationInvoiceActions } from '@/features/invoices/components/StationInvoiceActions';
export default async function StationInvoiceDetailPage({ params }: IdPageProps) {
  const { id } = await params;
  const invoice = stationInvoiceRows.find((item) => item.id === id);

  if (!invoice) {
    notFound();
  }

  const diagnosticsAmount = Math.round(invoice.totalCents * 0.22);
  const partsAmount = Math.round(invoice.totalCents * 0.48);
  const labourAmount = invoice.totalCents - diagnosticsAmount - partsAmount;
  const lineItems = [
    { amount: diagnosticsAmount, description: 'Diagnostics and road test', quantity: 1 },
    { amount: partsAmount, description: 'Approved parts and consumables', quantity: 1 },
    { amount: labourAmount, description: 'Adjusted labour after approvals', quantity: 1 },
  ];

  return (
    <AppShell
      actions={
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">Send invoice</Button>
          <Button>Record payment</Button>
        </div>
      }
      description="Branded invoice detail with payment actions, linked job card, and customer-ready document preview."
      surface="station"
      title={invoice.invoiceNumber}
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice summary</CardTitle>
              <CardDescription>
                Use this view to confirm job linkage, customer details, status, due date, and payment actions.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <SummaryItem label="Customer" value={invoice.customer} />
              <SummaryItem label="Vehicle" value={invoice.vehicle} />
              <SummaryItem label="Job card" value={invoice.jobCard} />
              <SummaryItem label="Issued" value={invoice.issuedAt} />
              <SummaryItem label="Due" value={invoice.dueDate} />
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </p>
                <div className="mt-2">
                  <StatusBadge tone={invoice.statusTone}>{invoice.status}</StatusBadge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoice line items</CardTitle>
              <CardDescription>
                These line items mirror the approved quote items that became billable work.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border rounded-xl border border-border bg-card">
                {lineItems.map((item) => (
                  <div
                    className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                    key={item.description}
                  >
                    <div>
                      <p className="font-semibold text-foreground">{item.description}</p>
                      <p className="text-sm text-muted-foreground">Quantity {item.quantity}</p>
                    </div>
                    <p className="font-mono text-sm text-muted-foreground">
                      {formatCurrencyFromCents(item.amount)}
                    </p>
                    <StatusBadge tone="success">Billable</StatusBadge>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <div className="w-full max-w-sm rounded-xl border border-border bg-muted/40 p-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Total due</span>
                    <span className="font-mono text-lg font-bold text-foreground">
                      {formatCurrencyFromCents(invoice.totalCents)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <StationInvoiceActions
          invoice={{
            amountPaidCents: 0,
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status,
            statusTone: invoice.statusTone,
            totalCents: invoice.totalCents,
          }}
          tenantId="station-default"
        />
        </div>

        <BrandedDocumentPreview
          documentType="invoice"
          items={lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            totalCents: item.amount,
            unitPriceCents: item.amount,
          }))}
          reference={invoice.invoiceNumber}
          status={invoice.status}
          title={`${invoice.customer} · ${invoice.vehicle}`}
          totalCents={invoice.totalCents}
        />
      </div>
    </AppShell>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
