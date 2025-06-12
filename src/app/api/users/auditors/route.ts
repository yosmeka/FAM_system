// import { Response } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/middleware/rbac';

// GET /api/users/auditors - Get users who can perform audits (AUDITOR role)
// This endpoint is specifically for audit assignment creation and doesn't require user management permissions
export const GET = withRole(['MANAGER'], async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all users with AUDITOR role (potential auditors)
    const auditors = await prisma.user.findMany({
      where: {
        role: 'AUDITOR',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return Response.json(auditors);
  } catch (error) {
    console.error('Error fetching auditors:', error);
    return Response.json(
      { error: 'Failed to fetch auditors' },
      { status: 500 }
    );
  }
});
