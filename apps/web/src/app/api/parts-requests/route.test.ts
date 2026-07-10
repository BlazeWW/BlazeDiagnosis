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

describe('/api/parts-requests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantContextMock.requireTenantContext.mockResolvedValue({ tenantId: 'tenant-1' });
  });

  it('returns the tenant parts catalog', async () => {
    dbMock.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ id: 'part-1', name: 'Oil filter' }])),
      })),
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(readJson(response)).resolves.toEqual({
      data: { catalog: [{ id: 'part-1', name: 'Oil filter' }] },
      meta: { count: 1 },
      success: true,
    });
  });

  it('creates a catalog part entry', async () => {
    dbMock.insert.mockReturnValue({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 'part-1' }])),
      })),
    });

    const response = await POST(
      jsonRequest('http://localhost/api/parts-requests', {
        name: 'Oil filter',
        partNumber: 'OF-123',
      }),
    );

    expect(response.status).toBe(201);
    await expect(readJson(response)).resolves.toEqual({
      data: { partId: 'part-1' },
      success: true,
    });
  });
});
