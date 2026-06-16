export interface SuppliersRecord {
  id: string;
}

export type PartsRequestStatus =
  | 'draft'
  | 'pending_quote'
  | 'ordered'
  | 'fulfilled'
  | 'cancelled';
