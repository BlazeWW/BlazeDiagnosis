import { Children, createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { FormField } from './formField';

describe('FormField', () => {
  it('associates the label and control while describing help and errors', () => {
    const field = FormField({
      children: createElement('input', {
        id: 'child-id',
        'aria-describedby': 'existing-help',
      }),
      description: 'Enter a valid email address.',
      error: 'Email is required.',
      id: 'email',
      label: 'Email',
    });
    const [label, control] = Children.toArray(field.props.children);

    expect(label).toMatchObject({ props: { htmlFor: 'email' } });
    expect(control).toMatchObject({
      props: {
        id: 'email',
        'aria-describedby': 'existing-help email-description email-error',
        'aria-invalid': true,
      },
    });
  });
});