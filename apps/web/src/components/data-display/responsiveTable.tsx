import { cn } from '@/lib/utils';

import type { ResponsiveTableProps } from '@/types/ui';

export function ResponsiveTable({
  children,
  className,
  'aria-label': ariaLabel,
  ...props
}: ResponsiveTableProps) {
  return (
    <div
      className={cn(
        'w-full overflow-x-auto rounded-xl border border-border bg-card p-px',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        className,
      )}
      role="region"
      aria-label={ariaLabel || 'Scrollable data table'}
      tabIndex={0}
      {...props}
    >
      <table className="w-full min-w-180 border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  );
}

export const tableHeadClassName =
  'border-b border-border bg-muted/60 text-xs font-semibold uppercase tracking-wide text-muted-foreground';

export const tableCellClassName = 'px-4 py-3 align-middle';
