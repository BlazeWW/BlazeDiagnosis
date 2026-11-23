import {
  CustomerProfileNotFoundError,
  getCustomerServiceHistory,
} from '@/features/customers/services/serviceHistoryService';
import { apiError, apiOk, handleApiError } from '@/lib/api/response';

const routeName = '/api/customer/service-history';

// Customer portal: the signed-in customer's own service history.
// Only page and pageSize are read from the request; tenant and customer come
// from the session.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const history = await getCustomerServiceHistory({
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
    });

    return apiOk({ items: history.items }, { meta: history.pagination });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Authentication required.'
    ) {
      return apiError('UNAUTHORIZED', 'Authentication required.', 401);
    }

    if (error instanceof CustomerProfileNotFoundError) {
      return apiError('NOT_FOUND', error.message, 404);
    }

    return handleApiError(`GET ${routeName}`, error);
  }
}
