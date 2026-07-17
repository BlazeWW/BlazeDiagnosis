export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'INTERNAL_SERVER_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'VALIDATION_ERROR';

export type ApiErrorPayload = {
  code: ApiErrorCode;
  details?: unknown;
  message: string;
};

export type ApiErrorResponse = {
  error: ApiErrorPayload;
  success: false;
};

export type ApiSuccessResponse<TData, TMeta = undefined> = TMeta extends undefined
  ? {
      data: TData;
      success: true;
    }
  : {
      data: TData;
      meta: TMeta;
      success: true;
    };

export type ApiResponse<TData, TMeta = undefined> =
  | ApiErrorResponse
  | ApiSuccessResponse<TData, TMeta>;

export type ApiListMeta = {
  count: number;
};

export type ApiRouteContext<TParams extends Record<string, string> = { id: string }> = {
  params: Promise<TParams>;
};
