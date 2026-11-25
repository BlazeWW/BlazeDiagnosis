import type { EmailProviderInput, EmailProviderResult } from "../types/email.types";

/**
 * Contract that every email provider must follow.
 *
 * Future providers such as Resend or SendGrid must implement
 * this interface.
 */
export interface EmailProvider {
  send(input: EmailProviderInput): Promise<EmailProviderResult>;
}
