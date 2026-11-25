import { getEligibleStaffMembers } from '@/features/job-cards/services/jobCardService';
import { apiOk, handleApiError } from '@/lib/api/response';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';

const routeName = '/api/job-cards/staff';

export async function GET() {
  try {
    const tenant = await requireTenantContext();
    const staff = await getEligibleStaffMembers(tenant.tenantId);
    return apiOk({ staff }, { meta: { count: staff.length } });
  } catch (error) {
    return handleApiError(`GET ${routeName}`, error);
  }
}
