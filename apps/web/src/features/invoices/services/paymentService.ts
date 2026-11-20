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

const currentAmountPaid = Number(
  invoice.amountPaid,
);

const invoiceTotal = Number(
  invoice.total,
);

if (
  currentAmountPaid + amount >
  invoiceTotal
) {
  throw new Error(
    'Payment exceeds outstanding balance',
  );
}
await db.insert(payments).values({
  tenantId,
  invoiceId,
  amount: amount.toString(),
  method: 'manual',
  status: 'completed',
  paidAt: new Date(),
});
const newAmountPaid =
  Number(invoice.amountPaid) + amount;
  const newStatus = getInvoicePaymentStatus(
  Number(invoice.total),
  newAmountPaid,
);
await db
  .update(invoices)
  .set({
    amountPaid: newAmountPaid.toString(),
    status: newStatus,
    paidAt:
      newStatus === 'paid'
        ? new Date()
        : null,
  })
  .where(
    and(
      eq(invoices.id, invoiceId),
      eq(invoices.tenantId, tenantId),
    ),
  );
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
    throw new Error(
      'Correction amount must be greater than zero',
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
const newAmountPaid =
  Number(invoice.amountPaid) - amount;

const newStatus = getInvoicePaymentStatus(
  Number(invoice.total),
  newAmountPaid,
);

await db
  .update(invoices)
  .set({
    amountPaid: newAmountPaid.toString(),
    status: newStatus,
  })
  .where(
    and(
      eq(invoices.id, invoiceId),
      eq(invoices.tenantId, tenantId),
    ),
  );

return {
  invoiceId,
  amountPaid: newAmountPaid,
  status: newStatus,
};
}