import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const schedules = await prisma.maintenanceSchedule.findMany({
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            serialNumber: true,
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
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const tasks = await prisma.maintenance.findMany({
      where: {
        scheduleId: {
          not: null,
        },
      },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        schedule: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      schedules: schedules.map(s => ({
        id: s.id,
        title: s.title,
        status: s.status,
        nextDue: s.nextDue,
        autoAssign: s.autoAssign,
        assignedToId: s.assignedToId,
        assignedTo: s.assignedTo,
        asset: s.asset,
        createdAt: s.createdAt,
      })),
      tasks: tasks.map(t => ({
        id: t.id,
        description: t.description,
        status: t.status,
        scheduledDate: t.scheduledDate,
        assignedToId: t.assignedToId,
        assignedTo: t.assignedTo,
        scheduleId: t.scheduleId,
        schedule: t.schedule,
        asset: t.asset,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ error: 'Failed to fetch debug data' }, { status: 500 });
  }
}
