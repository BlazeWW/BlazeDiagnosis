import {FormField} from "@/components/forms/formField";
import {cn} from "@/lib/utils";

export type DefectSeverity = "critical" | "major" | "minor" | "";

type Props = {
    value: DefectSeverity;
    onChange: (value: DefectSeverity) => void;
    error?: string;
};

const BADGE ={
    critical: "big-red-100 text-red-800 border-red-300",
    major: "big-orange-100 text-organge-800 border-orange-300",
    minor: "big-yellow-100 text yellow-800 border-yellow-300",    
} as const;

export function DefectSeverityField({ value, onChange, error}: Props) {
    return (
      <FormField
        id="defect-severity"
        label="Defect Severity"
        description="Critical: fix before vehicle leaves. Major: fix soon. Minor: advise customer."
        error={error}
      >
       <select
       id="defect-severity"
       value={value}
       onChange={(e) => onChange(e.target.value as DefectSeverity)}
       className={cn("w-full rounded-md border big-background p-3",error?"borader-destructive":"boarder-input")}
       >
        <option value="">Select severity</option>
        <option value="critical" className={cn("rounded-md border p-3",BADGE.critical)}>Critical</option>
        <option value="major" className={cn("rounded-md border p-3",BADGE.major)}>Major</option>
        <option value="minor" className={cn("rounded-md border p-3",BADGE.minor)}>Minor</option>
       </select>
      {value && (
        <span className={cn("mt-2inline-block rounded-full border px-3 py-1 text-sm",BADGE[value])}>
            {value==="critical"&&"Critical"}
            {value==="major"&&"Major"}
            {value==="minor"&&"Minor"}
        </span>
       )}
      </FormField>  
    );
}
export function validateSeverity(value: DefectSeverity){
    if(!value){
        return "Please select a defect severity.";
    }
    return undefined;
}