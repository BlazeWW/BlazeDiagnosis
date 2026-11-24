import { timingSafeEqual } from "node:crypto";

import { apiError, apiOk } from "@/lib/api/response";
import { processDueEmailRetries } from "@/features/notifications/email/services/email-notification.service";

export const runtime = "nodejs";

const routeName = "/api/internal/email-retries";
const DEFAULT_BATCH_SIZE = 25;

function isAuthorized(request: Request): boolean {
  const expectedSecret = process.env.EMAIL_RETRY_CRON_SECRET;

  if (!expectedSecret) {
    console.error(`${routeName}: EMAIL_RETRY_CRON_SECRET is not configured.`);
    return false;
  }

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return false;
  }

  const suppliedSecret = authorization.slice("Bearer ".length);

  const expectedBuffer = Buffer.from(expectedSecret);
  const suppliedBuffer = Buffer.from(suppliedSecret);

  if (expectedBuffer.length !== suppliedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return apiError("FORBIDDEN", "Unauthorized.", 403);
  }

  try {
    const result = await processDueEmailRetries({
      limit: DEFAULT_BATCH_SIZE,
    });

    return apiOk({
      message: "Email retry processing completed.",
      ...result,
    });
  } catch (error) {
    console.error(`${routeName} failed:`, error);

    return apiError("INTERNAL_SERVER_ERROR", "Email retry processing failed.", 500);
  }
}
