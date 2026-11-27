import { FormField } from "@/components/forms/formField";
import { cn } from "@/lib/utils";

// BD-018: Typed severity - no arbitrary strings
export type DefectSeverity = "normal" | "advisory" | "critical";
export type UnknownSeverity = "unknown";

export const SEVERITY_CONFIG = {
  normal: {
    label: "Normal",
    icon: "✓",
    description: "Normal: No action needed.",
    classes: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-200 dark:border-green-700",
  },
  advisory: {
    label: "Advisory",
    icon: "!",
    description: "Advisory: Monitor / check soon.",
    classes: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700",
  },
  critical: {
    label: "Critical",
    icon: "⚠",
    description: "Critical: Fix before vehicle leaves.",
    classes: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-200 dark:border-red-700",
  },
  unknown: {
    label: "Unknown",
    icon: "?",
    description: "Unknown: Severity not recognised - do not treat as normal.",
    classes: "bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-600",
  },
} as const;

// BD-018: Unknown fails safely - never defaults to normal
export function validateSeverity(value: string | null | undefined): DefectSeverity | UnknownSeverity {
  if (value === "normal" || value === "advisory" || value === "critical") return value;
  return "unknown";
}

export function DefectSeverityBadge({ severity }: { severity: string | null | undefined }) {
  const safe = validateSeverity(severity);
  const config = SEVERITY_CONFIG[safe];
  return (
    <span className={cn("mt-2 inline-block rounded-full border px-3 py-1 text-sm font-medium", config.classes)}>
      <span aria-hidden="true">{config.icon} </span>
      {config.label} <span className="font-normal">- {config.description}</span>
    </span>
  );
}

type Props = {
  value: DefectSeverity | "";
  onChange: (value: DefectSeverity) => void;
  error?: string;
};

export function DefectSeverityField({ value, onChange, error }: Props) {
  return (
    <FormField
      id="defect-severity"
      label="Defect Severity"
      description="Normal: No action needed. Advisory: Monitor / check soon. Critical: Fix before vehicle leaves."
      error={error}
    >
      <select
        id="defect-severity"
        value={value}
        onChange={(e) => onChange(e.target.value as DefectSeverity)}
        className={cn("w-full rounded-md border bg-background p-3", error && "border-red-500")}
      >
        <option value="">Select severity</option>
        <option value="normal">Normal</option>
        <option value="advisory">Advisory</option>
        <option value="critical">Critical</option>
      </select>
      {value && <DefectSeverityBadge severity={value} />}
      {/* Example of fail-safe: unknown never looks like normal */}
      {/* <DefectSeverityBadge severity="banana" /> -> shows Unknown */}
    </FormField>
  );
}