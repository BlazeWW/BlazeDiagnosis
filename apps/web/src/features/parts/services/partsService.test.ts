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
    it('persists a valid parts request and line items for the correct tenant', async () => {
    // Mock the DB finding the job card
    dbMock.query.jobCards.findFirst.mockResolvedValueOnce({ id: 'job-1', tenantId: 'tenant-A' });

    // Mock the DB insert and transaction
    const mockTx = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'req-123' }]),
        }),
      }),
    };
    dbMock.transaction.mockImplementationOnce(async (callback) => callback(mockTx));

    const payload = {
      jobCardId: 'job-1',
      items: [{ partId: 'part-1', quantity: '2' }],
    };

    // Call the service
    const result = await createPartsRequestDraft(payload);

    // Assert it worked
    expect(result).toEqual({ id: 'req-123' });
    expect(dbMock.transaction).toHaveBeenCalled();
  });
});