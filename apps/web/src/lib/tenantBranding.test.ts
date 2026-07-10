import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  applyTenantBranding,
  getReadableForeground,
  normalizeTenantBranding,
  saveTenantBranding,
  tenantBrandingChangedEvent,
  tenantBrandingStorageKey,
} from './tenantBranding';
import { defaultTenantBranding } from '@/types/tenantBranding';

describe('tenantBranding utilities', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes partial branding over defaults', () => {
    expect(normalizeTenantBranding({ businessName: 'Demo Station' })).toEqual({
      ...defaultTenantBranding,
      businessName: 'Demo Station',
    });
  });

  it('selects readable foreground colors for light and dark brand colors', () => {
    expect(getReadableForeground('#ffffff')).toBe('#0f172a');
    expect(getReadableForeground('#111827')).toBe('#ffffff');
    expect(getReadableForeground('invalid')).toBe('#ffffff');
  });

  it('applies branding CSS variables to the document root', () => {
    const setProperty = vi.fn();
    vi.stubGlobal('document', {
      documentElement: {
        style: { setProperty },
      },
    });

    applyTenantBranding({
      ...defaultTenantBranding,
      accentColor: '#22c55e',
      primaryColor: '#111827',
      secondaryColor: '#f8fafc',
    });

    expect(setProperty).toHaveBeenCalledWith('--primary', '#111827');
    expect(setProperty).toHaveBeenCalledWith('--primary-foreground', '#ffffff');
    expect(setProperty).toHaveBeenCalledWith('--secondary-foreground', '#0f172a');
  });

  it('saves branding to localStorage and dispatches a change event', () => {
    const setItem = vi.fn();
    const dispatchEvent = vi.fn();
    const setProperty = vi.fn();
    vi.stubGlobal('window', {
      dispatchEvent,
      localStorage: { setItem },
    });
    vi.stubGlobal('document', {
      documentElement: {
        style: { setProperty },
      },
    });

    saveTenantBranding(defaultTenantBranding);

    expect(setItem).toHaveBeenCalledWith(
      tenantBrandingStorageKey,
      JSON.stringify(defaultTenantBranding),
    );
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    expect((dispatchEvent.mock.calls[0]?.[0] as Event).type).toBe(tenantBrandingChangedEvent);
  });
});
