import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { customers } from './customers';
import {
  jobCustomerStatusEnum,
  jobInternalStatusEnum,
  serviceRequestStatusEnum,
  visibilityEnum,
} from './enums';
import { tenants } from './tenants';
import { users } from './users';
import { vehicles } from './vehicles';

export const serviceRequests = pgTable(
  'service_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    customerId: uuid('customer_id')
      .references(() => customers.id)
      .notNull(),
    vehicleId: uuid('vehicle_id')
      .references(() => vehicles.id)
      .notNull(),
    source: varchar('source', { length: 80 }).notNull().default('staff'),
    requestedService: text('requested_service').notNull(),
    customerConcern: text('customer_concern'),
    preferredDate: timestamp('preferred_date', { withTimezone: true }),
    status: serviceRequestStatusEnum('status').notNull().default('received'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('service_requests_tenant_status_idx').on(
      table.tenantId,
      table.status,
    ),
  ],
);

export const intakeInspections = pgTable('intake_inspections', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  serviceRequestId: uuid('service_request_id')
    .references(() => serviceRequests.id, { onDelete: 'cascade' })
    .notNull(),
  vehicleId: uuid('vehicle_id')
    .references(() => vehicles.id)
    .notNull(),
  mileage: integer('mileage'),
  fuelLevel: varchar('fuel_level', { length: 40 }),
  conditionNotes: text('condition_notes'),
  performedByUserId: uuid('performed_by_user_id').references(() => users.id),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const jobCards = pgTable(
  'job_cards',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    serviceRequestId: uuid('service_request_id').references(
      () => serviceRequests.id,
    ),
    customerId: uuid('customer_id')
      .references(() => customers.id)
      .notNull(),
    vehicleId: uuid('vehicle_id')
      .references(() => vehicles.id)
      .notNull(),
    jobNumber: varchar('job_number', { length: 80 }).notNull(),
    internalStatus: jobInternalStatusEnum('internal_status')
      .notNull()
      .default('request_received'),
    customerStatus: jobCustomerStatusEnum('customer_status')
      .notNull()
      .default('request_received'),
    statusVersion: integer('status_version').notNull().default(0),
    priority: varchar('priority', { length: 40 }).notNull().default('normal'),
    assignedMechanicId: uuid('assigned_mechanic_id').references(() => users.id),
    assignedFloorManagerId: uuid('assigned_floor_manager_id').references(
      () => users.id,
    ),
    expectedCompletionAt: timestamp('expected_completion_at', {
      withTimezone: true,
    }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('job_cards_tenant_status_idx').on(
      table.tenantId,
      table.internalStatus,
    ),
  ],
);

export const jobStatusEvents = pgTable('job_status_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  jobCardId: uuid('job_card_id')
    .references(() => jobCards.id, { onDelete: 'cascade' })
    .notNull(),
  fromStatus: varchar('from_status', { length: 80 }),
  toStatus: varchar('to_status', { length: 80 }).notNull(),
  statusType: varchar('status_type', { length: 40 }).notNull(),
  note: text('note'),
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  actorIdentity: text('actor_identity'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const jobNotes = pgTable('job_notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  jobCardId: uuid('job_card_id')
    .references(() => jobCards.id, { onDelete: 'cascade' })
    .notNull(),
  authorUserId: uuid('author_user_id').references(() => users.id),
  visibility: visibilityEnum('visibility').notNull().default('internal'),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// BD-020: time a technician spent on a job card. Corrections update the row in place;
// each change (with its reason) is recorded in audit_logs as the correction history.
export const jobLabourEntries = pgTable(
  'job_labour_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    jobCardId: uuid('job_card_id')
      .references(() => jobCards.id, { onDelete: 'cascade' })
      .notNull(),
    technicianId: uuid('technician_id')
      .references(() => users.id)
      .notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }).notNull(),
    minutes: integer('minutes').notNull(),
    note: text('note'),
    visibility: visibilityEnum('visibility').notNull().default('internal'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('job_labour_entries_job_idx').on(table.tenantId, table.jobCardId),
    index('job_labour_entries_technician_idx').on(
      table.tenantId,
      table.technicianId,
      table.startedAt,
    ),
  ],
);
