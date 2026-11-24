export const MAX_EMAIL_DELIVERY_ATTEMPTS = 5;

export const EMAIL_RETRY_BASE_DELAY_MS = 60 * 1000;

export const EMAIL_RETRY_MAX_DELAY_MS = 60 * 60 * 1000;

export const EMAIL_SENDING_STALE_AFTER_MS = 10 * 60 * 1000;

/**
 * Calculates exponential backoff for an email delivery attempt.
 *
 * Attempt 1: 1 minute
 * Attempt 2: 2 minutes
 * Attempt 3: 4 minutes
 * Attempt 4: 8 minutes
 * Attempt 5: 16 minutes
 *
 * The delay is capped at one hour.
 */
export function getEmailRetryDelayMs(attemptNumber: number): number {
  if (!Number.isInteger(attemptNumber) || attemptNumber < 1) {
    throw new Error("Attempt number must be a positive integer.");
  }

  const delay = EMAIL_RETRY_BASE_DELAY_MS * 2 ** (attemptNumber - 1);

  return Math.min(delay, EMAIL_RETRY_MAX_DELAY_MS);
}

/**
 * Determines whether a failed delivery can be retried.
 *
 * The maximum includes the initial delivery attempt.
 */
export function canRetryEmail(retryable: boolean, attemptNumber: number): boolean {
  return (
    retryable &&
    Number.isInteger(attemptNumber) &&
    attemptNumber >= 1 &&
    attemptNumber < MAX_EMAIL_DELIVERY_ATTEMPTS
  );
}

/**
 * Calculates when the next retry should be attempted.
 */
export function getNextEmailRetryAt(attemptNumber: number, now: Date = new Date()): Date {
  return new Date(now.getTime() + getEmailRetryDelayMs(attemptNumber));
}
