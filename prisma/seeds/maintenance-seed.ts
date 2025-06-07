import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedMaintenanceData() {
  console.log('🔧 Seeding maintenance data...');

  try {
    // Get existing users and assets
    const users = await prisma.user.findMany();
    const assets = await prisma.asset.findMany();
    
    if (users.length === 0 || assets.length === 0) {
      console.log('❌ No users or assets found. Please seed users and assets first.');
      return;
    }

    const managers = users.filter(u => u.role === 'MANAGER');
    const technicians = users.filter(u => u.role === 'USER');
    const admins = users.filter(u => u.role === 'ADMIN');

    if (managers.length === 0 || technicians.length === 0) {
      console.log('❌ No managers or technicians found. Please ensure proper user roles.');
      return;
    }

    const manager = managers[0];
    const technician = technicians[0];
    const admin = admins.length > 0 ? admins[0] : manager;

    // 1. Create Maintenance Templates
    console.log('📋 Creating maintenance templates...');
    
    const templates = await Promise.all([
      prisma.maintenanceTemplate.create({
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
            { id: '5', task: 'Test battery voltage and connections', completed: false, notes: '' },
            { id: '6', task: 'Check fuel system for leaks', completed: false, notes: '' },
            { id: '7', task: 'Test emergency stop functions', completed: false, notes: '' },
            { id: '8', task: 'Record operating hours', completed: false, notes: '' }
          ]),
          createdById: manager.id,
        },
      }),
      
      prisma.maintenanceTemplate.create({
        data: {
          name: 'HVAC System Quarterly Service',
          description: 'Quarterly maintenance for HVAC systems including cleaning and inspection',
          maintenanceType: 'PREVENTIVE',
          estimatedHours: 6,
          instructions: 'Turn off system before maintenance. Check all components systematically.',
          checklistItems: JSON.stringify([
            { id: '1', task: 'Replace air filters', completed: false, notes: '' },
            { id: '2', task: 'Clean evaporator and condenser coils', completed: false, notes: '' },
            { id: '3', task: 'Check refrigerant levels', completed: false, notes: '' },
            { id: '4', task: 'Inspect ductwork for leaks', completed: false, notes: '' },
            { id: '5', task: 'Lubricate moving parts', completed: false, notes: '' },
            { id: '6', task: 'Test thermostat calibration', completed: false, notes: '' },
            { id: '7', task: 'Check electrical connections', completed: false, notes: '' }
          ]),
          createdById: manager.id,
        },
      }),

      prisma.maintenanceTemplate.create({
        data: {
          name: 'Computer Equipment Annual Service',
          description: 'Annual maintenance for computer equipment and servers',
          maintenanceType: 'PREVENTIVE',
          estimatedHours: 2,
          instructions: 'Ensure proper shutdown procedures. Use anti-static precautions.',
          checklistItems: JSON.stringify([
            { id: '1', task: 'Clean internal components and fans', completed: false, notes: '' },
            { id: '2', task: 'Check cable connections', completed: false, notes: '' },
            { id: '3', task: 'Update firmware and drivers', completed: false, notes: '' },
            { id: '4', task: 'Test backup systems', completed: false, notes: '' },
            { id: '5', task: 'Check temperature monitoring', completed: false, notes: '' }
          ]),
          createdById: manager.id,
        },
      }),

      prisma.maintenanceTemplate.create({
        data: {
          name: 'Vehicle Fleet Inspection',
          description: 'Monthly safety and maintenance inspection for fleet vehicles',
          maintenanceType: 'PREVENTIVE',
          estimatedHours: 3,
          instructions: 'Follow vehicle safety checklist. Document any issues found.',
          checklistItems: JSON.stringify([
            { id: '1', task: 'Check tire pressure and tread depth', completed: false, notes: '' },
            { id: '2', task: 'Inspect brakes and brake fluid', completed: false, notes: '' },
            { id: '3', task: 'Check engine oil and filters', completed: false, notes: '' },
            { id: '4', task: 'Test lights and electrical systems', completed: false, notes: '' },
            { id: '5', task: 'Inspect windshield and wipers', completed: false, notes: '' },
            { id: '6', task: 'Check emergency equipment', completed: false, notes: '' }
          ]),
          createdById: manager.id,
        },
      })
    ]);

    console.log(`✅ Created ${templates.length} maintenance templates`);

    // 2. Create Maintenance Schedules
    console.log('📅 Creating maintenance schedules...');
    
    const schedules = [];
    const generatorAssets = assets.filter(a => a.category === 'EQUIPMENT' && a.name.toLowerCase().includes('generator'));
    const hvacAssets = assets.filter(a => a.category === 'EQUIPMENT' && (a.name.toLowerCase().includes('hvac') || a.name.toLowerCase().includes('air')));
    const computerAssets = assets.filter(a => a.category === 'IT_EQUIPMENT');
    const vehicleAssets = assets.filter(a => a.category === 'VEHICLE');

    // Generator schedules
    for (const asset of generatorAssets.slice(0, 3)) {
      const schedule = await prisma.maintenanceSchedule.create({
        data: {
          title: `${asset.name} Monthly Maintenance`,
          description: `Monthly preventive maintenance for ${asset.name}`,
          assetId: asset.id,
          templateId: templates[0].id,
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
      schedules.push(schedule);
    }

    // HVAC schedules
    for (const asset of hvacAssets.slice(0, 2)) {
      const schedule = await prisma.maintenanceSchedule.create({
        data: {
          title: `${asset.name} Quarterly Service`,
          description: `Quarterly maintenance for ${asset.name}`,
          assetId: asset.id,
          templateId: templates[1].id,
          frequency: 'QUARTERLY',
          priority: 'MEDIUM',
          estimatedHours: 6,
          nextDue: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Due in 14 days
          autoAssign: true,
          assignedToId: technician.id,
          status: 'ACTIVE',
          createdById: manager.id,
        },
      });
      schedules.push(schedule);
    }

    console.log(`✅ Created ${schedules.length} maintenance schedules`);

    // 3. Create Scheduled Maintenance Tasks
    console.log('📋 Creating scheduled maintenance tasks...');

    const scheduledTasks = [];
    for (let i = 0; i < schedules.length; i++) {
      const schedule = schedules[i];
      const task = await prisma.maintenance.create({
        data: {
          assetId: schedule.assetId,
          description: `Scheduled: ${schedule.title}`,
          priority: schedule.priority,
          maintenanceType: 'PREVENTIVE',
          status: 'SCHEDULED',
          scheduledDate: schedule.nextDue,
          estimatedHours: schedule.estimatedHours,
          scheduleId: schedule.id,
          templateId: schedule.templateId,
          requesterId: manager.id,
          managerId: manager.id,
          assignedToId: schedule.assignedToId,
          checklistItems: templates.find(t => t.id === schedule.templateId)?.checklistItems,
          notes: 'Auto-generated from maintenance schedule',
        },
      });
      scheduledTasks.push(task);
    }

    // 4. Create Corrective Maintenance Requests
    console.log('🔧 Creating corrective maintenance requests...');

    const correctiveRequests = [];
    const issueTypes = ['ELECTRICAL', 'MECHANICAL', 'SOFTWARE', 'STRUCTURAL', 'SAFETY'];
    const urgencyLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

    for (let i = 0; i < 8; i++) {
      const asset = assets[i % assets.length];
      const issueType = issueTypes[i % issueTypes.length];
      const urgency = urgencyLevels[i % urgencyLevels.length];

      const request = await prisma.maintenance.create({
        data: {
          assetId: asset.id,
          description: `${issueType.toLowerCase()} issue reported for ${asset.name}`,
          priority: urgency === 'CRITICAL' ? 'HIGH' : urgency === 'HIGH' ? 'MEDIUM' : 'LOW',
          maintenanceType: 'CORRECTIVE',
          status: i < 4 ? 'APPROVED' : i < 6 ? 'PENDING_APPROVAL' : 'COMPLETED',
          issueType,
          urgencyLevel: urgency,
          assetDowntime: urgency === 'CRITICAL',
          requesterId: technician.id,
          managerId: i < 6 ? manager.id : manager.id,
          assignedToId: i < 4 ? technician.id : null,
          estimatedHours: Math.floor(Math.random() * 8) + 1,
          notes: `Reported ${issueType.toLowerCase()} issue requiring immediate attention`,
          scheduledDate: new Date(Date.now() + (i * 2) * 24 * 60 * 60 * 1000),
        },
      });
      correctiveRequests.push(request);
    }

    // 5. Create Completed Work with Documentation
    console.log('📝 Creating completed maintenance work...');

    const completedTasks = [];
    for (let i = 0; i < 4; i++) {
      const asset = assets[i % assets.length];
      const startDate = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const completedDate = new Date(startDate.getTime() + (3 + i) * 60 * 60 * 1000);

      const laborHours = 3 + i;
      const laborRate = 50;
      const laborCost = laborHours * laborRate;
      const partsCost = Math.floor(Math.random() * 200) + 50;

      const task = await prisma.maintenance.create({
        data: {
          assetId: asset.id,
          description: `Completed maintenance work on ${asset.name}`,
          priority: 'MEDIUM',
          maintenanceType: i % 2 === 0 ? 'PREVENTIVE' : 'CORRECTIVE',
          status: 'WORK_COMPLETED',
          requesterId: technician.id,
          managerId: manager.id,
          assignedToId: technician.id,
          estimatedHours: laborHours,
          laborHours,
          laborCost,
          partsCost,
          totalCost: laborCost + partsCost,
          workStartedAt: startDate,
          workCompletedAt: completedDate,
          scheduledDate: startDate,
          workPerformed: `Performed comprehensive maintenance including parts replacement and system testing. All components checked and verified working properly.`,
          technicianNotes: `Work completed successfully. Asset is now operating within normal parameters. Recommend next inspection in ${i + 1} months.`,
          partsUsed: JSON.stringify([
            {
              id: '1',
              name: i % 2 === 0 ? 'Oil Filter' : 'Belt Assembly',
              quantity: 1,
              unitCost: Math.floor(partsCost * 0.6),
              totalCost: Math.floor(partsCost * 0.6)
            },
            {
              id: '2',
              name: i % 2 === 0 ? 'Engine Oil' : 'Lubricant',
              quantity: 2,
              unitCost: Math.floor(partsCost * 0.2),
              totalCost: Math.floor(partsCost * 0.4)
            }
          ]),
        },
      });
      completedTasks.push(task);
    }

    console.log(`✅ Created ${scheduledTasks.length} scheduled tasks`);
    console.log(`✅ Created ${correctiveRequests.length} corrective maintenance requests`);
    console.log(`✅ Created ${completedTasks.length} completed maintenance tasks`);

    console.log('🎉 Maintenance data seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding maintenance data:', error);
    throw error;
  }
}
