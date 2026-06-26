import { and, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  vehicleCustomers,
  vehicleOdometerReadings,
  vehicles,
} from '@/db/schema';
import { requireTenantPermission } from '@/lib/authorization/guards';

import type { CreateVehicleInput } from '../schemas/vehicleSchema';

export async function createVehicle(
  tenantId: string,
  input: CreateVehicleInput,
) {
  await requireTenantPermission(tenantId, 'vehicles.write');

  if (input.vin) {
    const [existingVin] = await db
      .select()
      .from(vehicles)
      .where(
          and(
              eq(vehicles.tenantId, tenantId),
              eq(vehicles.vin, input.vin),
              eq(vehicles.isArchived, false)
          )
      )
      .limit(1);

    if (existingVin) {
      throw new Error('A vehicle with the same VIN already exists in this tenant.');
    }
  }

  if (input.registrationNumber) {
    const [existingRegistration] = await db
      .select()
      .from(vehicles)
      .where(
        and(
          eq(vehicles.tenantId, tenantId),
          eq(vehicles.registrationNumber, input.registrationNumber),
          eq(vehicles.isArchived, false)
        ),
      )
      .limit(1);

    if (existingRegistration) {
      throw new Error('A vehicle with the same registration number already exists in this tenant.');
    }
  }

  return db.transaction(async (tx) => {
    const [vehicle] = await tx
      .insert(vehicles)
      .values({
        color: input.color,
        engineDetails: input.engineDetails,
        fuelType: input.fuelType,
        make: input.make,
        mileage: input.mileage,
        model: input.model,
        notes: input.notes,
        primaryCustomerId: input.primaryCustomerId,
        registrationNumber: input.registrationNumber,
        tenantId,
        transmission: input.transmission,
        vin: input.vin,
        year: input.year,
      })
      .returning();

    await tx.insert(vehicleCustomers).values({
      customerId: input.primaryCustomerId,
      relationshipType: 'owner',
      tenantId,
      vehicleId: vehicle.id,
    });

    if (input.mileage) {
      await tx.insert(vehicleOdometerReadings).values({
        reading: input.mileage,
        source: 'vehicle_creation',
        tenantId,
        vehicleId: vehicle.id,
      });
    }

    return vehicle;
  });
}

export async function listVehiclesForCustomer(
  tenantId: string,
  customerId: string,
) {
  await requireTenantPermission(tenantId, 'vehicles.read');

  return db
    .select()
    .from(vehicles)
    .where(
      and(
        eq(vehicles.tenantId, tenantId),
        eq(vehicles.primaryCustomerId, customerId),
      ),
    );
}

export async function getVehicleById(tenantId: string, vehicleId: string) {
  await requireTenantPermission(tenantId, 'vehicles.read');

  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(
      and(
        eq(vehicles.id, vehicleId),
        eq(vehicles.tenantId, tenantId),
        eq(vehicles.isArchived, false) // Don't fetch archived vehicles
      )
    )
    .limit(1);

  return vehicle;
}

export async function updateVehicle(
  tenantId: string,
  vehicleId: string,
  input: Partial<CreateVehicleInput>,
) {
  // Check permission
  await requireTenantPermission(tenantId, 'vehicles.write');

  return db.transaction(async (tx) => {
    // 1. Update the vehicle record fields
    const [updatedVehicle] = await tx
      .update(vehicles)
      .set({
        color: input.color,
        engineDetails: input.engineDetails,
        fuelType: input.fuelType,
        make: input.make,
        mileage: input.mileage,
        model: input.model,
        notes: input.notes,
        primaryCustomerId: input.primaryCustomerId,
        registrationNumber: input.registrationNumber,
        transmission: input.transmission,
        vin: input.vin,
        year: input.year,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(vehicles.id, vehicleId), 
          eq(vehicles.tenantId, tenantId),
          eq(vehicles.isArchived, false) 
        )
      )
      .returning();

    if (!updatedVehicle) {
      throw new Error('Vehicle not found, tenant mismatch, or vehicle is archived.');
    }

    // 2. Log updated odometer mileage history if it changed
    if (input.mileage) {
      await tx.insert(vehicleOdometerReadings).values({
        reading: input.mileage,
        source: 'vehicle_update',
        tenantId,
        vehicleId: vehicleId,
      });
    }

    return updatedVehicle;
  });
}


export async function deleteVehicle(tenantId: string, vehicleId: string) {
  await requireTenantPermission(tenantId, 'vehicles.write');

  await db
    .update(vehicles)
    .set({
      isArchived: true,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(vehicles.id, vehicleId), 
        eq(vehicles.tenantId, tenantId)
      )
    );
}
