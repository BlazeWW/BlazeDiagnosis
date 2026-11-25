import "server-only";

import { and, eq } from "drizzle-orm";

import { customers, invoices, tenants } from "@/db/schema";

import type { EmailProvider } from "../adapters/email-provider.interface";
import { MockEmailProviderAdapter } from "../adapters/mock-email.adapter";

import {
  emailDeliveryRepository,
  type EmailDeliveryRepository,
} from "../repositories/email-delivery.repository";

import {
  EMAIL_SENDING_STALE_AFTER_MS,
  canRetryEmail,
  getNextEmailRetryAt,
} from "./email-retry-policy";

import { renderInvoiceEmail } from "../templates/invoice-templates";

import type {
  EmailFailureCode,
  EmailNotificationEventType,
  EmailProviderResult,
  EmailTemplatePayloadMap,
} from "../types/email.types";

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

  repository: EmailDeliveryRepository;
}

interface PreparedInvoiceEmail {
  recipient: string;
  subject: string;
  html: string;
  text: string;
}

export interface ProcessEmailRetriesResult {
  recovered: number;
  claimed: number;
  sent: number;
  retrying: number;
  failed: number;
}

/**
 * Errors that should not be retried because the email
 * cannot be prepared successfully.
 */
class EmailPreparationError extends Error {
  constructor(
    message: string,
    public readonly failureCode: EmailFailureCode,
  ) {
    super(message);
    this.name = "EmailPreparationError";
  }
}

/**
 * Identifies a provider exception that has already been
 * recorded in the delivery repository.
 *
 * The retry worker uses this class to avoid recording
 * the same attempt twice.
 */
class EmailProviderSubmissionError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "EmailProviderSubmissionError";
  }
}

/**
 * Mock provider used during development and automated testing.
 *
 * This provider does not send real emails.
 */
const mockProvider = new MockEmailProviderAdapter();

/**
 * Default dependencies shared by the notification service
 * and the retry worker.
 */
function createDefaultDependencies(): EmailNotificationDependencies {
  return {
    authorizeTenant: async (tenantId) => {
      const { requireTenantPermission } = await import("@/lib/auth/auth-guards");

      return requireTenantPermission(tenantId, "invoices.read");
    },

    loadInvoice: loadInvoiceFromDatabase,

    provider: mockProvider,

    repository: emailDeliveryRepository,
  };
}

/**
 * Loads an invoice and its customer using tenant-scoped queries.
 *
 * The database client is imported lazily so importing this
 * service in unit tests does not require DATABASE_URL.
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
    throw new EmailPreparationError(
      `Cannot send ${eventType} email for invoice status: ${status}`,
      "TEMPLATE_VALIDATION_FAILED",
    );
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
    throw new EmailPreparationError(
      "Invoice due date is required for this email notification.",
      "TEMPLATE_VALIDATION_FAILED",
    );
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
 * Prepares an invoice email using the current invoice
 * and customer data.
 *
 * This function is shared by initial delivery and retry processing.
 */
async function prepareInvoiceEmail(
  tenantId: string,
  invoiceId: string,
  eventType: EmailNotificationEventType,
  dependencies: EmailNotificationDependencies,
): Promise<PreparedInvoiceEmail> {
  const invoice = await dependencies.loadInvoice(tenantId, invoiceId);

  if (!invoice) {
    throw new EmailPreparationError("Invoice not found.", "TEMPLATE_VALIDATION_FAILED");
  }

  if (invoice.tenantId !== tenantId) {
    throw new EmailPreparationError("Cross-tenant access denied.", "TENANT_SCOPE_MISMATCH");
  }

  validateInvoiceStatus(eventType, invoice.status);

  const recipient = invoice.customer.email?.trim();

  if (!recipient) {
    throw new EmailPreparationError("Customer email address is missing.", "INVALID_RECIPIENT");
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(recipient)) {
    throw new EmailPreparationError("Customer email address is invalid.", "INVALID_RECIPIENT");
  }

  const payload = createTemplatePayload(eventType, invoice);

  const renderedEmail = renderInvoiceEmail(eventType, payload);

  return {
    recipient,
    subject: renderedEmail.subject,
    html: renderedEmail.html,
    text: renderedEmail.text,
  };
}

/**
 * Persists a provider result and calculates whether another
 * attempt should be scheduled.
 */
async function finishProviderResult(
  input: {
    tenantId: string;
    deliveryId: string;
    attemptNumber: number;
    now?: Date;
  },
  result: EmailProviderResult,
  repository: EmailDeliveryRepository,
): Promise<void> {
  const retryAllowed = !result.success && canRetryEmail(result.retryable, input.attemptNumber);

  await repository.finish({
    tenantId: input.tenantId,
    deliveryId: input.deliveryId,
    attemptNumber: input.attemptNumber,
    success: result.success,
    providerReference: result.providerReference,
    failureCode: result.failureCode,
    retryable: retryAllowed,
    nextAttemptAt: retryAllowed ? getNextEmailRetryAt(input.attemptNumber, input.now) : undefined,
  });
}

/**
 * Submits an already-prepared email through the provider.
 *
 * Provider exceptions are recorded as retryable failures
 * until the maximum attempt count is reached.
 */
