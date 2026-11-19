import { and, asc, eq, lte, sql } from "drizzle-orm";

import { emailDeliveries, emailDeliveryAttempts } from "@/db/schema";

import type { EmailFailureCode, EmailNotificationEventType } from "../types/email.types";

import { canRetryEmail, getNextEmailRetryAt } from "../services/email-retry-policy";

type EmailDeliveryRecord = typeof emailDeliveries.$inferSelect;

interface CreateOrGetDeliveryInput {
  tenantId: string;
  invoiceId: string;
  eventType: EmailNotificationEventType;
  idempotencyKey: string;
}

interface ClaimDeliveryInput {
  tenantId: string;
  deliveryId: string;
}

interface FinishDeliveryInput {
  tenantId: string;
  deliveryId: string;
  attemptNumber: number;
  success: boolean;
  providerReference?: string;
  failureCode?: EmailFailureCode;
  retryable?: boolean;
  nextAttemptAt?: Date;
}

export interface EmailDeliveryRepository {
  createOrGet(
    input: CreateOrGetDeliveryInput,
  ): Promise<{ delivery: EmailDeliveryRecord; created: boolean }>;

  claim(input: ClaimDeliveryInput): Promise<EmailDeliveryRecord | null>;

  finish(input: FinishDeliveryInput): Promise<void>;

  claimDueRetries(limit?: number, now?: Date): Promise<EmailDeliveryRecord[]>;

  recoverStaleDeliveries(staleBefore: Date, now?: Date, limit?: number): Promise<number>;
}

/**
 * Database-backed email delivery repository.
 *
 * Database imports are lazy so importing this repository
 * does not initialize the database connection.
 */
