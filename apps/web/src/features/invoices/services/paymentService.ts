import { and, eq, gte, lte, sql } from 'drizzle-orm';
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
  await requireTenantPermission(tenantId, 'invoices.update');
    const paidAt = new Date();
    const amountValue = amount.toString();
    
    const result = await db.transaction(async (tx) => {
    const [invoice] = await tx
      .select({
        id: invoices.id,
        total: invoices.total,
      })
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)));

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const invoiceTotal = Number(invoice.total);
    const nextAmountSql = sql<string>`${invoices.amountPaid} + ${amountValue}`;

    const [updatedInvoice] = await tx
      .update(invoices)
      .set({
        amountPaid: nextAmountSql,
      })
      .where(
        and(
          eq(invoices.id, invoiceId),
          eq(invoices.tenantId, tenantId),
          lte(nextAmountSql, invoices.total),
        ),
      )
      .returning({
        amountPaid: invoices.amountPaid,
      });

    if (!updatedInvoice) {
      throw new Error('Payment exceeds outstanding balance');
    }

    const newAmountPaid = Number(updatedInvoice.amountPaid);
    const newStatus = getInvoicePaymentStatus(invoiceTotal, newAmountPaid);

    await tx
      .update(invoices)
      .set({
        status: newStatus,
        paidAt: newStatus === 'paid' ? paidAt : null,
      })
      .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)));

    await tx.insert(payments).values({
      tenantId,
      invoiceId,
      amount: amountValue,
      method: 'manual',
      status: 'completed',
      paidAt,
    });

    return {
      newAmountPaid,
      newStatus,
    };
  });

  await writeAudit.writeAudit({
    userId: tenantId,
    action: 'UPDATE',
    resource: 'INVOICE',
    resourceId: invoiceId,
    description: `Recorded manual payment of ${amount} on invoice ${invoiceId}. New paid total: ${result.newAmountPaid}, status: ${result.newStatus}`,
  });

  return {
    invoiceId,
    amountPaid: result.newAmountPaid,
    status: result.newStatus,
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

  const paidAt = new Date();
  const amountValue = amount.toString();

  const result = await db.transaction(async (tx) => {
    const [invoice] = await tx
      .select({
        id: invoices.id,
        total: invoices.total,
        paidAt: invoices.paidAt,
      })
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)));

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const invoiceTotal = Number(invoice.total);
    const nextAmountSql = sql<string>`${invoices.amountPaid} - ${amountValue}`;

    const [updatedInvoice] = await tx
      .update(invoices)
      .set({
        amountPaid: nextAmountSql,
      })
      .where(
        and(
          eq(invoices.id, invoiceId),
          eq(invoices.tenantId, tenantId),
          gte(nextAmountSql, 0),
        ),
      )
      .returning({
        amountPaid: invoices.amountPaid,
      });

    if (!updatedInvoice) {
      throw new Error('Correction amount cannot exceed amount paid');
    }

    const newAmountPaid = Number(updatedInvoice.amountPaid);
    const newStatus = getInvoicePaymentStatus(invoiceTotal, newAmountPaid);

    await tx
      .update(invoices)
      .set({
        status: newStatus,
        paidAt: newStatus === 'paid' ? invoice.paidAt ?? paidAt : null,
      })
      .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)));

    await tx.insert(payments).values({
      tenantId,
      invoiceId,
      amount: (-amount).toString(),
      method: 'manual',
      status: 'completed',
      paidAt,
    });

    return {
      newAmountPaid,
      newStatus,
    };
  });

  await writeAudit.writeAudit({
    userId: tenantId,
    action: 'UPDATE',
    resource: 'INVOICE',
    resourceId: invoiceId,
    description: `Recorded payment correction of -${amount} on invoice ${invoiceId}. New paid total: ${result.newAmountPaid}, status: ${result.newStatus}`,
  });

  return {
    invoiceId,
    amountPaid: result.newAmountPaid,
    status: result.newStatus,
  };
}