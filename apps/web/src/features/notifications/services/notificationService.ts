import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { notifications } from '@/db/schema';

// Accepts the db or a transaction, so callers can write inside their own transaction.
type NotificationWriter = Pick<typeof db, 'insert'>;

export type InvoiceNotificationEventType =
  | 'invoice_created'
  | 'invoice_issued'
  | 'invoice_paid'
  | 'invoice_overdue';

const invoiceNotificationTemplates: Record<
  InvoiceNotificationEventType,
  { title: string; body: string }
> = {
  invoice_created: {
    title: 'Invoice created',
    body: 'A new invoice has been created and requires staff review.',
  },
  invoice_issued: {
    title: 'Invoice issued',
    body: 'An invoice has been issued and is now due for payment.',
  },
  invoice_paid: {
    title: 'Invoice paid',
    body: 'An invoice payment has been received.',
  },
  invoice_overdue: {
    title: 'Invoice overdue',
    body: 'An invoice is overdue and needs attention.',
  },
};

export async function createInAppNotification(input: {
  tenantId: string;
  recipientUserId: string;
  type: string;
  title: string;
  body: string;
}) {
  const [notification] = await db
    .insert(notifications)
    .values({ ...input, channel: 'in_app' })
    .returning();
  return notification;
}

export async function createInvoiceNotificationRecord(
  input: {
    tenantId: string;
    recipientUserId: string;
    invoiceId: string;
    eventType: InvoiceNotificationEventType;
  },
  client: NotificationWriter = db,
) {
  const template = invoiceNotificationTemplates[input.eventType];

  const [notification] = await client
    .insert(notifications)
    .values({
      tenantId: input.tenantId,
      recipientUserId: input.recipientUserId,
      type: `invoice.${input.eventType}`,
      channel: 'in_app',
      title: template.title,
      body: `${template.body} Invoice ID: ${input.invoiceId}.`,
      status: 'queued',
    })
    .returning();

  return notification;
}

/**
 * Draft helper: create a standard in-app invoice notification record.
 *
 * This helper centralizes the invoice notification payload and allows
 * transactions to be shared via the optional client parameter.
 */
export async function createInvoiceNotification(
  tenantId: string,
  recipientUserId: string,
  invoiceId: string,
  eventType: InvoiceNotificationEventType,
  client: NotificationWriter = db,
) {
  return createInvoiceNotificationRecord(
    { tenantId, recipientUserId, invoiceId, eventType },
    client,
  );
}

export async function listUserNotifications(
  tenantId: string,
  recipientUserId: string,
) {
  return db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.tenantId, tenantId),
        eq(notifications.recipientUserId, recipientUserId),
      ),
    )
    .orderBy(desc(notifications.createdAt));
}