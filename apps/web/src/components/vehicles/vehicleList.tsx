'use client';

import { requestJson, deleteVehicle } from '@/lib/apiClient';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';


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

import type { VehicleRecord } from '@/types/vehicles';
import type { Route } from 'next';

const statusTone: Record<
  VehicleRecord['status'],
  'neutral' | 'success' | 'warning'
> = {
  Completed: 'success',
  'In service': 'neutral',
  Pending: 'warning',
};

export function VehicleList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]); // added
  const [loading, setLoading] = useState(true); // added
  const [error, setError] = useState<string | null>(null); //added
  const router = useRouter();
  
  const handleDelete = async (id: string) => {
  if (!confirm('Archive this vehicle?')) return;
  try {
    await deleteVehicle(id);
    setVehicles((current) => current.filter((v) => v.id !== id));
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to delete vehicle.');
  }
};

  // added: fetch real vehicles on mount
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
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load vehicles.',
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
      ].some((value) => value.toLowerCase().includes(query)),
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
            className="text-sm underline text-muted-foreground hover:text-foreground"
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
        <div className="w-full md:max-w-sm">
          <Input
            aria-label="Search vehicles"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search registration, VIN, make..."
            value={searchQuery}
            className="pr-8" //Added padding
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
              type="button"
              aria-label="Clear search"
            >
              ✕
              </button>
            )}
            {/* Added a reset button to clear the search bar*/}
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
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredVehicles.map((vehicle) => (
                <tr className="transition hover:bg-muted/40" key={vehicle.id} onClick={() => router.push(`/station/vehicles/${vehicle.id}` as Route)}>
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
                      onClick={(e) => { e.stopPropagation(); void handleDelete(vehicle.id); }}
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
