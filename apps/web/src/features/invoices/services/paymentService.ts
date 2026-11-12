import { and, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { invoices, payments } from '@/db/schema';
import { requireTenantPermission } from '@/lib/authorization/guards';
export function calculateOutstandingBalance(
  total: number,
  amountPaid: number,
): number {
  return total - amountPaid;
}

export function getInvoicePaymentStatus(
  total: number,
  amountPaid: number,
): 'issued' | 'partially_paid' | 'paid' {
  if (amountPaid <= 0) {
    return 'issued';
  }

  if (amountPaid >= total) {
    return 'paid';
  }

  return 'partially_paid';
}
export async function markInvoicePaid(
  tenantId: string,
  invoiceId: string,
  amount: number,
) {
  if (amount <= 0) {
    throw new Error(
      'Payment amount must be greater than zero',
    );
  }

  await requireTenantPermission(
  tenantId,
  'invoices.create',
);

const [invoice] = await db
  .select()
  .from(invoices)
  .where(
    and(
      eq(invoices.id, invoiceId),
      eq(invoices.tenantId, tenantId),
    ),
  );

if (!invoice) {
  throw new Error('Invoice not found');
}
}