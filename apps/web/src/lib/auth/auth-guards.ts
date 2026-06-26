// apps/web/src/lib/auth/auth-guards.ts
// TEMPORARY MOCK - Will be replaced with real auth

export async function requireTenantContext() {
  console.log("Mock tenant context called");
  
  // Use the tenant ID you just created
  const tenantId = process.env.MOCK_TENANT_ID || "temp-tenant-id";
  
  console.log("Using tenant ID:", tenantId);
  
  return { 
    tenantId: tenantId,
    userId: "temp-user-id"
  };
}

export async function requireTenantPermission(tenantId: string, permission: string) {
  console.log("Mock permission check:", { tenantId, permission });
  return true;
}