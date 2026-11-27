import { beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonRequest, readJson, routeContext } from '@/test/apiRouteTestUtils';

const authMock = vi.hoisted(() => ({
  requireUser: vi.fn(),
}));
const tenantMock = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
}));
const chatServiceMock = vi.hoisted(() => ({
  ChatParticipantAccessError: class ChatParticipantAccessError extends Error {},
  listChatMessages: vi.fn(),
  sendChatMessage: vi.fn(),
}));
const guardsMock = vi.hoisted(() => ({
  TenantAccessError: class TenantAccessError extends Error {},
}));

vi.mock('@/lib/auth/session', () => authMock);
vi.mock('@/lib/tenancy/tenantContext', () => tenantMock);
vi.mock('@/features/chat/services/chatService', () => chatServiceMock);
vi.mock('@/lib/authorization/guards', () => guardsMock);

import { GET, POST } from './route';

const threadId = '11111111-1111-4111-8111-111111111111';

describe('/api/chat/threads/[threadId]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.requireUser.mockResolvedValue({
      email: 'customer@example.test',
      id: 'auth0|customer',
    });
    tenantMock.requireTenantContext.mockResolvedValue({ tenantId: 'tenant-2' });
  });

  it('passes the resolved tenant and actor to paginated reads', async () => {
    chatServiceMock.listChatMessages.mockResolvedValue({
      messages: [{ id: 'message-1', body: 'Ready for collection' }],
      nextCursor: null,
    });

    const response = await GET(
      new Request(
        `http://localhost/api/chat/threads/${threadId}/messages?limit=20`,
      ),
      routeContext({ threadId }),
    );

    expect(chatServiceMock.listChatMessages).toHaveBeenCalledWith({
      before: undefined,
      limit: 20,
      tenantId: 'tenant-2',
      threadId,
      userId: 'auth0|customer',
    });
    expect(response.status).toBe(200);
  });

  it('hides threads not available in the active tenant', async () => {
    chatServiceMock.listChatMessages.mockResolvedValue(null);

    const response = await GET(
      new Request(`http://localhost/api/chat/threads/${threadId}/messages`),
      routeContext({ threadId }),
    );

    expect(chatServiceMock.listChatMessages).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-2' }),
    );
    expect(response.status).toBe(404);
  });

  it('uses the authenticated sender and hides non-participant threads', async () => {
    chatServiceMock.sendChatMessage.mockResolvedValue({
      body: 'Thanks',
      id: 'message-2',
      senderUserId: 'auth0|customer',
    });

    const response = await POST(
      jsonRequest(`http://localhost/api/chat/threads/${threadId}/messages`, {
        body: 'Thanks',
        visibility: 'customer',
      }),
      routeContext({ threadId }),
    );

    expect(chatServiceMock.sendChatMessage).toHaveBeenCalledWith({
      body: 'Thanks',
      senderUserId: 'auth0|customer',
      tenantId: 'tenant-2',
      threadId,
      visibility: 'customer',
    });
    expect(response.status).toBe(201);
  });

  it('rejects client-supplied sender, tenant, or attachment data', async () => {
    const response = await POST(
      jsonRequest(`http://localhost/api/chat/threads/${threadId}/messages`, {
        attachments: ['private-file-id'],
        body: 'Thanks',
        senderUserId: 'attacker-user',
        tenantId: 'attacker-tenant',
      }),
      routeContext({ threadId }),
    );

    expect(response.status).toBe(422);
    expect(chatServiceMock.sendChatMessage).not.toHaveBeenCalled();
  });

  it('returns not found when the service rejects a non-participant', async () => {
    chatServiceMock.sendChatMessage.mockRejectedValue(
      new chatServiceMock.ChatParticipantAccessError(),
    );

    const response = await POST(
      jsonRequest(`http://localhost/api/chat/threads/${threadId}/messages`, {
        body: 'Not mine',
      }),
      routeContext({ threadId }),
    );

    expect(response.status).toBe(404);
    await expect(readJson(response)).resolves.toMatchObject({
      error: { code: 'NOT_FOUND' },
      success: false,
    });
  });
});
