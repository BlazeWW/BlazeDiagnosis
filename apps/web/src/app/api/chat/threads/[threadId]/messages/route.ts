import {
  chatThreadParamsSchema,
  chatPaginationSchema,
  sendChatMessageSchema,
} from '@/features/chat/schemas/chatSchemas';
import {
  ChatParticipantAccessError,
  listChatMessages,
  sendChatMessage,
} from '@/features/chat/services/chatService';
import {
  apiCreated,
  apiError,
  apiOk,
  handleApiError,
} from '@/lib/api/response';
import { requireUser } from '@/lib/auth/session';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';
import type { ApiRouteContext } from '@/types/api';

const routeName = '/api/chat/threads/[threadId]/messages';

export async function GET(
  request: Request,
  { params }: ApiRouteContext<{ threadId: string }>,
) {
  try {
    const user = await requireUser();
    const tenant = await requireTenantContext();
    const { threadId } = chatThreadParamsSchema.parse(await params);
    const query = chatPaginationSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    const result = await listChatMessages({
      before: query.before,
      limit: query.limit,
      tenantId: tenant.tenantId,
      threadId,
      userId: user.id,
    });

    if (!result) {
      return apiError('NOT_FOUND', 'Thread not found.', 404);
    }

    return apiOk(result);
  } catch (error) {
    return handleApiError(`GET ${routeName}`, error);
  }
}

export async function POST(
  request: Request,
  { params }: ApiRouteContext<{ threadId: string }>,
) {
  try {
    const user = await requireUser();
    const tenant = await requireTenantContext();
    const { threadId } = chatThreadParamsSchema.parse(await params);
    const input = sendChatMessageSchema.parse(await request.json());
    const message = await sendChatMessage({
      body: input.body,
      senderUserId: user.id,
      tenantId: tenant.tenantId,
      threadId,
      visibility: input.visibility,
    });

    return apiCreated({ message });
  } catch (error) {
    if (error instanceof ChatParticipantAccessError) {
      return apiError('NOT_FOUND', 'Thread not found.', 404);
    }

    return handleApiError(`POST ${routeName}`, error);
  }
}
