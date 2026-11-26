import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SupplierResponseForm } from './supplierResponseForm';

const baseProps = {
  partId: '11111111-1111-4111-8111-111111111111',
  partName: 'Brake pads',
  partsRequestId: '22222222-2222-4222-8222-222222222222',
};

describe('SupplierResponseForm', () => {
  it('renders all required supplier response fields', () => {
    const markup = renderToStaticMarkup(<SupplierResponseForm {...baseProps} />);

    expect(markup).toContain('Quantity available');
    expect(markup).toContain('Unit price');
    expect(markup).toContain('Availability');
    expect(markup).toContain('ETA');
    expect(markup).toContain('Submit response');
  });

  it('displays the part being responded to', () => {
    const markup = renderToStaticMarkup(<SupplierResponseForm {...baseProps} />);

    expect(markup).toContain('Brake pads');
    expect(markup).toContain('Responding to:');
  });

  it('shows a validation error when passed an error prop', () => {
    const markup = renderToStaticMarkup(
      <SupplierResponseForm
        {...baseProps}
        error="Quantity must be greater than zero."
      />,
    );

    expect(markup).toContain('Quantity must be greater than zero.');
  });

  it('uses a datetime-local ETA input', () => {
    const markup = renderToStaticMarkup(<SupplierResponseForm {...baseProps} />);

    expect(markup).toContain('type="datetime-local"');
  });
});