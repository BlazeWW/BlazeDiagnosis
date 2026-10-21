import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { cloneElement,isValidElement } from 'react';  
import type { FormFieldProps } from '@/types/ui';

export function FormField({
  children,
  className,
  description,
  error,
  id,
  label,
}: FormFieldProps) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const control = isValidElement<{
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
  }>(children)
  ?cloneElement(children, {
    'aria-describedby': 
    [children.props['aria-describedby'], descriptionId, errorId].filter(Boolean).join(' ') || undefined,
    'aria-invalid': error ? true : children.props['aria-invalid'],
  })
  : children;

  return (
    <div className={cn('grid gap-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      {control}
      {description ? (
        <p className="text-sm text-muted-foreground" id={descriptionId}>
          {description}
        </p>
      ) : null}
      {error ? (
        <p
          className="text-sm font-medium text-destructive"
          id={errorId}
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
