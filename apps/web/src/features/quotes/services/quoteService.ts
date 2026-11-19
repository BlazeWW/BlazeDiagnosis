// apps/web/src/features/quotes/services/quote.service.ts
import { sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { calculateDocumentTotals, calculateLineCents, centsToString, DEFAULT_VAT_RATE } from '@/lib/money/cents';
import { requireTenantPermission } from '@/lib/auth/auth-guards';

// Helper function to safely get the first row from a query result
function getFirstRow(result: { rows?: unknown[] } | unknown[]): unknown {
  if (result && typeof result === 'object' && 'rows' in result && Array.isArray(result.rows)) {
    return result.rows.length > 0 ? result.rows[0] : undefined;
  }
  if (Array.isArray(result)) {
    return result.length > 0 ? result[0] : undefined;
  }
  return undefined;
}

// Helper function to get all rows from a query result
function getRows(result: { rows?: unknown[] } | unknown[]): unknown[] {
  if (result && typeof result === 'object' && 'rows' in result && Array.isArray(result.rows)) {
    return result.rows;
  }
  if (Array.isArray(result)) {
    return result;
  }
  return [];
}

// ============================================
// QUOTE CRUD OPERATIONS
// ============================================

export async function createQuoteFromJobCard(
  tenantId: string,
  jobCardId: string,
  customerId: string,
) {
  console.log("createQuoteFromJobCard called with:", { tenantId, jobCardId, customerId });
  
  if (!tenantId) throw new Error("Tenant ID is required");
  if (!jobCardId) throw new Error("Job Card ID is required");
  if (!customerId) throw new Error("Customer ID is required");
  
  await requireTenantPermission(tenantId, 'quotes.create');

  const quoteNumber = `Q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  console.log("Generated quote number:", quoteNumber);

  const result = await db.execute(sql`
    INSERT INTO quotes (
      tenant_id, job_card_id, customer_id, quote_number, 
      version, status, subtotal, tax_total, discount_total, total
    ) VALUES (
      ${tenantId}::uuid,
      ${jobCardId}::uuid,
      ${customerId}::uuid,
      ${quoteNumber},
      '1',
      'draft',
      '0',
      '0',
      '0',
      '0'
    ) RETURNING *
  `);

  const quote = getFirstRow(result);
  console.log("Quote created successfully:", quote);
  return quote;
}

export async function getQuoteWithItems(
  tenantId: string,
  quoteId: string,
) {
  await requireTenantPermission(tenantId, 'quotes.view');

  const quoteResult = await db.execute(sql`
    SELECT * FROM quotes 
    WHERE tenant_id = ${tenantId}::uuid 
    AND id = ${quoteId}::uuid 
    LIMIT 1
  `);

  const quote = getFirstRow(quoteResult);

  if (!quote) {
    return null;
  }

  const itemsResult = await db.execute(sql`
    SELECT * FROM quote_line_items 
    WHERE tenant_id = ${tenantId}::uuid 
    AND quote_id = ${quoteId}::uuid
  `);

  const items = getRows(itemsResult);

  return {
    ...quote as Record<string, unknown>,
    items,
  };
}

export async function getQuotes(
  tenantId: string,
  filters?: {
    status?: string;
    customerId?: string;
    jobCardId?: string;
    limit?: number;
    offset?: number;
  },
) {
  await requireTenantPermission(tenantId, 'quotes.view');

  let query = sql`
    SELECT * FROM quotes 
    WHERE tenant_id = ${tenantId}::uuid
  `;

  if (filters?.status) {
    query = sql`${query} AND status = ${filters.status}`;
  }
  if (filters?.customerId) {
    query = sql`${query} AND customer_id = ${filters.customerId}::uuid`;
  }
  if (filters?.jobCardId) {
    query = sql`${query} AND job_card_id = ${filters.jobCardId}::uuid`;
  }

  query = sql`${query} ORDER BY created_at DESC`;

  if (filters?.limit) {
    query = sql`${query} LIMIT ${filters.limit}`;
  }
  if (filters?.offset) {
    query = sql`${query} OFFSET ${filters.offset}`;
  }

  const result = await db.execute(query);
  return getRows(result);
}

// ============================================
// QUOTE LINE ITEM OPERATIONS
// ============================================

export async function addQuoteLineItem(
  tenantId: string,
  quoteId: string,
  jobCardId: string,
  input: {
    description: string;
    quantity: number;
    unitPrice: number;
    type: 'part' | 'labor' | 'diagnostic' | 'consumable' | 'optional_service';
    supplierId?: string;
  },
) {
  console.log("addQuoteLineItem called with:", { tenantId, quoteId, jobCardId, input });
  
  await requireTenantPermission(tenantId, 'quotes.update');

  if (!input.description) throw new Error("Description is required");
  if (input.quantity <= 0) throw new Error("Quantity must be greater than 0");
  if (input.unitPrice <= 0) throw new Error("Unit price must be greater than 0");

  // Check if quote exists
  const quoteResult = await db.execute(sql`
    SELECT id, status FROM quotes 
    WHERE tenant_id = ${tenantId}::uuid 
    AND id = ${quoteId}::uuid 
    LIMIT 1
  `);

  const quote = getFirstRow(quoteResult);

  if (!quote) {
    throw new Error('Quote not found.');
  }

  if (typeof quote === 'object' && quote !== null) {
    const quoteObj = quote as { status: string };
    if (quoteObj.status !== 'draft' && quoteObj.status !== 'sent') {
      throw new Error('Cannot add items to a quote that is not draft or sent.');
    }
  }

  // Line total = after discount, excluding VAT (BD-025). VAT is added at quote level.
  const line = calculateLineCents({ quantity: input.quantity, unitPrice: input.unitPrice });
  const total = centsToString(line.subtotal - line.discount);

  const result = await db.execute(sql`
    INSERT INTO quote_line_items (
      tenant_id, quote_id, job_card_id, category,
      description, quantity, unit_price, total,
      tax_rate, discount, approval_status
    ) VALUES (
      ${tenantId}::uuid,
      ${quoteId}::uuid,
      ${jobCardId}::uuid,
      ${input.type}::quote_line_category,
      ${input.description},
      ${input.quantity},
      ${input.unitPrice},
      ${total},
      ${DEFAULT_VAT_RATE},
      '0',
      'pending'
    ) RETURNING *
  `);

  const lineItem = getFirstRow(result);
  console.log("Line item created:", lineItem);

  await recalculateQuoteTotals(tenantId, quoteId);

  return lineItem;
}

export async function removeQuoteLineItem(
  tenantId: string,
  quoteId: string,
  lineItemId: string,
) {
  await requireTenantPermission(tenantId, 'quotes.update');

  // Check if quote exists and is in draft
  const quoteResult = await db.execute(sql`
    SELECT status FROM quotes 
    WHERE tenant_id = ${tenantId}::uuid 
    AND id = ${quoteId}::uuid 
    LIMIT 1
  `);

  const quote = getFirstRow(quoteResult);

  if (!quote) {
    throw new Error('Quote not found.');
  }

  if (typeof quote === 'object' && quote !== null) {
    const quoteObj = quote as { status: string };
    if (quoteObj.status !== 'draft') {
      throw new Error('Only draft quotes can have items removed.');
    }
  }

  await db.execute(sql`
    DELETE FROM quote_line_items 
    WHERE tenant_id = ${tenantId}::uuid 
    AND quote_id = ${quoteId}::uuid 
    AND id = ${lineItemId}::uuid
  `);

  await recalculateQuoteTotals(tenantId, quoteId);
}

export async function recalculateQuoteTotals(
  tenantId: string,
  quoteId: string,
) {
  const itemsResult = await db.execute(sql`
    SELECT quantity, unit_price, discount, tax_rate FROM quote_line_items
    WHERE tenant_id = ${tenantId}::uuid
    AND quote_id = ${quoteId}::uuid
  `);

  const items = getRows(itemsResult) as Array<{
    discount: string | null;
    quantity: string;
    tax_rate: string | null;
    unit_price: string;
  }>;

  // All maths in whole cents (BD-025): per-line discount and VAT, rounded half up.
  const totals = calculateDocumentTotals(
    items.map((item) => ({
      discount: item.discount,
      quantity: item.quantity,
      taxRate: item.tax_rate,
      unitPrice: item.unit_price,
    })),
  );

  await db.execute(sql`
    UPDATE quotes
    SET
      subtotal = ${centsToString(totals.subtotal)},
      discount_total = ${centsToString(totals.discountTotal)},
      tax_total = ${centsToString(totals.taxTotal)},
      total = ${centsToString(totals.total)}
    WHERE tenant_id = ${tenantId}::uuid
    AND id = ${quoteId}::uuid
  `);
}

// ============================================
// QUOTE STATUS AND APPROVAL OPERATIONS
// ============================================

export async function sendQuoteToCustomer(
  tenantId: string,
  quoteId: string,
) {
  await requireTenantPermission(tenantId, 'quotes.send');

  const quoteResult = await db.execute(sql`
    SELECT status FROM quotes 
    WHERE tenant_id = ${tenantId}::uuid 
    AND id = ${quoteId}::uuid 
    LIMIT 1
  `);

  const quote = getFirstRow(quoteResult);

  if (!quote) {
    throw new Error('Quote not found.');
  }

  if (typeof quote === 'object' && quote !== null) {
    const quoteObj = quote as { status: string };
    if (quoteObj.status !== 'draft') {
      throw new Error('Only draft quotes can be sent.');
    }
  }

  const itemsResult = await db.execute(sql`
    SELECT id FROM quote_line_items 
    WHERE tenant_id = ${tenantId}::uuid 
    AND quote_id = ${quoteId}::uuid
  `);

  const items = getRows(itemsResult);

  if (items.length === 0) {
    throw new Error('Cannot send a quote with no line items.');
  }

  const result = await db.execute(sql`
    UPDATE quotes 
    SET status = 'sent', sent_at = NOW()
    WHERE tenant_id = ${tenantId}::uuid 
    AND id = ${quoteId}::uuid
    RETURNING *
  `);

  const updated = getFirstRow(result);
  return updated;
}

export async function approveQuoteLineItem(
  tenantId: string,
  quoteId: string,
  quoteLineItemId: string,
  customerId: string,
) {
  return recordQuoteLineDecision({
    tenantId,
    quoteId,
    quoteLineItemId,
    customerId,
    decision: 'approved',
  });
}

export async function declineQuoteLineItem(
  tenantId: string,
  quoteId: string,
  quoteLineItemId: string,
  customerId: string,
  reason?: string,
) {
  return recordQuoteLineDecision({
    tenantId,
    quoteId,
    quoteLineItemId,
    customerId,
    decision: 'declined',
    reason,
  });
}

async function recordQuoteLineDecision(input: {
  tenantId: string;
  quoteId: string;
  quoteLineItemId: string;
  customerId: string;
  decision: 'approved' | 'declined';
  reason?: string;
}) {
  await requireTenantPermission(input.tenantId, 'quotes.approve');

  // Get quote
  const quoteResult = await db.execute(sql`
    SELECT * FROM quotes 
    WHERE tenant_id = ${input.tenantId}::uuid 
    AND id = ${input.quoteId}::uuid 
    LIMIT 1
  `);

  const quote = getFirstRow(quoteResult);

  if (!quote) {
    throw new Error('Quote not found.');
  }

  const quoteObj = quote as { customer_id: string; locked_at: string | null; status: string };

  if (quoteObj.customer_id !== input.customerId) {
    throw new Error('Customer is not allowed to approve this quote.');
  }

  if (quoteObj.locked_at || quoteObj.status === 'locked' || quoteObj.status === 'expired') {
    throw new Error('Quote is locked or expired.');
  }

  // Update line item
  const lineItemResult = await db.execute(sql`
    UPDATE quote_line_items 
    SET approval_status = ${input.decision}
    WHERE tenant_id = ${input.tenantId}::uuid 
    AND quote_id = ${input.quoteId}::uuid 
    AND id = ${input.quoteLineItemId}::uuid
    RETURNING *
  `);

  const lineItem = getFirstRow(lineItemResult);

  if (!lineItem) {
    throw new Error('Quote line item not found.');
  }

  // Create approval event
  await db.execute(sql`
    INSERT INTO quote_approval_events (
      tenant_id, quote_id, quote_line_item_id, 
      customer_id, decision, reason
    ) VALUES (
      ${input.tenantId}::uuid,
      ${input.quoteId}::uuid,
      ${input.quoteLineItemId}::uuid,
      ${input.customerId}::uuid,
      ${input.decision},
      ${input.reason || null}
    )
  `);

  // Get all line items to determine status
  const allItemsResult = await db.execute(sql`
    SELECT approval_status FROM quote_line_items 
    WHERE tenant_id = ${input.tenantId}::uuid 
    AND quote_id = ${input.quoteId}::uuid
  `);

  const allLineItems = getRows(allItemsResult) as { approval_status: string }[];

  const hasPending = allLineItems.some((item: { approval_status: string }) => item.approval_status === 'pending');
  const hasApproved = allLineItems.some(
    (item: { approval_status: string }) => item.approval_status === 'approved' || item.approval_status === 'not_required'
  );
  const hasDeclined = allLineItems.some((item: { approval_status: string }) => item.approval_status === 'declined');

  let status = 'draft';
  if (hasPending) {
    status = hasApproved || hasDeclined ? 'partially_approved' : 'sent';
  } else if (hasApproved) {
    status = hasDeclined ? 'partially_approved' : 'approved';
  } else {
    status = 'declined';
  }

  // Update quote status
  await db.execute(sql`
    UPDATE quotes 
    SET status = ${status}
    WHERE tenant_id = ${input.tenantId}::uuid 
    AND id = ${input.quoteId}::uuid
  `);

  return lineItem;
}

export async function lockApprovedQuote(
  tenantId: string,
  quoteId: string,
) {
  await requireTenantPermission(tenantId, 'quotes.lock');

  const quoteResult = await db.execute(sql`
    SELECT status FROM quotes 
    WHERE tenant_id = ${tenantId}::uuid 
    AND id = ${quoteId}::uuid 
    LIMIT 1
  `);

  const quote = getFirstRow(quoteResult);

  if (!quote) {
    throw new Error('Quote not found.');
  }

  const quoteObj = quote as { status: string };

  if (quoteObj.status !== 'approved') {
    throw new Error('Only approved quotes can be locked.');
  }

  // Check all items are approved
  const itemsResult = await db.execute(sql`
    SELECT approval_status FROM quote_line_items 
    WHERE tenant_id = ${tenantId}::uuid 
    AND quote_id = ${quoteId}::uuid
  `);

  const items = getRows(itemsResult) as { approval_status: string }[];
  const hasPending = items.some((item: { approval_status: string }) => item.approval_status === 'pending');

  if (hasPending) {
    throw new Error('Cannot lock a quote with pending items.');
  }

  const result = await db.execute(sql`
    UPDATE quotes 
    SET status = 'locked', locked_at = NOW()
    WHERE tenant_id = ${tenantId}::uuid 
    AND id = ${quoteId}::uuid
    RETURNING *
  `);

  const updated = getFirstRow(result);
  return updated;
}

// ============================================
// QUOTE RETRIEVAL OPERATIONS
// ============================================

export async function getCustomerQuotes(
  tenantId: string,
  customerId: string,
) {
  const result = await db.execute(sql`
    SELECT * FROM quotes 
    WHERE tenant_id = ${tenantId}::uuid 
    AND customer_id = ${customerId}::uuid
    ORDER BY created_at DESC
  `);

  return getRows(result);
}

export async function getQuoteApprovalEvents(
  tenantId: string,
  quoteId: string,
) {
  await requireTenantPermission(tenantId, 'quotes.view');

  const result = await db.execute(sql`
    SELECT * FROM quote_approval_events 
    WHERE tenant_id = ${tenantId}::uuid 
    AND quote_id = ${quoteId}::uuid
    ORDER BY created_at DESC
  `);

  return getRows(result);
}