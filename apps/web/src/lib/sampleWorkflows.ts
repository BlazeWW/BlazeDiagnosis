import type { Route } from 'next';
import type { InspectionFinding } from '@/types/workflow';
import type { FeatureChecklistItem, FeatureMetric, FeatureRecord } from '@/types/featureDashboard';
import type { StatusTone } from '@/types/ui';

export const currencyFormatter = new Intl.NumberFormat('en-ZA', {
  currency: 'ZAR',
  style: 'currency',
});

export function formatCurrencyFromCents(amountCents: number) {
  return currencyFormatter.format(amountCents / 100);
}

export const customerVehicleRecords: FeatureRecord[] = [
  {
    actionLabel: 'View history',
    description: '2020 Toyota Hilux 2.8 GD-6 with full workshop service history and current mileage captured at intake.',
    href: '/en/customer/services' as Route,
    id: 'veh-hilux',
    meta: 'Reg: BLAZE 123 GP · 124 300 km',
    status: 'In service',
    statusTone: 'info',
    title: 'Toyota Hilux 2.8 GD-6',
  },
  {
    actionLabel: 'Open vehicle',
    description: '2018 Volkswagen Polo 1.0 TSI with next annual service reminder queued for customer notification.',
    href: '/en/customer/services' as Route,
    id: 'veh-polo',
    meta: 'Reg: CA 123 456 · 83 910 km',
    status: 'Ready',
    statusTone: 'success',
    title: 'Volkswagen Polo 1.0 TSI',
  },
];

export const customerServiceRecords: FeatureRecord[] = [
  {
    actionLabel: 'View quote',
    description: 'Brake inspection completed. Front pads approved, discs declined, and supplier ETA confirmed for tomorrow morning.',
    href: '/en/customer/quotes' as Route,
    id: 'svc-brakes',
    meta: 'Toyota Hilux · ETA 2026-07-02 10:30',
    status: 'Waiting for parts',
    statusTone: 'warning',
    title: 'Brake service and inspection',
  },
  {
    actionLabel: 'View invoice',
    description: 'Minor service completed with oil, filter, diagnostics, and final quality check recorded.',
    href: '/en/customer/invoices' as Route,
    id: 'svc-minor',
    meta: 'Volkswagen Polo · Completed 2026-06-28',
    status: 'Completed',
    statusTone: 'success',
    title: 'Minor service',
  },
];

export const customerQuoteRecords: FeatureRecord[] = [
  {
    actionLabel: 'Review items',
    description: 'Approve or decline individual items before workshop work continues. Labor recalculates from approved work.',
    href: '/en/customer/services' as Route,
    id: 'quote-001',
    meta: 'Total if fully approved: R6,842.50 · 5 line items',
    status: 'Approval required',
    statusTone: 'warning',
    title: 'Quote Q-2026-001 · Toyota Hilux',
  },
  {
    actionLabel: 'View history',
    description: 'Oil service quote accepted from mobile and converted into final invoice after quality control.',
    href: '/en/customer/invoices' as Route,
    id: 'quote-002',
    meta: 'Approved 2026-06-28',
    status: 'Approved',
    statusTone: 'success',
    title: 'Quote Q-2026-002 · Volkswagen Polo',
  },
];

export const customerMessageRecords: FeatureRecord[] = [
  {
    actionLabel: 'Reply',
    description: 'Station: Your front brake pads are approved. We are waiting on the supplier ETA for delivery.',
    href: '/en/customer/services' as Route,
    id: 'msg-001',
    meta: 'Last update: 12 minutes ago',
    status: 'Open',
    statusTone: 'info',
    title: 'Brake service chat',
  },
  {
    actionLabel: 'View thread',
    description: 'Station: Your invoice has been issued and your vehicle is ready for collection.',
    href: '/en/customer/invoices' as Route,
    id: 'msg-002',
    meta: 'Last update: 2 days ago',
    status: 'Resolved',
    statusTone: 'success',
    title: 'Collection confirmation',
  },
];

