import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/maintenance-schedules/[id] - Get specific maintenance schedule
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const schedule = await prisma.maintenanceSchedule.findUnique({
      where: { id },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            serialNumber: true,
            location: true,
            department: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
            description: true,
            maintenanceType: true,
            instructions: true,
            checklistItems: true,
            toolsRequired: true,
            partsRequired: true,
            safetyNotes: true,
          },
        },
        maintenanceTasks: {
          include: {
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            scheduledDate: 'desc',
          },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Check access permissions
    if (session.user.role === 'USER') {
      // Users can only access schedules assigned to them
      if (schedule.assignedToId !== session.user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error fetching maintenance schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance schedule' },
      { status: 500 }
    );
  }
}

// PUT /api/maintenance-schedules/[id] - Update maintenance schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers can update schedules
    if (session.user.role !== 'MANAGER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;
    const data = await request.json();

    const existingSchedule = await prisma.maintenanceSchedule.findUnique({
      where: { id },
    });

    if (!existingSchedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    const {
      title,
      description,
      frequency,
      customInterval,
      priority,
      estimatedHours,
      assignedToId,
      templateId,
      startDate,
      endDate,
      leadTimeDays,
      autoAssign,
      status,
    } = data;

    // Calculate new next due date if frequency or start date changed
    let nextDue = existingSchedule.nextDue;
    if (frequency !== existingSchedule.frequency ||
        customInterval !== existingSchedule.customInterval ||
        (startDate && new Date(startDate).getTime() !== existingSchedule.startDate.getTime())) {
      nextDue = calculateNextDueDate(
        startDate ? new Date(startDate) : existingSchedule.startDate,
        frequency || existingSchedule.frequency,
        customInterval || existingSchedule.customInterval
      );
    }

    const updatedSchedule = await prisma.maintenanceSchedule.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(frequency && { frequency }),
        ...(customInterval !== undefined && { customInterval }),
        ...(priority && { priority }),
        ...(estimatedHours !== undefined && { estimatedHours }),
        ...(assignedToId !== undefined && { assignedToId }),
        ...(templateId !== undefined && { templateId }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(leadTimeDays !== undefined && { leadTimeDays }),
        ...(autoAssign !== undefined && { autoAssign }),
        ...(status && { status }),
        nextDue,
      },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            serialNumber: true,
            location: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
            maintenanceType: true,
          },
        },
      },
    });

    return NextResponse.json(updatedSchedule);
  } catch (error) {
    console.error('Error updating maintenance schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update maintenance schedule' },
      { status: 500 }
    );
  }
}

// DELETE /api/maintenance-schedules/[id] - Delete maintenance schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers can delete schedules
    if (session.user.role !== 'MANAGER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;

    const existingSchedule = await prisma.maintenanceSchedule.findUnique({
      where: { id },
      include: {
        maintenanceTasks: {
          where: {
            status: {
              in: ['SCHEDULED', 'IN_PROGRESS'],
            },
          },
        },
      },
    });

    if (!existingSchedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Delete all associated maintenance tasks first (cascade delete)
    if (existingSchedule.maintenanceTasks.length > 0) {
      await prisma.maintenance.deleteMany({
        where: {
          scheduleId: id,
        },
      });
    }

    // Delete the schedule
    await prisma.maintenanceSchedule.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting maintenance schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete maintenance schedule' },
      { status: 500 }
    );
  }
}

// Helper function to calculate next due date
function calculateNextDueDate(startDate: Date, frequency: string, customInterval?: number): Date {
  const nextDue = new Date(startDate);

  switch (frequency) {
    case 'DAILY':
      nextDue.setDate(nextDue.getDate() + 1);
      break;
    case 'WEEKLY':
      nextDue.setDate(nextDue.getDate() + 7);
      break;
    case 'MONTHLY':
      nextDue.setMonth(nextDue.getMonth() + 1);
      break;
    case 'QUARTERLY':
      nextDue.setMonth(nextDue.getMonth() + 3);
      break;
    case 'SEMI_ANNUALLY':
      nextDue.setMonth(nextDue.getMonth() + 6);
      break;
    case 'ANNUALLY':
      nextDue.setFullYear(nextDue.getFullYear() + 1);
      break;
    case 'CUSTOM':
      if (customInterval) {
        nextDue.setDate(nextDue.getDate() + customInterval);
      }
      break;
    default:
      nextDue.setMonth(nextDue.getMonth() + 1); // Default to monthly
  }

  return nextDue;
}
