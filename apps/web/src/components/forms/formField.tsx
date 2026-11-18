import React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

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
  const ariaDescribedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined; 

  return (
    <div className={cn('grid gap-2', className)}>
      <Label htmlFor={id}>{label}</Label>

      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<any>, {
            'aria-describedby': ariaDescribedBy,
          })
        : children}
        
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
