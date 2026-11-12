import { describe, expect, it } from "vitest";

import { renderInvoiceEmail } from "../templates/invoice-templates";

describe("Invoice email templates", () => {
  const invoiceIssuedPayload = {
    customerName: "John Smith",
    invoiceNumber: "INV-001",
    amount: "1500.00",
    currency: "ZAR",
    dueDate: "2026-11-20",
  };

  it("renders an invoice issued email", () => {
    const result = renderInvoiceEmail("invoice_issued", invoiceIssuedPayload);

    expect(result.subject).toBe("Invoice INV-001 issued");

    expect(result.html).toContain("John Smith");
    expect(result.html).toContain("INV-001");
    expect(result.html).toContain("ZAR 1500.00");
    expect(result.html).toContain("2026-11-20");

    expect(result.text).toContain("Your invoice has been issued");
  });

  it("renders an invoice paid email", () => {
    const result = renderInvoiceEmail("invoice_paid", {
      customerName: "John Smith",
      invoiceNumber: "INV-002",
      amount: "2500.00",
      currency: "ZAR",
    });

    expect(result.subject).toContain("Payment received");
    expect(result.html).toContain("Payment received");
    expect(result.text).toContain("ZAR 2500.00");
  });

  it("renders an overdue invoice email", () => {
    const result = renderInvoiceEmail("invoice_overdue", {
      customerName: "Jane Smith",
      invoiceNumber: "INV-003",
      amount: "800.00",
      currency: "ZAR",
      dueDate: "2026-10-20",
    });

    expect(result.subject.toLowerCase()).toContain("payment reminder");
    expect(result.html).toContain("Jane Smith");
    expect(result.html).toContain("2026-10-20");
    expect(result.text).toContain("Outstanding amount: ZAR 800.00");
  });

  it("escapes HTML in dynamic customer information", () => {
    const result = renderInvoiceEmail("invoice_issued", {
      customerName: '<script>alert("test")</script>',
      invoiceNumber: "INV-004",
      amount: "100.00",
      currency: "ZAR",
      dueDate: "2026-11-20",
    });

    expect(result.html).not.toContain("<script>");
    expect(result.html).toContain("&lt;script&gt;");
  });

  it("does not include internal notes in customer emails", () => {
    const result = renderInvoiceEmail("invoice_issued", {
      customerName: "John Smith",
      invoiceNumber: "INV-005",
      amount: "100.00",
      currency: "ZAR",
      dueDate: "2026-11-20",
    });

    expect(result.html).not.toContain("Internal notes");
    expect(result.text).not.toContain("Internal notes");
  });

  it("provides both HTML and plain-text content", () => {
    const result = renderInvoiceEmail("invoice_issued", invoiceIssuedPayload);

    expect(result.html).toContain("<html");
    expect(result.text.length).toBeGreaterThan(0);
  });
});
