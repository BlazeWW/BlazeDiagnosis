import { jwtVerify, createRemoteJWKSet } from 'jose';
import type { JWTVerifyResult } from 'jose';

const auth0Domain = process.env.AUTH0_DOMAIN;
const auth0Audience = process.env.AUTH0_AUDIENCE;

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

export async function verifyAuth0Token(
  token: string,
): Promise<JWTVerifyResult> {
  if (!auth0Domain || !auth0Audience) {
    throw new Error(
      'Missing AUTH0_DOMAIN or AUTH0_AUDIENCE environment variables.',
    );
  }

  jwks ??= createRemoteJWKSet(
    new URL(`https://${auth0Domain}/.well-known/jwks.json`),
  );

  return await jwtVerify(token, jwks, {
    audience: auth0Audience,
    issuer: `https://${auth0Domain}/`,
    algorithms: ['RS256'],
  });
}
