import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { TenantAccessError } from '@/lib/authorization/guards';

import {
  MissingSearchParamError,
  apiCreated,
  apiError,
  apiOk,
  apiValidationError,
  handleApiError,
  handleMissingSearchParam,
  requireSearchParam,
} from './response';

describe('API response helpers', () => {
  it('creates a standardized success response', async () => {
    const response = apiOk({ customers: [] }, { meta: { count: 0 } });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: { customers: [] },
      meta: { count: 0 },
      success: true,
    });
  });

  it('creates a standardized created response', async () => {
    const response = apiCreated({ id: 'record-1' });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      data: { id: 'record-1' },
      success: true,
    });
  });

  it('creates a standardized error response', async () => {
    const response = apiError('NOT_FOUND', 'Missing.', 404, { id: 'missing' });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'NOT_FOUND',
        details: { id: 'missing' },
        message: 'Missing.',
      },
      success: false,
    });
  });

  it('maps unauthenticated and unauthorized requests to the correct status', async () => {
    const unauthenticated = handleApiError(
      'GET /api/resource',
      new Error('Authentication required.'),
    );
    const unauthorized = handleApiError(
      'POST /api/resource',
      new Error('Missing permission: jobs.read'),
    );

    expect(unauthenticated.status).toBe(401);
    expect(unauthorized.status).toBe(403);
  });

  it('turns zod errors into validation responses', async () => {
    const result = z
      .object({ name: z.string().min(1) })
      .safeParse({ name: '' });
    if (result.success) {
      throw new Error('Expected validation to fail.');
    }

    const response = apiValidationError(result.error);

    expect(response.status).toBe(422);
    const payload = await response.json();
    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires mandatory search params', async () => {
    expect(
      requireSearchParam(new URLSearchParams('customerId=abc'), 'customerId'),
    ).toBe('abc');
    expect(() =>
      requireSearchParam(new URLSearchParams(), 'customerId'),
    ).toThrow(MissingSearchParamError);

    const response = handleMissingSearchParam(
      new MissingSearchParamError('customerId'),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'BAD_REQUEST', details: { param: 'customerId' } },
      success: false,
    });
  });

  it('returns a safe response for unexpected server errors', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const response = handleApiError(
      'GET /api/customers',
      new Error('Database password is secret.'),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal Server Error.',
      },
      success: false,
    });

    consoleError.mockRestore();
  });

  it('returns a forbidden response for tenant access errors', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const response = handleApiError(
      'GET /api/customers',
      new TenantAccessError(),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'FORBIDDEN',
        message: 'Forbidden.',
      },
      success: false,
    });

    consoleError.mockRestore();
  });

  it('returns a bad request response for malformed JSON', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const response = handleApiError(
      'POST /api/customers',
      new SyntaxError('Unexpected token in JSON'),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'BAD_REQUEST',
        message: 'Malformed JSON request body.',
      },
      success: false,
    });

    consoleError.mockRestore();
  });
});
