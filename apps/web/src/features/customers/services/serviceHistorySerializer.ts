import type {
  CustomerJobStatus,
  CustomerServiceHistoryDocument,
  CustomerServiceHistoryItem,
} from '@/types/serviceHistory';

// Customer-safe serializer for service history (BD-037).
// It copies an explicit allow-list of fields, so internal job data such as the
// internal status, assigned staff, priority, internal notes, line items, costs
// and supplier data can never reach the customer, even if a query returns them.

export type ServiceHistoryJobRow = {
  completedAt: Date | null;
  createdAt: Date;
  customerStatus: CustomerJobStatus;
  expectedCompletionAt: Date | null;
  jobCardId: string;
  jobNumber: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleRegistrationNumber: string | null;
  vehicleYear: number | null;
};

export type ServiceHistoryQuoteRow = {
  id: string;
  jobCardId: string;
  quoteNumber: string;
  sentAt: Date | null;
  status: string;
  total: string;
};

export type ServiceHistoryInvoiceRow = {
  id: string;
  invoiceNumber: string;
  issuedAt: Date | null;
  jobCardId: string;
  status: string;
  total: string;
};

export type ServiceHistoryNoteRow = {
  body: string;
  createdAt: Date;
  jobCardId: string;
  visibility: string;
};

export type ServiceHistoryRelatedRows = {
  invoices: ServiceHistoryInvoiceRow[];
  notes: ServiceHistoryNoteRow[];
  quotes: ServiceHistoryQuoteRow[];
};

export const customerStatusLabels: Record<CustomerJobStatus, string> = {
  awaiting_approval: 'Awaiting your approval',
  cancelled: 'Cancelled',
  completed: 'Completed',
  final_checks: 'Final checks',
  inspection_in_progress: 'Inspection in progress',
  invoice_ready: 'Invoice ready',
  quote_ready: 'Quote ready',
  ready_for_collection: 'Ready for collection',
  request_received: 'Request received',
  service_in_progress: 'Service in progress',
  vehicle_checked_in: 'Vehicle checked in',
  waiting_for_parts: 'Waiting for parts',
};

// Documents a customer may see. Drafts are still being prepared by staff.
export const customerVisibleQuoteStatuses = [
  'sent',
  'partially_approved',
  'approved',
  'declined',
  'expired',
  'locked',
] as const;

export const customerVisibleInvoiceStatuses = [
  'issued',
  'partially_paid',
  'paid',
  'overdue',
  'cancelled',
  'refunded',
] as const;

function toIso(value: Date | null) {
  return value ? value.toISOString() : null;
}

function isCustomerVisible(status: string, allowed: readonly string[]) {
  return allowed.includes(status);
}

export function toCustomerServiceHistoryItem(
  job: ServiceHistoryJobRow,
  related: ServiceHistoryRelatedRows,
): CustomerServiceHistoryItem {
  const quotes: CustomerServiceHistoryDocument[] = related.quotes
    .filter(
      (quote) =>
        quote.jobCardId === job.jobCardId &&
        isCustomerVisible(quote.status, customerVisibleQuoteStatuses),
    )
    .map((quote) => ({
      id: quote.id,
      issuedAt: toIso(quote.sentAt),
      number: quote.quoteNumber,
      status: quote.status,
      total: quote.total,
      type: 'quote',
    }));

  const invoices: CustomerServiceHistoryDocument[] = related.invoices
    .filter(
      (invoice) =>
        invoice.jobCardId === job.jobCardId &&
        isCustomerVisible(invoice.status, customerVisibleInvoiceStatuses),
    )
    .map((invoice) => ({
      id: invoice.id,
      issuedAt: toIso(invoice.issuedAt),
      number: invoice.invoiceNumber,
      status: invoice.status,
      total: invoice.total,
      type: 'invoice',
    }));

  const notes = related.notes
    .filter(
      (note) =>
        note.jobCardId === job.jobCardId && note.visibility === 'customer',
    )
    .map((note) => ({
      body: note.body,
      createdAt: note.createdAt.toISOString(),
    }));

  return {
    completedAt: toIso(job.completedAt),
    documents: [...quotes, ...invoices],
    expectedCompletionAt: toIso(job.expectedCompletionAt),
    isOngoing: job.customerStatus !== 'completed' && job.completedAt === null,
    jobCardId: job.jobCardId,
    jobNumber: job.jobNumber,
    notes,
    openedAt: job.createdAt.toISOString(),
    status: job.customerStatus,
    statusLabel: customerStatusLabels[job.customerStatus],
    vehicle: {
      make: job.vehicleMake,
      model: job.vehicleModel,
      registrationNumber: job.vehicleRegistrationNumber,
      year: job.vehicleYear,
    },
  };
}
