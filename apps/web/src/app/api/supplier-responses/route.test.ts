import { beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonRequest, readJson } from '@/test/apiRouteTestUtils';

const tenantContextMock = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
}));
const dbMock = vi.hoisted(() => ({
  insert: vi.fn(),
  select: vi.fn(),
}));

vi.mock('@/lib/tenancy/tenantContext', () => tenantContextMock);
vi.mock('@/db/client', () => ({ db: dbMock }));

import { GET, POST } from './route';

const uuid = '11111111-1111-4111-8111-111111111111';

describe('/api/supplier-responses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantContextMock.requireTenantContext.mockResolvedValue({ tenantId: 'tenant-1' });
  });

  it('requires partsRequestId for GET', async () => {
    const response = await GET(new Request('http://localhost/api/supplier-responses'));

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toMatchObject({
      error: { code: 'BAD_REQUEST', details: { param: 'partsRequestId' } },
      success: false,
    });
  });

  it('lists responses for a parts request', async () => {
    dbMock.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ id: 'response-1' }])),
      })),
    });

    const response = await GET(
      new Request(`http://localhost/api/supplier-responses?partsRequestId=${uuid}`),
    );

    expect(response.status).toBe(200);
    await expect(readJson(response)).resolves.toEqual({
      data: { responses: [{ id: 'response-1' }] },
      meta: { count: 1 },
      success: true,
    });
  });

  it('creates a supplier response and child response items', async () => {
    const returning = vi.fn(() => Promise.resolve([{ id: 'response-1' }]));
    const responseValues = vi.fn(() => ({ returning }));
    const itemValues = vi.fn(() => Promise.resolve());

    dbMock.insert
      .mockReturnValueOnce({ values: responseValues })
      .mockReturnValueOnce({ values: itemValues });

    const response = await POST(
      jsonRequest('http://localhost/api/supplier-responses', {
        items: [
          {
            partId: uuid,
            partName: 'Brake pads',
            quantityAvailable: 4,
            unitPrice: 950,
          },
        ],
        partsRequestId: uuid,
        subtotal: 950,
        supplierId: uuid,
        tax: 142.5,
        total: 1092.5,
      }),
    );

    expect(response.status).toBe(201);
    expect(responseValues).toHaveBeenCalledWith(
      expect.objectContaining({
        partsRequestId: uuid,
        supplierId: uuid,
        tenantId: 'tenant-1',
      }),
    );
    expect(itemValues).toHaveBeenCalledWith([
      expect.objectContaining({
        partName: 'Brake pads',
        supplierResponseId: 'response-1',
        tenantId: 'tenant-1',
      }),
    ]);
  });
});
