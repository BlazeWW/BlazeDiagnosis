// Station dashboard contract (BD-008). All values are for one tenant only.

export type StationDashboardMetrics = {
  awaitingApproval: number;
  awaitingParts: number;
  openJobs: number;
  // null when the signed-in user's role may not see financial figures.
  outstandingInvoices: { count: number; total: string } | null;
};

export type StationAttentionJob = {
  customerName: string;
  expectedCompletionAt: string | null;
  id: string;
  internalStatus: string;
  isOverdue: boolean;
  jobNumber: string;
  priority: string;
  vehicle: string;
};

export type StationPartsQueueItem = {
  id: string;
  jobNumber: string;
  requestedAt: string;
  status: string;
};

export type StationDashboard = {
  attentionJobs: StationAttentionJob[];
  generatedAt: string;
  metrics: StationDashboardMetrics;
  partsQueue: StationPartsQueueItem[];
};
