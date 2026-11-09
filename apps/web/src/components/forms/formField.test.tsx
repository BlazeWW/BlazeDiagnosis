import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { FormField } from './formField';

describe('FormField', () => {
  it('connects the field to its error message', () => {
    const markup = renderToStaticMarkup(
      <FormField error="Enter a valid email address." id="email" label="Email">
        <input id="email" />
      </FormField>,
    );

    expect(markup).toContain('Enter a valid email address.');
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('aria-describedby="email-error"');
    expect(markup).toContain('id="email-error"');
  });
});
