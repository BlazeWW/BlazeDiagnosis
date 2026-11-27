// Customer dashboard contract (BD-036).
// Only fields listed here may leave the server for the customer portal.

export type DashboardVehicle = {
  id: string;
  make: string;
  model: string;
  registrationNumber: string | null;
  year: number | null;
};

export type DashboardQuote = {
  id: string;
  quoteNumber: string;
  sentAt: string | null;
  status: string;
  total: string;
};

export type DashboardInvoice = {
  id: string;
  dueAt: string | null;
  invoiceNumber: string;
  status: string;
  total: string;
};

export type DashboardServiceRequest = {
  id: string;
  createdAt: string;
  requestedService: string;
};

export type DashboardSection<T> = { items: T[]; total: number };

export type CustomerDashboard = {
  openInvoices: DashboardSection<DashboardInvoice>;
  openQuotes: DashboardSection<DashboardQuote>;
  pendingRequests: DashboardSection<DashboardServiceRequest>;
  vehicles: DashboardSection<DashboardVehicle>;
};