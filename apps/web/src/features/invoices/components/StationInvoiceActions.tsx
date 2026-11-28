'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

import {
  StationInvoicePanel,
  type StationInvoiceSummary,
} from './StationInvoicePanel';

type RecordInvoiceAction = (payload: {
  amount: number;
  invoiceId: string;
  tenantId: string;
}) => Promise<void> | void;

interface StationInvoiceActionsProps {
  invoice: StationInvoiceSummary;
  onRecordCorrection?: RecordInvoiceAction;
  onRecordPayment?: RecordInvoiceAction;
  tenantId: string;
}

export function StationInvoiceActions({
  invoice,
  onRecordCorrection,
  onRecordPayment,
  tenantId,
}: StationInvoiceActionsProps) {
  const router = useRouter();

  const handleSuccess = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <StationInvoicePanel
      invoice={invoice}
      onRecordCorrection={onRecordCorrection}
      onRecordPayment={onRecordPayment}
      onSuccess={handleSuccess}
      tenantId={tenantId}
    />
  );
}