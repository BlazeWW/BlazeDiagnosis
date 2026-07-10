import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  MissingSearchParamError,
  apiCreated,
  apiError,
  apiOk,
  apiValidationError,
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

  it('turns zod errors into validation responses', async () => {
    const result = z.object({ name: z.string().min(1) }).safeParse({ name: '' });
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
    expect(requireSearchParam(new URLSearchParams('customerId=abc'), 'customerId')).toBe('abc');
    expect(() => requireSearchParam(new URLSearchParams(), 'customerId')).toThrow(MissingSearchParamError);

    const response = handleMissingSearchParam(new MissingSearchParamError('customerId'));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'BAD_REQUEST', details: { param: 'customerId' } },
      success: false,
    });
  });
});
