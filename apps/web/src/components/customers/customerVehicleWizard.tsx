'use client';

import { CheckCircle2, ChevronLeft, ChevronRight, UserRound, Wrench } from 'lucide-react';
import type { ChangeEvent, FormEvent } from 'react';
import { useMemo, useState } from 'react';

import { FormActions, FormField } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createCustomerVehicleIntake } from '@/lib/apiClient';
import type {
  CustomerVehicleIntake,
  CustomerWizardCustomer,
  CustomerWizardStep,
  CustomerWizardVehicle,
} from '@/types/customerIntake';

const customerInitialState: CustomerWizardCustomer = {
  address: '',
  companyName: '',
  email: '',
  firstName: '',
  lastName: '',
  notes: '',
  phone: '',
  preferredContactMethod: '',
};

const vehicleInitialState: CustomerWizardVehicle = {
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

const steps: { description: string; key: CustomerWizardStep; title: string }[] = [
  {
    description: 'Capture the customer contact profile and communication preferences.',
    key: 'customer',
    title: 'Customer',
  },
  {
    description: 'Capture registration, VIN, mileage, engine, and workshop notes.',
    key: 'vehicle',
    title: 'Vehicle',
  },
  {
    description: 'Review the intake record before creating the customer and vehicle.',
    key: 'review',
    title: 'Review',
  },
];

export function CustomerVehicleWizard() {
  const [stepIndex, setStepIndex] = useState(0);
  const [customer, setCustomer] = useState<CustomerWizardCustomer>(customerInitialState);
  const [vehicle, setVehicle] = useState<CustomerWizardVehicle>(vehicleInitialState);
  const [savedIntake, setSavedIntake] = useState<CustomerVehicleIntake | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const activeStep = steps[stepIndex];

  const completionScore = useMemo(() => {
    const requiredValues = [
      customer.firstName,
      customer.lastName,
      customer.email || customer.phone,
      vehicle.registrationNumber,
      vehicle.make,
      vehicle.model,
    ];
    const completed = requiredValues.filter(Boolean).length;
    return Math.round((completed / requiredValues.length) * 100);
  }, [customer, vehicle]);

  const updateCustomer = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.currentTarget;
    setCustomer((current) => ({ ...current, [name]: value }));
  };

  const updateVehicle = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.currentTarget;
    setVehicle((current) => ({ ...current, [name]: value }));
  };

  const canContinueFromCustomer = Boolean(customer.firstName && customer.lastName && (customer.email || customer.phone));
  const canContinueFromVehicle = Boolean(vehicle.registrationNumber && vehicle.make && vehicle.model);

  const next = () => setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  const back = () => setStepIndex((current) => Math.max(current - 1, 0));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    const intake: CustomerVehicleIntake = {
      createdAt: new Date().toISOString(),
      customer,
      id: `intake_${Date.now()}`,
      status: 'queued_for_save',
      vehicle,
    };

    try {
      await createCustomerVehicleIntake({ customer, vehicle });
      setSavedIntake({ ...intake, status: 'ready_for_review' });
      setStatusMessage('Customer and vehicle intake created successfully.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to create customer and vehicle intake.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setCustomer(customerInitialState);
    setVehicle(vehicleInitialState);
    setSavedIntake(null);
    setStepIndex(0);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <Card variant="panel">
        <CardHeader>
          <CardTitle>Intake progress</CardTitle>
          <CardDescription>{completionScore}% required details captured</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${completionScore}%` }} />
          </div>
          <ol className="grid gap-2">
            {steps.map((step, index) => {
              const isActive = index === stepIndex;
              const isComplete = index < stepIndex;

              return (
                <li
                  className={`rounded-xl border p-3 text-sm transition ${
                    isActive ? 'border-accent bg-accent/10' : 'border-border bg-card'
                  }`}
                  key={step.key}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    {isComplete ? <CheckCircle2 className="size-4 text-success" /> : null}
                    {step.title}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.description}</p>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{activeStep.title} details</CardTitle>
          <CardDescription>{activeStep.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6" onSubmit={handleSubmit}>
            {activeStep.key === 'customer' ? (
              <CustomerStep customer={customer} onChange={updateCustomer} />
            ) : null}

            {activeStep.key === 'vehicle' ? (
              <VehicleStep vehicle={vehicle} onChange={updateVehicle} />
            ) : null}

            {activeStep.key === 'review' ? (
              <ReviewStep customer={customer} savedIntake={savedIntake} vehicle={vehicle} />
            ) : null}

            <FormActions className="justify-between">
              <div className="flex gap-2">
                <Button disabled={stepIndex === 0} onClick={back} type="button" variant="outline">
                  <ChevronLeft className="size-4" />
                  Back
                </Button>
                {activeStep.key !== 'review' ? (
                  <Button
                    disabled={activeStep.key === 'customer' ? !canContinueFromCustomer : !canContinueFromVehicle}
                    onClick={next}
                    type="button"
                    variant="accent"
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                ) : null}
              </div>

              {activeStep.key === 'review' ? (
                <div className="flex gap-2">
                  <Button onClick={reset} type="button" variant="outline">Reset</Button>
                  <Button disabled={isSubmitting} type="submit" variant="accent">
                    <CheckCircle2 className="size-4" />
                    {isSubmitting ? 'Creating...' : 'Create intake'}
                  </Button>
                </div>
              ) : null}
            </FormActions>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function CustomerStep({
  customer,
  onChange,
}: {
  customer: CustomerWizardCustomer;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="firstName" label="First name">
          <Input autoComplete="given-name" id="firstName" name="firstName" onChange={onChange} required value={customer.firstName} />
        </FormField>
        <FormField id="lastName" label="Last name">
          <Input autoComplete="family-name" id="lastName" name="lastName" onChange={onChange} required value={customer.lastName} />
        </FormField>
        <FormField id="email" label="Email">
          <Input autoComplete="email" id="email" name="email" onChange={onChange} type="email" value={customer.email} />
        </FormField>
        <FormField id="phone" label="Mobile / phone">
          <Input autoComplete="tel" id="phone" name="phone" onChange={onChange} value={customer.phone} />
        </FormField>
        <FormField id="companyName" label="Company / fleet name">
          <Input id="companyName" name="companyName" onChange={onChange} value={customer.companyName} />
        </FormField>
        <FormField id="preferredContactMethod" label="Preferred contact method">
          <select
            className="h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            id="preferredContactMethod"
            name="preferredContactMethod"
            onChange={onChange}
            value={customer.preferredContactMethod}
          >
            <option value="">Select method</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </FormField>
      </div>
      <FormField id="address" label="Address">
        <textarea
          className="min-h-24 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          id="address"
          name="address"
          onChange={onChange}
          value={customer.address}
        />
      </FormField>
      <FormField id="customerNotes" label="Customer notes">
        <textarea
          className="min-h-24 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          id="customerNotes"
          name="notes"
          onChange={onChange}
          value={customer.notes}
        />
      </FormField>
      <p className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        <UserRound className="mr-2 inline size-4" />
        Either an email or phone number is required so the station can send approvals and service updates.
      </p>
    </div>
  );
}

function VehicleStep({
  onChange,
  vehicle,
}: {
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  vehicle: CustomerWizardVehicle;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FormField id="registrationNumber" label="Registration number">
          <Input id="registrationNumber" name="registrationNumber" onChange={onChange} required value={vehicle.registrationNumber} />
        </FormField>
        <FormField id="vin" label="VIN">
          <Input id="vin" name="vin" onChange={onChange} value={vehicle.vin} />
        </FormField>
        <FormField id="mileage" label="Mileage / odometer">
          <Input id="mileage" inputMode="numeric" name="mileage" onChange={onChange} value={vehicle.mileage} />
        </FormField>
        <FormField id="make" label="Make">
          <Input id="make" name="make" onChange={onChange} required value={vehicle.make} />
        </FormField>
        <FormField id="model" label="Model">
          <Input id="model" name="model" onChange={onChange} required value={vehicle.model} />
        </FormField>
        <FormField id="year" label="Year">
          <Input id="year" inputMode="numeric" name="year" onChange={onChange} value={vehicle.year} />
        </FormField>
        <FormField id="color" label="Color">
          <Input id="color" name="color" onChange={onChange} value={vehicle.color} />
        </FormField>
        <FormField id="engineDetails" label="Engine details">
          <Input id="engineDetails" name="engineDetails" onChange={onChange} value={vehicle.engineDetails} />
        </FormField>
        <FormField id="fuelType" label="Fuel type">
          <select
            className="h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            id="fuelType"
            name="fuelType"
            onChange={onChange}
            value={vehicle.fuelType}
          >
            <option value="">Select fuel type</option>
            <option value="petrol">Petrol</option>
            <option value="diesel">Diesel</option>
            <option value="hybrid">Hybrid</option>
            <option value="electric">Electric</option>
          </select>
        </FormField>
        <FormField id="transmission" label="Transmission">
          <select
            className="h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            id="transmission"
            name="transmission"
            onChange={onChange}
            value={vehicle.transmission}
          >
            <option value="">Select transmission</option>
            <option value="manual">Manual</option>
            <option value="automatic">Automatic</option>
          </select>
        </FormField>
      </div>
      <FormField id="vehicleNotes" label="Vehicle notes">
        <textarea
          className="min-h-24 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          id="vehicleNotes"
          name="notes"
          onChange={onChange}
          value={vehicle.notes}
        />
      </FormField>
      <p className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Wrench className="mr-2 inline size-4" />
        Required fields are registration number, make, and model. VIN and mileage improve service-history accuracy.
      </p>
    </div>
  );
}

function ReviewStep({
  customer,
  savedIntake,
  vehicle,
}: {
  customer: CustomerWizardCustomer;
  savedIntake: CustomerVehicleIntake | null;
  vehicle: CustomerWizardVehicle;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ReviewCard
        rows={[
          ['Name', `${customer.firstName} ${customer.lastName}`],
          ['Email', customer.email || 'Not captured'],
          ['Phone', customer.phone || 'Not captured'],
          ['Company', customer.companyName || 'Not captured'],
          ['Contact method', customer.preferredContactMethod || 'Not captured'],
        ]}
        title="Customer summary"
      />
      <ReviewCard
        rows={[
          ['Registration', vehicle.registrationNumber],
          ['Vehicle', `${vehicle.year} ${vehicle.make} ${vehicle.model}`.trim()],
          ['VIN', vehicle.vin || 'Not captured'],
          ['Mileage', vehicle.mileage || 'Not captured'],
          ['Engine', vehicle.engineDetails || 'Not captured'],
        ]}
        title="Vehicle summary"
      />
      {savedIntake ? (
        <p className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success lg:col-span-2">
          Intake {savedIntake.id} was created successfully.
        </p>
      ) : (
        <p className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground lg:col-span-2">
          Submit to create the customer and vehicle records through the tenant API.
        </p>
      )}
    </div>
  );
}

function ReviewCard({ rows, title }: { rows: [string, string][]; title: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4">
      <h3 className="font-semibold">{title}</h3>
      <dl className="mt-4 grid gap-3 text-sm">
        {rows.map(([label, value]) => (
          <div className="grid gap-1" key={label}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

