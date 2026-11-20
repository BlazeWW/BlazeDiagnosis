export function calculateOutstandingBalance(
  total: number,
  amountPaid: number,
): number {
  return total - amountPaid;
}

export function getInvoicePaymentStatus(
  total: number,
  amountPaid: number,
): 'unpaid' | 'partial' | 'paid' {
  if (amountPaid <= 0) {
    return 'unpaid';
  }

  if (amountPaid >= total) {
    return 'paid';
  }

  return 'partial';
}