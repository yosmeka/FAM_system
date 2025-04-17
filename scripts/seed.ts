import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');
  
  try {
    console.log('Creating admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.create({
      data: {
        email: 'admin@zemenbank.com',
        name: 'Admin User',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    console.log('Created admin user:', admin);

    console.log('Creating sample assets...');
    const asset = await prisma.asset.create({
      data: {
        name: 'Dell Laptop XPS 15',
        description: 'High-performance laptop for development',
        serialNumber: 'DLL-XPS15-2024-001',
        purchaseDate: new Date('2024-01-01'),
        purchasePrice: 1500.00,
        currentValue: 1350.00,
        status: 'ACTIVE',
        location: 'Head Office',
        department: 'IT',
        category: 'Computer Equipment',
        supplier: 'Dell Technologies',
        warrantyExpiry: new Date('2025-01-01'),
      },
    });

    console.log('Created sample asset:', asset);
    console.log('Database seeding completed successfully');
  } catch (error) {
    console.error('Error details:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  } finally {
    console.log('Disconnecting from database...');
    await prisma.$disconnect();
    console.log('Disconnected from database');
  }
}

// Handle the promise rejection properly
main().catch((error) => {
  console.error('Fatal error during seeding:', error);
  process.exit(1);
}); 