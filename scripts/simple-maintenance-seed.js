const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Starting maintenance data seeding...');

  try {
    // Create users
    const password = await bcrypt.hash('password123', 12);

    const manager = await prisma.user.upsert({
      where: { email: 'manager@zemenbank.com' },
      update: {},
      create: {
        email: 'manager@zemenbank.com',
        name: 'Maintenance Manager',
        password,
        role: 'MANAGER',
      },
    });

    const technician = await prisma.user.upsert({
      where: { email: 'user@zemenbank.com' },
      update: {},
      create: {
        email: 'user@zemenbank.com',
        name: 'Alice Technician',
        password,
        role: 'USER',
      },
    });

    console.log('✅ Users created');

    // Create assets
    const generator = await prisma.asset.upsert({
      where: { serialNumber: 'GEN-001' },
      update: {},
      create: {
        name: 'Main Generator Unit',
        serialNumber: 'GEN-001',
        category: 'EQUIPMENT',
        location: 'Building A - Basement',
        purchasePrice: 50000,
        currentValue: 45000,
        purchaseDate: new Date('2022-01-15'),
        condition: 'GOOD',
        status: 'ACTIVE',
        usefulLifeMonths: 120,
      },
    });

    const hvac = await prisma.asset.upsert({
      where: { serialNumber: 'HVAC-001' },
      update: {},
      create: {
        name: 'Central HVAC System',
        serialNumber: 'HVAC-001',
        category: 'EQUIPMENT',
        location: 'Building A - Roof',
        purchasePrice: 75000,
        currentValue: 65000,
        purchaseDate: new Date('2021-06-10'),
        condition: 'GOOD',
        status: 'ACTIVE',
        usefulLifeMonths: 180,
      },
    });

    console.log('✅ Assets created');

    // Create maintenance template
    const template = await prisma.maintenanceTemplate.create({
      data: {
        name: 'Generator Monthly Inspection',
        description: 'Comprehensive monthly inspection and maintenance for generators',
        maintenanceType: 'PREVENTIVE',
        estimatedHours: 4,
        instructions: 'Follow safety protocols. Check oil levels, filters, belts, and electrical connections.',
        checklistItems: JSON.stringify([
          { id: '1', task: 'Check engine oil level and quality', completed: false, notes: '' },
          { id: '2', task: 'Inspect air filter and clean if necessary', completed: false, notes: '' },
          { id: '3', task: 'Check coolant level and condition', completed: false, notes: '' },
          { id: '4', task: 'Inspect belts for wear and proper tension', completed: false, notes: '' },
          { id: '5', task: 'Test battery voltage and connections', completed: false, notes: '' }
        ]),
        createdById: manager.id,
      },
    });

    console.log('✅ Template created');

    // Create maintenance schedule
    const schedule = await prisma.maintenanceSchedule.create({
      data: {
        title: `${generator.name} Monthly Maintenance`,
        description: `Monthly preventive maintenance for ${generator.name}`,
        assetId: generator.id,
        templateId: template.id,
        frequency: 'MONTHLY',
        priority: 'HIGH',
        estimatedHours: 4,
        nextDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
        autoAssign: true,
        assignedToId: technician.id,
        status: 'ACTIVE',
        createdById: manager.id,
      },
    });

    console.log('✅ Schedule created');

    // Create scheduled maintenance task
    const scheduledTask = await prisma.maintenance.create({
      data: {
        assetId: generator.id,
        description: `Scheduled: ${schedule.title}`,
        priority: 'HIGH',
        maintenanceType: 'PREVENTIVE',
        status: 'SCHEDULED',
        scheduledDate: schedule.nextDue,
        estimatedHours: 4,
        scheduleId: schedule.id,
        templateId: template.id,
        requesterId: manager.id,
        managerId: manager.id,
        assignedToId: technician.id,
        checklistItems: template.checklistItems,
        notes: 'Auto-generated from maintenance schedule',
      },
    });

    console.log('✅ Scheduled task created');

    // Create corrective maintenance request
    const correctiveRequest = await prisma.maintenance.create({
      data: {
        assetId: hvac.id,
        description: 'HVAC system making unusual noise and not cooling properly',
        priority: 'HIGH',
        maintenanceType: 'CORRECTIVE',
        status: 'PENDING_APPROVAL',
        issueType: 'MECHANICAL',
        urgencyLevel: 'HIGH',
        assetDowntime: false,
        requesterId: technician.id,
        estimatedHours: 6,
        notes: 'Reported mechanical issue requiring immediate attention',
        scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
    });

    console.log('✅ Corrective request created');

    // Create completed work with documentation
    const completedWork = await prisma.maintenance.create({
      data: {
        assetId: generator.id,
        description: 'Completed generator maintenance - oil change and filter replacement',
        priority: 'MEDIUM',
        maintenanceType: 'PREVENTIVE',
        status: 'WORK_COMPLETED',
        requesterId: technician.id,
        managerId: manager.id,
        assignedToId: technician.id,
        estimatedHours: 3,
        laborHours: 3.5,
        laborCost: 175,
        partsCost: 85,
        totalCost: 260,
        workStartedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        workCompletedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 3.5 * 60 * 60 * 1000),
        scheduledDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        workPerformed: 'Performed oil change, replaced oil filter, checked belts and electrical connections. All systems operating normally.',
        technicianNotes: 'Generator is now operating within normal parameters. Next oil change due in 3 months.',
        partsUsed: JSON.stringify([
          { id: '1', name: 'Oil Filter', quantity: 1, unitCost: 25, totalCost: 25 },
          { id: '2', name: 'Engine Oil', quantity: 4, unitCost: 15, totalCost: 60 }
        ]),
      },
    });

    console.log('✅ Completed work created');

    console.log('\n🎉 Maintenance data seeding completed successfully!');
    console.log('\n📋 Test Accounts:');
    console.log('👨‍💼 Manager: manager@zemenbank.com / password123');
    console.log('👨‍🔧 Technician: user@zemenbank.com / password123');
    console.log('\n📊 Data Created:');
    console.log('• 1 Maintenance Template');
    console.log('• 1 Maintenance Schedule');
    console.log('• 1 Scheduled Task');
    console.log('• 1 Corrective Request');
    console.log('• 1 Completed Work with Documentation');

  } catch (error) {
    console.error('❌ Error seeding maintenance data:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
