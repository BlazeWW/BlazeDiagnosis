import { describe, expect, it, vi } from "vitest";

import { MockEmailProviderAdapter } from "../adapters/mock-email.adapter";

import {
  sendInvoiceEmail,
  type EmailNotificationDependencies,
} from "../services/email-notification.service";

import { INVOICE_A, INVOICE_B, TENANT_A } from "./fixtures";

describe("Email Notification Service", () => {
  function createDependencies(invoice = INVOICE_A) {
    const provider = new MockEmailProviderAdapter();

    const dependencies: EmailNotificationDependencies = {
      authorizeTenant: vi.fn().mockResolvedValue(undefined),
      loadInvoice: vi.fn().mockResolvedValue(invoice),
      provider,
    };

    return {
      dependencies,
      provider,
    };
  }

  it("sends an invoice issued email successfully", async () => {
    const { dependencies, provider } = createDependencies();

    const result = await sendInvoiceEmail(
      {
        tenantId: TENANT_A,
        invoiceId: INVOICE_A.id,
        eventType: "invoice_issued",
      },
      dependencies,
    );

    expect(result.success).toBe(true);
    expect(provider.sentEmails).toHaveLength(1);

    expect(provider.sentEmails[0].to).toBe("john@example.com");

    expect(provider.sentEmails[0].subject).toBe("Invoice INV-001 issued");
  });

  it("authorizes the tenant before loading the invoice", async () => {
    const { dependencies } = createDependencies();

    await sendInvoiceEmail(
      {
        tenantId: TENANT_A,
        invoiceId: INVOICE_A.id,
        eventType: "invoice_issued",
      },
      dependencies,
    );

    expect(dependencies.authorizeTenant).toHaveBeenCalledWith(TENANT_A);

    expect(dependencies.authorizeTenant.mock.invocationCallOrder[0]).toBeLessThan(
      dependencies.loadInvoice.mock.invocationCallOrder[0],
    );
  });

  it("rejects an invoice that does not exist", async () => {
    const { dependencies } = createDependencies();

    vi.mocked(dependencies.loadInvoice).mockResolvedValue(null);

    await expect(
      sendInvoiceEmail(
        {
          tenantId: TENANT_A,
          invoiceId: "missing-invoice",
          eventType: "invoice_issued",
        },
        dependencies,
      ),
    ).rejects.toThrow("Invoice not found.");
  });

  it("rejects cross-tenant invoice access", async () => {
    const { dependencies, provider } = createDependencies(INVOICE_B);

    await expect(
      sendInvoiceEmail(
        {
          tenantId: TENANT_A,
          invoiceId: INVOICE_B.id,
          eventType: "invoice_issued",
        },
        dependencies,
      ),
    ).rejects.toThrow("Cross-tenant access denied.");

    expect(provider.sentEmails).toHaveLength(0);
  });

  it("rejects an invoice without a customer email", async () => {
    const invoice = {
      ...INVOICE_A,
      customer: {
        ...INVOICE_A.customer,
        email: null,
      },
    };

    const { dependencies, provider } = createDependencies(invoice);

    await expect(
      sendInvoiceEmail(
        {
          tenantId: TENANT_A,
          invoiceId: invoice.id,
          eventType: "invoice_issued",
        },
        dependencies,
      ),
    ).rejects.toThrow("Customer email address is missing.");

    expect(provider.sentEmails).toHaveLength(0);
  });

  it("rejects an invalid customer email address", async () => {
    const invoice = {
      ...INVOICE_A,
      customer: {
        ...INVOICE_A.customer,
        email: "invalid-email",
      },
    };

    const { dependencies, provider } = createDependencies(invoice);

    await expect(
      sendInvoiceEmail(
        {
          tenantId: TENANT_A,
          invoiceId: invoice.id,
          eventType: "invoice_issued",
        },
        dependencies,
      ),
    ).rejects.toThrow("Customer email address is invalid.");

    expect(provider.sentEmails).toHaveLength(0);
  });

  it("rejects an invoice with an incorrect status", async () => {
    const invoice = {
      ...INVOICE_A,
      status: "draft",
    };

    const { dependencies, provider } = createDependencies(invoice);

    await expect(
      sendInvoiceEmail(
        {
          tenantId: TENANT_A,
          invoiceId: invoice.id,
          eventType: "invoice_issued",
        },
        dependencies,
      ),
    ).rejects.toThrow("Cannot send invoice_issued email for invoice status: draft");

    expect(provider.sentEmails).toHaveLength(0);
  });

  it("rejects unauthorized tenant access", async () => {
    const { dependencies, provider } = createDependencies();

    vi.mocked(dependencies.authorizeTenant).mockRejectedValue(
      new Error("Unauthorized tenant access"),
    );

    await expect(
      sendInvoiceEmail(
        {
          tenantId: TENANT_A,
          invoiceId: INVOICE_A.id,
          eventType: "invoice_issued",
        },
        dependencies,
      ),
    ).rejects.toThrow("Unauthorized tenant access");

    expect(dependencies.loadInvoice).not.toHaveBeenCalled();
    expect(provider.sentEmails).toHaveLength(0);
  });

  it("uses the correct invoice idempotency key", async () => {
    const { dependencies, provider } = createDependencies();

    await sendInvoiceEmail(
      {
        tenantId: TENANT_A,
        invoiceId: INVOICE_A.id,
        eventType: "invoice_issued",
      },
      dependencies,
    );

    expect(provider.sentEmails[0].idempotencyKey).toBe(
      `${TENANT_A}:${INVOICE_A.id}:invoice_issued`,
    );
  });

  it("returns provider failures without pretending delivery succeeded", async () => {
    const provider = new MockEmailProviderAdapter([
      {
        success: false,
        failureCode: "PROVIDER_TEMPORARY_FAILURE",
        retryable: true,
      },
    ]);

    const dependencies: EmailNotificationDependencies = {
      authorizeTenant: vi.fn().mockResolvedValue(undefined),
      loadInvoice: vi.fn().mockResolvedValue(INVOICE_A),
      provider,
    };

    const result = await sendInvoiceEmail(
      {
        tenantId: TENANT_A,
        invoiceId: INVOICE_A.id,
        eventType: "invoice_issued",
      },
      dependencies,
    );

    expect(result.success).toBe(false);
    expect(result.retryable).toBe(true);
    expect(result.failureCode).toBe("PROVIDER_TEMPORARY_FAILURE");
  });
});
