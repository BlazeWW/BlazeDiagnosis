
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CustomerVehicleWizard } from './customerVehicleWizard';

describe('CustomerVehicleWizard', () => {
  it('displays the customer registration step', () => {
    const markup = renderToStaticMarkup(<CustomerVehicleWizard />);

    expect(markup).toContain('Customer details');
    expect(markup).toContain('First name');
    expect(markup).toContain('Last name');
    expect(markup).toContain('Either an email or phone number is required');
  });

  it('shows the registration progress and next step', () => {
    const markup = renderToStaticMarkup(<CustomerVehicleWizard />);

    expect(markup).toContain('Intake progress');
    expect(markup).toContain('Vehicle');
    expect(markup).toContain('Review');
  });
});