export const stationJobRecords: FeatureRecord[] = [
  {
    actionLabel: 'Open queue',
    description: 'Customer approved brake pads only. Labor adjusted automatically and parts request is linked to supplier ETA.',
    href: '/en/station/parts' as Route,
    id: 'job-001',
    meta: 'Assigned: Themba · Floor manager: Ayesha · Due today',
    status: 'Awaiting parts',
    statusTone: 'warning',
    title: 'JC-2026-0184 · Toyota Hilux brake service',
  },
  {
    actionLabel: 'Review QC',
    description: 'Final quality check is ready after minor service, diagnostics, and customer-visible notes were captured.',
    href: '/en/station/invoices' as Route,
    id: 'job-002',
    meta: 'Assigned: Sipho · Invoice pending',
    status: 'Ready for invoice',
    statusTone: 'success',
    title: 'JC-2026-0185 · Volkswagen Polo minor service',
  },
  {
    actionLabel: 'Send quote',
    description: 'Inspection results captured with two photos and four recommended quote items awaiting manager review.',
    href: '/en/station/quotes' as Route,
    id: 'job-003',
    meta: 'Assigned: Lerato · Customer waiting',
    status: 'Quote draft',
    statusTone: 'info',
    title: 'JC-2026-0186 · BMW 320d diagnostics',
  },
];

export const stationPartsRecords: FeatureRecord[] = [
  {
    actionLabel: 'Compare offers',
    description: 'Three suppliers responded for front brake pad set with price, availability, and ETA.',
    href: '/en/station/parts' as Route,
    id: 'parts-001',
    meta: 'Best ETA: 2026-07-02 10:30 · Best price: R1,180.00',
    status: 'Responses received',
    statusTone: 'success',
    title: 'Toyota Hilux front brake pad set',
  },
  {
    actionLabel: 'Request stock',
    description: 'Compatible filters need supplier confirmation before quote can be sent to the customer.',
    href: '/en/station/quotes' as Route,
    id: 'parts-002',
    meta: 'Vehicle: BMW 320d · Engine: N47',
    status: 'Need request',
    statusTone: 'warning',
    title: 'Oil, air, and cabin filters',
  },
];

export const supplierRequestRecords: FeatureRecord[] = [
  {
    actionLabel: 'Respond',
    description: 'Station needs price, availability, ETA, and alternative options for front brake pads.',
    href: '/en/supplier/quotes' as Route,
    id: 'sup-req-001',
    meta: 'Blaze Diagnostics Demo Station · Needed today',
    status: 'New',
    statusTone: 'warning',
    title: 'Toyota Hilux front brake pads',
  },
  {
    actionLabel: 'View request',
    description: 'Oil filter, air filter, and cabin filter set for BMW 320d service quote.',
    href: '/en/supplier/quotes' as Route,
    id: 'sup-req-002',
    meta: 'Requested 34 minutes ago',
    status: 'Viewed',
    statusTone: 'info',
    title: 'BMW 320d service filter kit',
  },
];

export const supplierQuoteRecords: FeatureRecord[] = [
  {
    actionLabel: 'Update ETA',
    description: 'Quoted R1,180.00 with same-day dispatch and delivery tomorrow morning.',
    href: '/en/supplier/orders' as Route,
    id: 'sup-quote-001',
    meta: 'Quote valid until 17:00',
    status: 'Accepted',
    statusTone: 'success',
    title: 'Front brake pad set response',
  },
  {
    actionLabel: 'Edit quote',
    description: 'Alternative premium brand available at higher cost with shorter warranty.',
    href: '/en/supplier/requests' as Route,
    id: 'sup-quote-002',
    meta: 'Awaiting station review',
    status: 'Pending',
    statusTone: 'info',
    title: 'BMW filter kit response',
  },
];

export const supplierOrderRecords: FeatureRecord[] = [
  {
    actionLabel: 'Dispatch',
    description: 'Order accepted by station and ready for courier collection from warehouse.',
    href: '/en/supplier/deliveries' as Route,
    id: 'order-001',
    meta: 'PO-2026-044 · ETA 2026-07-02 10:30',
    status: 'Ready to dispatch',
    statusTone: 'warning',
    title: 'Toyota Hilux brake pad order',
  },
  {
    actionLabel: 'View order',
    description: 'Delivered and awaiting station confirmation with proof of delivery uploaded.',
    href: '/en/supplier/deliveries' as Route,
    id: 'order-002',
    meta: 'Delivered yesterday',
    status: 'Delivered',
    statusTone: 'success',
    title: 'Volkswagen Polo service kit',
  },
];

