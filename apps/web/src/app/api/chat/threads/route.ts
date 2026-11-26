import { createChatThreadSchema } from '@/features/chat/schemas/chatSchemas';
import {
  createJobChatThread,
  createSupplierChatThread,
  listChatThreads,
} from '@/features/chat/services/chatService';
import {
  apiCreated,
  apiError,
  apiOk,
  handleApiError,
} from '@/lib/api/response';
import { requireUser } from '@/lib/auth/session';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';

const routeName = '/api/chat/threads';

export async function GET() {
  try {
    const user = await requireUser();
    const tenant = await requireTenantContext();
    const result = await listChatThreads(tenant.tenantId, user.id);

    return apiOk(result, { meta: { count: result.threads.length } });
  } catch (error) {
    return handleApiError(`GET ${routeName}`, error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const tenant = await requireTenantContext();
    const input = createChatThreadSchema.parse(await request.json());
    const thread =
      input.type === 'customer'
        ? await createJobChatThread(tenant.tenantId, input.jobCardId, user.id)
        : await createSupplierChatThread(
            tenant.tenantId,
            input.partsRequestId,
            input.supplierId,
            input.supplierUserId,
            user.id,
          );

    if (!thread) {
      return apiError(
        'NOT_FOUND',
        'The requested record or permitted recipient was not found.',
        404,
      );
    }

    return apiCreated({ threadId: thread.id });
  } catch (error) {
    return handleApiError(`POST ${routeName}`, error);
  }
}
