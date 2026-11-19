import { and, eq, or } from 'drizzle-orm';

import { db } from '@/db/client';
import { invoiceLineItems, invoices, quoteLineItems, quotes } from '@/db/schema';
import { createInvoiceNotificationRecord } from '@/features/notifications/services/notificationService';
import writeAudit from '@/lib/auditWriter';
import { requireTenantPermission } from '@/lib/authorization/guards';
import { calculateDocumentTotals, centsToString } from '@/lib/money/cents';

import { allocateInvoiceNumber } from './invoiceNumbering';

/** Quote statuses that may be invoiced (BD-027; pending technical-lead confirmation). */
const INVOICEABLE_STATUSES: string[] = ['approved', 'partially_approved'];

/**
 * Service: issue an invoice from an approved quote (BD-027).
 *
 * Runs in one transaction: locks the quote row, returns the existing invoice on a
 * retry, allocates the next per-tenant invoice number, writes the invoice and its
 * lines, locks the quote, and records an audit event and a notification. If any
 * step fails, everything is rolled back.
 */
export async function createInvoiceFromApprovedQuote(
  tenantId: string,
  quoteId: string,
  userId: string, // Injected to populate the actor metadata for audit tracking
  options?: {
    actorUserId?: string;
    notificationRecipientUserId?: string;
  },
) {
  await requireTenantPermission(tenantId, 'invoices.create');

  return db.transaction(async (tx) => {
    // 1. Fetch the quote and lock its row until this transaction ends,
    //    so a second request for the same quote waits here.
    const [quote] = await tx
      .select()
      .from(quotes)
      .where(and(eq(quotes.tenantId, tenantId), eq(quotes.id, quoteId)))
      .limit(1)
      .for('update');

    if (!quote) {
      throw new Error('Quote not found.');
    }

    // 2. Idempotency: a retried request returns the invoice that already exists.
    const [existingInvoice] = await tx
      .select()
      .from(invoices)
      .where(and(eq(invoices.tenantId, tenantId), eq(invoices.quoteId, quoteId)))
      .limit(1);

    if (existingInvoice) {
      return existingInvoice;
    }

    // 3. Business rules
    if (quote.status === 'locked') {
      throw new Error('This quote has already been processed and locked.');
    }

    if (!INVOICEABLE_STATUSES.includes(quote.status)) {
      throw new Error('Only approved quotes can be invoiced.');
    }

    const actorUserId = options?.actorUserId ?? userId;
    const notificationRecipientUserId = options?.notificationRecipientUserId ?? quote.customerId;

    // 4. Only line items that are approved or don't need approval are invoiced
    const billableItems = await tx
      .select()
      .from(quoteLineItems)
      .where(
        and(
          eq(quoteLineItems.tenantId, tenantId),
          eq(quoteLineItems.quoteId, quoteId),
          or(
            eq(quoteLineItems.approvalStatus, 'approved'),
            eq(quoteLineItems.approvalStatus, 'not_required'),
          ),
        ),
      );

    if (!billableItems.length) {
      throw new Error('Cannot create an invoice without approved or billable quote items.');
    }

    // 5. Totals in whole cents via the shared money module (BD-025)
    const totals = calculateDocumentTotals(
      billableItems.map((item) => ({
        discount: item.discount,
        quantity: item.quantity,
        taxRate: item.taxRate,
        unitPrice: item.unitPrice,
      })),
    );

    // 6. Next per-tenant invoice number, allocated inside this transaction
    const issuedAt = new Date();
    const invoiceNumber = await allocateInvoiceNumber(tx, tenantId, issuedAt);

    // 7. Create the invoice
    const [invoice] = await tx
      .insert(invoices)
      .values({
        tenantId,
        jobCardId: quote.jobCardId,
        customerId: quote.customerId,
        quoteId,
        invoiceNumber,
        status: 'issued',
        issuedAt,
        subtotal: centsToString(totals.subtotal),
        taxTotal: centsToString(totals.taxTotal),
        discountTotal: centsToString(totals.discountTotal),
        total: centsToString(totals.total),
      })
      .returning();

    // 8. Invoice lines
    await tx.insert(invoiceLineItems).values(
      billableItems.map((item) => ({
        tenantId,
        invoiceId: invoice.id,
        quoteLineItemId: item.id,
        category: item.category,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        total: item.total,
      })),
    );

    // 9. Lock the quote so it can't be invoiced again
    await tx
      .update(quotes)
      .set({ status: 'locked' })
      .where(and(eq(quotes.id, quoteId), eq(quotes.tenantId, tenantId)));

    // 10. Audit record
    await writeAudit.writeAudit({
      userId: actorUserId,
      action: 'CREATE',
      resource: 'INVOICE',
      resourceId: invoice.id,
      description: `Issued invoice ${invoice.invoiceNumber} from quote ${quoteId}. Total: R${invoice.total}`,
    });

    // 11. Notification, inside the same transaction
    if (notificationRecipientUserId) {
      await createInvoiceNotificationRecord(
        {
          tenantId,
          recipientUserId: notificationRecipientUserId,
          invoiceId: invoice.id,
          eventType: 'invoice_created',
        },
        tx as any, // Shared transaction context
      );
    }

    return invoice;
  });
}