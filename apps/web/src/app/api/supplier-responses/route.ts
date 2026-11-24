import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  partsRequestItems,
  partsRequests,
} from '@/db/schema/parts';
import {
  supplierResponseItems,
  supplierResponses,
  suppliers,
  tenantSuppliers,
} from '@/db/schema/suppliers';
import { createSupplierResponseSchema } from '@/features/parts/schemas/supplierResponseSchema';
import type {
  RequestedComparisonItem,
  SupplierComparisonItem,
  SupplierComparisonOffer,
} from '@/types/supplierOfferComparison';
import { compareSupplierOffers } from '@/features/parts/services/supplierOfferComparison';
import { TenantAccessError, requireTenantPermission } from '@/lib/authorization/guards';
import { getCurrentUser } from '@/lib/auth/session';
import {
  apiCreated,
  apiError,
  apiOk,
  handleApiError,
  handleMissingSearchParam,
  MissingSearchParamError,
  requireSearchParam,
} from '@/lib/api/response';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';

function normalizeAvailability(
  value: string,
): SupplierComparisonItem['availability'] {
  switch (value.toLowerCase()) {
    case 'available':
      return 'available';
    case 'partial':
      return 'partial';
    case 'unavailable':
      return 'unavailable';
    default:
      return 'unknown';
  }
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiError('UNAUTHORIZED', 'Authentication required.', 401);
    }

    // Comparison is for station decision-makers, not supplier accounts.
    if (!['site_manager', 'floor_manager'].includes(user.tenantRole ?? '')) {
      throw new TenantAccessError();
    }

    const tenant = await requireTenantContext();
    await requireTenantPermission(
      tenant.tenantId,
      'parts.approve_supplier_quote',
    );

    const { searchParams } = new URL(request.url);
    const partsRequestId = requireSearchParam(searchParams, 'partsRequestId');

    const [partsRequest] = await db
      .select({ id: partsRequests.id })
      .from(partsRequests)
      .where(
        and(
          eq(partsRequests.id, partsRequestId),
          eq(partsRequests.tenantId, tenant.tenantId),
        ),
      )
      .limit(1);

    if (!partsRequest) {
      return apiError('NOT_FOUND', 'Parts request not found.', 404);
    }

    const requestItems = await db
      .select({
        id: partsRequestItems.id,
        quantity: partsRequestItems.quantity,
      })
      .from(partsRequestItems)
      .where(
        and(
          eq(partsRequestItems.tenantId, tenant.tenantId),
          eq(partsRequestItems.partsRequestId, partsRequestId),
        ),
      );

    if (requestItems.length === 0) {
      return apiError(
        'CONFLICT',
        'The parts request has no items to compare.',
        409,
      );
    }

    const responseRows = await db
      .select({
        id: supplierResponses.id,
        supplierName: suppliers.name,
        total: supplierResponses.total,
        taxTotal: supplierResponses.taxTotal,
        deliveryFee: supplierResponses.deliveryFee,
        eta: supplierResponses.eta,
      })
      .from(supplierResponses)
      .innerJoin(
        suppliers,
        eq(suppliers.id, supplierResponses.supplierId),
      )
      .innerJoin(
        tenantSuppliers,
        and(
          eq(tenantSuppliers.supplierId, supplierResponses.supplierId),
          eq(tenantSuppliers.tenantId, tenant.tenantId),
          eq(tenantSuppliers.status, 'active'),
        ),
      )
      .where(
        and(
          eq(supplierResponses.tenantId, tenant.tenantId),
          eq(supplierResponses.partsRequestId, partsRequestId),
        ),
      );

    const responseIds = responseRows.map((response) => response.id);
    const responseItems =
      responseIds.length === 0
        ? []
        : await db
            .select({
              supplierResponseId: supplierResponseItems.supplierResponseId,
              requestItemId: supplierResponseItems.partsRequestItemId,
              quantityAvailable: supplierResponseItems.quantityAvailable,
              availabilityStatus: supplierResponseItems.availabilityStatus,
              isAlternate: supplierResponseItems.alternativeOffered,
            })
            .from(supplierResponseItems)
            .where(
              and(
                eq(supplierResponseItems.tenantId, tenant.tenantId),
                inArray(supplierResponseItems.supplierResponseId, responseIds),
              ),
            );

    const requestItemIds = new Set(requestItems.map((item) => item.id));

    const requested: RequestedComparisonItem[] = requestItems.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      // Current schema does not record the requested unit.
      unitCode: null,
    }));

    const offers: SupplierComparisonOffer[] = responseRows.map((response) => ({
      id: response.id,
      supplierName: response.supplierName,

      // Do not infer currency from the tenant or supplier's location.
      currencyCode: null,

      // Confirm what `total` includes before treating it as payable total.
      payableTotal: null,
      taxAmount: response.taxTotal,
      taxTreatment: null,
      deliveryFee: response.deliveryFee,
      eta: response.eta?.toISOString() ?? null,

      items: responseItems
        .filter(
          (item) =>
            item.supplierResponseId === response.id &&
            requestItemIds.has(item.requestItemId),
        )
        .map((item) => ({
          requestItemId: item.requestItemId,
          quantityAvailable: item.quantityAvailable,
          unitCode: null,
          availability: normalizeAvailability(item.availabilityStatus),
          isAlternate: item.isAlternate,
          fitmentVerified: false,
        })),
    }));

    return apiOk({
      requestedItems: requested,
      offers: compareSupplierOffers(requested, offers),
    });
  } catch (error) {
    if (error instanceof MissingSearchParamError) {
      return handleMissingSearchParam(error);
    }

    return handleApiError('GET /api/supplier-responses', error);
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await requireTenantContext();
    const rawBody = await request.json();

    if (rawBody.tenantId && rawBody.tenantId !== tenant.tenantId) {
      throw new TenantAccessError('Submitted tenant ID conflicts with authenticated session tenant.');
    }

    const input = createSupplierResponseSchema.parse(rawBody);
    // Verify the supplier is active for this tenant before accepting the response.
    const [tenantSupplier] = await db
      .select({ id: tenantSuppliers.id })
      .from(tenantSuppliers)
      .where(
        and(
          eq(tenantSuppliers.tenantId, tenant.tenantId),
          eq(tenantSuppliers.supplierId, input.supplierId),
          eq(tenantSuppliers.status, 'active'),
        ),
      )
      .limit(1);

    if (!tenantSupplier) {
      return apiError(
        'FORBIDDEN',
        'Supplier is not active for this tenant.',
        403,
      );
    }

    const [response] = await db
      .insert(supplierResponses)
      .values({
        deliveryFee: String(input.deliveryFee ?? 0),
        eta: input.eta ? new Date(input.eta) : undefined,
        partsRequestId: input.partsRequestId,
        status: 'submitted',
        subtotal: String(input.subtotal),
        supplierId: input.supplierId,
        taxTotal: String(input.tax),
        tenantId: tenant.tenantId,
        total: String(input.total),
      })
      .returning();

    const itemValues: (typeof supplierResponseItems.$inferInsert)[] =
      input.items.map((item) => ({
        availabilityStatus: item.availability,
        brand: item.brand,
        partName: item.partName,
        partNumber: item.partNumber,
        partsRequestItemId: item.partId,
        quantityAvailable: String(item.quantityAvailable),
        supplierResponseId: response.id,
        tenantId: tenant.tenantId,
        unitPrice: String(item.unitPrice),
      }));

    await db.insert(supplierResponseItems).values(itemValues);

    return apiCreated({ response });
  } catch (error) {
    return handleApiError('POST /api/supplier-responses', error);
  }
}
