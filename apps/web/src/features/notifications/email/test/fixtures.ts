import type { InvoiceEmailContext } from "../services/email-notification.service";

export const TENANT_A = "tenant-a-001";
export const TENANT_B = "tenant-b-001";

export const INVOICE_A: InvoiceEmailContext = {
  id: "invoice-a-001",
  tenantId: TENANT_A,
  customerId: "customer-a-001",
  invoiceNumber: "INV-001",
  status: "issued",
  total: "1500.00",
  dueAt: new Date("2026-11-20T00:00:00.000Z"),
  currency: "ZAR",
  customer: {
    firstName: "John",
    lastName: "Smith",
    email: "john@example.com",
  },
};

export const INVOICE_B: InvoiceEmailContext = {
  id: "invoice-b-001",
  tenantId: TENANT_B,
  customerId: "customer-b-001",
  invoiceNumber: "INV-002",
  status: "issued",
  total: "2500.00",
  dueAt: new Date("2026-11-25T00:00:00.000Z"),
  currency: "ZAR",
  customer: {
    firstName: "Jane",
    lastName: "Jones",
    email: "jane@example.com",
  },
};
