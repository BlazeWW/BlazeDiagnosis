import type { HTMLAttributes, PropsWithChildren, ReactNode } from 'react';

export type CardVariant = 'default' | 'elevated' | 'muted' | 'panel';

export type StatCardProps = {
  description?: string;
  icon?: ReactNode;
  label: string;
  value: string;
};

export type StatusTone = 'danger' | 'info' | 'neutral' | 'success' | 'warning';

export type StatusBadgeProps = {
  children: ReactNode;
  className?: string;
  tone?: StatusTone;
};

export type PlaceholderCardProps = {
  children?: ReactNode;
  description: string;
  title: string;
};

export type EmptyStateProps = {
  action?: ReactNode;
  className?: string;
  description: string;
  title: string;
};

export type LoadingStateProps = {
  className?: string;
  description?: string;
  title?: string;
};

export type ErrorStateProps = {
  className?: string;
  description: string;
  onRetry: () => void;
  retryLabel?: string;
  title?: string;
};

export type ResponsiveTableProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export type PageSectionProps = {
  children: ReactNode;
  className?: string;
  description?: string;
  title?: string;
};

export type TimelineItem = {
  id: string;
  subtitle?: ReactNode;
  timestamp?: string;
  title: ReactNode;
};

export type TimelineProps = {
  className?: string;
  emptyMessage?: string;
  items: TimelineItem[];
};

export type FormActionsProps = PropsWithChildren<{
  className?: string;
}>;

export type FormFieldProps = {
  children: ReactNode;
  className?: string;
  description?: string;
  error?: string;
  id: string;
  label: string;
};


export type StatusValueBadgeProps = {
  value: string;
};
