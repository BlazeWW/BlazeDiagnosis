import { beforeEach, describe, expect, it, vi } from 'vitest';

const authGuardMock = vi.hoisted(() => ({
  requireTenantPermission: vi.fn(),
}));
const dbMock = vi.hoisted(() => ({
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/lib/authorization/guards', () => authGuardMock);
vi.mock('@/db/client', () => ({ db: dbMock }));

import {
  ChatParticipantAccessError,
  listChatMessages,
  listChatThreads,
  sendChatMessage,
} from './chatService';

function mockAuthorizedParticipant(
  participantType: 'customer' | 'staff' | 'supplier',
  threadType: string,
) {
  dbMock.select.mockReturnValue({
    from: vi.fn(() => ({
      innerJoin: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([
            {
              participant: { participantType },
              thread: { threadType },
            },
          ]),
        })),
      })),
    })),
  });
}

describe('chatService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forces customer messages to customer-visible correspondence', async () => {
    mockAuthorizedParticipant('customer', 'job_customer');
    dbMock.insert.mockReturnValue({
      values: vi.fn((values: Record<string, unknown>) => ({
        returning: vi.fn().mockResolvedValue([{ ...values, id: 'message-1' }]),
      })),
    });

    await expect(
      sendChatMessage({
        body: 'I approve the quote.',
        senderUserId: 'customer-user',
        tenantId: 'tenant-1',
        threadId: 'thread-1',
      }),
    ).resolves.toMatchObject({ visibility: 'customer' });
  });

  it('forces supplier messages to supplier-visible correspondence', async () => {
    mockAuthorizedParticipant('supplier', 'parts_supplier');
    dbMock.insert.mockReturnValue({
      values: vi.fn((values: Record<string, unknown>) => ({
        returning: vi.fn().mockResolvedValue([{ ...values, id: 'message-1' }]),
      })),
    });

    await expect(
      sendChatMessage({
        body: 'The requested part is available.',
        senderUserId: 'supplier-user',
        tenantId: 'tenant-1',
        threadId: 'thread-1',
      }),
    ).resolves.toMatchObject({ visibility: 'supplier' });
  });

  it('rejects internal correspondence from a customer participant', async () => {
    mockAuthorizedParticipant('customer', 'job_customer');

    await expect(
      sendChatMessage({
        body: 'Hidden note',
        senderUserId: 'customer-user',
        tenantId: 'tenant-1',
        threadId: 'thread-1',
        visibility: 'internal',
      }),
    ).rejects.toBeInstanceOf(ChatParticipantAccessError);

    expect(dbMock.insert).not.toHaveBeenCalled();
  });

  it('does not send or return messages for a non-participant', async () => {
    dbMock.select.mockReturnValue({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      })),
    });

    await expect(
      sendChatMessage({
        body: 'Not authorized',
        senderUserId: 'other-user',
        tenantId: 'tenant-1',
        threadId: 'thread-1',
      }),
    ).rejects.toBeInstanceOf(ChatParticipantAccessError);

    expect(dbMock.insert).not.toHaveBeenCalled();
  });

  it('updates last-read state when the latest page is opened', async () => {
    const participant = {
      participant: {
        participantType: 'customer',
      },
      thread: { threadType: 'job_customer' },
    };
    dbMock.select
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([participant]),
            })),
          })),
        })),
      })
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([
                { id: 'message-2', body: 'Second' },
                { id: 'message-1', body: 'First' },
              ]),
            })),
          })),
        })),
      });
    const updates: Array<{ lastReadAt: Date }> = [];
    const set = vi.fn((values: { lastReadAt: Date }) => {
      updates.push(values);
      return {
        where: vi.fn().mockResolvedValue(undefined),
      };
    });
    dbMock.update.mockReturnValue({ set });

    await expect(
      listChatMessages({
        limit: 2,
        tenantId: 'tenant-1',
        threadId: 'thread-1',
        userId: 'customer-user',
      }),
    ).resolves.toMatchObject({
      messages: [{ id: 'message-1' }, { id: 'message-2' }],
      nextCursor: null,
    });

    expect(set).toHaveBeenCalledWith({
      lastReadAt: expect.any(Date),
    });
    expect(updates[0].lastReadAt).toBeInstanceOf(Date);
  });

  it('paginates older messages without advancing the read position', async () => {
    const cursorDate = new Date('2026-03-01T10:00:00Z');
    dbMock.select
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([
                {
                  participant: { participantType: 'customer' },
                  thread: { threadType: 'job_customer' },
                },
              ]),
            })),
          })),
        })),
      })
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi
              .fn()
              .mockResolvedValue([{ createdAt: cursorDate, id: 'message-3' }]),
          })),
        })),
      })
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([
                { id: 'message-2', body: 'Second' },
                { id: 'message-1', body: 'First' },
                { id: 'message-0', body: 'Earlier' },
              ]),
            })),
          })),
        })),
      });

    await expect(
      listChatMessages({
        before: 'message-3',
        limit: 2,
        tenantId: 'tenant-1',
        threadId: 'thread-1',
        userId: 'customer-user',
      }),
    ).resolves.toMatchObject({
      messages: [{ id: 'message-1' }, { id: 'message-2' }],
      nextCursor: 'message-1',
    });
    expect(dbMock.update).not.toHaveBeenCalled();
  });

  it('does not expose threads outside the user participant list and reports unread counts', async () => {
    dbMock.select
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue([
                  {
                    participant: {
                      lastReadAt: new Date('2026-01-01T00:00:00Z'),
                      participantType: 'customer',
                    },
                    thread: {
                      id: 'thread-1',
                      jobCardId: 'job-1',
                      partsRequestId: null,
                      threadType: 'job_customer',
                    },
                  },
                ]),
              })),
            })),
          })),
        })),
      })
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              groupBy: vi
                .fn()
                .mockResolvedValue([{ threadId: 'thread-1', count: 2 }]),
            })),
          })),
        })),
      });

    await expect(listChatThreads('tenant-1', 'customer-user')).resolves.toEqual(
      {
        threads: [
          {
            id: 'thread-1',
            jobCardId: 'job-1',
            partsRequestId: null,
            threadType: 'job_customer',
            unreadCount: 2,
          },
        ],
        totalUnreadCount: 2,
      },
    );
  });
});
