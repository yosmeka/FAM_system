import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/assets/user
// Returns assets assigned to the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get assets for the current user
    // Since the current schema doesn't have direct user-asset assignment,
    // we'll return all assets for now. You may need to adjust this based on your business logic.
    // const userId = session.user.id; // Uncomment when implementing user-specific filtering
    const assets = await prisma.asset.findMany({
      orderBy: {
        name: 'asc'
      },
      select: {
        id: true,
        name: true,
        serialNumber: true,
        status: true,
        category: true,
        location: true,
        department: true,
      }
    });
    
    return Response.json(assets);
  } catch (error) {
    console.error('Error fetching user assets:', error);
    return Response.json(
      { error: 'Failed to fetch assets' },
      { status: 500 }
    );
  }
}

// Note: The getUserDepartmentIds function has been removed as the UserDepartment model
// doesn't exist in the current schema. If you need user-department relationships,
// you'll need to add the appropriate models to your Prisma schema.
