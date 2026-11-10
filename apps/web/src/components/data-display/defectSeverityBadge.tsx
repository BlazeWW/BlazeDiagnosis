
import {
  defectSeverities,
  type DefectSeverity,
} from '@/types/workflow';

type DefectSeverityBadgeProps = {
  severity: unknown;
};

const severityDetails: Record<
  DefectSeverity,
  { label: string; icon: string; description: string }
> = {
  normal: {
    label: 'Normal',
    icon: '✓',
    description: 'No significant issue identified.',
  },
  advisory: {
    label: 'Advisory',
    icon: '!',
    description: 'Attention recommended.',
  },
  critical: {
    label: 'Critical',
    icon: '⚠',
    description: 'Urgent attention required.',
  },
};

function isDefectSeverity(
  value: unknown,
): value is DefectSeverity {
  return (
    typeof value === 'string' &&
    (defectSeverities as readonly string[]).includes(value)
  );
}

export function DefectSeverityBadge({
  severity,
}: DefectSeverityBadgeProps) {
  if (!isDefectSeverity(severity)) {
    return (
      <span
        className="defect-severity defect-severity--unknown"
        role="status"
      >
        <span aria-hidden="true">?</span>
        Unknown severity
      </span>
    );
  }

  const details = severityDetails[severity];

  return (
    <span
      className={`defect-severity defect-severity--${severity}`}
      aria-label={`${details.label}: ${details.description}`}
    >
      <span aria-hidden="true">{details.icon}</span>
      <span>{details.label}</span>
    </span>
  );
}
