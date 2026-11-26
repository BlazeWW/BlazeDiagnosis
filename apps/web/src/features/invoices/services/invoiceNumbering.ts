import { sql } from 'drizzle-orm';

import type { db } from '@/db/client';
import { invoiceSequences } from '@/db/schema';

export const DEFAULT_INVOICE_PREFIX = 'INV';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** INV-2026-0001: prefix, year, then a 4-digit sequence. */
export function formatInvoiceNumber(
  prefix: string,
  year: number,
  sequence: number,
): string {
  return `${prefix}-${year}-${String(sequence).padStart(4, '0')}`;
}

/** Takes the next invoice number for this tenant and year. Must run inside the issuing transaction. */
export async function allocateInvoiceNumber(
  tx: Tx,
  tenantId: string,
  issuedAt: Date,
  prefix = DEFAULT_INVOICE_PREFIX,
): Promise<string> {
  const year = issuedAt.getFullYear();
  const [row] = await tx
    .insert(invoiceSequences)
    .values({ lastNumber: 1, tenantId, year })
    .onConflictDoUpdate({
      set: { lastNumber: sql`${invoiceSequences.lastNumber} + 1` },
      target: [invoiceSequences.tenantId, invoiceSequences.year],
    })
    .returning({ lastNumber: invoiceSequences.lastNumber });

  return formatInvoiceNumber(prefix, year, row.lastNumber);
}
