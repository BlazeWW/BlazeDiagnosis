import "server-only";

import { and, eq } from "drizzle-orm";

import { customers, invoices, tenants } from "@/db/schema";

import type {
  EmailNotificationEventType,
  EmailProviderResult,
  EmailTemplatePayloadMap,
} from "../types/email.types";

import type { EmailProvider } from "../adapters/email-provider.interface";

import { MockEmailProviderAdapter } from "../adapters/mock-email.adapter";
import { renderInvoiceEmail } from "../templates/invoice-templates";

export interface InvoiceEmailContext {
  id: string;
  tenantId: string;
  customerId: string;
  invoiceNumber: string;
  status: string;
  total: string;
  dueAt: Date | null;
  currency: string;

  customer: {
    firstName: string;
    lastName: string;
    email: string | null;
  };
}

export interface SendInvoiceEmailInput {
  tenantId: string;
  invoiceId: string;
  eventType: EmailNotificationEventType;
}

export interface EmailNotificationDependencies {
  authorizeTenant: (tenantId: string) => Promise<unknown>;

  loadInvoice: (tenantId: string, invoiceId: string) => Promise<InvoiceEmailContext | null>;

  provider: EmailProvider;
}

/**
 * Mock provider used during development and automated testing.
 *
 * This provider does not send real emails.
 */
const mockProvider = new MockEmailProviderAdapter();

/**
 * Loads an invoice and its customer using tenant-scoped queries.
 *
 * The database client is imported lazily so importing this
 * service in unit tests does not require DATABASE_URL.
 *
 * Invoice, customer and tenant ownership are checked together.
 */
async function loadInvoiceFromDatabase(
  tenantId: string,
  invoiceId: string,
): Promise<InvoiceEmailContext | null> {
  const { db } = await import("@/db/client");

  const [result] = await db
    .select({
      id: invoices.id,
      tenantId: invoices.tenantId,
      customerId: invoices.customerId,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
      total: invoices.total,
      dueAt: invoices.dueAt,
      currency: tenants.currency,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
      customerEmail: customers.email,
    })
    .from(invoices)
    .innerJoin(
      customers,
      and(eq(invoices.customerId, customers.id), eq(invoices.tenantId, customers.tenantId)),
    )
    .innerJoin(tenants, eq(invoices.tenantId, tenants.id))
    .where(
      and(
        eq(invoices.id, invoiceId),
        eq(invoices.tenantId, tenantId),
        eq(customers.tenantId, tenantId),
        eq(customers.isArchived, false),
      ),
    )
    .limit(1);

  if (!result) {
    return null;
  }

  return {
    id: result.id,
    tenantId: result.tenantId,
    customerId: result.customerId,
    invoiceNumber: result.invoiceNumber,
    status: result.status,
    total: result.total,
    dueAt: result.dueAt,
    currency: result.currency,

    customer: {
      firstName: result.customerFirstName,
      lastName: result.customerLastName,
      email: result.customerEmail,
    },
  };
}

/**
 * Validates whether an invoice is in the correct state
 * for the requested notification.
 */
function validateInvoiceStatus(eventType: EmailNotificationEventType, status: string): void {
  const allowedStatuses: Record<EmailNotificationEventType, string[]> = {
    invoice_issued: ["issued", "partially_paid"],
    invoice_paid: ["paid"],
    invoice_overdue: ["overdue"],
  };

  if (!allowedStatuses[eventType].includes(status)) {
    throw new Error(`Cannot send ${eventType} email for invoice status: ${status}`);
  }
}

/**
 * Creates an approved customer-facing email payload.
 *
 * Internal notes and other private customer information
 * are deliberately excluded.
 */
function createTemplatePayload(
  eventType: EmailNotificationEventType,
  invoice: InvoiceEmailContext,
): EmailTemplatePayloadMap[EmailNotificationEventType] {
  if ((eventType === "invoice_issued" || eventType === "invoice_overdue") && !invoice.dueAt) {
    throw new Error("Invoice due date is required for this email notification.");
  }

  const basePayload = {
    customerName: [invoice.customer.firstName, invoice.customer.lastName].join(" "),

    invoiceNumber: invoice.invoiceNumber,
    amount: invoice.total,
    currency: invoice.currency,
  };

  if (eventType === "invoice_issued") {
    return {
      ...basePayload,
      dueDate: invoice.dueAt!.toISOString().slice(0, 10),
    };
  }

  if (eventType === "invoice_overdue") {
    return {
      ...basePayload,
      dueDate: invoice.dueAt!.toISOString().slice(0, 10),
    };
  }

  return basePayload;
}

/**
 * Sends a customer-facing invoice email.
 *
 * Responsibilities:
 * 1. Authorize tenant access.
 * 2. Load invoice and customer.
 * 3. Verify tenant ownership.
 * 4. Validate invoice status.
 * 5. Validate customer email.
 * 6. Render the email template.
 * 7. Submit the email through the provider.
 */
export async function sendInvoiceEmail(
  input: SendInvoiceEmailInput,

  dependencies: EmailNotificationDependencies = {
    authorizeTenant: async (tenantId) => {
      const { requireTenantPermission } = await import("@/lib/auth/auth-guards");

      return requireTenantPermission(tenantId, "invoices.read");
    },

    loadInvoice: loadInvoiceFromDatabase,

    provider: mockProvider,
  },
): Promise<EmailProviderResult> {
  // 1. Authorize tenant access.
  await dependencies.authorizeTenant(input.tenantId);

  // 2. Retrieve the invoice using tenant-scoped lookup.
  const invoice = await dependencies.loadInvoice(input.tenantId, input.invoiceId);

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  // 3. Verify invoice tenant ownership.
  if (invoice.tenantId !== input.tenantId) {
    throw new Error("Cross-tenant access denied.");
  }

  // 4. Verify invoice status.
  validateInvoiceStatus(input.eventType, invoice.status);

  // 5. Resolve customer recipient from the database record.
  const recipient = invoice.customer.email?.trim();

  if (!recipient) {
    throw new Error("Customer email address is missing.");
  }

  // 6. Validate email format.
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(recipient)) {
    throw new Error("Customer email address is invalid.");
  }

  // 7. Create the approved template payload.
  const payload = createTemplatePayload(input.eventType, invoice);

  // 8. Render HTML and plain-text email.
  const renderedEmail = renderInvoiceEmail(input.eventType, payload);

  // 9. Submit through the configured provider.
  return dependencies.provider.send({
    to: recipient,
    subject: renderedEmail.subject,
    html: renderedEmail.html,
    text: renderedEmail.text,

    idempotencyKey: `${input.tenantId}:${invoice.id}:${input.eventType}`,
  });
}
