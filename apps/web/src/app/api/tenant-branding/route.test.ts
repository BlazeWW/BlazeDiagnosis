import { beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonRequest, readJson } from '@/test/apiRouteTestUtils';
import { defaultTenantBranding } from '@/types/tenantBranding';

const tenantContextMock = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
}));
const tenantServiceMock = vi.hoisted(() => ({
  getTenantBrandingConfig: vi.fn(),
  updateTenantBrandingConfig: vi.fn(),
}));

vi.mock('@/lib/tenancy/tenantContext', () => tenantContextMock);
vi.mock('@/features/tenants/services/tenantService', () => tenantServiceMock);

import { GET, PUT } from './route';

describe('/api/tenant-branding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantContextMock.requireTenantContext.mockResolvedValue({ tenantId: 'tenant-1' });
  });

  it('returns current tenant branding', async () => {
    tenantServiceMock.getTenantBrandingConfig.mockResolvedValue(defaultTenantBranding);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(tenantServiceMock.getTenantBrandingConfig).toHaveBeenCalledWith('tenant-1');
    await expect(readJson(response)).resolves.toMatchObject({
      data: { branding: defaultTenantBranding },
      success: true,
    });
  });

  it('updates tenant branding', async () => {
    tenantServiceMock.updateTenantBrandingConfig.mockResolvedValue({
      ...defaultTenantBranding,
      businessName: 'Updated Motors',
    });

    const response = await PUT(
      jsonRequest('http://localhost/api/tenant-branding', {
        ...defaultTenantBranding,
        businessEmail: 'info@example.com',
        businessName: 'Updated Motors',
      }, { method: 'PUT' }),
    );

    expect(response.status).toBe(200);
    expect(tenantServiceMock.updateTenantBrandingConfig).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ businessName: 'Updated Motors' }),
    );
  });
});
