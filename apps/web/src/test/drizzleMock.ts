import { vi } from 'vitest';

export function createSelectWhereChain<T>(rows: T[]) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve(rows)),
    })),
  };
}

export function createSelectWhereLimitChain<T>(rows: T[]) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve(rows)),
      })),
    })),
  };
}

export function createInsertReturningChain<T>(row: T) {
  return {
    values: vi.fn(() => ({
      returning: vi.fn(() => Promise.resolve([row])),
    })),
  };
}

export function createUpdateReturningChain<T>(row: T) {
  return {
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([row])),
      })),
    })),
  };
}

export function createUpdateWhereChain() {
  return {
    set: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  };
}
