import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function seedUsers() {
  console.log('👥 Creating users for maintenance testing...');
  
  const password = await hash('password123', 12);

  // Create Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@zemenbank.com' },
    update: {},
    create: {
      email: 'admin@zemenbank.com',
      name: 'System Administrator',
      password,
      role: 'ADMIN',
    },
  });

  // Create Manager
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

  // Create Technicians
  const technician1 = await prisma.user.upsert({
    where: { email: 'user@zemenbank.com' },
    update: {},
    create: {
      email: 'user@zemenbank.com',
      name: 'Alice Technician',
      password,
      role: 'USER',
    },
  });

  const technician2 = await prisma.user.upsert({
    where: { email: 'tech2@zemenbank.com' },
    update: {},
    create: {
      email: 'tech2@zemenbank.com',
      name: 'Bob Technician',
      password,
      role: 'USER',
    },
  });

  console.log('✅ Users created successfully');
  return { admin, manager, technician1, technician2 };
}

async function seedAssets() {
  console.log('🏢 Creating assets for maintenance testing...');

  const assets = await Promise.all([
    prisma.asset.upsert({
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
        usefulLifeMonths: 120, // 10 years
      },
    }),

    prisma.asset.upsert({
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
        usefulLifeMonths: 180, // 15 years
      },
    }),

    prisma.asset.upsert({
      where: { serialNumber: 'SRV-001' },
      update: {},
      create: {
        name: 'Database Server',
        serialNumber: 'SRV-001',
        category: 'IT_EQUIPMENT',
        location: 'Server Room',
        purchasePrice: 15000,
        currentValue: 12000,
        purchaseDate: new Date('2023-03-20'),
        condition: 'EXCELLENT',
        status: 'ACTIVE',
        usefulLifeMonths: 60, // 5 years
      },
    }),

    prisma.asset.upsert({
      where: { serialNumber: 'VEH-001' },
      update: {},
      create: {
        name: 'Service Van',
        serialNumber: 'VEH-001',
        category: 'VEHICLE',
        location: 'Parking Lot A',
        purchasePrice: 35000,
        currentValue: 28000,
        purchaseDate: new Date('2022-08-15'),
        condition: 'GOOD',
        status: 'ACTIVE',
        usefulLifeMonths: 96, // 8 years
      },
    }),

    prisma.asset.upsert({
      where: { serialNumber: 'GEN-002' },
      update: {},
      create: {
        name: 'Backup Generator',
        serialNumber: 'GEN-002',
        category: 'EQUIPMENT',
        location: 'Building B - Basement',
        purchasePrice: 45000,
        currentValue: 40000,
        purchaseDate: new Date('2022-05-10'),
        condition: 'GOOD',
        status: 'ACTIVE',
        usefulLifeMonths: 120, // 10 years
      },
    }),

    prisma.asset.upsert({
      where: { serialNumber: 'PUMP-001' },
      update: {},
      create: {
        name: 'Water Pump System',
        serialNumber: 'PUMP-001',
        category: 'EQUIPMENT',
        location: 'Utility Room',
        purchasePrice: 8000,
        currentValue: 6500,
        purchaseDate: new Date('2023-01-20'),
        condition: 'EXCELLENT',
        status: 'ACTIVE',
        usefulLifeMonths: 84, // 7 years
      },
    }),
  ]);

  console.log(`✅ Created ${assets.length} assets`);
  return assets;
}

async function seedMaintenanceData() {
  console.log('🔧 Starting comprehensive maintenance data seeding...');

  try {
    // Seed users and assets first
    const users = await seedUsers();
    const assets = await seedAssets();

    const { manager, technician1, technician2 } = users;

    // Now run the maintenance seed
    const { seedMaintenanceData: runMaintenanceSeed } = await import('../prisma/seeds/maintenance-seed');
    await runMaintenanceSeed();

    console.log('🎉 All maintenance data seeded successfully!');
    console.log('\n📋 Test Accounts Created:');
    console.log('👨‍💼 Manager: manager@zemenbank.com / password123');
    console.log('👨‍🔧 Technician 1: user@zemenbank.com / password123');
    console.log('👨‍🔧 Technician 2: tech2@zemenbank.com / password123');
    console.log('👨‍💻 Admin: admin@zemenbank.com / password123');

  } catch (error) {
    console.error('❌ Error seeding maintenance data:', error);
    throw error;
  }
}

// Run the seed
seedMaintenanceData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
