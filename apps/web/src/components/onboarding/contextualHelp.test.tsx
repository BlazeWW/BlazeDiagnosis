import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ContextualHint } from './contextualHelp';

describe('ContextualHint', () => {
  it('renders accessible contextual guidance without interactive form controls', () => {
    const markup = renderToStaticMarkup(
      <ContextualHint>Keep this form open while reviewing the guidance.</ContextualHint>,
    );

    expect(markup).toContain('aria-label="Contextual help"');
    expect(markup).toContain('Keep this form open while reviewing the guidance.');
    expect(markup).not.toContain('<input');
  });
});
