import { beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonRequest, readJson } from '@/test/apiRouteTestUtils';

const authMock = vi.hoisted(() => ({
  requireUser: vi.fn(),
}));
const tenantMock = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
}));
const chatServiceMock = vi.hoisted(() => ({
  createJobChatThread: vi.fn(),
  createSupplierChatThread: vi.fn(),
  listChatThreads: vi.fn(),
}));
const guardsMock = vi.hoisted(() => ({
  TenantAccessError: class TenantAccessError extends Error {},
}));

vi.mock('@/lib/auth/session', () => authMock);
vi.mock('@/lib/tenancy/tenantContext', () => tenantMock);
vi.mock('@/features/chat/services/chatService', () => chatServiceMock);
vi.mock('@/lib/authorization/guards', () => guardsMock);

import { GET, POST } from './route';

const jobCardId = '11111111-1111-4111-8111-111111111111';
const partsRequestId = '22222222-2222-4222-8222-222222222222';
const supplierId = '33333333-3333-4333-8333-333333333333';

describe('/api/chat/threads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.requireUser.mockResolvedValue({
      email: 'station@example.test',
      id: 'auth0|station-user',
    });
    tenantMock.requireTenantContext.mockResolvedValue({ tenantId: 'tenant-1' });
  });

  it('lists only the authenticated user threads in the resolved tenant', async () => {
    chatServiceMock.listChatThreads.mockResolvedValue({
      threads: [{ id: 'thread-1', unreadCount: 2 }],
      totalUnreadCount: 2,
    });

    const response = await GET();

    expect(chatServiceMock.listChatThreads).toHaveBeenCalledWith(
      'tenant-1',
      'auth0|station-user',
    );
    expect(response.status).toBe(200);
    await expect(readJson(response)).resolves.toMatchObject({
      data: {
        threads: [{ id: 'thread-1', unreadCount: 2 }],
        totalUnreadCount: 2,
      },
    });
  });

  it('creates a customer thread using only the resolved tenant and actor', async () => {
    chatServiceMock.createJobChatThread.mockResolvedValue({ id: 'thread-1' });

    const response = await POST(
      jsonRequest('http://localhost/api/chat/threads', {
        jobCardId,
        type: 'customer',
      }),
    );

    expect(chatServiceMock.createJobChatThread).toHaveBeenCalledWith(
      'tenant-1',
      jobCardId,
      'auth0|station-user',
    );
    expect(response.status).toBe(201);
  });

  it('rejects client-supplied tenant and participant identifiers', async () => {
    const response = await POST(
      jsonRequest('http://localhost/api/chat/threads', {
        jobCardId,
        tenantId: 'attacker-tenant',
        type: 'customer',
      }),
    );

    expect(response.status).toBe(422);
    expect(chatServiceMock.createJobChatThread).not.toHaveBeenCalled();
  });

  it('creates a supplier thread for the authenticated tenant only', async () => {
    chatServiceMock.createSupplierChatThread.mockResolvedValue({
      id: 'thread-2',
    });

    const response = await POST(
      jsonRequest('http://localhost/api/chat/threads', {
        partsRequestId,
        supplierId,
        supplierUserId: 'supplier-user',
        type: 'supplier',
      }),
    );

    expect(chatServiceMock.createSupplierChatThread).toHaveBeenCalledWith(
      'tenant-1',
      partsRequestId,
      supplierId,
      'supplier-user',
      'auth0|station-user',
    );
    expect(response.status).toBe(201);
  });
});
