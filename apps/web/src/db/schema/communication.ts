import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { customers } from './customers';
import { notificationStatusEnum, visibilityEnum } from './enums';
import { jobCards } from './jobs';
import { partsRequests, suppliers } from './suppliers';
import { tenants } from './tenants';
import { users } from './users';

export const chatThreads = pgTable(
  'chat_threads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    threadType: varchar('thread_type', { length: 80 }).notNull(),
    jobCardId: uuid('job_card_id').references(() => jobCards.id),
    partsRequestId: uuid('parts_request_id').references(() => partsRequests.id),
    customerId: uuid('customer_id').references(() => customers.id),
    supplierId: uuid('supplier_id').references(() => suppliers.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('chat_threads_tenant_job_idx').on(table.tenantId, table.jobCardId),
  ],
);

export const chatThreadParticipants = pgTable(
  'chat_thread_participants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    threadId: uuid('thread_id')
      .references(() => chatThreads.id, { onDelete: 'cascade' })
      .notNull(),
    userId: text('user_id').notNull(),
    participantType: varchar('participant_type', { length: 20 })
      .$type<'customer' | 'staff' | 'supplier'>()
      .notNull(),
    lastReadAt: timestamp('last_read_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('chat_thread_participants_thread_user_idx').on(
      table.threadId,
      table.userId,
    ),
    index('chat_thread_participants_tenant_user_idx').on(
      table.tenantId,
      table.userId,
    ),
  ],
);

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    threadId: uuid('thread_id')
      .references(() => chatThreads.id, { onDelete: 'cascade' })
      .notNull(),
    senderUserId: text('sender_user_id'),
    body: text('body').notNull(),
    visibility: visibilityEnum('visibility').notNull().default('internal'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('chat_messages_tenant_thread_created_idx').on(
      table.tenantId,
      table.threadId,
      table.createdAt,
    ),
  ],
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    recipientUserId: uuid('recipient_user_id')
      .references(() => users.id)
      .notNull(),
    type: varchar('type', { length: 120 }).notNull(),
    channel: varchar('channel', { length: 40 }).notNull().default('in_app'),
    title: text('title').notNull(),
    body: text('body').notNull(),
    status: notificationStatusEnum('status').notNull().default('queued'),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('notifications_recipient_idx').on(
      table.recipientUserId,
      table.status,
    ),
  ],
);
