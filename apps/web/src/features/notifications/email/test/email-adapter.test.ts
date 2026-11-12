import { describe, expect, it } from "vitest";

import { MockEmailProviderAdapter } from "../adapters/mock-email.adapter";

describe("MockEmailProviderAdapter", () => {
  const emailInput = {
    to: "customer@example.com",
    subject: "Your invoice has been issued",
    html: "<h1>Invoice issued</h1>",
    text: "Your invoice has been issued.",
    idempotencyKey: "invoice-001-issued",
  };

  it("simulates successful email delivery", async () => {
    const provider = new MockEmailProviderAdapter();

    const result = await provider.send(emailInput);

    expect(result.success).toBe(true);
    expect(result.providerReference).toBe("mock-1");
    expect(result.retryable).toBe(false);
  });

  it("simulates a temporary provider failure", async () => {
    const provider = new MockEmailProviderAdapter([
      {
        success: false,
        failureCode: "PROVIDER_TEMPORARY_FAILURE",
        retryable: true,
      },
    ]);

    const result = await provider.send(emailInput);

    expect(result.success).toBe(false);

    expect(result.failureCode).toBe("PROVIDER_TEMPORARY_FAILURE");

    expect(result.retryable).toBe(true);
  });

  it("simulates a permanent provider failure", async () => {
    const provider = new MockEmailProviderAdapter([
      {
        success: false,
        failureCode: "PROVIDER_PERMANENT_FAILURE",
        retryable: false,
      },
    ]);

    const result = await provider.send(emailInput);

    expect(result.success).toBe(false);

    expect(result.failureCode).toBe("PROVIDER_PERMANENT_FAILURE");

    expect(result.retryable).toBe(false);
  });

  it("records submitted emails for testing", async () => {
    const provider = new MockEmailProviderAdapter();

    await provider.send(emailInput);

    expect(provider.sentEmails).toHaveLength(1);

    expect(provider.sentEmails[0].to).toBe("customer@example.com");

    expect(provider.sentEmails[0].subject).toBe("Your invoice has been issued");
  });

  it("supports multiple email submissions", async () => {
    const provider = new MockEmailProviderAdapter();

    await provider.send(emailInput);

    await provider.send({
      ...emailInput,
      to: "another-customer@example.com",
    });

    expect(provider.sentEmails).toHaveLength(2);
  });

  it("uses configured responses in sequence", async () => {
    const provider = new MockEmailProviderAdapter([
      {
        success: false,
        failureCode: "PROVIDER_TEMPORARY_FAILURE",
        retryable: true,
      },
      {
        success: true,
        providerReference: "recovered-001",
        retryable: false,
      },
    ]);

    const firstResult = await provider.send(emailInput);
    const secondResult = await provider.send(emailInput);

    expect(firstResult.success).toBe(false);
    expect(secondResult.success).toBe(true);

    expect(secondResult.providerReference).toBe("recovered-001");
  });
});
