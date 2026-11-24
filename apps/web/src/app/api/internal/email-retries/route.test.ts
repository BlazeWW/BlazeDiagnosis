import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { processDueEmailRetries } = vi.hoisted(() => ({
  processDueEmailRetries: vi.fn(),
}));

vi.mock("@/features/notifications/email/services/email-notification.service", () => ({
  processDueEmailRetries,
}));

vi.mock("@/lib/authorization/guards", () => ({
  TenantAccessError: class TenantAccessError extends Error {},
}));

import { POST } from "./route";

const TEST_SECRET = "test-email-retry-secret";

describe("POST /api/internal/email-retries", () => {
  beforeEach(() => {
    vi.stubEnv("EMAIL_RETRY_CRON_SECRET", TEST_SECRET);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("rejects requests without authorization", async () => {
    const request = new Request("http://localhost/api/internal/email-retries", { method: "POST" });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(processDueEmailRetries).not.toHaveBeenCalled();
  });

  it("rejects requests with an invalid secret", async () => {
    const request = new Request("http://localhost/api/internal/email-retries", {
      method: "POST",
      headers: {
        authorization: "Bearer incorrect-secret",
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(processDueEmailRetries).not.toHaveBeenCalled();
  });

  it("rejects requests when the cron secret is not configured", async () => {
    vi.stubEnv("EMAIL_RETRY_CRON_SECRET", "");

    const request = new Request("http://localhost/api/internal/email-retries", {
      method: "POST",
      headers: {
        authorization: `Bearer ${TEST_SECRET}`,
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(processDueEmailRetries).not.toHaveBeenCalled();
  });

  it("processes retries when the correct secret is supplied", async () => {
    processDueEmailRetries.mockResolvedValue({
      recovered: 1,
      claimed: 3,
      sent: 2,
      retrying: 1,
      failed: 0,
    });

    const request = new Request("http://localhost/api/internal/email-retries", {
      method: "POST",
      headers: {
        authorization: `Bearer ${TEST_SECRET}`,
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      message: "Email retry processing completed.",
      recovered: 1,
      claimed: 3,
      sent: 2,
      retrying: 1,
      failed: 0,
    });

    expect(processDueEmailRetries).toHaveBeenCalledWith({
      limit: 25,
    });
  });

  it("returns a safe server error when retry processing fails", async () => {
    processDueEmailRetries.mockRejectedValue(new Error("Database connection failed"));

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = new Request("http://localhost/api/internal/email-retries", {
      method: "POST",
      headers: {
        authorization: `Bearer ${TEST_SECRET}`,
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe("Email retry processing failed.");
    expect(JSON.stringify(body)).not.toContain("Database connection failed");

    expect(consoleError).toHaveBeenCalled();
  });
});
