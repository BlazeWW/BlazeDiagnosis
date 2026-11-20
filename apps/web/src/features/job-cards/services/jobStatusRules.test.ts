import { describe, expect, it } from 'vitest';

import {
  getCustomerStatusForInternalStatus,
  isAllowedJobStatusTransition,
  requiresJobStatusManager,
  requiresJobStatusReason,
} from './jobStatusRules';

describe('job status transition rules', () => {
  it('allows the defined forward workflow and QC recovery path', () => {
    expect(
      isAllowedJobStatusTransition('request_received', 'vehicle_received'),
    ).toBe(true);
    expect(
      isAllowedJobStatusTransition(
        'awaiting_customer_approval',
        'work_in_progress',
      ),
    ).toBe(true);
    expect(
      isAllowedJobStatusTransition('quality_control', 'work_in_progress'),
    ).toBe(true);
  });

  it('rejects skipped states, same-state updates, and terminal-state shortcuts', () => {
    expect(
      isAllowedJobStatusTransition('request_received', 'work_in_progress'),
    ).toBe(false);
    expect(
      isAllowedJobStatusTransition('work_in_progress', 'work_in_progress'),
    ).toBe(false);
    expect(isAllowedJobStatusTransition('cancelled', 'completed')).toBe(false);
    expect(isAllowedJobStatusTransition('completed', 'work_in_progress')).toBe(
      false,
    );
  });

  it('requires reasons and manager privileges for exceptional transitions', () => {
    expect(requiresJobStatusReason('request_received', 'cancelled')).toBe(true);
    expect(requiresJobStatusReason('quality_control', 'work_in_progress')).toBe(
      true,
    );
    expect(requiresJobStatusReason('completed', 'ready_for_collection')).toBe(
      true,
    );
    expect(requiresJobStatusReason('work_in_progress', 'quality_control')).toBe(
      false,
    );
    expect(requiresJobStatusManager('request_received', 'cancelled')).toBe(
      true,
    );
    expect(requiresJobStatusManager('cancelled', 'request_received')).toBe(
      true,
    );
    expect(requiresJobStatusManager('completed', 'ready_for_collection')).toBe(
      true,
    );
    expect(
      requiresJobStatusManager('quality_control', 'work_in_progress'),
    ).toBe(false);
  });

  it('maps internal statuses to the corresponding customer-safe status', () => {
    expect(getCustomerStatusForInternalStatus('diagnostics_in_progress')).toBe(
      'inspection_in_progress',
    );
    expect(getCustomerStatusForInternalStatus('quote_preparation')).toBe(
      'inspection_in_progress',
    );
    expect(getCustomerStatusForInternalStatus('awaiting_payment')).toBe(
      'invoice_ready',
    );
    expect(getCustomerStatusForInternalStatus('cancelled')).toBe('cancelled');
  });
});
