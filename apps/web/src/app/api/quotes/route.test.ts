import { beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonRequest, readJson } from '@/test/apiRouteTestUtils';

const tenantContextMock = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
}));
const quoteServiceMock = vi.hoisted(() => ({
  addQuoteLineItem: vi.fn(),
  createQuoteFromJobCard: vi.fn(),
  getQuotes: vi.fn(),
}));

vi.mock('@/lib/tenancy/tenantContext', () => tenantContextMock);
vi.mock('@/features/quotes', () => quoteServiceMock);

import { GET, POST } from './route';

describe('/api/quotes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantContextMock.requireTenantContext.mockResolvedValue({ tenantId: 'tenant-1' });
  });

  it('returns quotes in the standardized list envelope', async () => {
    quoteServiceMock.getQuotes.mockResolvedValue([{ id: 'quote-1' }]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(quoteServiceMock.getQuotes).toHaveBeenCalledWith('tenant-1');
    await expect(readJson(response)).resolves.toEqual({
      data: { quotes: [{ id: 'quote-1' }] },
      meta: { count: 1 },
      success: true,
    });
  });

  it('creates a quote and optional line items', async () => {
    quoteServiceMock.createQuoteFromJobCard.mockResolvedValue({ id: 'quote-1' });
    quoteServiceMock.addQuoteLineItem.mockResolvedValue({ id: 'line-1' });

    const response = await POST(
      jsonRequest('http://localhost/api/quotes', {
        customerId: 'customer-1',
        jobCardId: 'job-1',
        lineItems: [
          {
            description: 'Brake pads',
            quantity: 1,
            type: 'part',
            unitPrice: 950,
          },
        ],
      }),
    );

    expect(response.status).toBe(201);
    expect(quoteServiceMock.createQuoteFromJobCard).toHaveBeenCalledWith(
      'tenant-1',
      'job-1',
      'customer-1',
    );
    expect(quoteServiceMock.addQuoteLineItem).toHaveBeenCalledWith(
      'tenant-1',
      'quote-1',
      'job-1',
      {
        description: 'Brake pads',
        quantity: 1,
        type: 'part',
        unitPrice: 950,
      },
    );
    await expect(readJson(response)).resolves.toMatchObject({
      data: { lineItems: [{ id: 'line-1' }], quote: { id: 'quote-1' } },
      success: true,
    });
  });

  it('rejects invalid quote payloads', async () => {
    const response = await POST(
      jsonRequest('http://localhost/api/quotes', { customerId: 'customer-1' }),
    );

    expect(response.status).toBe(422);
    await expect(readJson(response)).resolves.toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
      success: false,
    });
  });
});
