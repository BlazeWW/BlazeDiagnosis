import type { SystemRole } from '@/lib/constants/roles';

export type EvidenceVisibility = 'internal' | 'customer_visible';

export interface EvidenceRecord {
  id: string;
  tenantId: string;
  jobId: string;
  customerId: string;
  visibility: EvidenceVisibility;
  mimeType: string;
  sizeBytes: number;
}

export interface ActorContext {
  userId: string;
  tenantId: string;
  role: SystemRole;
  customerId?: string;
}

export class EvidenceAccessError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 400 | 403 | 404 | 413,
  ) {
    super(message);
    this.name = 'EvidenceAccessError';
  }
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'video/mp4',
  'video/quicktime',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export function validateEvidenceUpload(file: {
  mimeType: string;
  sizeBytes: number;
}): void {
  if (!ALLOWED_MIME_TYPES.has(file.mimeType)) {
    throw new EvidenceAccessError(
      `Unsupported file type: ${file.mimeType}`,
      400,
    );
  }

  if (file.sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new EvidenceAccessError(
      'File exceeds maximum allowed size of 10MB',
      413,
    );
  }
}

export function authorizeEvidenceRead(
  actor: ActorContext,
  record: EvidenceRecord | null,
): EvidenceRecord {
  if (
    !record ||
    (actor.role !== 'platform_admin' && record.tenantId !== actor.tenantId)
  ) {
    throw new EvidenceAccessError('Evidence attachment not found', 404);
  }

  if (actor.role === 'parts_supplier') {
    throw new EvidenceAccessError(
      'Suppliers cannot access diagnostic evidence',
      403,
    );
  }

  if (actor.role === 'customer') {
    if (record.customerId !== actor.customerId) {
      throw new EvidenceAccessError('Evidence attachment not found', 404);
    }

    if (record.visibility === 'internal') {
      throw new EvidenceAccessError(
        'Internal diagnostic evidence is restricted',
        403,
      );
    }
  }

  return record;
}

export function authorizeEvidenceDelete(
  actor: ActorContext,
  record: EvidenceRecord | null,
): void {
  if (
    !record ||
    (actor.role !== 'platform_admin' && record.tenantId !== actor.tenantId)
  ) {
    throw new EvidenceAccessError('Evidence attachment not found', 404);
  }

  const canDelete = ['mechanic', 'floor_manager', 'platform_admin'].includes(
    actor.role,
  );
  if (!canDelete) {
    throw new EvidenceAccessError(
      'Insufficient permissions to remove diagnostic evidence',
      403,
    );
  }
}