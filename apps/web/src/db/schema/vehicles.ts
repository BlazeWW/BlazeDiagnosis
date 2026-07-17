import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { customers } from './customers';
import { tenants } from './tenants';
import { users } from './users';

export const vehicles = pgTable(
  'vehicles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    primaryCustomerId: uuid('primary_customer_id')
      .references(() => customers.id)
      .notNull(),
    vin: varchar('vin', { length: 40 }),
    registrationNumber: varchar('registration_number', { length: 40 }),
    make: text('make').notNull(),
    model: text('model').notNull(),
    year: integer('year'),
    mileage: integer('mileage'),
    engineDetails: text('engine_details'),
    fuelType: varchar('fuel_type', { length: 80 }),
    transmission: varchar('transmission', { length: 80 }),
    color: varchar('color', { length: 80 }),
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
    index('vehicles_tenant_id_idx').on(table.tenantId, table.id, table.isArchived),
    index('vehicles_tenant_customer_idx').on(
      table.tenantId,
      table.primaryCustomerId,
    ),
  ],
);

export const vehicleCustomers = pgTable(
  'vehicle_customers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    vehicleId: uuid('vehicle_id')
      .references(() => vehicles.id, { onDelete: 'cascade' })
      .notNull(),
    customerId: uuid('customer_id')
      .references(() => customers.id, { onDelete: 'cascade' })
      .notNull(),
    relationshipType: varchar('relationship_type', { length: 80 })
      .notNull()
      .default('owner'),
    startedAt: timestamp('started_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
  },
  (table) => [
    index('vehicle_customers_vehicle_idx').on(table.tenantId, table.vehicleId),
  ],
);

export const vehicleOdometerReadings = pgTable('vehicle_odometer_readings', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  vehicleId: uuid('vehicle_id')
    .references(() => vehicles.id, { onDelete: 'cascade' })
    .notNull(),
  reading: integer('reading').notNull(),
  source: varchar('source', { length: 80 }).notNull(),
  recordedAt: timestamp('recorded_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
});
