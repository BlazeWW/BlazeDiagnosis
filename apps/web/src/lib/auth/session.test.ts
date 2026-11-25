
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  authorization: null as string | null,
  cookieToken: undefined as string | undefined,
  verifyAuth0Token: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({
    get: (name: string) =>
      name.toLowerCase() === 'authorization'
        ? authMocks.authorization
        : null,
  })),
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      name === 'auth0_session' && authMocks.cookieToken
        ? { value: authMocks.cookieToken }
        : undefined,
  })),
}));

vi.mock('@/lib/auth/verify', () => ({
  verifyAuth0Token: authMocks.verifyAuth0Token,
}));

import { getCurrentUser } from './session';

describe('Authentication sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    authMocks.authorization = null;
    authMocks.cookieToken = undefined;

    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('APP_ENV', 'production');
    vi.stubEnv('ENABLE_DEV_AUTH_FALLBACK', 'false');
  });

  it('rejects requests without a token in production', async () => {
    const user = await getCurrentUser();

    expect(user).toBeNull();
    expect(authMocks.verifyAuth0Token).not.toHaveBeenCalled();
  });

  it('accepts a valid bearer token', async () => {
    authMocks.authorization = 'Bearer valid-token';

    authMocks.verifyAuth0Token.mockResolvedValue({
      payload: {
        sub: 'user-123',
        email: 'user@example.com',
        'custom:tenant_id': null,
        'custom:tenant_memberships': [],
      },
    });

    const user = await getCurrentUser();

    expect(user?.id).toBe('user-123');
    expect(user?.email).toBe('user@example.com');
    expect(authMocks.verifyAuth0Token)
      .toHaveBeenCalledWith('valid-token');
  });

  it('uses the auth0_session cookie when no bearer token exists', async () => {
    authMocks.cookieToken = 'cookie-token';

    authMocks.verifyAuth0Token.mockResolvedValue({
      payload: {
        sub: 'cookie-user',
        email: 'cookie@example.com',
        'custom:tenant_id': null,
        'custom:tenant_memberships': [],
      },
    });

    const user = await getCurrentUser();

    expect(user?.id).toBe('cookie-user');
    expect(authMocks.verifyAuth0Token)
      .toHaveBeenCalledWith('cookie-token');
  });

  it('does not authenticate an invalid token', async () => {
    authMocks.authorization = 'Bearer invalid-token';

    authMocks.verifyAuth0Token.mockRejectedValue(
      new Error('Invalid token'),
    );

    await expect(getCurrentUser()).rejects.toThrow(
      'Invalid token',
    );
  });

  it('does not create a development administrator in production', async () => {

    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ENABLE_DEV_AUTH_FALLBACK', 'true');

    const user = await getCurrentUser();

    expect(user).toBeNull();
    expect(user?.tenantRole).not.toBe('platform_admin');
  });
});
