import { and, eq, ilike, or } from 'drizzle-orm';

import { db } from '@/db/client';
import { customers } from '@/db/schema';
import { createVehicle } from '@/features/vehicles/services/vehicleService';
import { requireTenantPermission } from '@/lib/authorization/guards';

import type {
  CreateCustomerInput,
  UpdateCustomerInput,
} from '../schemas/customerSchema';
import type { CustomerVehicleIntakeInput } from '../schemas/customerVehicleIntakeSchema';

export async function createCustomer(
  tenantId: string,
  input: CreateCustomerInput,
) {
  await requireTenantPermission(tenantId, 'customers.write');

  if (input.phone) {
    const [existingPhone] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.phone, input.phone)))
      .limit(1);

    if (existingPhone) {
      throw new Error('A customer with the same phone number already exists in this tenant.');
    }
  }

  if (input.email) {
    const [existingEmail] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.email, input.email)))
      .limit(1);

    if (existingEmail) {
      throw new Error('A customer with the same email address already exists in this tenant.');
    }
  }

  const [customer] = await db
    .insert(customers)
    .values({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      notes: input.notes,
      phone: input.phone,
      preferredLocale: input.preferredLocale,
      tenantId,
    })
    .returning();

  return customer;
}

export async function searchCustomers(tenantId: string, query: string) {
  await requireTenantPermission(tenantId, 'customers.read');

  return db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.tenantId, tenantId),
        query
          ? or(
              ilike(customers.firstName, `%${query}%`),
              ilike(customers.lastName, `%${query}%`),
              ilike(customers.email, `%${query}%`),
            )
          : undefined,
      ),
    );
}

export async function getCustomerById(tenantId: string, customerId: string) {
  await requireTenantPermission(tenantId, 'customers.read');

  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.tenantId, tenantId), eq(customers.id, customerId)))
    .limit(1);

  return customer ?? null;
}

export async function updateCustomer(
  tenantId: string,
  customerId: string,
  input: UpdateCustomerInput,
) {
  await requireTenantPermission(tenantId, 'customers.write');

  const data = {
    ...(input.email !== undefined && { email: input.email }),
    ...(input.firstName !== undefined && { firstName: input.firstName }),
    ...(input.lastName !== undefined && { lastName: input.lastName }),
    ...(input.notes !== undefined && { notes: input.notes }),
    ...(input.phone !== undefined && { phone: input.phone }),
    ...(input.preferredLocale !== undefined && {
      preferredLocale: input.preferredLocale,
    }),
    updatedAt: new Date(),
  };

  const [customer] = await db
    .update(customers)
    .set(data)
    .where(and(eq(customers.tenantId, tenantId), eq(customers.id, customerId)))
    .returning();

  return customer;
}

export async function deleteCustomer(tenantId: string, customerId: string) {
  await requireTenantPermission(tenantId, 'customers.write');

  await db
    .update(customers)
    .set({
      isArchived: true,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(customers.tenantId, tenantId),
         eq(customers.id, customerId)
        )
      );
}


export async function createCustomerVehicleIntake(
  tenantId: string,
  input: CustomerVehicleIntakeInput,
) {
  await requireTenantPermission(tenantId, 'customers.write');
  await requireTenantPermission(tenantId, 'vehicles.write');

  const customer = await createCustomer(tenantId, {
    email: input.customer.email || undefined,
    firstName: input.customer.firstName,
    lastName: input.customer.lastName,
    notes: [input.customer.notes, input.customer.address, input.customer.companyName]
      .filter(Boolean)
      .join('\n'),
    phone: input.customer.phone || undefined,
    preferredLocale: 'en',
  });

  const vehicle = await createVehicle(tenantId, {
    color: input.vehicle.color || undefined,
    engineDetails: input.vehicle.engineDetails || undefined,
    fuelType: input.vehicle.fuelType || undefined,
    make: input.vehicle.make,
    mileage: typeof input.vehicle.mileage === 'number' ? input.vehicle.mileage : undefined,
    model: input.vehicle.model,
    notes: input.vehicle.notes || undefined,
    primaryCustomerId: customer.id,
    registrationNumber: input.vehicle.registrationNumber,
    transmission: input.vehicle.transmission || undefined,
    vin: input.vehicle.vin || undefined,
    year: typeof input.vehicle.year === 'number' ? input.vehicle.year : undefined,
  });

  return { customer, vehicle };
}