export const supplierDeliveryRecords: FeatureRecord[] = [
  {
    actionLabel: 'Confirm POD',
    description: 'Courier has collected order. Driver details and tracking reference captured for the station.',
    href: '/en/supplier/orders' as Route,
    id: 'delivery-001',
    meta: 'Courier: FastTrack · REF FT-88391',
    status: 'In transit',
    statusTone: 'info',
    title: 'Hilux brake pad delivery',
  },
  {
    actionLabel: 'Resolve delay',
    description: 'Supplier delay reason required because original ETA has passed and customer completion may move.',
    href: '/en/supplier/messages' as Route,
    id: 'delivery-002',
    meta: 'Delayed by 1 day',
    status: 'Delayed',
    statusTone: 'danger',
    title: 'BMW filter kit delivery',
  },
];

export const supplierMessageRecords: FeatureRecord[] = [
  {
    actionLabel: 'Reply',
    description: 'Station asked whether an alternative brake pad brand can still meet tomorrow morning delivery.',
    href: '/en/supplier/quotes' as Route,
    id: 'sup-msg-001',
    meta: 'Unread · 8 minutes ago',
    status: 'Needs reply',
    statusTone: 'warning',
    title: 'Alternative part confirmation',
  },
  {
    actionLabel: 'Open thread',
    description: 'Delivery note and proof-of-delivery discussion for yesterday’s service kit order.',
    href: '/en/supplier/deliveries' as Route,
    id: 'sup-msg-002',
    meta: 'Last update yesterday',
    status: 'Resolved',
    statusTone: 'success',
    title: 'POD confirmation',
  },
];

export const platformTenantRecords: FeatureRecord[] = [
  {
    actionLabel: 'Review setup',
    description: 'Pilot tenant with branding configured, staff invited, and customer portal enabled.',
    href: '/en/platform/usage' as Route,
    id: 'tenant-001',
    meta: 'Plan: Pilot · Users: 14 · Storage: 1.2 GB',
    status: 'Active',
    statusTone: 'success',
    title: 'Blaze Diagnostics Demo Station',
  },
  {
    actionLabel: 'Complete onboarding',
    description: 'Tenant created but invoice settings, supplier invitations, and tax details still need confirmation.',
    href: '/en/platform/feature-flags' as Route,
    id: 'tenant-002',
    meta: 'Plan: Trial · Users: 3 · Missing setup steps: 4',
    status: 'Onboarding',
    statusTone: 'warning',
    title: 'Northside Auto Service',
  },
];

export const platformSubscriptionRecords: FeatureRecord[] = [
  {
    actionLabel: 'View usage',
    description: 'Pilot tenant is inside the validation period with billing details pending.',
    href: '/en/platform/usage' as Route,
    id: 'sub-001',
    meta: 'Renewal placeholder: 2026-08-01',
    status: 'Pilot',
    statusTone: 'info',
    title: 'Blaze Diagnostics Demo Station',
  },
  {
    actionLabel: 'Review account',
    description: 'Trial tenant has not completed required setup and needs follow-up before activation.',
    href: '/en/platform/tenants' as Route,
    id: 'sub-002',
    meta: 'Trial ends in 11 days',
    status: 'Trial',
    statusTone: 'warning',
    title: 'Northside Auto Service',
  },
];

export const platformFeatureFlagRecords: FeatureRecord[] = [
  {
    description: 'Allows tenant to use the customer + vehicle wizard, vehicle prefill, and intake queue.',
    id: 'flag-intake',
    meta: 'Enabled for pilot tenants',
    status: 'Enabled',
    statusTone: 'success',
    title: 'customerIntakeWizard',
  },
  {
    description: 'Enables supplier response comparison in the station parts workflow.',
    id: 'flag-suppliers',
    meta: 'Enabled for demo tenant only',
    status: 'Pilot',
    statusTone: 'info',
    title: 'supplierComparison',
  },
  {
    description: 'Future integration switch for real payment links and payment provider callbacks.',
    id: 'flag-payments',
    meta: 'Blocked until PCI/provider review',
    status: 'Disabled',
    statusTone: 'neutral',
    title: 'paymentLinks',
  },
];

