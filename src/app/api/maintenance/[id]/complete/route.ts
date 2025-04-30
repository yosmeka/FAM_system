export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
// 
    // Get the maintenance request
    const maintenance = await prisma.maintenance.findUnique({
      where: { id: params.id },
      include: { asset: true }
    });

    if (!maintenance) {
      return NextResponse.json({ error: 'Maintenance not found' }, { status: 404 });
    }

    // Update the maintenance status
    const updatedMaintenance = await prisma.maintenance.update({
      where: { id: params.id },
      data: {
        status: 'COMPLETED',
        cost: parseFloat(body.cost),
        completedAt: new Date(),
      },
      include: { asset: true }
    });

    // Update the asset's maintenance dates
    const updatedAsset = await prisma.asset.update({
      where: { id: maintenance.assetId },
      data: {
        lastMaintenance: new Date(),
        nextMaintenance: body.nextMaintenance ? new Date(body.nextMaintenance) : null,
      }
    });

    // Track the changes in asset history
    await prisma.assetHistory.createMany({
      data: [
        {
          assetId: maintenance.assetId,
          field: 'lastMaintenance',
          oldValue: maintenance.asset.lastMaintenance?.toISOString() || null,
          newValue: new Date().toISOString(),
          changedBy: session.user?.email || 'system',
        },
        {
          assetId: maintenance.assetId,
          field: 'nextMaintenance',
          oldValue: maintenance.asset.nextMaintenance?.toISOString() || null,
          newValue: body.nextMaintenance ? new Date(body.nextMaintenance).toISOString() : null,
          changedBy: session.user?.email || 'system',
        }
      ]
    });

    return NextResponse.json(updatedMaintenance);
  } catch (error) {
    console.error('Error completing maintenance:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 