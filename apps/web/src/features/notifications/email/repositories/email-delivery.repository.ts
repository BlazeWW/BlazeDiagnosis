import { and, eq, sql } from "drizzle-orm";

import { emailDeliveries, emailDeliveryAttempts } from "@/db/schema";

import type { EmailFailureCode, EmailNotificationEventType } from "../types/email.types";

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
}

export interface EmailDeliveryRepository {
  createOrGet(
    input: CreateOrGetDeliveryInput,
  ): Promise<{ delivery: EmailDeliveryRecord; created: boolean }>;

  claim(input: ClaimDeliveryInput): Promise<EmailDeliveryRecord | null>;

  finish(input: FinishDeliveryInput): Promise<void>;
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

    // A matching delivery already exists for this tenant and key.
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

    // Prevent an idempotency key from being reused for a different event.
    if (existing.invoiceId !== input.invoiceId || existing.eventType !== input.eventType) {
      throw new Error("Email delivery idempotency key conflict.");
    }

    return { delivery: existing, created: false };
  },

  async claim(input) {
    const { db } = await import("@/db/client");

    // Only one request can move a queued delivery into sending.
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

    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(emailDeliveries)
        .set({
          status: input.success ? "sent" : "failed",
          providerReference: input.providerReference ?? null,
          failureCode: input.success ? null : (input.failureCode ?? "UNKNOWN_ERROR"),
          sentAt: input.success ? new Date() : null,
          nextAttemptAt: null,
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
};
