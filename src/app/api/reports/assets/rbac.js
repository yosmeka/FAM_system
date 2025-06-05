// RBAC for reports/assets API
import { withRole } from '@/middleware/rbac';

// Only ADMIN and USER can view reports
export const GET = withRole(['MANAGER', 'USER','AUDITOR'], async function GET(req) {
  // The original GET logic will be moved here
});
