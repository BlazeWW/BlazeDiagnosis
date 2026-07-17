import {
  index,
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { tenants } from './tenants';
import { users } from './users';

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id').references(() => users.id),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email'),
    phone: text('phone'),
    preferredLocale: varchar('preferred_locale', { length: 12 })
      .notNull()
      .default('en'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    isArchived: boolean('is_archived').default(false).notNull(),
  },
  (table) => [
    index('customers_tenant_id_idx').on(table.tenantId, table.id),
    index('customers_tenant_email_idx').on(table.tenantId, table.email),
  ],
);
