import { Clock, FileCheck2, MessageSquare, ShieldCheck } from 'lucide-react';

import { AppShell } from '@/components/common/appShell';
import { StatCard } from '@/components/common/statCard';
import { CustomerForm, CustomerList } from '@/components/customers';
import { PageSection } from '@/components/layout/pageSection';
import { ContextualHelp, ContextualHint } from '@/components/onboarding/contextualHelp';

export default function CustomerDashboardPage() {
  return (
    <AppShell
      description="A customer-first view for active service work, quote approvals, invoices, and vehicle records."
      surface="customer"
      title="Customer dashboard"
    >
      <ContextualHelp surface="customer" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard description="Currently checked in" icon={<Clock className="size-4" />} label="Active services" value="1" />
        <StatCard description="Needs customer action" icon={<FileCheck2 className="size-4" />} label="Quotes awaiting approval" value="1" />
        <StatCard description="No overdue balance" icon={<ShieldCheck className="size-4" />} label="Open invoices" value="0" />
        <StatCard description="Linked to profile" icon={<MessageSquare className="size-4" />} label="Messages" value="2" />
      </div>

      <PageSection
        description="These demo panels remain client-side until the customer server actions are connected."
        title="Customer workspace"
      >
        <ContextualHint>Use the customer form to capture contact details. The directory helps you find existing customer records without leaving this workspace.</ContextualHint>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <CustomerForm />
          <CustomerList />
        </div>
      </PageSection>
    </AppShell>
  );
}
