'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useState } from 'react';

import { FormActions, FormField } from '@/components/forms';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createCustomer, updateCustomer } from '@/lib/apiClient';
import type { CustomerFormState } from '@/types/customers';

const initialState: CustomerFormState = {
  address: '',
  alternateNumber: '',
  companyName: '',
  email: '',
  firstName: '',
  lastName: '',
  marketingConsent: false,
  mobileNumber: '',
  preferredCommunicationChannel: '',
  taxNumber: '',
};

interface CustomerFormProps {
  customerId?: string;
  initialData?: CustomerFormState;
  onSuccess?: () => void;
}

export function CustomerForm({
  customerId,
  initialData,
  onSuccess,
}: CustomerFormProps = {}) {
  const [customer, setCustomer] = useState<CustomerFormState>(initialData ?? initialState);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const isEditing = Boolean(customerId);

  const handleChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const target = event.currentTarget;
    const value =
      target instanceof HTMLInputElement && target.type === 'checkbox'
        ? target.checked
        : target.value;

    setCustomer((current) => ({ ...current, [target.name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage(null);

    try {
      const notes = [
        customer.companyName ? `Company: ${customer.companyName}` : undefined,
        customer.taxNumber ? `Tax number: ${customer.taxNumber}` : undefined,
        customer.preferredCommunicationChannel
          ? `Preferred contact: ${customer.preferredCommunicationChannel}`
          : undefined,
        customer.alternateNumber ? `Alternate number: ${customer.alternateNumber}` : undefined,
        customer.address ? `Address: ${customer.address}` : undefined,
      ]
        .filter(Boolean)
        .join('\n');

      if (isEditing && customerId) {
        await updateCustomer(customerId, {
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.mobileNumber,
          notes: notes || undefined,
          preferredLocale: 'en',
        });
        setStatusMessage('Customer updated successfully.');
      } else {
        await createCustomer({
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.mobileNumber,
          notes: notes || undefined,
          preferredLocale: 'en',
        });
        setStatusMessage('Customer saved successfully.');
        setCustomer(initialState);
      }
      onSuccess?.();
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : 'Failed to save customer.',
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Capture customer</CardTitle>
        <CardDescription>
          Add customer details for the tenant workspace. The form is ready for
          the server action integration.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="firstName" label="First name">
              <Input
                id="firstName"
                name="firstName"
                onChange={handleChange}
                required
                value={customer.firstName}
              />
            </FormField>

            <FormField id="lastName" label="Last name">
              <Input
                id="lastName"
                name="lastName"
                onChange={handleChange}
                required
                value={customer.lastName}
              />
            </FormField>

            <FormField id="email" label="Email">
              <Input
                autoComplete="email"
                id="email"
                name="email"
                onChange={handleChange}
                required
                type="email"
                value={customer.email}
              />
            </FormField>

            <FormField id="mobileNumber" label="Mobile number">
              <Input
                autoComplete="tel"
                id="mobileNumber"
                name="mobileNumber"
                onChange={handleChange}
                required
                value={customer.mobileNumber}
              />
            </FormField>

            <FormField id="alternateNumber" label="Alternate number">
              <Input
                autoComplete="tel"
                id="alternateNumber"
                name="alternateNumber"
                onChange={handleChange}
                value={customer.alternateNumber}
              />
            </FormField>

            <FormField id="companyName" label="Company name">
              <Input
                id="companyName"
                name="companyName"
                onChange={handleChange}
                value={customer.companyName}
              />
            </FormField>

            <FormField id="taxNumber" label="Tax number">
              <Input
                id="taxNumber"
                name="taxNumber"
                onChange={handleChange}
                value={customer.taxNumber}
              />
            </FormField>
          </div>

          <FormField id="address" label="Address">
            <textarea
              className="min-h-24 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              id="address"
              name="address"
              onChange={handleChange}
              value={customer.address}
            />
          </FormField>

          <FormField
            id="preferredCommunicationChannel"
            label="Preferred communication channel"
          >
            <select
              className="h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              id="preferredCommunicationChannel"
              name="preferredCommunicationChannel"
              onChange={handleChange}
              value={customer.preferredCommunicationChannel}
            >
              <option value="">Select a channel</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
            </select>
          </FormField>

          <label className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            <input
              checked={customer.marketingConsent}
              className="mt-1 size-4 rounded border-input accent-accent"
              name="marketingConsent"
              onChange={handleChange}
              type="checkbox"
            />
            <span>
              Customer consents to receive operational and marketing
              communications where legally allowed.
            </span>
          </label>

          {statusMessage ? (
            <p
              aria-live="polite"
              className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground"
            >
              {statusMessage}
            </p>
          ) : null}

          <FormActions>
            <Button type="submit" variant="accent">
              {isEditing ? 'Update customer' : 'Save customer'}
            </Button>
            <Button
              onClick={() => setCustomer(initialState)}
              type="button"
              variant="outline"
            >
              Reset
            </Button>
          </FormActions>
        </form>
      </CardContent>
    </Card>
  );
}