async function submitClaimedEmail(
  input: {
    tenantId: string;
    deliveryId: string;
    attemptNumber: number;
    idempotencyKey: string;
    now?: Date;
  },
  email: PreparedInvoiceEmail,
  dependencies: EmailNotificationDependencies,
): Promise<EmailProviderResult> {
  let result: EmailProviderResult;

  try {
    result = await dependencies.provider.send({
      to: email.recipient,
      subject: email.subject,
      html: email.html,
      text: email.text,
      idempotencyKey: input.idempotencyKey,
    });
  } catch (error) {
    const retryable = canRetryEmail(true, input.attemptNumber);

    await dependencies.repository.finish({
      tenantId: input.tenantId,
      deliveryId: input.deliveryId,
      attemptNumber: input.attemptNumber,
      success: false,
      failureCode: "UNKNOWN_ERROR",
      retryable,
      nextAttemptAt: retryable ? getNextEmailRetryAt(input.attemptNumber, input.now) : undefined,
    });

    // Only wrap after the failure has been successfully recorded.
    // If repository.finish fails, its error will propagate instead.
    throw new EmailProviderSubmissionError("Email procider submission failed.", retryable);
  }

  await finishProviderResult(
    {
      tenantId: input.tenantId,
      deliveryId: input.deliveryId,
      attemptNumber: input.attemptNumber,
      now: input.now,
    },
    result,
    dependencies.repository,
  );

  return result;
}

/**
 * Sends a customer-facing invoice email.
 *
 * Responsibilities:
 * 1. Authorize tenant access.
 * 2. Load invoice and customer.
 * 3. Verify tenant ownership.
 * 4. Validate invoice status and recipient.
 * 5. Render the email template.
 * 6. Create or retrieve the delivery record.
 * 7. Claim and submit the email.
 * 8. Record the provider outcome and retry schedule.
 */
export async function sendInvoiceEmail(
  input: SendInvoiceEmailInput,
  dependencies: EmailNotificationDependencies = createDefaultDependencies(),
): Promise<EmailProviderResult> {
  await dependencies.authorizeTenant(input.tenantId);

  const email = await prepareInvoiceEmail(
    input.tenantId,
    input.invoiceId,
    input.eventType,
    dependencies,
  );

  const idempotencyKey = `${input.tenantId}:${input.invoiceId}:${input.eventType}`;

  const { delivery, created } = await dependencies.repository.createOrGet({
    tenantId: input.tenantId,
    invoiceId: input.invoiceId,
    eventType: input.eventType,
    idempotencyKey,
  });

  if (!created) {
    if (delivery.status === "sent") {
      return {
        success: true,
        providerReference: delivery.providerReference ?? undefined,
        retryable: false,
      };
    }

    throw new Error(`Email delivery already exists with status: ${delivery.status}`);
  }

  const claimed = await dependencies.repository.claim({
    tenantId: input.tenantId,
    deliveryId: delivery.id,
  });

  if (!claimed) {
    throw new Error("Email delivery could not be claimed.");
  }

  return submitClaimedEmail(
    {
      tenantId: input.tenantId,
      deliveryId: claimed.id,
      attemptNumber: claimed.attemptCount,
      idempotencyKey,
    },
    email,
    dependencies,
  );
}

/**
 * Processes scheduled email retries.
 *
 * This function is intended to be called by a trusted server-side
 * scheduled job or background worker, never directly by a browser.
 *
 * It first recovers stale deliveries, then claims due retries,
 * reloads invoice/customer data and submits each email.
 */
export async function processDueEmailRetries(
  options: {
    limit?: number;
    now?: Date;
  } = {},
  dependencies: EmailNotificationDependencies = createDefaultDependencies(),
): Promise<ProcessEmailRetriesResult> {
  const limit = options.limit ?? 25;
  const now = options.now ?? new Date();

  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Retry processing limit must be a positive integer.");
  }

  const staleBefore = new Date(now.getTime() - EMAIL_SENDING_STALE_AFTER_MS);

  const recovered = await dependencies.repository.recoverStaleDeliveries(staleBefore, now, limit);

  const claimedDeliveries = await dependencies.repository.claimDueRetries(limit, now);

  const summary: ProcessEmailRetriesResult = {
    recovered,
    claimed: claimedDeliveries.length,
    sent: 0,
    retrying: 0,
    failed: 0,
  };

  for (const delivery of claimedDeliveries) {
    let email: PreparedInvoiceEmail;

    // Prepare the email before attempting provider submission.
    try {
      email = await prepareInvoiceEmail(
        delivery.tenantId,
        delivery.invoiceId,
        delivery.eventType,
        dependencies,
      );
    } catch (error) {
      const isPreparationError = error instanceof EmailPreparationError;

      const retryable = !isPreparationError && canRetryEmail(true, delivery.attemptCount);

      await dependencies.repository.finish({
        tenantId: delivery.tenantId,
        deliveryId: delivery.id,
        attemptNumber: delivery.attemptCount,
        success: false,
        failureCode: isPreparationError ? error.failureCode : "UNKNOWN_ERROR",
        retryable,
        nextAttemptAt: retryable ? getNextEmailRetryAt(delivery.attemptCount, now) : undefined,
      });

      if (retryable) {
        summary.retrying += 1;
      } else {
        summary.failed += 1;
      }

      continue;
    }

    // Submit the prepared email.
    try {
      const result = await submitClaimedEmail(
        {
          tenantId: delivery.tenantId,
          deliveryId: delivery.id,
          attemptNumber: delivery.attemptCount,
          idempotencyKey: delivery.idempotencyKey,
          now,
        },
        email,
        dependencies,
      );

      if (result.success) {
        summary.sent += 1;
      } else if (canRetryEmail(result.retryable, delivery.attemptCount)) {
        summary.retrying += 1;
      } else {
        summary.failed += 1;
      }
    } catch (error) {
      if (error instanceof EmailProviderSubmissionError) {
        // This provider failure has already been recorded.
        // Do not call repository.finish() a second time.
        if (error.retryable) {
          summary.retrying += 1;
        } else {
          summary.failed += 1;
        }

        continue;
      }

      // Unexpected infrastructure or persistence errors must
      // propagate so the worker/scheduler can report the problem.
      throw error;
    }
  }

  return summary;
}
