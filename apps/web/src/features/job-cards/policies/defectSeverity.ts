export const DEFECT_SEVERITIES = ['normal', 'advisory', 'critical'] as const;

export type DefectSeverity = (typeof DEFECT_SEVERITIES)[number];
export type DefectSeverityFallback = 'unknown';
export type ResolvedDefectSeverity = DefectSeverity | DefectSeverityFallback;

export type DefectSeverityIconKey =
  | 'check-circle'
  | 'alert-triangle'
  | 'alert-octagon'
  | 'help-circle';

export interface DefectSeverityMeta {
  severity: ResolvedDefectSeverity;
  label: string;
  shortCode: 'NORM' | 'ADV' | 'CRIT' | 'UNK';
  description: string;
  ariaLabel: string;
  iconKey: DefectSeverityIconKey;
  badgeClassName: string;
  isKnownSeverity: boolean;
}

const SEVERITY_META: Record<ResolvedDefectSeverity, DefectSeverityMeta> = {
  normal: {
    severity: 'normal',
    label: 'Normal',
    shortCode: 'NORM',
    description:
      'Within normal operating tolerances; no immediate repair required.',
    ariaLabel: 'Severity Normal: within normal operating tolerances',
    iconKey: 'check-circle',
    badgeClassName:
      'border-emerald-700/30 bg-emerald-50 text-emerald-950 dark:border-emerald-400/30 dark:bg-emerald-950/60 dark:text-emerald-200',
    isKnownSeverity: true,
  },
  advisory: {
    severity: 'advisory',
    label: 'Advisory',
    shortCode: 'ADV',
    description:
      'Wear or condition noted; monitor closely or schedule planned maintenance.',
    ariaLabel:
      'Severity Advisory: wear or condition noted for planned attention',
    iconKey: 'alert-triangle',
    badgeClassName:
      'border-amber-700/30 bg-amber-50 text-amber-950 dark:border-amber-400/30 dark:bg-amber-950/60 dark:text-amber-200',
    isKnownSeverity: true,
  },
  critical: {
    severity: 'critical',
    label: 'Critical',
    shortCode: 'CRIT',
    description:
      'Immediate safety or breakdown risk; requires urgent attention before release.',
    ariaLabel: 'Severity Critical: immediate safety or breakdown risk',
    iconKey: 'alert-octagon',
    badgeClassName:
      'border-red-700/30 bg-red-50 text-red-950 dark:border-red-400/30 dark:bg-red-950/60 dark:text-red-200',
    isKnownSeverity: true,
  },
  unknown: {
    severity: 'unknown',
    label: 'Unknown Severity',
    shortCode: 'UNK',
    description:
      'Unsupported or missing severity value; verify classification before release.',
    ariaLabel:
      'Severity Unknown: unsupported or missing severity requires review',
    iconKey: 'help-circle',
    badgeClassName:
      'border-slate-600/30 bg-slate-100 text-slate-900 dark:border-slate-400/30 dark:bg-slate-900 dark:text-slate-100',
    isKnownSeverity: false,
  },
};

export function resolveDefectSeverity(raw: unknown): ResolvedDefectSeverity {
  if (typeof raw !== 'string') {
    return 'unknown';
  }

  const normalized = raw.trim().toLowerCase();
  if (
    normalized === 'normal' ||
    normalized === 'advisory' ||
    normalized === 'critical'
  ) {
    return normalized;
  }

  return 'unknown';
}

export function getDefectSeverityMeta(raw: unknown): DefectSeverityMeta {
  return SEVERITY_META[resolveDefectSeverity(raw)];
}