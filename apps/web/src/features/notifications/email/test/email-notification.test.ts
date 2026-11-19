import { describe, expect, it, vi } from "vitest";

import { MockEmailProviderAdapter } from "../adapters/mock-email.adapter";
import type { EmailProvider } from "../adapters/email-provider.interface";
import type { EmailDeliveryRepository } from "../repositories/email-delivery.repository";

import {
  processDueEmailRetries,
  sendInvoiceEmail,
  type EmailNotificationDependencies,
} from "../services/email-notification.service";

import { INVOICE_A, INVOICE_B, TENANT_A } from "./fixtures";

describe("Email Notification Service", () => {
  function createDependencies(invoice = INVOICE_A, provider = new MockEmailProviderAdapter()) {
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

      recoverStaleDeliveries: vi.fn().mockResolvedValue(0),

      claimDueRetries: vi.fn().mockResolvedValue([]),
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

  const dueDelivery = {
    id: "delivery-retry-001",
    tenantId: TENANT_A,
    invoiceId: INVOICE_A.id,
    eventType: "invoice_issued" as const,
    idempotencyKey: `${TENANT_A}:${INVOICE_A.id}:invoice_issued`,
    attemptCount: 2,
  };

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

    const { dependencies, repository } = createDependencies(INVOICE_A, provider);

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

  // Retry worker tests

  it("processes a due retry successfully", async () => {
    const { dependencies, provider, repository } = createDependencies();

    const now = new Date("2026-11-19T12:00:00.000Z");

    vi.mocked(repository.claimDueRetries).mockResolvedValue([dueDelivery] as never);

    vi.mocked(repository.recoverStaleDeliveries).mockResolvedValue(2);

    const result = await processDueEmailRetries({ limit: 10, now }, dependencies);

    expect(result).toEqual({
      recovered: 2,
      claimed: 1,
      sent: 1,
      retrying: 0,
      failed: 0,
    });

    expect(repository.recoverStaleDeliveries).toHaveBeenCalledWith(
      new Date(now.getTime() - 10 * 60 * 1000),
      now,
      10,
    );

    expect(repository.claimDueRetries).toHaveBeenCalledWith(10, now);

    expect(provider.sentEmails).toHaveLength(1);

    expect(provider.sentEmails[0].idempotencyKey).toBe(dueDelivery.idempotencyKey);

    expect(repository.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_A,
        deliveryId: dueDelivery.id,
        attemptNumber: 2,
        success: true,
      }),
    );
  });

  it("schedules another retry after a temporary provider failure", async () => {
    const provider = new MockEmailProviderAdapter([
      {
        success: false,
        failureCode: "PROVIDER_TEMPORARY_FAILURE",
        retryable: true,
      },
    ]);

    const { dependencies, repository } = createDependencies(INVOICE_A, provider);

    const now = new Date("2026-11-19T12:00:00.000Z");

    vi.mocked(repository.claimDueRetries).mockResolvedValue([dueDelivery] as never);

    const result = await processDueEmailRetries({ now }, dependencies);

    expect(result.retrying).toBe(1);
    expect(result.failed).toBe(0);

    expect(repository.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_A,
        deliveryId: dueDelivery.id,
        attemptNumber: 2,
        success: false,
        failureCode: "PROVIDER_TEMPORARY_FAILURE",
        retryable: true,
        nextAttemptAt: new Date(now.getTime() + 2 * 60 * 1000),
      }),
    );
  });

  it("marks a permanent provider failure as failed", async () => {
    const provider = new MockEmailProviderAdapter([
      {
        success: false,
        failureCode: "PROVIDER_PERMANENT_FAILURE",
        retryable: false,
      },
    ]);

    const { dependencies, repository } = createDependencies(INVOICE_A, provider);

    vi.mocked(repository.claimDueRetries).mockResolvedValue([dueDelivery] as never);

    const result = await processDueEmailRetries({}, dependencies);

    expect(result.failed).toBe(1);
    expect(result.retrying).toBe(0);

    expect(repository.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        failureCode: "PROVIDER_PERMANENT_FAILURE",
        retryable: false,
        nextAttemptAt: undefined,
      }),
    );
  });

  it("records a provider exception only once", async () => {
    const { dependencies, repository } = createDependencies();

    const throwingProvider = {
      send: vi.fn().mockRejectedValue(new Error("Provider connection failed")),
    };

    dependencies.provider = throwingProvider as unknown as EmailProvider;

    vi.mocked(repository.claimDueRetries).mockResolvedValue([dueDelivery] as never);

    const result = await processDueEmailRetries({}, dependencies);

    expect(result.retrying).toBe(1);
    expect(result.failed).toBe(0);

    expect(repository.finish).toHaveBeenCalledOnce();

    expect(repository.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_A,
        deliveryId: dueDelivery.id,
        attemptNumber: 2,
        success: false,
        failureCode: "UNKNOWN_ERROR",
        retryable: true,
      }),
    );
  });

  it("does not retry an invoice preparation failure", async () => {
    const { dependencies, provider, loadInvoice, repository } = createDependencies();

    vi.mocked(loadInvoice).mockResolvedValue(null);

    vi.mocked(repository.claimDueRetries).mockResolvedValue([dueDelivery] as never);

    const result = await processDueEmailRetries({}, dependencies);

    expect(result.failed).toBe(1);
    expect(result.retrying).toBe(0);

    expect(provider.sentEmails).toHaveLength(0);

    expect(repository.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        failureCode: "TEMPLATE_VALIDATION_FAILED",
        retryable: false,
        nextAttemptAt: undefined,
      }),
    );
  });

  it("retries an unexpected invoice preparation error", async () => {
    const { dependencies, loadInvoice, repository } = createDependencies();

    const now = new Date("2026-11-19T12:00:00.000Z");

    vi.mocked(loadInvoice).mockRejectedValue(new Error("Temporary database connection failure"));

    vi.mocked(repository.claimDueRetries).mockResolvedValue([dueDelivery] as never);

    const result = await processDueEmailRetries({ now }, dependencies);

    expect(result.retrying).toBe(1);
    expect(result.failed).toBe(0);

    expect(repository.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        failureCode: "UNKNOWN_ERROR",
        retryable: true,
        nextAttemptAt: new Date(now.getTime() + 2 * 60 * 1000),
      }),
    );
  });
});
