import {
  boolean,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import {
  deliveryStatusEnum,
  partsOrderStatusEnum,
  partsRequestStatusEnum,
} from './enums';
import { jobCards } from './jobs';
import { tenants } from './tenants';
import { users } from './users';

export const suppliers = pgTable('suppliers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  status: varchar('status', { length: 40 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const tenantSuppliers = pgTable(
  'tenant_suppliers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    supplierId: uuid('supplier_id')
      .references(() => suppliers.id, { onDelete: 'cascade' })
      .notNull(),
    status: varchar('status', { length: 40 }).notNull().default('active'),
    preferred: boolean('preferred').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('tenant_suppliers_tenant_idx').on(table.tenantId)],
);

export const partsRequests = pgTable(
  'parts_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    jobCardId: uuid('job_card_id')
      .references(() => jobCards.id, { onDelete: 'cascade' })
      .notNull(),
    requestedByUserId: uuid('requested_by_user_id').references(() => users.id),
    status: partsRequestStatusEnum('status').notNull().default('draft'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('parts_requests_tenant_job_idx').on(table.tenantId, table.jobCardId),
  ],
);

export const partsRequestItems = pgTable('parts_request_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  partsRequestId: uuid('parts_request_id')
    .references(() => partsRequests.id, { onDelete: 'cascade' })
    .notNull(),
  partName: text('part_name').notNull(),
  partNumber: text('part_number'),
  quantity: numeric('quantity', { precision: 12, scale: 2 })
    .notNull()
    .default('1'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const supplierResponses = pgTable('supplier_responses', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  partsRequestId: uuid('parts_request_id')
    .references(() => partsRequests.id, { onDelete: 'cascade' })
    .notNull(),
  supplierId: uuid('supplier_id')
    .references(() => suppliers.id)
    .notNull(),
  status: varchar('status', { length: 40 }).notNull().default('submitted'),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 })
    .notNull()
    .default('0'),
  taxTotal: numeric('tax_total', { precision: 12, scale: 2 })
    .notNull()
    .default('0'),
  deliveryFee: numeric('delivery_fee', { precision: 12, scale: 2 })
    .notNull()
    .default('0'),
  total: numeric('total', { precision: 12, scale: 2 }).notNull().default('0'),
  eta: timestamp('eta', { withTimezone: true }),
  notes: text('notes'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const supplierResponseItems = pgTable('supplier_response_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  supplierResponseId: uuid('supplier_response_id')
    .references(() => supplierResponses.id, { onDelete: 'cascade' })
    .notNull(),
  partsRequestItemId: uuid('parts_request_item_id')
    .references(() => partsRequestItems.id)
    .notNull(),
  partName: text('part_name').notNull(),
  partNumber: text('part_number'),
  brand: text('brand'),
  quantityAvailable: numeric('quantity_available', { precision: 12, scale: 2 })
    .notNull()
    .default('0'),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 })
    .notNull()
    .default('0'),
  eta: timestamp('eta', { withTimezone: true }),
  availabilityStatus: varchar('availability_status', { length: 80 })
    .notNull()
    .default('available'),
  alternativeOffered: boolean('alternative_offered').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const partsOrders = pgTable('parts_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  supplierResponseId: uuid('supplier_response_id')
    .references(() => supplierResponses.id)
    .notNull(),
  supplierId: uuid('supplier_id')
    .references(() => suppliers.id)
    .notNull(),
  jobCardId: uuid('job_card_id')
    .references(() => jobCards.id)
    .notNull(),
  status: partsOrderStatusEnum('status').notNull().default('pending_approval'),
  orderedAt: timestamp('ordered_at', { withTimezone: true }),
  expectedDeliveryAt: timestamp('expected_delivery_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const partsDeliveries = pgTable('parts_deliveries', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  partsOrderId: uuid('parts_order_id')
    .references(() => partsOrders.id, { onDelete: 'cascade' })
    .notNull(),
  status: deliveryStatusEnum('status').notNull().default('awaiting_dispatch'),
  trackingReference: text('tracking_reference'),
  courierName: text('courier_name'),
  driverName: text('driver_name'),
  eta: timestamp('eta', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  proofFileId: uuid('proof_file_id'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const deliveryStatuses = pgTable(
  'delivery_statuses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    partsRequestId: uuid('parts_request_id')
      .references(() => partsRequests.id, { onDelete: 'cascade' })
      .notNull(),
    supplierResponseId: uuid('supplier_response_id')
      .references(() => supplierResponses.id, { onDelete: 'cascade' })
      .notNull(),
  
    currentSurfaceStatus: varchar('current_surface_status', { length: 100 }).notNull(), 
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('delivery_tenant_surface_idx').on(table.tenantId, table.currentSurfaceStatus),
    index('delivery_request_idx').on(table.partsRequestId),
  ]
);
