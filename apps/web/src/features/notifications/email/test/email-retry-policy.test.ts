import { describe, expect, it } from "vitest";

import {
  canRetryEmail,
  getEmailRetryDelayMs,
  getNextEmailRetryAt,
  MAX_EMAIL_DELIVERY_ATTEMPTS,
} from "../services/email-retry-policy";

describe("Email Retry Policy", () => {
  it("uses exponential backoff", () => {
    expect(getEmailRetryDelayMs(1)).toBe(60_000);
    expect(getEmailRetryDelayMs(2)).toBe(120_000);
    expect(getEmailRetryDelayMs(3)).toBe(240_000);
    expect(getEmailRetryDelayMs(4)).toBe(480_000);
  });

  it("caps retry delays at one hour", () => {
    expect(getEmailRetryDelayMs(10)).toBe(3_600_000);
  });

  it("rejects invalid attempt numbers", () => {
    expect(() => getEmailRetryDelayMs(0)).toThrow();
    expect(() => getEmailRetryDelayMs(-1)).toThrow();
    expect(() => getEmailRetryDelayMs(1.5)).toThrow();
  });

  it("allows retryable failures before the maximum attempt", () => {
    expect(canRetryEmail(true, 1)).toBe(true);
    expect(canRetryEmail(true, 4)).toBe(true);
  });

  it("does not retry permanent failures", () => {
    expect(canRetryEmail(false, 1)).toBe(false);
  });

  it("does not retry after the maximum attempts", () => {
    expect(canRetryEmail(true, MAX_EMAIL_DELIVERY_ATTEMPTS)).toBe(false);
  });

  it("calculates the next retry timestamp", () => {
    const now = new Date("2026-11-18T10:00:00.000Z");

    expect(getNextEmailRetryAt(1, now)).toEqual(new Date("2026-11-18T10:01:00.000Z"));
  });
});
