import { and, eq, or } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  invoiceLineItems,
  invoices,
  quoteLineItems,
  quotes,
} from '@/db/schema';
import { requireTenantPermission } from '@/lib/authorization/guards';
import { calculateDocumentTotals, centsToString } from '@/lib/money/cents';
import writeAudit from '@/lib/auditWriter'; 
import { createInvoiceNotificationRecord } from '@/features/notifications/services/notificationService';

/**
 * Service: create a new invoice from an approved quote.
 *
 * This service reads approved or billable quote line items, calculates
 * invoice totals, writes the invoice and line items, logs an audit event,
 * and enqueues a notification for the recipient.
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
    // 1. Fetch the quote with strict multi-tenant constraints
    const [quote] = await tx
      .select()
      .from(quotes)
      .where(and(eq(quotes.tenantId, tenantId), eq(quotes.id, quoteId)))
      .limit(1);

    if (!quote) {
      throw new Error('Quote not found.');
    }

    // Business rule check: Prevent re-invoicing an already locked/processed document
    if (quote.status === 'locked') {
      throw new Error('This quote has already been processed and locked.');
    }

    // Determine fallback recipient and actor data safely from context context
    const actorUserId = options?.actorUserId ?? userId;
    const notificationRecipientUserId = options?.notificationRecipientUserId ?? quote.customerId;

    // 2. Query only line items explicitly marked as approved or not requiring verification
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
      throw new Error(
        'Cannot create an invoice without approved or billable quote items.',
      );
    }

    // 3. Totals in whole cents via the shared money module (BD-025)
    const totals = calculateDocumentTotals(
      billableItems.map((item) => ({
        discount: item.discount,
        quantity: item.quantity,
        taxRate: item.taxRate,
        unitPrice: item.unitPrice,
      })),
    );

    // 4. Create the primary parent Invoice record
    const [invoice] = await tx
      .insert(invoices)
      .values({
        tenantId,
        jobCardId: quote.jobCardId,
        customerId: quote.customerId,
        invoiceNumber: `INV-${Date.now()}`,
        status: 'draft',
        subtotal: centsToString(totals.subtotal),
        taxTotal: centsToString(totals.taxTotal),
        discountTotal: centsToString(totals.discountTotal),
        total: centsToString(totals.total),
      })
      .returning();

    // 5. Bulk write associated child line structures
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

    // 6. Lock down quote reference state transition to prevent double-billing
    await tx
      .update(quotes)
      .set({ status: 'locked' })
      .where(and(eq(quotes.id, quoteId), eq(quotes.tenantId, tenantId)));

    // 7. Write an official security audit tracking record (Fulfills Issue 2)
    await writeAudit.writeAudit({
      userId: actorUserId,
      action: 'CREATE',
      resource: 'INVOICE',
      resourceId: invoice.id,
      description: `Generated invoice ${invoice.invoiceNumber} from approved quote ${quoteId}. Total: R${invoice.total}`,
    });

    // 8. Generate System App Notifications using the shared team helper inside the transaction
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