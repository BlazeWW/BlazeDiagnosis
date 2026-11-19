import { pgEnum } from 'drizzle-orm/pg-core';

export const tenantStatusEnum = pgEnum('tenant_status', [
  'trial',
  'active',
  'suspended',
  'archived',
]);
export const membershipStatusEnum = pgEnum('membership_status', [
  'invited',
  'active',
  'disabled',
]);
export const invitationStatusEnum = pgEnum('invitation_status', [
  'pending',
  'accepted',
  'expired',
  'revoked',
]);
export const serviceRequestStatusEnum = pgEnum('service_request_status', [
  'draft',
  'received',
  'converted',
  'cancelled',
]);
export const jobInternalStatusEnum = pgEnum('job_internal_status', [
  'request_received',
  'vehicle_received',
  'intake_in_progress',
  'diagnostics_in_progress',
  'quote_preparation',
  'awaiting_customer_approval',
  'awaiting_parts',
  'work_in_progress',
  'quality_control',
  'ready_for_invoice',
  'awaiting_payment',
  'ready_for_collection',
  'completed',
  'cancelled',
]);
export const jobCustomerStatusEnum = pgEnum('job_customer_status', [
  'request_received',
  'vehicle_checked_in',
  'inspection_in_progress',
  'quote_ready',
  'awaiting_approval',
  'waiting_for_parts',
  'service_in_progress',
  'final_checks',
  'invoice_ready',
  'ready_for_collection',
  'completed',
  'cancelled',
]);
export const visibilityEnum = pgEnum('visibility', [
  'internal',
  'customer',
  'supplier',
]);
export const quoteStatusEnum = pgEnum('quote_status', [
  'draft',
  'sent',
  'partially_approved',
  'approved',
  'declined',
  'expired',
  'locked',
]);
export const quoteLineCategoryEnum = pgEnum('quote_line_category', [
  'part',
  'labor',
  'diagnostic',
  'consumable',
  'optional_service',
]);
export const approvalStatusEnum = pgEnum('approval_status', [
  'pending',
  'approved',
  'declined',
  'not_required',
]);
export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft',
  'issued',
  'partially_paid',
  'paid',
  'overdue',
  'cancelled',
  'refunded',
]);
export const partsRequestStatusEnum = pgEnum('parts_request_status', [
  'draft',
  'sent',
  'response_received',
  'accepted',
  'expired',
  'cancelled',
]);
export const partsOrderStatusEnum = pgEnum('parts_order_status', [
  'pending_approval',
  'ordered',
  'awaiting_dispatch',
  'dispatched',
  'in_transit',
  'delivered',
  'partially_delivered',
  'delayed',
  'cancelled',
]);

export const deliveryStatusEnum = pgEnum('delivery_status', [
  'awaiting_dispatch',
  'dispatched',
  'in_transit',
  'delivered',
  'partially_delivered',
  'delayed',
  'failed_delivery',
  'cancelled',
]);
export const notificationStatusEnum = pgEnum('notification_status', [
  'queued',
  'sent',
  'read',
  'failed',
]);
