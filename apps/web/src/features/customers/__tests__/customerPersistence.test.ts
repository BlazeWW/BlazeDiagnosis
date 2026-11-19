import { beforeEach, describe, expect, it, vi } from 'vitest';

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';

type CustomerRow = {
  id: string;
  tenantId: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  preferredLocale: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  isArchived: boolean;
};

const state = vi.hoisted(() => ({
  activeTenantId: '11111111-1111-4111-8111-111111111111',
  rows: [] as CustomerRow[],
  seq: 0,
}));

function extractFilters(
  node: unknown,
  acc: {
    tenantId?: string;
    id?: string;
    excludeId?: string;
    email?: string;
    phone?: string;
    isArchived?: boolean;
  } = {},
) {
  if (!node || typeof node !== 'object') return acc;
  const obj = node as { queryChunks?: unknown[]; value?: unknown };
  const chunks = obj.queryChunks;
  if (!Array.isArray(chunks)) return acc;

  const colNames: string[] = [];
  const params: unknown[] = [];

  for (const chunk of chunks) {
    if (chunk && typeof chunk === 'object') {
      const c = chunk as { name?: string; value?: unknown; queryChunks?: unknown[] };
      if (typeof c.name === 'string') {
        colNames.push(c.name);
      } else if ('value' in c && !Array.isArray(c.value)) {
        params.push(c.value);
      } else if (Array.isArray(c.queryChunks)) {
        extractFilters(c, acc);
      }
    }
  }

  if (colNames.length === 1 && params.length === 1) {
    const col = colNames[0];
    const val = params[0];
    const rawText = chunks
      .map((c) =>
        c && typeof c === 'object' && Array.isArray((c as { value?: unknown }).value)
          ? ((c as { value: string[] }).value.join(''))
          : '',
      )
      .join('');

    if (col === 'tenant_id' && typeof val === 'string') acc.tenantId = val;
    if (col === 'id' && typeof val === 'string') {
      if (rawText.includes('<>') || rawText.includes('!=')) {
        acc.excludeId = val;
      } else {
        acc.id = val;
      }
    }
    if (col === 'email' && typeof val === 'string') acc.email = val;
    if (col === 'phone' && typeof val === 'string') acc.phone = val;
    if (col === 'is_archived' && typeof val === 'boolean') acc.isArchived = val;
  }

  return acc;
}

function queryRows(whereClause: unknown): CustomerRow[] {
  const f = extractFilters(whereClause);
  return state.rows.filter((row) => {
    if (f.tenantId !== undefined && row.tenantId !== f.tenantId) return false;
    if (f.id !== undefined && row.id !== f.id) return false;
    if (f.excludeId !== undefined && row.id === f.excludeId) return false;
    if (f.email !== undefined && row.email !== f.email) return false;
    if (f.phone !== undefined && row.phone !== f.phone) return false;
    if (f.isArchived !== undefined && row.isArchived !== f.isArchived) return false;
    return true;
  });
}

vi.mock('@/db/client', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn((whereClause: unknown) => {
          const matched = queryRows(whereClause);
          const result = Promise.resolve(matched) as Promise<CustomerRow[]> & {
            limit: (n: number) => Promise<CustomerRow[]>;
          };
          result.limit = (n: number) => Promise.resolve(matched.slice(0, n));
          return result;
        }),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((vals: Partial<CustomerRow>) => ({
        returning: vi.fn(async () => {
          state.seq += 1;
          const now = new Date();
          const created: CustomerRow = {
            id: `00000000-0000-4000-8000-${String(state.seq).padStart(12, '0')}`,
            tenantId: vals.tenantId ?? state.activeTenantId,
            userId: null,
            firstName: vals.firstName ?? '',
            lastName: vals.lastName ?? '',
            email: vals.email ?? null,
            phone: vals.phone ?? null,
            preferredLocale: vals.preferredLocale ?? 'en',
            notes: vals.notes ?? null,
            createdAt: now,
            updatedAt: now,
            isArchived: false,
          };
          state.rows.push(created);
          return [created];
        }),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn((patch: Partial<CustomerRow>) => ({
        where: vi.fn((whereClause: unknown) => ({
          returning: vi.fn(async () => {
            const matched = queryRows(whereClause);
            for (const row of matched) {
              Object.assign(row, patch);
            }
            return matched.map((r) => ({ ...r }));
          }),
        })),
      })),
    })),
  },
}));

vi.mock('@/lib/tenancy/tenantContext', () => ({
  requireTenantContext: vi.fn(async () => ({
    tenantId: state.activeTenantId,
    source: 'session' as const,
  })),
}));

