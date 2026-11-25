import { getDefectSeverityMeta } from '@/features/job-cards/policies/defectSeverity';

export interface DefectSeverityBadgeProps {
  severity: unknown;
  showDescription?: boolean;
  className?: string;
}

function SeverityIcon({
  iconKey,
}: {
  iconKey: ReturnType<typeof getDefectSeverityMeta>['iconKey'];
}) {
  switch (iconKey) {
    case 'check-circle':
      return (
        <svg
          aria-hidden="true"
          className="h-4 w-4 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="m8.5 12 2.5 2.5 4.5-5" />
        </svg>
      );
    case 'alert-triangle':
      return (
        <svg
          aria-hidden="true"
          className="h-4 w-4 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M12 3 2.5 19.5h19L12 3Z" />
          <path d="M12 9v4.5" />
          <circle cx="12" cy="17" r="1" fill="currentColor" />
        </svg>
      );
    case 'alert-octagon':
      return (
        <svg
          aria-hidden="true"
          className="h-4 w-4 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M7.8 3h8.4L21 7.8v8.4L16.2 21H7.8L3 16.2V7.8L7.8 3Z" />
          <path d="M12 8v5" />
          <circle cx="12" cy="16.5" r="1" fill="currentColor" />
        </svg>
      );
    case 'help-circle':
    default:
      return (
        <svg
          aria-hidden="true"
          className="h-4 w-4 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3.5" />
          <circle cx="12" cy="17" r="1" fill="currentColor" />
        </svg>
      );
  }
}

export function DefectSeverityBadge({
  severity,
  showDescription = false,
  className = '',
}: DefectSeverityBadgeProps) {
  const meta = getDefectSeverityMeta(severity);

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <span
        aria-label={meta.ariaLabel}
        className={`inline-flex w-fit items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${meta.badgeClassName}`}
        data-testid={`defect-severity-${meta.severity}`}
      >
        <SeverityIcon iconKey={meta.iconKey} />
        <span>{meta.label}</span>
        <span className="rounded bg-black/10 px-1 py-0.5 text-[10px] font-bold dark:bg-white/15">
          {meta.shortCode}
        </span>
      </span>
      {showDescription && (
        <p className="text-xs text-slate-700 dark:text-slate-300">
          {meta.description}
        </p>
      )}
    </div>
  );
}