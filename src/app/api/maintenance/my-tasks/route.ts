import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/maintenance/my-tasks - Get tasks assigned to the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only users (technicians) can access this endpoint
    if (session.user.role !== 'USER') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    console.log(`Fetching tasks for user: ${userId} (${session.user.name})`);

    // Build query to get tasks assigned to this user
    const where: any = {
      assignedToId: userId,
    };

    // Filter by status if provided
    if (status && status !== 'all') {
      where.status = status;
    }

    const tasks = await prisma.maintenance.findMany({
      where,
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            serialNumber: true,
            location: true,
          },
        },
        schedule: {
          select: {
            id: true,
            title: true,
            frequency: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
            maintenanceType: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { scheduledDate: 'asc' },
        { priority: 'desc' },
      ],
    });

    console.log(`Found ${tasks.length} tasks for user ${userId}`);
    tasks.forEach(task => {
      console.log(`Task: ${task.description}, Status: ${task.status}, Assigned to: ${task.assignedToId}`);
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching user tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}