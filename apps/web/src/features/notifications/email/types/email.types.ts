export type EmailNotificationEventType = "invoice_issued" | "invoice_paid" | "invoice_overdue";

export type EmailDeliveryStatus = "queued" | "sending" | "retrying" | "sent" | "failed";

export type EmailFailureCode =
  | "INVALID_RECIPIENT"
  | "TEMPLATE_VALIDATION_FAILED"
  | "PROVIDER_TEMPORARY_FAILURE"
  | "PROVIDER_PERMANENT_FAILURE"
  | "TENANT_SCOPE_MISMATCH"
  | "MAX_RETRIES_EXCEEDED"
  | "UNKNOWN_ERROR";

/**
 * Shared customer-facing invoice information.
 *
 * Internal notes, supplier information and credentials
 * must never be added to this DTO.
 */
export interface InvoiceEmailPayload {
  customerName: string;
  invoiceNumber: string;
  amount: string;
  currency: string;
}

/**
 * Additional information required when an invoice is issued.
 */
export interface InvoiceIssuedPayload extends InvoiceEmailPayload {
  dueDate: string;
}

/**
 * Additional information required when an invoice is overdue.
 */
export interface InvoiceOverduePayload extends InvoiceEmailPayload {
  dueDate: string;
}

/**
 * Fixed payload contract for supported email events.
 */
export interface EmailTemplatePayloadMap {
  invoice_issued: InvoiceIssuedPayload;
  invoice_paid: InvoiceEmailPayload;
  invoice_overdue: InvoiceOverduePayload;
}

/**
 * Template rendering result.
 */
export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Standard provider input.
 *
 * The recipient will eventually be resolved and validated
 * by the server-side notification service.
 */
export interface EmailProviderInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}

/**
 * Standard provider response.
 */
export interface EmailProviderResult {
  success: boolean;
  providerReference?: string;
  failureCode?: EmailFailureCode;
  retryable: boolean;
}