vi.mock('@/lib/authorization/guards', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/authorization/guards')>();
  return {
    ...actual,
    requireTenantPermission: vi.fn(async () => undefined),
  };
});

import {
  GET as getCustomerRoute,
  PATCH as patchCustomerRoute,
} from '@/app/api/customers/[id]/route';
import {
  GET as listCustomersRoute,
  POST as createCustomerRoute,
} from '@/app/api/customers/route';
import {
  createCustomer,
  getCustomerById,
  updateCustomer,
} from '@/features/customers/services/customerService';

describe('BD-010: Customer profile persistence & tenant isolation', () => {
  beforeEach(() => {
    state.rows = [];
    state.seq = 0;
    state.activeTenantId = TENANT_A;
  });

  it('persists created and updated customer fields and reloads the same record', async () => {
    state.activeTenantId = TENANT_A;

    const created = await createCustomer(TENANT_A, {
      email: 'alice.bd010@example.com',
      firstName: 'Alice',
      lastName: 'Mokoena',
      notes: 'Initial intake note',
      phone: '+27820001111',
      preferredLocale: 'en',
    });

    expect(created.id).toBeDefined();
    expect(created.firstName).toBe('Alice');

    const updated = await updateCustomer(TENANT_A, created.id, {
      firstName: 'Alicia',
      notes: 'Updated service preference',
      phone: '+27820002222',
    });

    expect(updated.firstName).toBe('Alicia');
    expect(updated.preferredLocale).toBe('en');

    const reloaded = await getCustomerById(TENANT_A, created.id);
    expect(reloaded).not.toBeNull();
    expect(reloaded?.firstName).toBe('Alicia');
    expect(reloaded?.lastName).toBe('Mokoena');
    expect(reloaded?.email).toBe('alice.bd010@example.com');
    expect(reloaded?.phone).toBe('+27820002222');
    expect(reloaded?.notes).toBe('Updated service preference');
  });

  it('rejects duplicate email or phone within the same tenant with 409', async () => {
    state.activeTenantId = TENANT_A;

    await createCustomer(TENANT_A, {
      email: 'dup.bd010@example.com',
      firstName: 'Thabo',
      lastName: 'Ndlovu',
      phone: '+27820003333',
      preferredLocale: 'en',
    });

    const dupCreateRes = await createCustomerRoute(
      new Request('http://localhost/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'dup.bd010@example.com',
          firstName: 'Another',
          lastName: 'User',
        }),
      }),
    );

    expect(dupCreateRes.status).toBe(409);
  });

  it('prevents Tenant B from reading or updating Tenant A customer and rejects invalid input', async () => {
    state.activeTenantId = TENANT_A;

    const tenantACustomer = await createCustomer(TENANT_A, {
      email: 'private.a@example.com',
      firstName: 'Lerato',
      lastName: 'Khumalo',
      phone: '+27820004444',
      preferredLocale: 'en',
    });

    state.activeTenantId = TENANT_B;

    const crossReadService = await getCustomerById(TENANT_B, tenantACustomer.id);
    expect(crossReadService).toBeNull();

    const crossReadRes = await getCustomerRoute(
      new Request(`http://localhost/api/customers/${tenantACustomer.id}`),
      { params: Promise.resolve({ id: tenantACustomer.id }) },
    );
    expect(crossReadRes.status).toBe(404);

    const crossPatchRes = await patchCustomerRoute(
      new Request(`http://localhost/api/customers/${tenantACustomer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'Hacked' }),
      }),
      { params: Promise.resolve({ id: tenantACustomer.id }) },
    );
    expect(crossPatchRes.status).toBe(404);

    const invalidCreateRes = await createCustomerRoute(
      new Request('http://localhost/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'not-a-valid-email',
          firstName: '',
          lastName: '',
        }),
      }),
    );
    expect(invalidCreateRes.status).toBe(422);

    const emptyPatchRes = await patchCustomerRoute(
      new Request(`http://localhost/api/customers/${tenantACustomer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: tenantACustomer.id }) },
    );
    expect(emptyPatchRes.status).toBe(422);

    const listRes = await listCustomersRoute(
      new Request('http://localhost/api/customers'),
    );
    const listBody = (await listRes.json()) as {
      data: { customers: { id: string }[] };
      success: boolean;
    };

    expect(listBody.success).toBe(true);
    expect(
      listBody.data.customers.some((c) => c.id === tenantACustomer.id),
    ).toBe(false);
  });
});
