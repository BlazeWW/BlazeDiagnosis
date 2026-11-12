import type {
  EmailNotificationEventType,
  EmailTemplatePayloadMap,
  RenderedEmail,
  InvoiceIssuedPayload,
  InvoiceOverduePayload,
} from "../types/email.types";

/**
 * Escape dynamic values before inserting them into HTML.
 * This prevents HTML injection from customer or invoice data.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Creates a consistent HTML email layout.
 */
function createHtmlEmail(heading: string, message: string, details: string[]): string {
  const safeHeading = escapeHtml(heading);
  const safeMessage = escapeHtml(message);

  const safeDetails = details.map((detail) => `<li>${escapeHtml(detail)}</li>`).join("");

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${safeHeading}</title>
      </head>
      <body style="margin:0;padding:20px;background-color:#f4f4f4;font-family:Arial,sans-serif;">
        <main style="max-width:600px;margin:auto;padding:30px;background-color:#ffffff;border-radius:8px;">
          <h1 style="color:#1f2937;">${safeHeading}</h1>
          <p>${safeMessage}</p>
          <ul>${safeDetails}</ul>
          <p>Kind regards,<br />Blaze Diagnostics</p>
        </main>
      </body>
    </html>
  `;
}

/**
 * Renders a customer invoice notification.
 *
 * Only approved customer-facing information is accepted.
 */
export function renderInvoiceEmail<T extends EmailNotificationEventType>(
  eventType: T,
  payload: EmailTemplatePayloadMap[T],
): RenderedEmail {
  const customerName = payload.customerName;
  const invoiceNumber = payload.invoiceNumber;
  const amount = `${payload.currency} ${payload.amount}`;

  switch (eventType) {
    case "invoice_issued": {
      const invoice = payload as InvoiceIssuedPayload;

      const subject = `Invoice ${invoiceNumber} issued`;

      const message = `Hello ${customerName}, your invoice has been issued and is ready for payment.`;

      const details = [
        `Invoice number: ${invoiceNumber}`,
        `Amount due: ${amount}`,
        `Due date: ${invoice.dueDate}`,
      ];

      return {
        subject,
        html: createHtmlEmail("Your invoice has been issued", message, details),
        text: [
          "Your invoice has been issued",
          "",
          message,
          "",
          ...details,
          "",
          "Kind regards,",
          "Blaze Diagnostics",
        ].join("\n"),
      };
    }

    case "invoice_paid": {
      const subject = `Payment received for invoice ${invoiceNumber}`;

      const message = `Hello ${customerName}, we have received your payment. Thank you.`;

      const details = [`Invoice number: ${invoiceNumber}`, `Amount paid: ${amount}`];

      return {
        subject,
        html: createHtmlEmail("Payment received", message, details),
        text: [
          "Payment received",
          "",
          message,
          "",
          ...details,
          "",
          "Kind regards,",
          "Blaze Diagnostics",
        ].join("\n"),
      };
    }

    case "invoice_overdue": {
      const invoice = payload as InvoiceOverduePayload;

      const subject = `Payment reminder: invoice ${invoiceNumber}`;

      const message = `Hello ${customerName}, our records indicate that your invoice is overdue.`;

      const details = [
        `Invoice number: ${invoiceNumber}`,
        `Outstanding amount: ${amount}`,
        `Original due date: ${invoice.dueDate}`,
      ];

      return {
        subject,
        html: createHtmlEmail("Invoice payment reminder", message, details),
        text: [
          "Invoice payment reminder",
          "",
          message,
          "",
          ...details,
          "",
          "Kind regards,",
          "Blaze Diagnostics",
        ].join("\n"),
      };
    }

    default: {
      const unsupportedEvent: never = eventType;
      throw new Error(`Unsupported email event: ${unsupportedEvent}`);
    }
  }
}
