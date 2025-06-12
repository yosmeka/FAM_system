//import { Response } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/users/managers
export async function GET() {
  try {
    // Get the current session to verify authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Fetch all users with MANAGER role
    const managers = await prisma.user.findMany({
      where: {
        role: 'MANAGER',
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    return Response.json(managers);
  } catch (error) {
    console.error('Error fetching managers:', error);
    return Response.json(
      { error: 'Failed to fetch managers' },
      { status: 500 }
    );
  }
}
