import {and,asc,desc,eq,gt,inArray,lt,ne,or,sql,
} from 'drizzle-orm';

import { db } from '@/db/client';
import {
  chatMessages,
  chatThreadParticipants,
  chatThreads,
  customers,
  jobCards,
  partsRequests,
  suppliers,
  tenantMembers,
  tenantSuppliers,
} from '@/db/schema';
import { requireTenantPermission } from '@/lib/authorization/guards';

export type ChatParticipantType = 'customer' | 'staff' | 'supplier';

export type ChatMessageVisibility =
  | 'internal'
  | 'customer'
  | 'supplier';

export class ChatParticipantAccessError extends Error {
  constructor() {
    super('Only thread participants may access or send messages.');
    this.name = 'ChatParticipantAccessError';
  }
}

export async function createJobChatThread(
  tenantId: string,
  jobCardId: string,
  customerId: string,
  creatorUserId?: string,
) {
  await requireTenantPermission(tenantId, 'jobs.read');

  const [job] = await db
    .select({
      customerId: jobCards.customerId,
      customerUserId: customers.userId,
    })
    .from(jobCards)
    .innerJoin(
      customers,
      and(
        eq(customers.id, jobCards.customerId),
        eq(customers.tenantId, jobCards.tenantId),
      ),
    )
    .where(
      and(
        eq(jobCards.tenantId, tenantId),
        eq(jobCards.id, jobCardId),
        customerId ? eq(jobCards.customerId, customerId) : undefined,
      ),
    )
    .limit(1);

  const customerUserId = job?.customerUserId;

  if (!job || !customerUserId) {
    return null;
  }

  return db.transaction(async (tx) => {
    const [thread] = await tx
      .insert(chatThreads)
      .values({
        customerId: job.customerId,
        jobCardId,
        tenantId,
        threadType: 'job_customer',
      })
      .returning();

    await tx.insert(chatThreadParticipants).values([
      {
        participantType: 'staff',
        tenantId,
        threadId: thread.id,
        userId: creatorUserId,
      },
      {
        participantType: 'customer',
        tenantId,
        threadId: thread.id,
        userId: customerUserId,
      },
    ]);

    return thread;
  });
}

export async function createSupplierChatThread(
  tenantId: string,
  partsRequestId: string,
  supplierId: string,
  supplierUserId: string,
  creatorUserId: string,
) {
  await requireTenantPermission(tenantId, 'parts.request');

  const [partsRequest] = await db
    .select({
      id: partsRequests.id,
    })
    .from(partsRequests)
    .where(
      and(
        eq(partsRequests.tenantId, tenantId),
        eq(partsRequests.id, partsRequestId),
      ),
    )
    .limit(1);

  const [supplierMember] = await db
    .select({
      supplierId: suppliers.id,
      userId: tenantMembers.userId,
    })
    .from(tenantMembers)
    .innerJoin(
      tenantSuppliers,
      and(
        eq(tenantSuppliers.tenantId, tenantMembers.tenantId),
        eq(tenantSuppliers.status, 'active'),
      ),
    )
    .innerJoin(
      suppliers,
      and(
        eq(suppliers.id, tenantSuppliers.supplierId),
        eq(suppliers.email, tenantMembers.email),
      ),
    )
    .where(
      and(
        eq(tenantMembers.tenantId, tenantId),
        eq(tenantMembers.userId, supplierUserId),
        eq(tenantMembers.role, 'parts_supplier'),
        eq(tenantMembers.status, 'active'),
        eq(suppliers.id, supplierId),
      ),
    )
    .limit(1);

  if (!partsRequest || !supplierMember) {
    return null;
  }

  return db.transaction(async (tx) => {
    const [thread] = await tx
      .insert(chatThreads)
      .values({
        partsRequestId,
        supplierId: supplierMember.supplierId,
        tenantId,
        threadType: 'parts_supplier',
      })
      .returning();

    await tx.insert(chatThreadParticipants).values([
      {
        participantType: 'staff',
        tenantId,
        threadId: thread.id,
        userId: creatorUserId,
      },
      {
        participantType: 'supplier',
        tenantId,
        threadId: thread.id,
        userId: supplierMember.userId,
      },
    ]);

    return thread;
  });
}

