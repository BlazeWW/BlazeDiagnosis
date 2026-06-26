'use client';

import { useEffect, useState } from 'react';

import { StatusBadge } from '@/components/common/statusBadge';
import { EmptyState } from '@/components/data-display';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requestJson } from '@/lib/apiClient';
import type { VehicleDetailProps, VehicleDetailRecord } from '@/types/vehicles';

export function VehicleDetail({ vehicleId }: VehicleDetailProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState<VehicleDetailRecord | null>(null);

    useEffect(() => {
    const loadVehicle = async () => {
      try {
        setError(null);
        setLoading(true);

        // 1. FIXED: Expect an object with a singular 'vehicle' property
        const data = await requestJson<{ vehicle: VehicleDetailRecord }>(
          `/api/vehicles/${vehicleId}`,
          { errorMessage: 'Unable to load vehicle.' },
        );
        
        // 2. FIXED: Assign the singular vehicle object to state
        setVehicle(data.vehicle);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load vehicle.');
      } finally {
        setLoading(false);
      }
    };

    if (vehicleId) {
      void loadVehicle();
    }
  }, [vehicleId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Loading vehicle details...
        </CardContent>
      </Card>
    );
  }

  if (error || !vehicle) {
    return (
      <EmptyState
        description={error ?? 'The selected vehicle could not be found.'}
        title="Vehicle unavailable"
      />
    );
  }

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>
            {vehicle.make ?? 'Vehicle'} {vehicle.model ?? ''}
          </CardTitle>
          <CardDescription>
            {vehicle.registrationNumber ?? 'No registration'} • Owner: {vehicle.customerName ?? 'Unassigned'}
          </CardDescription>
        </div>
        {vehicle.archived ? <StatusBadge tone="warning">Archived</StatusBadge> : <StatusBadge tone="success">Active</StatusBadge>}
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DetailItem label="Created" value={vehicle.createdAt ? new Date(vehicle.createdAt).toLocaleString() : '—'} />
        <DetailItem label="Updated" value={vehicle.updatedAt ? new Date(vehicle.updatedAt).toLocaleString() : '—'} />
        <DetailItem label="Open jobs" value={String(vehicle.jobs?.length ?? 0)} />
        <DetailItem label="Quotes" value={String(vehicle.quotes?.length ?? 0)} />
      </CardContent>
    </Card>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
