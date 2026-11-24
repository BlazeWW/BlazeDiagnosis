import { CustomerVehicleWizard } from '@/components/customers/customerVehicleWizard'; // Update path if needed

export default function CustomerWizardPage() {
  return (
    <main className="container mx-auto py-10 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Customer & Vehicle Intake</h1>
        <p className="text-muted-foreground mt-1">Complete the intake wizard to register a new customer and vehicle.</p>
      </div>
      <CustomerVehicleWizard />
    </main>
  );
}