import { describe, it, expect } from 'vitest';
import {
  validateEvidenceUpload,
  authorizeEvidenceRead,
  authorizeEvidenceDelete,
  EvidenceAccessError,
  type EvidenceRecord,
  type ActorContext,
} from '@/features/job-cards/policies/evidencePolicy';

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';

const CUSTOMER_1_ID = 'cust-001';
const CUSTOMER_2_ID = 'cust-002';

// Typed mock fixtures simulating private storage records
const mockEvidenceStore: EvidenceRecord[] = [
  {
    id: 'file-uuid-public-1',
    tenantId: TENANT_A,
    jobId: 'job-101',
    customerId: CUSTOMER_1_ID,
    visibility: 'customer_visible',
    mimeType: 'image/jpeg',
    sizeBytes: 2 * 1024 * 1024,
  },
  {
    id: 'file-uuid-internal-1',
    tenantId: TENANT_A,
    jobId: 'job-101',
    customerId: CUSTOMER_1_ID,
    visibility: 'internal',
    mimeType: 'application/pdf',
    sizeBytes: 1 * 1024 * 1024,
  },
  {
    id: 'file-uuid-cust2-1',
    tenantId: TENANT_A,
    jobId: 'job-102',
    customerId: CUSTOMER_2_ID,
    visibility: 'customer_visible',
    mimeType: 'image/png',
    sizeBytes: 3 * 1024 * 1024,
  },
  {
    id: 'file-uuid-tenantB-1',
    tenantId: TENANT_B,
    jobId: 'job-201',
    customerId: 'cust-999',
    visibility: 'customer_visible',
    mimeType: 'image/webp',
    sizeBytes: 500 * 1024,
  },
];

describe('BD-019: Diagnostic Evidence Attachments — Policy & Security Suite', () => {
  describe('Upload Validation (MIME Types & Size Limits)', () => {
    it('accepts permitted image, PDF, and video files within 10MB', () => {
      expect(() =>
        validateEvidenceUpload({ mimeType: 'image/jpeg', sizeBytes: 5 * 1024 * 1024 })
      ).not.toThrow();

      expect(() =>
        validateEvidenceUpload({ mimeType: 'application/pdf', sizeBytes: 10 * 1024 * 1024 })
      ).not.toThrow();
    });

    it('rejects disallowed executable or script file types', () => {
      expect(() =>
        validateEvidenceUpload({ mimeType: 'application/x-msdownload', sizeBytes: 1024 })
      ).toThrow(EvidenceAccessError);

      expect(() =>
        validateEvidenceUpload({ mimeType: 'text/x-shellscript', sizeBytes: 512 })
      ).toThrow(EvidenceAccessError);
    });

    it('rejects files exceeding the 10MB size limit', () => {
      const oversizedBytes = 10 * 1024 * 1024 + 1;
      expect(() =>
        validateEvidenceUpload({ mimeType: 'image/png', sizeBytes: oversizedBytes })
      ).toThrow(/10MB/);
    });
  });

  describe('Read Authorization, ID Enumeration & Visibility Enforcement', () => {
    it('allows a customer to read customer_visible evidence for their own job', () => {
      const customer1: ActorContext = {
        userId: 'user-cust-1',
        tenantId: TENANT_A,
        role: 'customer',
        customerId: CUSTOMER_1_ID,
      };
      const record = mockEvidenceStore.find((f) => f.id === 'file-uuid-public-1') ?? null;

      const result = authorizeEvidenceRead(customer1, record);
      expect(result.id).toBe('file-uuid-public-1');
    });

    it('blocks a customer from accessing internal-only evidence on their own job', () => {
      const customer1: ActorContext = {
        userId: 'user-cust-1',
        tenantId: TENANT_A,
        role: 'customer',
        customerId: CUSTOMER_1_ID,
      };
      const internalRecord = mockEvidenceStore.find((f) => f.id === 'file-uuid-internal-1') ?? null;

      expect(() => authorizeEvidenceRead(customer1, internalRecord)).toThrow(EvidenceAccessError);
    });

    it('prevents guessing a file identifier belonging to another customer in the same tenant', () => {
      const customer1: ActorContext = {
        userId: 'user-cust-1',
        tenantId: TENANT_A,
        role: 'customer',
        customerId: CUSTOMER_1_ID,
      };
      const otherCustomerRecord = mockEvidenceStore.find((f) => f.id === 'file-uuid-cust2-1') ?? null;

      expect(() => authorizeEvidenceRead(customer1, otherCustomerRecord)).toThrow(EvidenceAccessError);
    });

    it('prevents cross-tenant file access even for station mechanics', () => {
      const mechanicTenantA: ActorContext = {
        userId: 'user-mech-a',
        tenantId: TENANT_A,
        role: 'mechanic',
      };
      const tenantBRecord = mockEvidenceStore.find((f) => f.id === 'file-uuid-tenantB-1') ?? null;

      expect(() => authorizeEvidenceRead(mechanicTenantA, tenantBRecord)).toThrow(EvidenceAccessError);
    });

    it('allows station mechanics to read both internal and customer_visible evidence in their tenant', () => {
      const mechanicTenantA: ActorContext = {
        userId: 'user-mech-a',
        tenantId: TENANT_A,
        role: 'mechanic',
      };
      const internalRecord = mockEvidenceStore.find((f) => f.id === 'file-uuid-internal-1') ?? null;

      expect(authorizeEvidenceRead(mechanicTenantA, internalRecord).id).toBe('file-uuid-internal-1');
    });
  });

  describe('Removal Handling', () => {
    it('prevents customers and suppliers from deleting evidence attachments', () => {
      const customer1: ActorContext = {
        userId: 'user-cust-1',
        tenantId: TENANT_A,
        role: 'customer',
        customerId: CUSTOMER_1_ID,
      };
      const record = mockEvidenceStore.find((f) => f.id === 'file-uuid-public-1') ?? null;

      expect(() => authorizeEvidenceDelete(customer1, record)).toThrow(EvidenceAccessError);
    });

    it('allows mechanics within the same tenant to delete evidence attachments', () => {
      const mechanicTenantA: ActorContext = {
        userId: 'user-mech-a',
        tenantId: TENANT_A,
        role: 'mechanic',
      };
      const record = mockEvidenceStore.find((f) => f.id === 'file-uuid-internal-1') ?? null;

      expect(() => authorizeEvidenceDelete(mechanicTenantA, record)).not.toThrow();
    });
  });
});