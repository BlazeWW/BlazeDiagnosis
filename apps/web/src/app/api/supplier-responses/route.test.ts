import { beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonRequest, readJson } from '@/test/apiRouteTestUtils';

import { TenantAccessError } from '@/lib/authorization/guards';

const tenantContextMock = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
}));
const dbMock = vi.hoisted(() => ({
  insert: vi.fn(),
  select: vi.fn(),
}));

const sessionMock = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));
const guardsMock = vi.hoisted(() => ({ requireTenantPermission: vi.fn() }));

vi.mock('@/lib/tenancy/tenantContext', () => tenantContextMock);
vi.mock('@/db/client', () => ({ db: dbMock }));
vi.mock('@/lib/auth/session', () => sessionMock);
vi.mock('@/lib/authorization/guards', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/authorization/guards')>()),
  ...guardsMock,
}));

// Each db.select() returns the next row set, however the query chain ends.
function queueSelects(rowSets: unknown[][]) {
  dbMock.select.mockImplementation(() => {
    const rows = rowSets.shift() ?? [];
    const chain = {
      from: () => chain,
      innerJoin: () => chain,
      where: () => chain,
      limit: () => Promise.resolve(rows),
      then: (resolve: (value: unknown) => unknown) => resolve(rows),
    };
    return chain;
  });
}

import { GET, POST } from './route';

const uuid = '11111111-1111-4111-8111-111111111111';

describe('/api/supplier-responses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantContextMock.requireTenantContext.mockResolvedValue({
      tenantId: 'tenant-1',
    });
    sessionMock.getCurrentUser.mockResolvedValue({ tenantRole: 'site_manager' });
    guardsMock.requireTenantPermission.mockResolvedValue(undefined);
  });

  it('requires partsRequestId for GET', async () => {
    const response = await GET(
      new Request('http://localhost/api/supplier-responses'),
    );

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toMatchObject({
      error: { code: 'BAD_REQUEST', details: { param: 'partsRequestId' } },
      success: false,
    });
  });

  it('compares supplier offers for a parts request', async () => {
    queueSelects([
      [{ id: uuid }],
      [{ id: 'item-1', quantity: '2' }],
      [
        {
          id: 'response-1',
          supplierName: 'Supplier A',
          total: '1092.50',
          taxTotal: '142.50',
          deliveryFee: '0.00',
          eta: null,
        },
      ],
      [
        {
          supplierResponseId: 'response-1',
          requestItemId: 'item-1',
          quantityAvailable: '2',
          availabilityStatus: 'available',
          isAlternate: false,
        },
      ],
    ]);

    const response = await GET(
      new Request(
        `http://localhost/api/supplier-responses?partsRequestId=${uuid}`,
      ),
    );

    expect(response.status).toBe(200);
    const body = (await readJson(response)) as {
      data: {
        requestedItems: unknown[];
        offers: Array<Record<string, unknown>>;
      };
    };
    expect(body.data.requestedItems).toHaveLength(1);
    expect(body.data.offers).toHaveLength(1);
    // Currency, payable total and units are not stored yet, so real offers are never ranked.
    expect(body.data.offers[0]).toMatchObject({
      id: 'response-1',
      comparable: false,
      rankWithinCurrency: null,
    });
  });

  it('blocks supplier accounts from seeing competing offers', async () => {
    sessionMock.getCurrentUser.mockResolvedValue({
      tenantRole: 'parts_supplier',
    });

    const response = await GET(
      new Request(
        `http://localhost/api/supplier-responses?partsRequestId=${uuid}`,
      ),
    );

    expect(response.status).toBe(403);
    expect(dbMock.select).not.toHaveBeenCalled();
  });

  it('returns 401 when signed out', async () => {
    sessionMock.getCurrentUser.mockResolvedValue(null);

    const response = await GET(
      new Request(
        `http://localhost/api/supplier-responses?partsRequestId=${uuid}`,
      ),
    );

    expect(response.status).toBe(401);
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

  it('rejects invalid supplier response payloads', async () => {
    const response = await POST(
      jsonRequest('http://localhost/api/supplier-responses', {
        items: [],
        partsRequestId: 'invalid-id',
        supplierId: 'invalid-id',
      }),
    );

    expect(response.status).toBe(422);
    await expect(readJson(response)).resolves.toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
      success: false,
    });
  });

  it('rejects requests when tenant access is denied', async () => {
    tenantContextMock.requireTenantContext.mockRejectedValue(
      new TenantAccessError(),
    );

    const response = await GET(
      new Request(
        `http://localhost/api/supplier-responses?partsRequestId=${uuid}`,
      ),
    );

    expect(response.status).toBe(403);
    await expect(readJson(response)).resolves.toMatchObject({
      error: { code: 'FORBIDDEN' },
      success: false,
    });
  });
});