export const emailDeliveryRepository: EmailDeliveryRepository = {
  async createOrGet(input) {
    const { db } = await import("@/db/client");

    const [inserted] = await db
      .insert(emailDeliveries)
      .values({
        tenantId: input.tenantId,
        invoiceId: input.invoiceId,
        eventType: input.eventType,
        idempotencyKey: input.idempotencyKey,
        status: "queued",
      })
      .onConflictDoNothing({
        target: [emailDeliveries.tenantId, emailDeliveries.idempotencyKey],
      })
      .returning();

    if (inserted) {
      return { delivery: inserted, created: true };
    }

    const [existing] = await db
      .select()
      .from(emailDeliveries)
      .where(
        and(
          eq(emailDeliveries.tenantId, input.tenantId),
          eq(emailDeliveries.idempotencyKey, input.idempotencyKey),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new Error("Email delivery could not be retrieved after conflict.");
    }

    if (existing.invoiceId !== input.invoiceId || existing.eventType !== input.eventType) {
      throw new Error("Email delivery idempotency key conflict.");
    }

    return { delivery: existing, created: false };
  },

  async claim(input) {
    const { db } = await import("@/db/client");

    const [claimed] = await db
      .update(emailDeliveries)
      .set({
        status: "sending",
        attemptCount: sql`${emailDeliveries.attemptCount} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(emailDeliveries.id, input.deliveryId),
          eq(emailDeliveries.tenantId, input.tenantId),
          eq(emailDeliveries.status, "queued"),
        ),
      )
      .returning();

    return claimed ?? null;
  },

  async finish(input) {
    const { db } = await import("@/db/client");

    const nextStatus = input.success
      ? "sent"
      : input.retryable && input.nextAttemptAt
        ? "retrying"
        : "failed";

    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(emailDeliveries)
        .set({
          status: nextStatus,
          providerReference: input.providerReference ?? null,
          failureCode: input.success ? null : (input.failureCode ?? "UNKNOWN_ERROR"),
          sentAt: input.success ? new Date() : null,
          nextAttemptAt: nextStatus === "retrying" ? input.nextAttemptAt! : null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(emailDeliveries.id, input.deliveryId),
            eq(emailDeliveries.tenantId, input.tenantId),
            eq(emailDeliveries.status, "sending"),
            eq(emailDeliveries.attemptCount, input.attemptNumber),
          ),
        )
        .returning({ id: emailDeliveries.id });

      if (!updated) {
        throw new Error("Email delivery could not be updated for this attempt.");
      }

      await tx.insert(emailDeliveryAttempts).values({
        deliveryId: input.deliveryId,
        tenantId: input.tenantId,
        attemptNumber: input.attemptNumber,
        status: input.success ? "succeeded" : "failed",
        providerReference: input.providerReference ?? null,
        failureCode: input.success ? null : (input.failureCode ?? "UNKNOWN_ERROR"),
      });
    });
  },

  /**
   * Atomically claims retrying deliveries whose scheduled time has arrived.
   *
   * SKIP LOCKED allows multiple workers to process separate deliveries
   * without claiming the same delivery.
   */
  async claimDueRetries(limit = 25, now = new Date()) {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error("Retry claim limit must be a positive integer.");
    }

    const { db } = await import("@/db/client");

    return db.transaction(async (tx) => {
      const dueDeliveries = await tx
        .select()
        .from(emailDeliveries)
        .where(and(eq(emailDeliveries.status, "retrying"), lte(emailDeliveries.nextAttemptAt, now)))
        .orderBy(asc(emailDeliveries.nextAttemptAt))
        .limit(limit)
        .for("update", { skipLocked: true });

      const claimedDeliveries: EmailDeliveryRecord[] = [];

      for (const delivery of dueDeliveries) {
        const [claimed] = await tx
          .update(emailDeliveries)
          .set({
            status: "sending",
            attemptCount: sql`${emailDeliveries.attemptCount} + 1`,
            nextAttemptAt: null,
            updatedAt: now,
          })
          .where(
            and(
              eq(emailDeliveries.id, delivery.id),
              eq(emailDeliveries.tenantId, delivery.tenantId),
              eq(emailDeliveries.status, "retrying"),
            ),
          )
          .returning();

        if (claimed) {
          claimedDeliveries.push(claimed);
        }
      }

      return claimedDeliveries;
    });
  },

  /**
   * Recovers deliveries left in "sending" after a worker interruption.
   *
   * The previous attempt is recorded as UNKNOWN_ERROR because the
   * provider outcome cannot be determined after a process crash.
   */
  async recoverStaleDeliveries(staleBefore, now = new Date(), limit = 25) {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error("Recovery limit must be a positive integer.");
    }

    const { db } = await import("@/db/client");

    return db.transaction(async (tx) => {
      const staleDeliveries = await tx
        .select()
        .from(emailDeliveries)
        .where(
          and(eq(emailDeliveries.status, "sending"), lte(emailDeliveries.updatedAt, staleBefore)),
        )
        .limit(limit)
        .for("update", { skipLocked: true });

      let recoveredCount = 0;

      for (const delivery of staleDeliveries) {
        const retryAllowed = canRetryEmail(true, delivery.attemptCount);

        const failureCode: EmailFailureCode = retryAllowed
          ? "UNKNOWN_ERROR"
          : "MAX_RETRIES_EXCEEDED";

        const nextAttemptAt = retryAllowed ? getNextEmailRetryAt(delivery.attemptCount, now) : null;

        const [updated] = await tx
          .update(emailDeliveries)
          .set({
            status: retryAllowed ? "retrying" : "failed",
            failureCode,
            nextAttemptAt,
            updatedAt: now,
          })
          .where(
            and(
              eq(emailDeliveries.id, delivery.id),
              eq(emailDeliveries.tenantId, delivery.tenantId),
              eq(emailDeliveries.status, "sending"),
              eq(emailDeliveries.attemptCount, delivery.attemptCount),
              lte(emailDeliveries.updatedAt, staleBefore),
            ),
          )
          .returning({ id: emailDeliveries.id });

        if (!updated) {
          continue;
        }

        await tx.insert(emailDeliveryAttempts).values({
          deliveryId: delivery.id,
          tenantId: delivery.tenantId,
          attemptNumber: delivery.attemptCount,
          status: "failed",
          failureCode,
        });

        recoveredCount += 1;
      }

      return recoveredCount;
    });
  },
};
