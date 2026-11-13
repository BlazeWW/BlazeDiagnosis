import { describe, expect, it, vi } from "vitest";

import { MockEmailProviderAdapter } from "../adapters/mock-email.adapter";
import type { EmailDeliveryRepository } from "../repositories/email-delivery.repository";

import {
  sendInvoiceEmail,
  type EmailNotificationDependencies,
} from "../services/email-notification.service";

import { INVOICE_A, INVOICE_B, TENANT_A } from "./fixtures";

describe("Email Notification Service", () => {
  function createDependencies(invoice = INVOICE_A) {
    const provider = new MockEmailProviderAdapter();

    const authorizeTenant = vi.fn().mockResolvedValue(undefined);
    const loadInvoice = vi.fn().mockResolvedValue(invoice);

    const repository = {
      createOrGet: vi.fn().mockResolvedValue({
        created: true,
        delivery: {
          id: "delivery-001",
          status: "queued",
          attemptCount: 0,
          providerReference: null,
          failureCode: null,
        },
      }),

      claim: vi.fn().mockResolvedValue({
        id: "delivery-001",
        status: "sending",
        attemptCount: 1,
      }),

      finish: vi.fn().mockResolvedValue(undefined),
    } as unknown as EmailDeliveryRepository;

    const dependencies: EmailNotificationDependencies = {
      authorizeTenant,
      loadInvoice,
      provider,
      repository,
    };

    return {
      dependencies,
      provider,
      authorizeTenant,
      loadInvoice,
      repository,
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
    const { dependencies, authorizeTenant, loadInvoice } = createDependencies();

    await sendInvoiceEmail(
      {
        tenantId: TENANT_A,
        invoiceId: INVOICE_A.id,
        eventType: "invoice_issued",
      },
      dependencies,
    );

    expect(authorizeTenant).toHaveBeenCalledWith(TENANT_A);

    expect(authorizeTenant.mock.invocationCallOrder[0]).toBeLessThan(
      loadInvoice.mock.invocationCallOrder[0],
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

    const repository = {
      createOrGet: vi.fn().mockResolvedValue({
        created: true,
        delivery: {
          id: "delivery-001",
          status: "queued",
          attemptCount: 0,
          providerReference: null,
          failureCode: null,
        },
      }),

      claim: vi.fn().mockResolvedValue({
        id: "delivery-001",
        status: "sending",
        attemptCount: 1,
      }),

      finish: vi.fn().mockResolvedValue(undefined),
    } as unknown as EmailDeliveryRepository;

    const dependencies: EmailNotificationDependencies = {
      authorizeTenant: vi.fn().mockResolvedValue(undefined),
      loadInvoice: vi.fn().mockResolvedValue(INVOICE_A),
      provider,
      repository,
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
    expect(repository.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        failureCode: "PROVIDER_TEMPORARY_FAILURE",
        attemptNumber: 1,
      }),
    );
  });

  it("records a successful delivery and its attempt", async () => {
    const { dependencies, repository } = createDependencies();

    const result = await sendInvoiceEmail(
      {
        tenantId: TENANT_A,
        invoiceId: INVOICE_A.id,
        eventType: "invoice_issued",
      },
      dependencies,
    );

    expect(result.success).toBe(true);
    expect(repository.createOrGet).toHaveBeenCalledOnce();
    expect(repository.claim).toHaveBeenCalledOnce();

    expect(repository.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_A,
        deliveryId: "delivery-001",
        attemptNumber: 1,
        success: true,
      }),
    );
  });

  it("does not send an email when a delivery already exists", async () => {
    const { dependencies, provider, repository } = createDependencies();

    vi.mocked(repository.createOrGet).mockResolvedValue({
      created: false,
      delivery: {
        id: "delivery-001",
        status: "sent",
        attemptCount: 1,
        providerReference: "mock-1",
        failureCode: null,
      },
    } as Awaited<ReturnType<EmailDeliveryRepository["createOrGet"]>>);

    const result = await sendInvoiceEmail(
      {
        tenantId: TENANT_A,
        invoiceId: INVOICE_A.id,
        eventType: "invoice_issued",
      },
      dependencies,
    );

    expect(result.success).toBe(true);
    expect(result.providerReference).toBe("mock-1");
    expect(provider.sentEmails).toHaveLength(0);
    expect(repository.claim).not.toHaveBeenCalled();
  });
});
