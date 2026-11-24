'use client';

import type { Route } from 'next';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { StatusBadge } from '@/components/common/statusBadge';
import {
  EmptyState,
  ResponsiveTable,
  tableCellClassName,
  tableHeadClassName,
} from '@/components/data-display';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { deleteVehicle, requestJson } from '@/lib/apiClient';
import type { VehicleRecord } from '@/types/vehicles';

const statusTone: Record<
  VehicleRecord['status'],
  'neutral' | 'success' | 'warning'
> = {
  Completed: 'success',
  'In service': 'neutral',
  Pending: 'warning',
};

export function VehicleList() {
  const params = useParams<{ locale?: string }>();
  const router = useRouter();
  const locale = params.locale ?? 'en';

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);

  const handleDelete = async (id: string) => {
    if (!confirm('Archive this vehicle?')) return;

    try {
      await deleteVehicle(id);
      setVehicles((current) => current.filter((vehicle) => vehicle.id !== id));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Failed to delete vehicle.',
      );
    }
  };

  useEffect(() => {
    const loadVehicles = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await requestJson<{ vehicles: VehicleRecord[] }>(
          '/api/vehicles',
          {
            errorMessage: 'Failed to load vehicles.',
          },
        );
        setVehicles(data.vehicles);
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Failed to load vehicles.',
        );
      } finally {
        setLoading(false);
      }
    };

    void loadVehicles();
  }, []);

  const filteredVehicles = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    if (!query) {
      return vehicles;
    }

    return vehicles.filter((vehicle) =>
      [
        vehicle.registration,
        vehicle.vin,
        vehicle.make,
        vehicle.model,
        vehicle.variant,
        vehicle.fuel,
        vehicle.transmission,
        vehicle.year,
        vehicle.status,
      ].some((value) =>
        String(value ?? '').toLowerCase().includes(query)
      )
    );
  }, [searchQuery, vehicles]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Loading vehicles...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 pt-6">
          <p className="text-sm text-destructive">{error}</p>
          <button
            className="text-sm text-muted-foreground underline hover:text-foreground"
            onClick={() => window.location.reload()}
            type="button"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle>Vehicle directory</CardTitle>
          <CardDescription>
            Search active vehicles by registration, VIN, make, model, fuel type,
            or status.
          </CardDescription>
        </div>
        <div className="relative w-full md:max-w-sm">
          <Input
            aria-label="Search vehicles"
            className="pr-8"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search registration, VIN, make..."
            value={searchQuery}
          />
          {searchQuery ? (
            <button
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setSearchQuery('')}
              type="button"
            >
              ×
            </button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {filteredVehicles.length === 0 ? (
          <EmptyState
            description="No vehicles match the current search. Clear the filter or capture a new vehicle."
            title="No vehicles found"
          />
        ) : (
          <ResponsiveTable>
            <thead>
              <tr className={tableHeadClassName}>
                <th className={tableCellClassName}>Vehicle</th>
                <th className={tableCellClassName}>Registration</th>
                <th className={tableCellClassName}>VIN</th>
                <th className={tableCellClassName}>Fuel</th>
                <th className={tableCellClassName}>Status</th>
                <th className={tableCellClassName}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredVehicles.map((vehicle) => (
                <tr
                  className="cursor-pointer transition hover:bg-muted/40"
                  key={vehicle.id}
                  onClick={() =>
                    router.push(
                      `/${locale}/station/vehicles/${vehicle.id}` as Route,
                    )
                  }
                >
                  <td className={tableCellClassName}>
                    <div className="font-semibold text-foreground">
                      {vehicle.make} {vehicle.model}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {vehicle.variant} • {vehicle.year} •{' '}
                      {vehicle.transmission}
                    </div>
                  </td>
                  <td className={`${tableCellClassName} font-mono text-sm`}>
                    {vehicle.registration}
                  </td>
                  <td
                    className={`${tableCellClassName} font-mono text-xs text-muted-foreground`}
                  >
                    {vehicle.vin}
                  </td>
                  <td className={`${tableCellClassName} text-muted-foreground`}>
                    {vehicle.fuel}
                  </td>
                  <td className={tableCellClassName}>
                    <StatusBadge tone={statusTone[vehicle.status]}>
                      {vehicle.status}
                    </StatusBadge>
                  </td>
                  <td className={tableCellClassName}>
                    <button
                      className="text-xs text-destructive hover:underline"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDelete(vehicle.id);
                      }}
                      type="button"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </ResponsiveTable>
        )}
      </CardContent>
    </Card>
  );
}
