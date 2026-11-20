import { and, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { invoices, payments } from '@/db/schema';
import { requireTenantPermission } from '@/lib/authorization/guards';
import writeAudit from '@/lib/auditWriter';

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
    throw new Error('Payment amount must be greater than zero');
  }

  await requireTenantPermission(tenantId, 'invoices.create');

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)));

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const currentAmountPaid = Number(invoice.amountPaid);
  const invoiceTotal = Number(invoice.total);

  if (currentAmountPaid + amount > invoiceTotal) {
    throw new Error('Payment exceeds outstanding balance');
  }

  const paidAt = new Date();

  await db.insert(payments).values({
    tenantId,
    invoiceId,
    amount: amount.toString(),
    method: 'manual',
    status: 'completed',
    paidAt,
  });

  const newAmountPaid = currentAmountPaid + amount;
  const newStatus = getInvoicePaymentStatus(invoiceTotal, newAmountPaid);

  await db
    .update(invoices)
    .set({
      amountPaid: newAmountPaid.toString(),
      status: newStatus,
      paidAt: newStatus === 'paid' ? paidAt : null,
    })
    .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)));

  await writeAudit.writeAudit({
    userId: tenantId,
    action: 'UPDATE',
    resource: 'INVOICE',
    resourceId: invoiceId,
    description: `Recorded manual payment of ${amount} on invoice ${invoiceId}. New paid total: ${newAmountPaid}, status: ${newStatus}`,
  });

  return {
    invoiceId,
    amountPaid: newAmountPaid,
    status: newStatus,
  };
}

export async function recordPaymentCorrection(
  tenantId: string,
  invoiceId: string,
  amount: number,
) {
  if (amount <= 0) {
    throw new Error('Correction amount must be greater than zero');
  }

  await requireTenantPermission(tenantId, 'invoices.create');

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)));

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const currentAmountPaid = Number(invoice.amountPaid);
  const newAmountPaid = currentAmountPaid - amount;

  if (newAmountPaid < 0) {
    throw new Error('Correction amount cannot exceed amount paid');
  }

  const paidAt = new Date();

  await db.insert(payments).values({
    tenantId,
    invoiceId,
    amount: (-amount).toString(),
    method: 'manual',
    status: 'completed',
    paidAt,
  });

  const newStatus = getInvoicePaymentStatus(Number(invoice.total), newAmountPaid);

  await db
    .update(invoices)
    .set({
      amountPaid: newAmountPaid.toString(),
      status: newStatus,
      paidAt: newStatus === 'paid' ? invoice.paidAt ?? paidAt : null,
    })
    .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)));

  await writeAudit.writeAudit({
    userId: tenantId,
    action: 'UPDATE',
    resource: 'INVOICE',
    resourceId: invoiceId,
    description: `Recorded payment correction of -${amount} on invoice ${invoiceId}. New paid total: ${newAmountPaid}, status: ${newStatus}`,
  });

  return {
    invoiceId,
    amountPaid: newAmountPaid,
    status: newStatus,
  };
}