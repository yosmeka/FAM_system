import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting maintenance system seed...');

  // Create users first
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Manager
  const manager = await prisma.user.upsert({
    where: { email: 'manager@zemenbank.com' },
    update: {},
    create: {
      name: 'John Manager',
      email: 'manager@zemenbank.com',
      password: hashedPassword,
      role: 'MANAGER',
    },
  });

  // Create Technicians (Users)
  const technician1 = await prisma.user.upsert({
    where: { email: 'tech1@zemenbank.com' },
    update: {},
    create: {
      name: 'Alice Technician',
      email: 'tech1@zemenbank.com',
      password: hashedPassword,
      role: 'USER',
    },
  });

  const technician2 = await prisma.user.upsert({
    where: { email: 'tech2@zemenbank.com' },
    update: {},
    create: {
      name: 'Bob Technician',
      email: 'tech2@zemenbank.com',
      password: hashedPassword,
      role: 'USER',
    },
  });

  const technician3 = await prisma.user.upsert({
    where: { email: 'tech3@zemenbank.com' },
    update: {},
    create: {
      name: 'Carol Technician',
      email: 'tech3@zemenbank.com',
      password: hashedPassword,
      role: 'USER',
    },
  });

  console.log('✅ Users created');

  // Create sample assets
  const assets = await Promise.all([
    prisma.asset.upsert({
      where: { serialNumber: 'HVAC-001' },
      update: {},
      create: {
        name: 'Main HVAC System',
        description: 'Central air conditioning and heating system for main building',
        serialNumber: 'HVAC-001',
        purchaseDate: new Date('2020-01-15'),
        purchasePrice: 25000.00,
        currentValue: 20000.00,
        status: 'ACTIVE',
        location: 'Main Building - Roof',
        department: 'Zemen Bank',
        category: 'HVAC',
        type: 'Equipment',
        supplier: 'Climate Control Inc.',
      },
    }),
    prisma.asset.upsert({
      where: { serialNumber: 'GEN-001' },
      update: {},
      create: {
        name: 'Backup Generator',
        description: 'Emergency backup power generator',
        serialNumber: 'GEN-001',
        purchaseDate: new Date('2019-06-10'),
        purchasePrice: 15000.00,
        currentValue: 12000.00,
        status: 'ACTIVE',
        location: 'Main Building - Basement',
        department: 'Zemen Bank',
        category: 'Power',
        type: 'Equipment',
        supplier: 'Power Solutions Ltd.',
      },
    }),
    prisma.asset.upsert({
      where: { serialNumber: 'ELEV-001' },
      update: {},
      create: {
        name: 'Main Elevator',
        description: 'Primary passenger elevator',
        serialNumber: 'ELEV-001',
        purchaseDate: new Date('2018-03-20'),
        purchasePrice: 35000.00,
        currentValue: 28000.00,
        status: 'ACTIVE',
        location: 'Main Building - Central',
        department: 'Zemen Bank',
        category: 'Transportation',
        type: 'Equipment',
        supplier: 'Elevator Systems Co.',
      },
    }),
    prisma.asset.upsert({
      where: { serialNumber: 'FIRE-001' },
      update: {},
      create: {
        name: 'Fire Suppression System',
        description: 'Automatic fire detection and suppression system',
        serialNumber: 'FIRE-001',
        purchaseDate: new Date('2021-02-28'),
        purchasePrice: 18000.00,
        currentValue: 16000.00,
        status: 'ACTIVE',
        location: 'Main Building - All Floors',
        department: 'Zemen Bank',
        category: 'Safety',
        type: 'System',
        supplier: 'Fire Safety Corp.',
      },
    }),
    prisma.asset.upsert({
      where: { serialNumber: 'UPS-001' },
      update: {},
      create: {
        name: 'UPS System',
        description: 'Uninterruptible Power Supply for critical systems',
        serialNumber: 'UPS-001',
        purchaseDate: new Date('2020-09-15'),
        purchasePrice: 8000.00,
        currentValue: 6500.00,
        status: 'ACTIVE',
        location: 'Main Building - Server Room',
        department: 'Zemen Bank',
        category: 'Power',
        type: 'Equipment',
        supplier: 'Power Solutions Ltd.',
      },
    }),
  ]);

  console.log('✅ Assets created');

  // Create maintenance templates
  const templates = [];

  // HVAC Template
  try {
    const hvacTemplate = await prisma.maintenanceTemplate.create({
      data: {
        name: 'HVAC Filter Replacement',
        description: 'Monthly air filter replacement and system inspection',
        maintenanceType: 'PREVENTIVE',
        priority: 'MEDIUM',
        estimatedHours: 2.0,
        instructions: 'Replace air filters, check airflow, inspect ducts for leaks, test thermostat operation',
        checklistItems: JSON.stringify([
          { id: 1, task: 'Turn off HVAC system', completed: false },
          { id: 2, task: 'Remove old air filters', completed: false },
          { id: 3, task: 'Install new air filters', completed: false },
          { id: 4, task: 'Check airflow at vents', completed: false },
          { id: 5, task: 'Inspect ductwork for damage', completed: false },
          { id: 6, task: 'Test thermostat operation', completed: false },
          { id: 7, task: 'Turn system back on', completed: false },
          { id: 8, task: 'Document filter sizes and types', completed: false },
        ]),
        requiredSkills: 'HVAC maintenance, basic electrical knowledge',
        safetyNotes: 'Ensure power is off before working on electrical components. Wear protective equipment.',
        toolsRequired: 'Screwdrivers, flashlight, ladder, multimeter',
        partsRequired: 'Air filters (various sizes), cleaning supplies',
        createdById: manager.id,
      },
    });
    templates.push(hvacTemplate);
  } catch (error: any) {
    console.log('HVAC template already exists or error:', error.message);
  }

  // Generator Template
  try {
    const generatorTemplate = await prisma.maintenanceTemplate.create({
      data: {
        name: 'Generator Monthly Test',
        description: 'Monthly generator load test and maintenance',
        maintenanceType: 'PREVENTIVE',
        priority: 'HIGH',
        estimatedHours: 3.0,
        instructions: 'Perform full load test, check oil levels, inspect fuel system, test automatic transfer switch',
        checklistItems: JSON.stringify([
          { id: 1, task: 'Check oil level and condition', completed: false },
          { id: 2, task: 'Check coolant level', completed: false },
          { id: 3, task: 'Inspect fuel level and quality', completed: false },
          { id: 4, task: 'Test battery voltage', completed: false },
          { id: 5, task: 'Start generator and warm up', completed: false },
          { id: 6, task: 'Perform load test (30 minutes)', completed: false },
          { id: 7, task: 'Test automatic transfer switch', completed: false },
          { id: 8, task: 'Check for leaks or unusual noises', completed: false },
          { id: 9, task: 'Record runtime hours', completed: false },
          { id: 10, task: 'Clean and secure unit', completed: false },
        ]),
        requiredSkills: 'Generator maintenance, electrical systems, fuel systems',
        safetyNotes: 'Never operate in enclosed spaces. Ensure proper ventilation. Follow lockout/tagout procedures.',
        toolsRequired: 'Multimeter, oil dipstick, fuel testing kit, cleaning supplies',
        partsRequired: 'Engine oil, oil filter, air filter, fuel additives',
        createdById: manager.id,
      },
    });
    templates.push(generatorTemplate);
  } catch (error: any) {
    console.log('Generator template already exists or error:', error.message);
  }

  // Elevator Template
  try {
    const elevatorTemplate = await prisma.maintenanceTemplate.create({
      data: {
        name: 'Elevator Safety Inspection',
        description: 'Quarterly elevator safety and performance inspection',
        maintenanceType: 'INSPECTION',
        priority: 'CRITICAL',
        estimatedHours: 4.0,
        instructions: 'Comprehensive safety inspection including cables, brakes, doors, and emergency systems',
        checklistItems: JSON.stringify([
          { id: 1, task: 'Inspect hoist cables for wear', completed: false },
          { id: 2, task: 'Test emergency brake system', completed: false },
          { id: 3, task: 'Check door operation and sensors', completed: false },
          { id: 4, task: 'Test emergency communication system', completed: false },
          { id: 5, task: 'Inspect guide rails and alignment', completed: false },
          { id: 6, task: 'Test emergency lighting', completed: false },
          { id: 7, task: 'Check motor and drive system', completed: false },
          { id: 8, task: 'Test overload protection', completed: false },
          { id: 9, task: 'Verify floor leveling accuracy', completed: false },
          { id: 10, task: 'Update inspection certificate', completed: false },
        ]),
        requiredSkills: 'Elevator maintenance certification, mechanical systems, electrical systems',
        safetyNotes: 'Follow all elevator safety protocols. Use proper fall protection. Never bypass safety systems.',
        toolsRequired: 'Specialized elevator tools, multimeter, torque wrench, inspection forms',
        partsRequired: 'Lubricants, brake pads, door sensors (as needed)',
        createdById: manager.id,
      },
    });
    templates.push(elevatorTemplate);
  } catch (error: any) {
    console.log('Elevator template already exists or error:', error.message);
  }

  console.log('✅ Maintenance templates created');

  // Create maintenance schedules
  const schedules = [];

  // HVAC Monthly Schedule
  try {
    const hvacSchedule = await prisma.maintenanceSchedule.create({
      data: {
        assetId: assets[0].id, // HVAC System
        title: 'HVAC Filter Replacement - Monthly',
        description: 'Monthly preventive maintenance for HVAC system including filter replacement and inspection',
        frequency: 'MONTHLY',
        priority: 'MEDIUM',
        estimatedHours: 2.0,
        status: 'ACTIVE',
        createdById: manager.id,
        assignedToId: technician1.id,
        templateId: templates[0]?.id || null,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2025-12-31'),
        lastGenerated: new Date('2024-01-01'),
        nextDue: new Date('2024-02-01'),
        leadTimeDays: 7,
        autoAssign: true,
      },
    });
    schedules.push(hvacSchedule);
  } catch (error: any) {
    console.log('HVAC schedule creation error:', error.message);
  }
  // Generator Monthly Schedule
  try {
    const generatorSchedule = await prisma.maintenanceSchedule.create({
      data: {
        assetId: assets[1].id, // Generator
        title: 'Generator Monthly Test & Maintenance',
        description: 'Monthly load test and preventive maintenance for backup generator',
        frequency: 'MONTHLY',
        priority: 'HIGH',
        estimatedHours: 3.0,
        status: 'ACTIVE',
        createdById: manager.id,
        assignedToId: technician2.id,
        templateId: templates[1]?.id || null,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2025-12-31'),
        lastGenerated: new Date('2024-01-01'),
        nextDue: new Date('2024-02-01'),
        leadTimeDays: 5,
        autoAssign: true,
      },
    });
    schedules.push(generatorSchedule);
  } catch (error: any) {
    console.log('Generator schedule creation error:', error.message);
  }
  // Create a few more schedules with simpler approach
  try {
    const elevatorSchedule = await prisma.maintenanceSchedule.create({
      data: {
        assetId: assets[2].id, // Elevator
        title: 'Elevator Safety Inspection - Quarterly',
        description: 'Comprehensive quarterly safety inspection and maintenance for main elevator',
        frequency: 'QUARTERLY',
        priority: 'CRITICAL',
        estimatedHours: 4.0,
        status: 'ACTIVE',
        createdById: manager.id,
        assignedToId: technician3.id,
        templateId: templates[2]?.id || null,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2025-12-31'),
        lastGenerated: new Date('2024-01-01'),
        nextDue: new Date('2024-04-01'),
        leadTimeDays: 14,
        autoAssign: true,
      },
    });
    schedules.push(elevatorSchedule);
  } catch (error: any) {
    console.log('Elevator schedule creation error:', error.message);
  }

  console.log('✅ Maintenance schedules created');

  // Create sample maintenance tasks (some completed, some pending)
  const maintenanceTasks = [];

  // Completed HVAC maintenance
  if (schedules.length > 0) {
    try {
      const hvacTask = await prisma.maintenance.create({
        data: {
          assetId: assets[0].id,
          description: 'Monthly HVAC filter replacement and system inspection',
          cost: 150.00,
          scheduledDate: new Date('2024-01-15'),
          completedAt: new Date('2024-01-15'),
          priority: 'MEDIUM',
          requesterId: manager.id,
          managerId: manager.id,
          assignedToId: technician1.id,
          status: 'COMPLETED',
          maintenanceType: 'PREVENTIVE',
          scheduleId: schedules[0]?.id || null,
          templateId: templates[0]?.id || null,
          estimatedHours: 2.0,
          actualHours: 1.8,
          checklistItems: JSON.stringify([
            { id: 1, task: 'Turn off HVAC system', completed: true },
            { id: 2, task: 'Remove old air filters', completed: true },
            { id: 3, task: 'Install new air filters', completed: true },
            { id: 4, task: 'Check airflow at vents', completed: true },
          ]),
          notes: 'All filters replaced successfully. System operating normally. No issues found.',
        },
      });
      maintenanceTasks.push(hvacTask);
    } catch (error: any) {
      console.log('HVAC task creation error:', error.message);
    }
  }

  console.log('✅ Maintenance tasks created');

  // Summary
  console.log('\n🎉 Maintenance system seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`👥 Users: ${4} (1 Manager, 3 Technicians)`);
  console.log(`🏢 Assets: ${assets.length}`);
  console.log(`📋 Templates: ${templates.length}`);
  console.log(`📅 Schedules: ${schedules.length}`);
  console.log(`🔧 Maintenance Tasks: ${maintenanceTasks.length}`);

  console.log('\n🔑 Login Credentials:');
  console.log('Manager: manager@zemenbank.com / password123');
  console.log('Technician 1: tech1@zemenbank.com / password123');
  console.log('Technician 2: tech2@zemenbank.com / password123');
  console.log('Technician 3: tech3@zemenbank.com / password123');

  console.log('\n🚀 Ready to test the Schedule Creation Flow!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
