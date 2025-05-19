import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/assets/user
// Returns assets assigned to the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Get assets assigned to the user
    // This is a simplified example - you may need to adjust based on your data model
    const assets = await prisma.asset.findMany({
      where: {
        OR: [
          { assignedToId: userId },
          { departmentId: { in: await getUserDepartmentIds(userId) } }
        ]
      },
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
      }
    });
    
    return NextResponse.json(assets);
  } catch (error) {
    console.error('Error fetching user assets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assets' },
      { status: 500 }
    );
  }
}

// Helper function to get department IDs for a user
async function getUserDepartmentIds(userId: string): Promise<string[]> {
  try {
    const userDepartments = await prisma.userDepartment.findMany({
      where: { userId },
      select: { departmentId: true }
    });
    
    return userDepartments.map(ud => ud.departmentId);
  } catch (error) {
    console.error('Error fetching user departments:', error);
    return [];
  }
}
