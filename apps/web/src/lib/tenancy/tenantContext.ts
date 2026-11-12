import { db } from "@/db/client";
import { tenantDomains } from "@/db/schema/tenants";
import { requireUser } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export type TenantContext = {
  tenantId: string;
  source: "session" | "host" | "platform_override";
};

export async function resolveTenantFromRequest(): Promise<TenantContext | null> {
  const user = await requireUser().catch(() => null);

  if (user?.activeTenantId) {
    return {
      tenantId: user.activeTenantId,
      source: "session",
    };
  }

  const headerList = await headers();
  const host = headerList.get("host");

  if (!host) {
    return null;
  }

  const match = await db
    .select()
    .from(tenantDomains)
    .where(eq(tenantDomains.domain, host))
    .limit(1);

  if (match.length > 0) {
    return {
      tenantId: match[0].tenantId,
      source: "host",
    };
  }

  return null;
}

export async function requireTenantContext(): Promise<TenantContext> {
  const tenant = await resolveTenantFromRequest();

  if (!tenant) {
    if (process.env.NODE_ENV === "development") {
      console.warn("⚠️ No tenant found — using dev fallback tenant.");
      return {
        tenantId: process.env.MOCK_TENANT_ID ?? "00000000-0000-0000-0000-000000000001",
        source: "platform_override",
      };
    }

    throw new Error("Tenant context required.");
  }

  return tenant;
}

export function assertSameTenant(resourceTenantId: string, context: TenantContext) {
  if (resourceTenantId !== context.tenantId) {
    throw new Error("Cross-tenant access denied.");
  }
}
