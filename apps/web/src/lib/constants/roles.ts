export const systemRoles = [
  'customer',
  'site_manager',
  'floor_manager',
  'mechanic',
  'parts_supplier',
  'platform_admin',
] as const;

export type SystemRole = (typeof systemRoles)[number];

export const permissions = [
  'tenant.manage',
  'tenant.settings.update',
  'users.invite',
  'users.manage',
  'customers.read',
  'customers.write',
  'vehicles.read',
  'vehicles.write',
  'jobs.read',
  'jobs.create',
  'jobs.assign',
  'jobs.update_status',
  'jobs.add_internal_note',
  'jobs.add_customer_note',
  'quotes.create',
  'quotes.send',
  'quotes.approve',
  'quotes.view',
  'quotes.update',
  'quotes.lock',
  'invoices.create',
  'invoices.update',
  'parts.request',
  'parts.approve_supplier_quote',
  'supplier.requests.read',
  'supplier.requests.respond',
  'reports.view',
  'audit.read',
  'platform.tenants.manage',
] as const;

export type Permission = (typeof permissions)[number];
