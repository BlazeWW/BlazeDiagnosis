import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  primaryKey,
  uniqueIndex
} from 'drizzle-orm/pg-core';

import { customers } from './customers';
import { invoiceStatusEnum } from './enums';
import { jobCards } from './jobs';
import { quoteLineItems,quotes } from './quotes';
import { tenants } from './tenants';

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    jobCardId: uuid('job_card_id')
      .references(() => jobCards.id)
      .notNull(),
    customerId: uuid('customer_id')
      .references(() => customers.id)
      .notNull(),
    quoteId: uuid('quote_id').references(() => quotes.id),
    invoiceNumber: varchar('invoice_number', { length: 80 }).notNull(),
    status: invoiceStatusEnum('status').notNull().default('draft'),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    taxTotal: numeric('tax_total', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    discountTotal: numeric('discount_total', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    total: numeric('total', { precision: 12, scale: 2 }).notNull().default('0'),
    amountPaid: numeric('amount_paid', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    issuedAt: timestamp('issued_at', { withTimezone: true }),
    dueAt: timestamp('due_at', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('invoices_tenant_customer_idx').on(table.tenantId, table.customerId),
    uniqueIndex('invoices_tenant_number_unique').on(table.tenantId, table.invoiceNumber),
    uniqueIndex('invoices_tenant_quote_unique').on(table.tenantId, table.quoteId),
  ],
);

export const invoiceLineItems = pgTable('invoice_line_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  invoiceId: uuid('invoice_id')
    .references(() => invoices.id, { onDelete: 'cascade' })
    .notNull(),
  quoteLineItemId: uuid('quote_line_item_id').references(
    () => quoteLineItems.id,
  ),
  category: varchar('category', { length: 80 }).notNull(),
  description: text('description').notNull(),
  quantity: numeric('quantity', { precision: 12, scale: 2 })
    .notNull()
    .default('1'),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 })
    .notNull()
    .default('0'),
  taxRate: numeric('tax_rate', { precision: 5, scale: 2 })
    .notNull()
    .default('0'),
  total: numeric('total', { precision: 12, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  invoiceId: uuid('invoice_id')
    .references(() => invoices.id, { onDelete: 'cascade' })
    .notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  method: varchar('method', { length: 80 }).notNull().default('manual'),
  status: varchar('status', { length: 80 }).notNull().default('pending'),
  provider: varchar('provider', { length: 80 }),
  providerReference: text('provider_reference'),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const invoiceSequences = pgTable(
  'invoice_sequences',
  {
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    year: integer('year').notNull(),
    lastNumber: integer('last_number').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.tenantId, table.year] })],
);