async function getParticipantThread(
  tenantId: string,
  threadId: string,
  userId: string,
) {
  const [result] = await db
    .select({
      participant: chatThreadParticipants,
      thread: chatThreads,
    })
    .from(chatThreadParticipants)
    .innerJoin(
      chatThreads,
      and(
        eq(
          chatThreads.id,
          chatThreadParticipants.threadId,
        ),
        eq(
          chatThreads.tenantId,
          chatThreadParticipants.tenantId,
        ),
      ),
    )
    .where(
      and(
        eq(chatThreadParticipants.tenantId, tenantId),
        eq(chatThreadParticipants.threadId, threadId),
        eq(chatThreadParticipants.userId, userId),
      ),
    )
    .limit(1);

  return result ?? null;
}

function visibleMessagesFor(
  participantType: ChatParticipantType,
) {
  if (participantType === 'customer') {
    return eq(chatMessages.visibility, 'customer');
  }

  if (participantType === 'supplier') {
    return eq(chatMessages.visibility, 'supplier');
  }

  return undefined;
}

export async function listChatThreads(
  tenantId: string,
  userId: string,
  participantType?: ChatParticipantType,
) {
  const participants = await db
    .select({
      participant: chatThreadParticipants,
      thread: chatThreads,
    })
    .from(chatThreadParticipants)
    .innerJoin(
      chatThreads,
      and(
        eq(
          chatThreads.id,
          chatThreadParticipants.threadId,
        ),
        eq(
          chatThreads.tenantId,
          chatThreadParticipants.tenantId,
        ),
      ),
    )
    .where(
      and(
        eq(chatThreadParticipants.tenantId, tenantId),
        eq(chatThreadParticipants.userId, userId),
        participantType
          ? eq(
              chatThreadParticipants.participantType,
              participantType,
            )
          : undefined,
      ),
    )
    .orderBy(desc(chatThreads.createdAt))
    .limit(50);

  const unreadRows = await db
    .select({
      count: sql<number>`count(${chatMessages.id})::int`,
      threadId: chatThreadParticipants.threadId,
    })
    .from(chatThreadParticipants)
    .innerJoin(
      chatMessages,
      and(
        eq(
          chatMessages.tenantId,
          chatThreadParticipants.tenantId,
        ),
        eq(
          chatMessages.threadId,
          chatThreadParticipants.threadId,
        ),
        ne(chatMessages.senderUserId, userId),
        gt(
          chatMessages.createdAt,
          chatThreadParticipants.lastReadAt,
        ),
        or(
          and(
            eq(
              chatThreadParticipants.participantType,
              'customer',
            ),
            eq(chatMessages.visibility, 'customer'),
          ),
          and(
            eq(
              chatThreadParticipants.participantType,
              'supplier',
            ),
            eq(chatMessages.visibility, 'supplier'),
          ),
          and(
            eq(
              chatThreadParticipants.participantType,
              'staff',
            ),
            inArray(chatMessages.visibility, [
              'internal',
              'customer',
              'supplier',
            ]),
          ),
        ),
      ),
    )
    .where(
      and(
        eq(chatThreadParticipants.tenantId, tenantId),
        eq(chatThreadParticipants.userId, userId),
        participantType
          ? eq(
              chatThreadParticipants.participantType,
              participantType,
            )
          : undefined,
      ),
    )
    .groupBy(chatThreadParticipants.threadId);

  const unreadByThread = new Map(
    unreadRows.map((row) => [
      row.threadId,
      row.count,
    ]),
  );

  const threads = participants.map(({ thread }) => ({
    id: thread.id,
    jobCardId: thread.jobCardId,
    partsRequestId: thread.partsRequestId,
    threadType: thread.threadType,
    unreadCount:
      unreadByThread.get(thread.id) ?? 0,
  }));

  return {
    threads,
    totalUnreadCount: unreadRows.reduce(
      (total, row) => total + row.count,
      0,
    ),
  };
}

