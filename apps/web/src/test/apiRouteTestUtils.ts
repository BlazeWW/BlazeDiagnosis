import type { ApiRouteContext } from '@/types/api';

export function jsonRequest(url: string, body?: unknown, init?: RequestInit) {
  return new Request(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    ...init,
  });
}

export function routeContext<TParams extends Record<string, string>>(
  params: TParams,
): ApiRouteContext<TParams> {
  return { params: Promise.resolve(params) };
}

export async function readJson<T = unknown>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