export const platformUsageRecords: FeatureRecord[] = [
  {
    description: 'Quotes sent, item-level approvals, and invoice conversion remain healthy for the pilot tenant.',
    id: 'usage-001',
    meta: '42 quotes · 71% approval rate · 31 invoices',
    status: 'Healthy',
    statusTone: 'success',
    title: 'Pilot tenant adoption',
  },
  {
    description: 'Supplier response time is trending above the target and should be watched during the next pilot cycle.',
    id: 'usage-002',
    meta: 'Average response: 2h 14m · Target: 1h 30m',
    status: 'Needs review',
    statusTone: 'warning',
    title: 'Supplier response performance',
  },
];

export const customerChecklist: FeatureChecklistItem[] = [
  { completed: true, label: 'Customer can view vehicles and current service progress.' },
  { completed: true, label: 'Customer can review quote status and approval history.' },
  { completed: false, label: 'Connect live customer records after production auth is finalized.' },
  { completed: false, label: 'Add mobile approval confirmation and signature capture.' },
];

export const stationChecklist: FeatureChecklistItem[] = [
  { completed: true, label: 'Surface job blockers, quote actions, supplier dependencies, and invoice readiness.' },
  { completed: true, label: 'Use responsive cards and tables inside the shared AppShell layout.' },
  { completed: false, label: 'Replace demo data with tenant-aware queries and mutation actions.' },
  { completed: false, label: 'Add automated workflow tests for status transitions.' },
];

export const supplierChecklist: FeatureChecklistItem[] = [
  { completed: true, label: 'Supplier can see request, quote, order, delivery, and message queues.' },
  { completed: false, label: 'Persist supplier responses to the database with tenant permission checks.' },
  { completed: false, label: 'Add proof-of-delivery upload and delivery exception workflow.' },
  { completed: false, label: 'Add supplier notification preferences.' },
];

export const platformChecklist: FeatureChecklistItem[] = [
  { completed: true, label: 'Platform admin can review tenant, subscription, flag, and usage queues.' },
  { completed: false, label: 'Replace mock metrics with SaaS telemetry and billing-provider data.' },
  { completed: false, label: 'Add tenant provisioning, suspension, and feature-flag mutation endpoints.' },
  { completed: false, label: 'Add platform audit reports and support access controls.' },
];

export const stationReportMetrics: FeatureMetric[] = [
  { description: 'Open service jobs', label: 'Open jobs', value: '18' },
  { description: 'Customer approvals pending', label: 'Awaiting approvals', value: '6' },
  { description: 'Parts ETA risk', label: 'Delayed jobs', value: '3' },
  { description: 'Manual payment follow-up', label: 'Outstanding invoices', value: 'R38,420' },
];

export const stationInvoiceRows = [
  {
    customer: 'Mpho Dlamini',
    dueDate: '2026-07-05',
    id: 'inv-2026-001',
    invoiceNumber: 'INV-2026-001',
    issuedAt: '2026-07-01',
    jobCard: 'JC-2026-0185',
    status: 'PENDING' as const,
    statusTone: 'warning' as StatusTone,
    totalCents: 684250,
    vehicle: 'Toyota Hilux 2.8 GD-6',
  },
  {
    customer: 'Naledi Jacobs',
    dueDate: '2026-06-30',
    id: 'inv-2026-002',
    invoiceNumber: 'INV-2026-002',
    issuedAt: '2026-06-28',
    jobCard: 'JC-2026-0179',
    status: 'OVERDUE' as const,
    statusTone: 'danger' as StatusTone,
    totalCents: 245000,
    vehicle: 'Volkswagen Polo 1.0 TSI',
  },
  {
    customer: 'Sipho Maseko',
    dueDate: '2026-06-25',
    id: 'inv-2026-003',
    invoiceNumber: 'INV-2026-003',
    issuedAt: '2026-06-21',
    jobCard: 'JC-2026-0168',
    status: 'PAID' as const,
    statusTone: 'success' as StatusTone,
    totalCents: 139995,
    vehicle: 'Ford Ranger 2.2 TDCi',
  },
];
export const stationInspectionFindings: InspectionFinding[] = [
  {
    id: 'finding-001',
    title: 'Tyre condition',
    description: 'Tyres show normal wear for their current use.',
    severity: 'normal',
  },
  {
    id: 'finding-002',
    title: 'Brake pads',
    description: 'Brake pads should be checked and replaced if necessary.',
    severity: 'advisory',
  },
  {
    id: 'finding-003',
    title: 'Brake system',
    description: 'Potential brake system issue requiring urgent attention.',
    severity: 'critical',
  },
];