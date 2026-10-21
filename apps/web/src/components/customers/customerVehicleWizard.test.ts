import { describe, expect, it } from 'vitest';

import { calculateCompletionScore } from './customerVehicleWizard';
import type { CustomerWizardCustomer, CustomerWizardVehicle } from '@/types/customerIntake';

const customer: CustomerWizardCustomer = {
  address: '',
  companyName: '',
  email: '',
  firstName: '',
  lastName: '',
  notes: '',
  phone: '',
  preferredContactMethod: '',
};

const vehicle: CustomerWizardVehicle = {
  color: '',
  engineDetails: '',
  fuelType: '',
  make: '',
  mileage: '',
  model: '',
  notes: '',
  registrationNumber: '',
  transmission: '',
  vin: '',
  year: '',
};

describe('calculateCompletionScore', () => {
  it('does not count whitespace-only required fields as complete', () => {
    expect(
      calculateCompletionScore(
        { ...customer, email: ' ', firstName: ' ', lastName: ' ' },
        { ...vehicle, make: ' ', model: ' ', registrationNumber: ' ' },
      ),
    ).toBe(0);
  });

  it('counts trimmed values and phone as the contact requirement', () => {
    expect(
      calculateCompletionScore(
        { ...customer, email: ' ', firstName: ' Ada ', lastName: ' Lovelace ', phone: ' 555 ' },
        { ...vehicle, make: ' Saab ', model: ' 900 ', registrationNumber: ' ABC 123 ' },
      ),
    ).toBe(100);
  });
});