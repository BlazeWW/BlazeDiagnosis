import { describe, expect, it } from 'vitest';

import { calculateCompletionScore, validateCustomer, validateVehicle } from './customerVehicleWizard';
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

describe('validateCustomer', () => {
  it('requires non-whitespace names and at least one contact method', () => {
    expect(validateCustomer({ ...customer, firstName: ' ', lastName: ' ', phone: ' ' })).toEqual({
      email: 'Enter an email address or phone number.',
      firstName: "Enter the customer's first name.",
      lastName: "Enter the customer's last name.",
    });
  });

  it('rejects an invalid email even when a phone number is provided', () => {
    expect(
      validateCustomer({
        ...customer,
        email: 'not-an-email',
        firstName: 'Ada',
        lastName: 'Lovelace',
        phone: '555-0100',
      }),
    ).toEqual({ email: 'Enter a valid email address.' });
  });

  it('accepts trimmed names and a phone number without an email address', () => {
    expect(
      validateCustomer({
        ...customer,
        firstName: ' Ada ',
        lastName: ' Lovelace ',
        phone: '555-0100',
      }),
    ).toEqual({});
  });

  it('accepts a valid email address without a phone number', () => {
    expect(
      validateCustomer({
        ...customer,
        email: 'ada@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
      }),
    ).toEqual({});
  });
});

describe('validateVehicle', () => {
  it('requires a registration number, make, and model', () => {
    expect(validateVehicle(vehicle)).toEqual({
      make: 'Enter the vehicle make.',
      model: 'Enter the vehicle model.',
      registrationNumber: 'Enter the vehicle registration number.',
    });
  });

  it('rejects whitespace-only required vehicle details', () => {
    expect(
      validateVehicle({
        ...vehicle,
        make: ' ',
        model: ' ',
        registrationNumber: ' ',
      }),
    ).toEqual({
      make: 'Enter the vehicle make.',
      model: 'Enter the vehicle model.',
      registrationNumber: 'Enter the vehicle registration number.',
    });
  });

  it('accepts trimmed required vehicle details', () => {
    expect(
      validateVehicle({
        ...vehicle,
        make: ' Toyota ',
        model: ' Corolla ',
        registrationNumber: ' ABC 123 ',
      }),
    ).toEqual({});
  });
});