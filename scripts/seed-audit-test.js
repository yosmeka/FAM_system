const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding audit test data...');

  // Create test users
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create manager
  const manager = await prisma.user.upsert({
    where: { email: 'manager@zemenbank.com' },
    update: {},
    create: {
      email: 'manager@zemenbank.com',
      name: 'Test Manager',
      password: hashedPassword,
      role: 'MANAGER',
    },
  });

  // Create auditor user
  const auditor = await prisma.user.upsert({
    where: { email: 'auditor@zemenbank.com' },
    update: {},
    create: {
      email: 'auditor@zemenbank.com',
      name: 'Test Auditor',
      password: hashedPassword,
      role: 'USER',
    },
  });

  // Create test assets
  const asset1 = await prisma.asset.upsert({
    where: { serialNumber: 'TEST-LAPTOP-001' },
    update: {},
    create: {
      name: 'Test Laptop',
      serialNumber: 'TEST-LAPTOP-001',
      category: 'IT Equipment',
      department: 'Zemen Bank',
      location: 'Head Office - IT Department',
      purchasePrice: 1500.00,
      currentValue: 1200.00,
      purchaseDate: new Date('2023-01-15'),
      status: 'ACTIVE',
      description: 'Dell Latitude 5520 Laptop for testing audit workflow',
    },
  });

  const asset2 = await prisma.asset.upsert({
    where: { serialNumber: 'TEST-PRINTER-001' },
    update: {},
    create: {
      name: 'Test Printer',
      serialNumber: 'TEST-PRINTER-001',
      category: 'Office Equipment',
      department: 'Zemen Bank',
      location: 'Head Office - Admin',
      purchasePrice: 800.00,
      currentValue: 600.00,
      purchaseDate: new Date('2023-03-10'),
      status: 'ACTIVE',
      description: 'HP LaserJet Pro for testing audit workflow',
    },
  });

  // Create audit assignment
  const assignment = await prisma.auditAssignment.create({
    data: {
      assetId: asset1.id,
      assignedToId: auditor.id,
      assignedById: manager.id,
      title: 'Quarterly IT Equipment Audit',
      description: 'Routine quarterly audit of IT equipment',
      priority: 'MEDIUM',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      instructions: 'Please verify the physical condition, location, and functionality of the laptop. Check for any damage, missing components, or security issues.',
      checklistItems: JSON.stringify([
        { item: 'Physical condition check', checked: false, notes: '' },
        { item: 'Location verification', checked: false, notes: '' },
        { item: 'Functionality test', checked: false, notes: '' },
        { item: 'Security compliance', checked: false, notes: '' },
        { item: 'Asset tag verification', checked: false, notes: '' },
        { item: 'Documentation review', checked: false, notes: '' }
      ]),
      estimatedHours: 2.0,
    },
  });

  // Create audit request
  const request = await prisma.auditRequest.create({
    data: {
      assetId: asset2.id,
      requesterId: auditor.id,
      title: 'Printer Maintenance Audit',
      reason: 'Reports of printing quality issues',
      urgency: 'HIGH',
      requestedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      description: 'Need to audit printer due to reported printing quality issues and potential maintenance needs.',
      expectedFindings: 'May find toner issues, paper feed problems, or need for cleaning/maintenance.',
    },
  });

  console.log('✅ Test data created successfully!');
  console.log(`👤 Manager: ${manager.email} (password: password123)`);
  console.log(`👤 Auditor: ${auditor.email} (password: password123)`);
  console.log(`📋 Assignment: ${assignment.title} (ID: ${assignment.id})`);
  console.log(`📝 Request: ${request.title} (ID: ${request.id})`);
  console.log(`💻 Asset 1: ${asset1.name} (${asset1.serialNumber})`);
  console.log(`🖨️ Asset 2: ${asset2.name} (${asset2.serialNumber})`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
