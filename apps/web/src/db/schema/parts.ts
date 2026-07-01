import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { tenants } from './tenants';

export const parts = pgTable(
  'parts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('part_name').notNull(),
    partNumber: varchar('part_number', { length: 100 }).notNull(),
    sku: varchar('sku', { length: 100 }),
    brand: text('brand'),
    category: varchar('category', { length: 100 }),
    description: text('description'),
    status: varchar('status', { length: 40 }).notNull().default('active'),
    costPrice: numeric('cost_price', { precision: 12, scale: 2 })
      .notNull()
      .default('0.00'),
    retailPrice: numeric('retail_price', { precision: 12, scale: 2 })
      .notNull()
      .default('0.00'),
    quantityOnHand: numeric('quantity_on_hand', { precision: 12, scale: 2 })
      .notNull()
      .default('0.00'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('parts_tenant_number_idx').on(table.tenantId, table.partNumber),
    index('parts_sku_idx').on(table.sku),
  ],
);

// Clean transparent re-exports from your suppliers file
export { partsRequestItems, partsRequests } from './suppliers';
