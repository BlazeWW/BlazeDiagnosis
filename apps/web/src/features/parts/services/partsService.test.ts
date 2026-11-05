import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPartsRequestDraft } from './partsService';

// 1. Mock the tenant context
const tenantContextMock = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
}));
vi.mock('@/lib/tenancy/tenantContext', () => tenantContextMock);

// 2. Mock the database
const dbMock = vi.hoisted(() => ({
  query: {
    jobCards: {
      findFirst: vi.fn(),
    },
  },
  insert: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock('@/db/client', () => ({ db: dbMock }));

describe('partsService - createPartsRequestDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantContextMock.requireTenantContext.mockResolvedValue({ tenantId: 'tenant-A' });
  });

  it('rejects creation if the job card belongs to a different tenant', async () => {
    // DB lookup returns NULL (job card not found for tenant-A)
    dbMock.query.jobCards.findFirst.mockResolvedValueOnce(null);

    const payload = {
      jobCardId: 'job-card-from-tenant-B', 
      items: [{ partId: 'part-1', quantity: '1' }],
    };

    await expect(createPartsRequestDraft(payload)).rejects.toThrow(
      'Job card not found or unauthorized'
    );

    // Verify NO database inserts happened
    expect(dbMock.insert).not.toHaveBeenCalled();
  });
  
  it('rejects creation if quantity is invalid', async () => {
    // Job card IS found for this tenant
    dbMock.query.jobCards.findFirst.mockResolvedValueOnce({ id: 'job-1', tenantId: 'tenant-A' });

    const payload = {
      jobCardId: 'job-1',
      items: [{ partId: 'part-1', quantity: '-5' }], // Invalid negative quantity
    };

    await expect(createPartsRequestDraft(payload)).rejects.toThrow(
      'Invalid quantity'
    );
  });
});