import {
  jobCustomerStatusEnum,
  jobInternalStatusEnum,
} from '@/db/schema/enums';

export type JobInternalStatus =
  (typeof jobInternalStatusEnum.enumValues)[number];
export type JobCustomerStatus =
  (typeof jobCustomerStatusEnum.enumValues)[number];

const transitions: Record<JobInternalStatus, readonly JobInternalStatus[]> = {
  request_received: ['vehicle_received', 'cancelled'],
  vehicle_received: ['intake_in_progress', 'cancelled'],
  intake_in_progress: ['diagnostics_in_progress', 'cancelled'],
  diagnostics_in_progress: ['quote_preparation', 'cancelled'],
  quote_preparation: ['awaiting_customer_approval', 'cancelled'],
  awaiting_customer_approval: [
    'work_in_progress',
    'awaiting_parts',
    'cancelled',
  ],
  awaiting_parts: [
    'work_in_progress',
    'awaiting_customer_approval',
    'cancelled',
  ],
  work_in_progress: [
    'quality_control',
    'awaiting_customer_approval',
    'cancelled',
  ],
  quality_control: ['ready_for_invoice', 'work_in_progress', 'cancelled'],
  ready_for_invoice: ['awaiting_payment', 'cancelled'],
  awaiting_payment: ['ready_for_collection', 'cancelled'],
  ready_for_collection: ['completed', 'cancelled'],
  completed: ['ready_for_collection'],
  cancelled: ['request_received'],
};

const customerStatusByInternalStatus: Record<
  JobInternalStatus,
  JobCustomerStatus
> = {
  request_received: 'request_received',
  vehicle_received: 'vehicle_checked_in',
  intake_in_progress: 'inspection_in_progress',
  diagnostics_in_progress: 'inspection_in_progress',
  quote_preparation: 'inspection_in_progress',
  awaiting_customer_approval: 'awaiting_approval',
  awaiting_parts: 'waiting_for_parts',
  work_in_progress: 'service_in_progress',
  quality_control: 'final_checks',
  ready_for_invoice: 'invoice_ready',
  awaiting_payment: 'invoice_ready',
  ready_for_collection: 'ready_for_collection',
  completed: 'completed',
  cancelled: 'cancelled',
};

const reasonRequiredTransitions = new Set([
  'quality_control->work_in_progress',
  'completed->ready_for_collection',
  'cancelled->request_received',
  'request_received->cancelled',
  'vehicle_received->cancelled',
  'intake_in_progress->cancelled',
  'diagnostics_in_progress->cancelled',
  'quote_preparation->cancelled',
  'awaiting_customer_approval->cancelled',
  'awaiting_parts->cancelled',
  'work_in_progress->cancelled',
  'quality_control->cancelled',
  'ready_for_invoice->cancelled',
  'awaiting_payment->cancelled',
  'ready_for_collection->cancelled',
]);

export function isAllowedJobStatusTransition(
  from: JobInternalStatus,
  to: JobInternalStatus,
) {
  return transitions[from].includes(to);
}

export function requiresJobStatusReason(
  from: JobInternalStatus,
  to: JobInternalStatus,
) {
  return reasonRequiredTransitions.has(`${from}->${to}`);
}

export function requiresJobStatusManager(
  from: JobInternalStatus,
  to: JobInternalStatus,
) {
  return to === 'cancelled' || from === 'cancelled' || from === 'completed';
}

export function getCustomerStatusForInternalStatus(
  status: JobInternalStatus,
): JobCustomerStatus {
  return customerStatusByInternalStatus[status];
}
