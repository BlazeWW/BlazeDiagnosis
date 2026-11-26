import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { TenantAccessError } from '@/lib/authorization/guards';
import type { ApiErrorCode, ApiErrorResponse } from '@/types/api';

export function apiOk<TData, TMeta = undefined>(
  data: TData,
  init?: { meta?: TMeta; status?: number },
) {
  const payload =
    init?.meta === undefined
      ? { data, success: true }
      : { data, meta: init.meta, success: true };

  return NextResponse.json(payload, { status: init?.status ?? 200 });
}

export function apiCreated<TData, TMeta = undefined>(
  data: TData,
  init?: { meta?: TMeta },
) {
  return apiOk(data, { meta: init?.meta, status: 201 });
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: unknown,
) {
  const payload: ApiErrorResponse = {
    error: {
      code,
      details,
      message,
    },
    success: false,
  };

  return NextResponse.json(payload, { status });
}

export function apiValidationError(error: ZodError) {
  return apiError(
    'VALIDATION_ERROR',
    'Validation failed.',
    422,
    error.flatten(),
  );
}

// Returns a safe message without exposing internal server details
export function getErrorMessage(error: unknown) {
  void error;
  return 'Internal Server Error.';
}

export function isTenantAccessError(error: unknown) {
  if (error instanceof TenantAccessError) {
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('cross-tenant access denied') ||
      message.includes('tenant_scope_mismatch')
    );
  }

  return false;
}

export function handleApiError(route: string, error: unknown) {
  console.error(`${route} failed:`, error);

  if (error instanceof ZodError) {
    return apiValidationError(error);
  }

  if (error instanceof Error && error.message === 'Authentication required.') {
    return apiError('UNAUTHORIZED', 'Authentication required.', 401);
  }

  if (
    error instanceof Error &&
    (error.message.startsWith('Missing permission:') ||
      error.message.startsWith('Missing one of permissions:'))
  ) {
    return apiError('FORBIDDEN', 'Forbidden.', 403);
  }

  if (isTenantAccessError(error)) {
    return apiError('FORBIDDEN', 'Forbidden.', 403, {
      reason: 'tenant_scope_mismatch',
    });
  }

  // Malformed JSON is a client request error, not a server error
  if (error instanceof SyntaxError) {
    return apiError('BAD_REQUEST', 'Malformed JSON request body.', 400);
  }

  return apiError('INTERNAL_SERVER_ERROR', getErrorMessage(error), 500);
}

export function requireSearchParam(
  searchParams: URLSearchParams,
  name: string,
) {
  const value = searchParams.get(name);

  if (!value) {
    throw new MissingSearchParamError(name);
  }

  return value;
}

// Thrown by services for client mistakes (missing record, invalid reference) so routes answer 4xx, not 500.
export class ApiRequestError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export class MissingSearchParamError extends Error {
  constructor(public readonly paramName: string) {
    super(`Missing required '${paramName}' parameter.`);
    this.name = 'MissingSearchParamError';
  }
}

export function handleMissingSearchParam(error: MissingSearchParamError) {
  return apiError('BAD_REQUEST', error.message, 400, {
    param: error.paramName,
  });
}
