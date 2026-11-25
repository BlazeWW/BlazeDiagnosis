
# BD-002 — Production Authentication Validation

## 1. Purpose

Verify that BlazeDiagnosis authentication is safe for
production deployments.

## 2. Authentication architecture

Authentication is handled by:

- session.ts
- verify.ts
- Auth0 JWT verification
- requireUser()
- requireTenantContext()
- requireTenantPermission()

## 3. Authentication flow

1. User sends an application request.
2. Application reads the Authorization header or auth0_session cookie.
3. Session helper extracts the token.
4. Auth0 token verification validates the JWT.
5. User identity and trusted claims are resolved.
6. Tenant membership is validated.
7. Authorization guards check permissions.
8. Application allows or rejects the request.

## 4. Security checks

- Missing token rejected.
- Expired token rejected.
- Invalid signature rejected.
- Incorrect audience rejected.
- Incorrect issuer rejected.
- Missing Auth0 configuration fails closed.
- Development fallback disabled in production.
- Invalid tenant membership rejected.
- Platform administrator privileges cannot be
  obtained through untrusted tenant claims.

## 5. Logout validation

Verify that logout clears the application session
and redirects the user appropriately.

Document bearer-token revocation separately.

## 6. Production configuration checklist

- [ ] APP_ENV=production
- [ ] ENABLE_DEV_AUTH_FALLBACK=false
- [ ] AUTH0_DOMAIN configured
- [ ] AUTH0_AUDIENCE configured
- [ ] Production secrets stored securely
- [ ] No credentials committed to Git
- [ ] HTTPS enabled
- [ ] Invalid sessions rejected
- [ ] Expired sessions rejected
- [ ] Tenant isolation verified
- [ ] Role escalation prevented

## 7. Automated testing

Record the results of:

- Valid token
- Missing token
- Invalid token
- Expired token
- Invalid signature
- Missing provider configuration
- Cookie authentication
- Bearer authentication
- Tenant membership validation
- Platform administrator privilege validation

## 8. Verification results

Record actual test, lint, typecheck and build
results before submitting the pull request.

## 9. Review

Issue: BD-002 (#94)

Independent technical-lead approval required.
