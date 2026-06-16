import React from 'react';
import { type PartsRequestStatus } from '../types/suppliers.types';

interface StatusBadgeProps {
  status: PartsRequestStatus;
}

const statusStyles: Record<PartsRequestStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  pending_quote: "bg-amber-50 text-amber-700 border-amber-200",
  ordered: "bg-blue-50 text-blue-700 border-blue-200",
  fulfilled: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
};

const statusLabels: Record<PartsRequestStatus, string> = {
  draft: "Draft",
  pending_quote: "Pending Quote",
  ordered: "Ordered",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = statusStyles[status];
  const label = statusLabels[status];

  if (!style || !label) {
    throw new Error(`Invalid status: ${status}`);
  }

  return (
    <span className={`${style} text-xs px-2.5 py-1 font-medium rounded-full`}>
      {label}
    </span>
  );
}
