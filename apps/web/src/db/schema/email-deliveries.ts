import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { tenants } from "./tenants";
import { invoices } from "./invoices";

import type {
  EmailDeliveryStatus,
  EmailNotificationEventType,
} from "@/features/notifications/email/types/email.types";

export const emailDeliveries = pgTable(
  "email_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    tenantId: uuid("tenant_id")
      .references(() => tenants.id, { onDelete: "cascade" })
      .notNull(),

    invoiceId: uuid("invoice_id")
      .references(() => invoices.id, { onDelete: "cascade" })
      .notNull(),

    eventType: varchar("event_type", { length: 40 }).$type<EmailNotificationEventType>().notNull(),

    status: varchar("status", { length: 20 })
      .$type<EmailDeliveryStatus>()
      .default("queued")
      .notNull(),

    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),

    attemptCount: integer("attempt_count").default(0).notNull(),

    providerReference: text("provider_reference"),

    failureCode: varchar("failure_code", { length: 80 }),

    nextAttemptAt: timestamp("next_attempt_at", {
      withTimezone: true,
    }),

    sentAt: timestamp("sent_at", { withTimezone: true }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("email_deliveries_tenant_idempotency_idx").on(table.tenantId, table.idempotencyKey),
    index("email_deliveries_tenant_status_idx").on(table.tenantId, table.status),
    index("email_deliveries_invoice_idx").on(table.invoiceId),
  ],
);

export const emailDeliveryAttempts = pgTable(
  "email_delivery_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    deliveryId: uuid("delivery_id")
      .references(() => emailDeliveries.id, { onDelete: "cascade" })
      .notNull(),

    tenantId: uuid("tenant_id")
      .references(() => tenants.id, { onDelete: "cascade" })
      .notNull(),

    attemptNumber: integer("attempt_number").notNull(),

    status: varchar("status", { length: 20 }).$type<"succeeded" | "failed">().notNull(),

    providerReference: text("provider_reference"),

    failureCode: varchar("failure_code", { length: 80 }),

    attemptedAt: timestamp("attempted_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("email_delivery_attempts_delivery_number_idx").on(
      table.deliveryId,
      table.attemptNumber,
    ),
    index("email_delivery_attempts_tenant_time_idx").on(table.tenantId, table.attemptedAt),
  ],
);
