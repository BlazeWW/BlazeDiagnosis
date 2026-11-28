'use client';

import { useEffect, useState } from 'react';

import { StatusBadge } from '@/components/common/statusBadge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TenantAccessError } from '@/lib/authorization/guards';
import { formatCurrencyFromCents } from '@/lib/sampleWorkflows';
import type { StatusTone } from '@/types/ui';

type InvoiceActionInput = {
  amount: number;
  invoiceId: string;
  tenantId: string;
};

type ActionCallback = (input: InvoiceActionInput) => Promise<void> | void;

export interface StationInvoiceSummary {
  amountPaidCents?: number;
  id: string;
  invoiceNumber: string;
  status: string;
  statusTone: StatusTone;
  totalCents: number;
}

export interface StationInvoicePanelProps {
  invoice: StationInvoiceSummary;
  onRecordCorrection?: ActionCallback;
  onRecordPayment?: ActionCallback;
  onSuccess?: () => void;
  tenantId: string;
}

type PendingKind = 'payment' | 'correction' | null;

function getErrorText(error: unknown, fallback: string): string {
  if (error instanceof TenantAccessError) {
    return 'Forbidden: Missing permission to update invoices for this tenant.';
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

export function StationInvoicePanel({
  invoice,
  onRecordCorrection,
  onRecordPayment,
  onSuccess,
  tenantId,
}: StationInvoicePanelProps) {
  const paidCents = invoice.amountPaidCents ?? 0;
  const remainingCents = Math.max(invoice.totalCents - paidCents, 0);

  const [paymentInput, setPaymentInput] = useState('');
  const [correctionInput, setCorrectionInput] = useState('');
  const [pendingKind, setPendingKind] = useState<PendingKind>(null);
  const [alertText, setAlertText] = useState<string | null>(null);

  useEffect(() => {
    setPaymentInput('');
    setCorrectionInput('');
    setAlertText(null);
    setPendingKind(null);
  }, [invoice.id, tenantId]);

  const busy = pendingKind !== null;

  async function runAction(
    kind: Exclude<PendingKind, null>,
    rawValue: string,
    handler: ActionCallback | undefined,
    missingMsg: string,
    clearInput: () => void,
  ) {
    setAlertText(null);

    const amount = Number(rawValue);
    if (!Number.isFinite(amount) || amount <= 0) {
      setAlertText(
        kind === 'payment'
          ? 'Payment amount must be greater than zero.'
          : 'Correction amount must be greater than zero.',
      );
      return;
    }

    if (!handler) {
      setAlertText(missingMsg);
      return;
    }

    setPendingKind(kind);
    try {
      await handler({ amount, invoiceId: invoice.id, tenantId });
      clearInput();
      onSuccess?.();
    } catch (err) {
      setAlertText(
        getErrorText(err, 'Unable to complete the invoice action.'),
      );
    } finally {
      setPendingKind(null);
    }
  }

  const onPaymentFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runAction(
      'payment',
      paymentInput,
      onRecordPayment,
      'Payment recording is not configured.',
      () => setPaymentInput(''),
    );
  };

  const onCorrectionFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runAction(
      'correction',
      correctionInput,
      onRecordCorrection,
      'Payment correction is not configured.',
      () => setCorrectionInput(''),
    );
  };

  const summaryCells = [
    { label: 'Total', value: formatCurrencyFromCents(invoice.totalCents) },
    { label: 'Paid', value: formatCurrencyFromCents(paidCents) },
    { label: 'Balance due', value: formatCurrencyFromCents(remainingCents) },
  ];

  return (
    <Card data-tenant-id={tenantId}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Invoice actions · {invoice.invoiceNumber}</CardTitle>
            <CardDescription>
              Record payments or payment adjustments for tenant {tenantId}.
            </CardDescription>
          </div>
          <StatusBadge tone={invoice.statusTone}>{invoice.status}</StatusBadge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {summaryCells.map((cell) => (
            <div
              className="rounded-lg border border-border bg-muted/40 p-3"
              key={cell.label}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {cell.label}
              </p>
              <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                {cell.value}
              </p>
            </div>
          ))}
        </div>

        {alertText && (
          <div
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            {alertText}
          </div>
        )}

        <form className="space-y-2" onSubmit={onPaymentFormSubmit}>
          <label
            className="block text-sm font-medium text-foreground"
            htmlFor="payment-amount-input"
          >
            Payment amount
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              aria-label="Payment amount"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              disabled={busy}
              id="payment-amount-input"
              min="0"
              step="any"
              type="number"
              value={paymentInput}
              onChange={(e) => setPaymentInput(e.target.value)}
            />
            <Button disabled={busy} type="submit">
              {pendingKind === 'payment'
                ? 'Recording payment…'
                : 'Record payment'}
            </Button>
          </div>
        </form>

        <form className="space-y-2" onSubmit={onCorrectionFormSubmit}>
          <label
            className="block text-sm font-medium text-foreground"
            htmlFor="correction-amount-input"
          >
            Payment correction amount
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              aria-label="Payment correction amount"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              disabled={busy}
              id="correction-amount-input"
              min="0"
              step="any"
              type="number"
              value={correctionInput}
              onChange={(e) => setCorrectionInput(e.target.value)}
            />
            <Button disabled={busy} type="submit" variant="outline">
              {pendingKind === 'correction'
                ? 'Recording correction…'
                : 'Record correction'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}