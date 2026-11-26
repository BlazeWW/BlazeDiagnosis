import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { db as Db } from '@/db/client';
import {
  customers,
  invoices,
  jobCards,
  quoteLineItems,
  quotes,
  tenants,
  vehicles,
} from '@/db/schema';

import type { createInvoiceFromApprovedQuote as CreateInvoice } from './invoiceService';

// Only permissions, audit and notifications are faked. The database and the
// number allocator are real.
const notificationMock = vi.hoisted(() => ({
  createInvoiceNotificationRecord: vi.fn(),
}));

vi.mock('@/lib/authorization/guards', () => ({
  requireTenantPermission: vi.fn(),
}));
vi.mock('@/lib/auditWriter', () => ({ default: { writeAudit: vi.fn() } }));
vi.mock(
  '@/features/notifications/services/notificationService',
  () => notificationMock,
);

// Runs only when DATABASE_URL points at the throwaway test database.
const useRealDb = process.env.DATABASE_URL?.includes('blaze_test') ?? false;
const year = new Date().getFullYear();

describe.skipIf(!useRealDb)(
  'BD-027 integration (real Postgres: blaze_test)',
  () => {
    let db: typeof Db;
    let createInvoiceFromApprovedQuote: typeof CreateInvoice;
    const createdTenantIds: string[] = [];

    beforeAll(async () => {
      // Imported here, not at the top: db/client throws if DATABASE_URL is missing,
      // and on CI (no .env.test) this whole block is skipped instead.
      ({ db } = await import('@/db/client'));
      ({ createInvoiceFromApprovedQuote } = await import('./invoiceService'));
    });

    afterAll(async () => {
      // Deleting the test tenants cascades to everything created under them.
      if (createdTenantIds.length) {
        await db.delete(tenants).where(inArray(tenants.id, createdTenantIds));
      }
      await db.$client.end();
    });

    async function createTenant(label: string) {
      const [tenant] = await db
        .insert(tenants)
        .values({
          name: `BD-027 test ${label}`,
          slug: `bd027-${label}-${Math.random().toString(36).slice(2, 8)}`,
        })
        .returning();
      createdTenantIds.push(tenant.id);
      return tenant.id;
    }

    // Customer -> vehicle -> job card -> approved quote with one approved line:
    // 2 x R100, R10 discount, 15% VAT = R218.50.
    async function seedApprovedQuote(tenantId: string, label: string) {
      const [customer] = await db
        .insert(customers)
        .values({ tenantId, firstName: 'Test', lastName: label })
        .returning();
      const [vehicle] = await db
        .insert(vehicles)
        .values({
          tenantId,
          primaryCustomerId: customer.id,
          make: 'Toyota',
          model: 'Corolla',
        })
        .returning();
      const [jobCard] = await db
        .insert(jobCards)
        .values({
          tenantId,
          customerId: customer.id,
          vehicleId: vehicle.id,
          jobNumber: `JOB-${label}`,
        })
        .returning();
      const [quote] = await db
        .insert(quotes)
        .values({
          tenantId,
          jobCardId: jobCard.id,
          customerId: customer.id,
          quoteNumber: `Q-${label}`,
          status: 'approved',
        })
        .returning();
      await db.insert(quoteLineItems).values({
        tenantId,
        quoteId: quote.id,
        jobCardId: jobCard.id,
        category: 'part',
        description: 'Brake pads',
        quantity: '2',
        unitPrice: '100.00',
        discount: '10.00',
        taxRate: '15',
        total: '190.00',
        approvalStatus: 'approved',
      });
      return quote.id;
    }

    it('issues INV-<year>-0001 with the correct total and locks the quote', async () => {
      const tenantId = await createTenant('first');
      const quoteId = await seedApprovedQuote(tenantId, 'first');

      const invoice = await createInvoiceFromApprovedQuote(
        tenantId,
        quoteId,
        'actor-1',
      );

      expect(invoice.invoiceNumber).toBe(`INV-${year}-0001`);
      expect(invoice.status).toBe('issued');
      expect(invoice.total).toBe('218.50');

      const [quote] = await db
        .select()
        .from(quotes)
        .where(eq(quotes.id, quoteId));
      expect(quote.status).toBe('locked');

      const rows = await db
        .select()
        .from(invoices)
        .where(eq(invoices.quoteId, quoteId));
      expect(rows).toHaveLength(1);
    });

    it('returns one invoice when the same quote is issued twice at the same time', async () => {
      const tenantId = await createTenant('double');
      const quoteId = await seedApprovedQuote(tenantId, 'double');

      // Two requests start together, like a double-click on "Issue invoice".
      const [first, second] = await Promise.all([
        createInvoiceFromApprovedQuote(tenantId, quoteId, 'actor-1'),
        createInvoiceFromApprovedQuote(tenantId, quoteId, 'actor-2'),
      ]);

      expect(second.id).toBe(first.id);
      const rows = await db
        .select()
        .from(invoices)
        .where(eq(invoices.quoteId, quoteId));
      expect(rows).toHaveLength(1);
    });

    it('gives two quotes in one tenant different numbers at the same time', async () => {
      const tenantId = await createTenant('pair');
      const quoteA = await seedApprovedQuote(tenantId, 'pair-a');
      const quoteB = await seedApprovedQuote(tenantId, 'pair-b');

      const issued = await Promise.all([
        createInvoiceFromApprovedQuote(tenantId, quoteA, 'actor-1'),
        createInvoiceFromApprovedQuote(tenantId, quoteB, 'actor-1'),
      ]);

      // sort before comparing.
      expect(issued.map((invoice) => invoice.invoiceNumber).sort()).toEqual([
        `INV-${year}-0001`,
        `INV-${year}-0002`,
      ]);
    });

    it('lets the database refuse a duplicate invoice number in the same tenant', async () => {
      const tenantId = await createTenant('unique');
      const quoteId = await seedApprovedQuote(tenantId, 'unique');
      const invoice = await createInvoiceFromApprovedQuote(
        tenantId,
        quoteId,
        'actor-1',
      );

      // Bypass the service and insert the same number directly: the unique index must stop it.
      await expect(
        db.insert(invoices).values({
          tenantId,
          jobCardId: invoice.jobCardId,
          customerId: invoice.customerId,
          invoiceNumber: invoice.invoiceNumber,
        }),
      ).rejects.toThrow();
    });

    it('rolls everything back when a later step fails, including the number', async () => {
      const tenantId = await createTenant('rollback');
      const quoteId = await seedApprovedQuote(tenantId, 'rollback');

      // The notification is the last step. Make it fail once.
      notificationMock.createInvoiceNotificationRecord.mockRejectedValueOnce(
        new Error('boom'),
      );

      await expect(
        createInvoiceFromApprovedQuote(tenantId, quoteId, 'actor-1'),
      ).rejects.toThrow('boom');

      const rows = await db
        .select()
        .from(invoices)
        .where(eq(invoices.tenantId, tenantId));
      expect(rows).toHaveLength(0);
      const [quote] = await db
        .select()
        .from(quotes)
        .where(eq(quotes.id, quoteId));
      expect(quote.status).toBe('approved');

      // The number was rolled back too, so the retry still gets 0001 (no gaps).
      const retry = await createInvoiceFromApprovedQuote(
        tenantId,
        quoteId,
        'actor-1',
      );
      expect(retry.invoiceNumber).toBe(`INV-${year}-0001`);
    });

    it("does not let one tenant invoice another tenant's quote", async () => {
      const owner = await createTenant('owner');
      const quoteId = await seedApprovedQuote(owner, 'owner');
      const intruder = await createTenant('intruder');

      await expect(
        createInvoiceFromApprovedQuote(intruder, quoteId, 'actor-1'),
      ).rejects.toThrow('Quote not found.');
    });

    it('numbers each tenant separately', async () => {
      const tenantA = await createTenant('tenant-a');
      const tenantB = await createTenant('tenant-b');
      const quoteA = await seedApprovedQuote(tenantA, 'tenant-a');
      const quoteB = await seedApprovedQuote(tenantB, 'tenant-b');

      const invoiceA = await createInvoiceFromApprovedQuote(
        tenantA,
        quoteA,
        'actor-1',
      );
      const invoiceB = await createInvoiceFromApprovedQuote(
        tenantB,
        quoteB,
        'actor-1',
      );

      expect(invoiceA.invoiceNumber).toBe(`INV-${year}-0001`);
      expect(invoiceB.invoiceNumber).toBe(`INV-${year}-0001`);
    });
  },
);
