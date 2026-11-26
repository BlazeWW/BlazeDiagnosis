import { EmptyState } from '@/components/data-display';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { VehicleServiceHistory } from '@/types/vehicles';

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString() : '-';
}

export function VehicleHistoryList({
  history,
}: {
  history: VehicleServiceHistory;
}) {
  const isEmpty =
    history.jobs.length === 0 &&
    history.serviceRequests.length === 0 &&
    history.inspections.length === 0 &&
    history.odometerReadings.length === 0;

  if (isEmpty) {
    return (
      <EmptyState
        title="No Service History"
        description="This vehicle has no service history yet."
      />
    );
  }

  return (
    <div className="grid gap-4">
      {history.jobs.length > 0 ? (
        <HistoryCard
          title="Jobs"
          description={`${history.jobs.length} job card(s)`}
        >
          <ul className="grid gap-3">
            {history.jobs.map((job) => (
              <li key={job.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{job.jobNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {job.customerStatus} • {job.priority} •{' '}
                    {formatDate(job.createdAt)}
                  </p>
                </div>
                {job.notes.length > 0 ? (
                  <ul className="mt-2 grid gap-1">
                    {job.notes.map((note, index) => {
                      return (
                        <li
                          key={index}
                          className="text-xs text-muted-foreground"
                        >
                          {note.visibility === 'customer'
                            ? 'Customer note'
                            : 'Internal note'}{' '}
                          - {note.body}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </HistoryCard>
      ) : null}

      {history.serviceRequests.length > 0 ? (
        <HistoryCard
          title="Service Requests"
          description={`${history.serviceRequests.length} service request(s)`}
        >
          <ul className="grid gap-2">
            {history.serviceRequests.map((request) => (
              <li
                key={request.id}
                className="rounded-lg border border-border p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{request.requestedService}</p>
                  <p className="text-xs text-muted-foreground">
                    {request.status} • {formatDate(request.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </HistoryCard>
      ) : null}

      {history.inspections.length > 0 ? (
        <HistoryCard
          title="Inspections"
          description={`${history.inspections.length} inspection(s)`}
        >
          <ul className="grid gap-2">
            {history.inspections.map((inspection) => (
              <li
                key={inspection.id}
                className="rounded-lg border border-border p-3 text-sm"
              >
                <p className="font-medium">
                  {inspection.mileage !== null
                    ? `${inspection.mileage.toLocaleString()} km`
                    : 'Mileage not recorded'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {inspection.fuelLevel ?? 'Fuel level not recorded'} •{' '}
                  {formatDate(inspection.completedAt ?? null)}
                </p>
              </li>
            ))}
          </ul>
        </HistoryCard>
      ) : null}

      {history.odometerReadings.length > 0 ? (
        <HistoryCard
          title="Odometer readings"
          description={`${history.odometerReadings.length} reading(s)`}
        >
          <ul className="grid gap-2">
            {history.odometerReadings.map((reading, index) => (
              <li
                key={index}
                className="rounded-lg border border-border p-3 text-sm"
              >
                <p className="font-medium">
                  {reading.reading.toLocaleString()} km
                </p>
                <p className="text-xs text-muted-foreground">
                  {reading.source} • {formatDate(reading.recordedAt)}
                </p>
              </li>
            ))}
          </ul>
        </HistoryCard>
      ) : null}
    </div>
  );
}

function HistoryCard({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
