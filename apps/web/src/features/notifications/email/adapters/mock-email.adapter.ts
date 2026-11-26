import type { EmailProviderInput, EmailProviderResult } from "../types/email.types";

import type { EmailProvider } from "./email-provider.interface";

/**
 * Mock email provider.
 *
 * This adapter does not send real emails.
 * It simulates provider responses for development and testing.
 */
export class MockEmailProviderAdapter implements EmailProvider {
  /**
   * Stores submitted messages for local testing.
   *
   * Do not use this as production delivery logging.
   */
  readonly sentEmails: EmailProviderInput[] = [];

  private responseIndex = 0;

  constructor(private readonly responses: EmailProviderResult[] = []) {}

  /**
   * Simulates sending an email.
   *
   * If a response has been configured, it returns that response.
   * Otherwise, it simulates successful delivery.
   */
  async send(input: EmailProviderInput): Promise<EmailProviderResult> {
    this.sentEmails.push({ ...input });

    const configuredResponse = this.responses[this.responseIndex];

    this.responseIndex++;

    if (configuredResponse) {
      return { ...configuredResponse };
    }

    return {
      success: true,
      providerReference: `mock-${this.sentEmails.length}`,
      retryable: false,
    };
  }
}
