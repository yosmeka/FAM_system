//import { Response } from 'next/server';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/managers - Get all managers for maintenance requests
export async function GET(request: NextRequest) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);

    // Allow requests even without a session for testing purposes
    console.log("Managers API - Session:", session?.user?.email || "No session");

    // Find all users with MANAGER role
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
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
