// Customer-visible service history contract (BD-037).
// Only fields listed here may leave the server for the customer portal.

export type CustomerJobStatus =
  | 'request_received'
  | 'vehicle_checked_in'
  | 'inspection_in_progress'
  | 'quote_ready'
  | 'awaiting_approval'
  | 'waiting_for_parts'
  | 'service_in_progress'
  | 'final_checks'
  | 'invoice_ready'
  | 'ready_for_collection'
  | 'completed';

export type CustomerServiceHistoryVehicle = {
  make: string;
  model: string;
  registrationNumber: string | null;
  year: number | null;
};

export type CustomerServiceHistoryDocument = {
  id: string;
  issuedAt: string | null;
  number: string;
  status: string;
  total: string;
  type: 'invoice' | 'quote';
};

export type CustomerServiceHistoryNote = {
  body: string;
  createdAt: string;
};

export type CustomerServiceHistoryItem = {
  completedAt: string | null;
  documents: CustomerServiceHistoryDocument[];
  expectedCompletionAt: string | null;
  isOngoing: boolean;
  jobCardId: string;
  jobNumber: string;
  notes: CustomerServiceHistoryNote[];
  openedAt: string;
  status: CustomerJobStatus;
  statusLabel: string;
  vehicle: CustomerServiceHistoryVehicle;
};

export type CustomerServiceHistoryPagination = {
  hasNextPage: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CustomerServiceHistoryPage = {
  items: CustomerServiceHistoryItem[];
  pagination: CustomerServiceHistoryPagination;
};