export async function sendChatMessage(input: {
  tenantId: string;
  threadId: string;
  senderUserId: string;
  body: string;
  visibility?: ChatMessageVisibility;
}) {
  const participant = await getParticipantThread(
    input.tenantId,
    input.threadId,
    input.senderUserId,
  );

  if (!participant) {
    throw new ChatParticipantAccessError();
  }

  const {
    participant: threadParticipant,
    thread,
  } = participant;

  const defaultVisibility: ChatMessageVisibility =
    threadParticipant.participantType === 'supplier' ||
    thread.threadType === 'parts_supplier'
      ? 'supplier'
      : 'customer';

  const visibility =
    input.visibility ?? defaultVisibility;

  if (
    threadParticipant.participantType === 'customer' &&
    visibility !== 'customer'
  ) {
    throw new ChatParticipantAccessError();
  }

  if (
    threadParticipant.participantType === 'supplier' &&
    visibility !== 'supplier'
  ) {
    throw new ChatParticipantAccessError();
  }

  if (
    threadParticipant.participantType === 'staff' &&
    visibility !== 'internal' &&
    visibility !== defaultVisibility
  ) {
    throw new ChatParticipantAccessError();
  }

  const [message] = await db
    .insert(chatMessages)
    .values({
      body: input.body,
      senderUserId: input.senderUserId,
      tenantId: input.tenantId,
      threadId: input.threadId,
      visibility,
    })
    .returning({
      body: chatMessages.body,
      createdAt: chatMessages.createdAt,
      id: chatMessages.id,
      visibility: chatMessages.visibility,
    });

  return message;
}

export async function listChatMessages(input: {
  tenantId: string;
  threadId: string;
  userId: string;
  before?: string;
  limit: number;
}) {
  const authorized = await getParticipantThread(
    input.tenantId,
    input.threadId,
    input.userId,
  );

  if (!authorized) {
    return null;
  }

  let beforeDate: Date | undefined;
  let beforeId: string | undefined;

  if (input.before) {
    const [cursor] = await db
      .select({
        createdAt: chatMessages.createdAt,
        id: chatMessages.id,
      })
      .from(chatMessages)
      .where(
        and(
          eq(
            chatMessages.tenantId,
            input.tenantId,
          ),
          eq(
            chatMessages.threadId,
            input.threadId,
          ),
          eq(
            chatMessages.id,
            input.before,
          ),
          visibleMessagesFor(
            authorized.participant.participantType,
          ),
        ),
      )
      .limit(1);

    if (!cursor) {
      return null;
    }

    beforeDate = cursor.createdAt;
    beforeId = cursor.id;
  }

  const readAt = new Date();

  if (!input.before) {
    await db
      .update(chatThreadParticipants)
      .set({
        lastReadAt: readAt,
      })
      .where(
        and(
          eq(
            chatThreadParticipants.tenantId,
            input.tenantId,
          ),
          eq(
            chatThreadParticipants.threadId,
            input.threadId,
          ),
          eq(
            chatThreadParticipants.userId,
            input.userId,
          ),
        ),
      );
  }

  const rows = await db
    .select({
      body: chatMessages.body,
      createdAt: chatMessages.createdAt,
      id: chatMessages.id,
      visibility: chatMessages.visibility,
    })
    .from(chatMessages)
    .where(
      and(
        eq(
          chatMessages.tenantId,
          input.tenantId,
        ),
        eq(
          chatMessages.threadId,
          input.threadId,
        ),
        visibleMessagesFor(
          authorized.participant.participantType,
        ),
        input.before &&
        beforeDate &&
        beforeId
          ? or(
              lt(
                chatMessages.createdAt,
                beforeDate,
              ),
              and(
                eq(
                  chatMessages.createdAt,
                  beforeDate,
                ),
                lt(
                  chatMessages.id,
                  beforeId,
                ),
              ),
            )
          : undefined,
      ),
    )
    .orderBy(
      desc(chatMessages.createdAt),
      desc(chatMessages.id),
    )
    .limit(input.limit + 1);

  const hasMore = rows.length > input.limit;
  const page = rows.slice(0, input.limit);
  const nextCursor = hasMore
    ? page.at(-1)?.id ?? null
    : null;

  return {
    messages: page.reverse(),
    nextCursor,
  };
}
