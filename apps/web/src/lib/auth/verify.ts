import { jwtVerify, createRemoteJWKSet, JWTVerifyResult } from 'jose';

const auth0Domain = process.env.AUTH0_DOMAIN;
const auth0Audience = process.env.AUTH0_AUDIENCE;
const auth0Issuer = auth0Domain
  ? `https://${auth0Domain}/`
  : undefined;

if (!auth0Domain || !auth0Audience) {
  throw new Error('Missing AUTH0_DOMAIN or AUTH0_AUDIENCE environment variables.');
}

const jwks = createRemoteJWKSet(new URL(`https://${auth0Domain}/.well-known/jwks.json`));

export async function verifyAuth0Token(token: string): Promise<JWTVerifyResult> {
  return await jwtVerify(token, jwks, {
    audience: auth0Audience,
    issuer: auth0Issuer,
    algorithms: ['RS256'],
  });
}
