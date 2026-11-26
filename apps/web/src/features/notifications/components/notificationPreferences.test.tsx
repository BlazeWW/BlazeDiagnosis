
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { NotificationPreferences } from './notificationPreferences';

describe('NotificationPreferences', () => {
  it('displays all notification categories', () => {
    const markup = renderToStaticMarkup(<NotificationPreferences />);

    expect(markup).toContain('Repair updates');
    expect(markup).toContain('Quotation notifications');
    expect(markup).toContain('Invoice notifications');
  });

  it('shows all preferences enabled by default', () => {
    const markup = renderToStaticMarkup(<NotificationPreferences />);

    const checkedCount = (markup.match(/checked=""/g) ?? []).length;

    expect(checkedCount).toBe(3);
  });

  it('disables save and cancel buttons when there are no changes', () => {
    const markup = renderToStaticMarkup(<NotificationPreferences />);

    expect(markup).toContain('Save preferences</button>');
    expect(markup).toContain('Cancel</button>');
    expect(markup).toContain('disabled=""');
  });

  it('provides an accessible notification preferences section', () => {
    const markup = renderToStaticMarkup(<NotificationPreferences />);

    expect(markup).toContain('<fieldset');
    expect(markup).toContain('<legend');
    expect(markup).toContain('aria-live="polite"');
  });
});
