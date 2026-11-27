
import 'server-only';

import { createRemoteJWKSet, jwtVerify } from 'jose';

function getAuth0Config() {
  const domain = process.env.AUTH0_DOMAIN?.trim();
  const audience = process.env.AUTH0_AUDIENCE?.trim();

  if (!domain || !audience) {
    throw new Error(
      'Missing AUTH0_DOMAIN or AUTH0_AUDIENCE environment variables.',
    );
  }

  // Accept a hostname, not an arbitrary URL.
  if (
    domain.includes('://') ||
    domain.includes('/') ||
    domain.includes(' ')
  ) {
    throw new Error('AUTH0_DOMAIN must be a valid hostname.');
  }

  const issuer = `https://${domain}/`;

  return {
    audience,
    issuer,
    jwksUrl: new URL(
      '.well-known/jwks.json',
      issuer,
    ),
  };
}

let jwks:
  | ReturnType<typeof createRemoteJWKSet>
  | null = null;

let jwksUrl: string | null = null;

export async function verifyAuth0Token(token: string) {
  if (!token || !token.trim()) {
    throw new Error('Authentication token is required.');
  }

  const config = getAuth0Config();
  const currentJwksUrl = config.jwksUrl.toString();

  if (!jwks || jwksUrl !== currentJwksUrl) {
    jwks = createRemoteJWKSet(config.jwksUrl);
    jwksUrl = currentJwksUrl;
  }

  return jwtVerify(token, jwks, {
    issuer: config.issuer,
    audience: config.audience,
    algorithms: ['RS256'],
  });
}


