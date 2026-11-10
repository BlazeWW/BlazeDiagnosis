export const customerStatuses = [
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
] as const;

export type CustomerStatus = (typeof customerStatuses)[number];


export const defectSeverities = [
  'normal',
  'advisory',
  'critical',
] as const;

export type DefectSeverity = (typeof defectSeverities)[number];

export type InspectionFinding = {
  id: string;
  title: string;
  description: string;
  severity: DefectSeverity;
};


export const internalStatuses = [
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
] as const;

export type InternalStatus = (typeof internalStatuses)[number];
