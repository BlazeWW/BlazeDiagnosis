'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormActions, FormField } from '@/components/forms';
import { requestJson } from '@/lib/apiClient';

export interface SupplierResponseFormProps {
  partsRequestId: string;
  partId: string;
  partName: string;
  supplierId?: string;
  error?: string;
  onSuccess?: () => void;
}

export function SupplierResponseForm({
  partsRequestId,
  partId,
  partName,
  supplierId = '',
  error,
  onSuccess,
}: SupplierResponseFormProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);
    setSubmitting(true);

    try {
      const form = new FormData(event.currentTarget);
      const quantityAvailable = Number(form.get('quantityAvailable'));
      const unitPrice = Number(form.get('unitPrice'));
      const availability = String(form.get('availability') ?? 'available');
      const etaValue = form.get('eta');
      const eta = etaValue ? new Date(String(etaValue)).toISOString() : undefined;

      const payload = {
        partsRequestId,
        supplierId,
        items: [
          {
            partId,
            partName,
            quantityAvailable,
            unitPrice,
            availability,
          },
        ],
        subtotal: unitPrice * quantityAvailable,
        tax: 0,
        total: unitPrice * quantityAvailable,
        eta,
      };

      await requestJson('/api/supplier-responses', {
        body: JSON.stringify(payload),
        errorMessage: 'Failed to submit supplier response.',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });

      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : 'Failed to submit supplier response.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = error ?? localError;

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <p className="text-sm text-muted-foreground">
        Responding to: <strong>{partName}</strong>
      </p>

      <FormField id="quantityAvailable" label="Quantity available">
        <Input
          id="quantityAvailable"
          min={1}
          name="quantityAvailable"
          required
          type="number"
        />
      </FormField>

      <FormField id="unitPrice" label="Unit price (ZAR)">
        <Input
          id="unitPrice"
          min={0}
          name="unitPrice"
          required
          step="0.01"
          type="number"
        />
      </FormField>

      <FormField id="availability" label="Availability">
        <select
          className="min-h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
          defaultValue="available"
          id="availability"
          name="availability"
        >
          <option value="available">Available</option>
          <option value="partial">Partial</option>
          <option value="unavailable">Unavailable</option>
        </select>
      </FormField>

      <FormField id="eta" label="ETA">
        <Input id="eta" name="eta" type="datetime-local" />
      </FormField>

      {displayError ? (
        <p aria-live="polite" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {displayError}
        </p>
      ) : null}

      {success ? (
        <p aria-live="polite" className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          Response submitted successfully.
        </p>
      ) : null}

      <FormActions>
        <Button disabled={submitting} type="submit" variant="accent">
          {submitting ? 'Submitting...' : 'Submit response'}
        </Button>
      </FormActions>
    </form>
  );
}