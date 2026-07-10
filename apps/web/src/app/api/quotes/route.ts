import { z } from 'zod';

import {
  addQuoteLineItem,
  createQuoteFromJobCard,
  getQuotes,
} from '@/features/quotes';
import { apiCreated, apiOk, handleApiError } from '@/lib/api/response';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';

const routeName = '/api/quotes';

const createQuoteLineItemSchema = z.object({
  description: z.string().min(1, 'Line item description is required.'),
  quantity: z.number().positive('Quantity must be greater than zero.'),
  type: z
    .enum(['part', 'labor', 'diagnostic', 'consumable', 'optional_service'])
    .default('part'),
  unitPrice: z.number().nonnegative('Unit price cannot be negative.'),
});

const createQuoteSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required.'),
  jobCardId: z.string().min(1, 'Job card ID is required.'),
  lineItems: z.array(createQuoteLineItemSchema).default([]),
});

export async function GET() {
  try {
    const tenant = await requireTenantContext();
    const quotes = await getQuotes(tenant.tenantId);

    return apiOk({ quotes }, { meta: { count: quotes.length } });
  } catch (error) {
    return handleApiError(`GET ${routeName}`, error);
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await requireTenantContext();
    const input = createQuoteSchema.parse(await request.json());
    const quote = await createQuoteFromJobCard(
      tenant.tenantId,
      input.jobCardId,
      input.customerId,
    );
    const quoteId = (quote as { id: string }).id;

    const lineItems = [];
    for (const item of input.lineItems) {
      const lineItem = await addQuoteLineItem(
        tenant.tenantId,
        quoteId,
        input.jobCardId,
        item,
      );
      lineItems.push(lineItem);
    }

    return apiCreated({ lineItems, quote });
  } catch (error) {
    return handleApiError(`POST ${routeName}`, error);
  }
}
