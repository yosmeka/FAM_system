import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  try {
    // Clear existing users
    console.log('Removing all existing users...');
    const deletedUsers = await prisma.user.deleteMany({});
    console.log(`Deleted ${deletedUsers.count} users`);

    console.log('Creating users...');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.create({
      data: {
        email: 'admin@zemenbank.com',
        name: 'Admin User',
        password: adminPassword,
        role: 'ADMIN',
      },
    });
    console.log('Created admin user:', admin.email);

    // Create manager user
    const managerPassword = await bcrypt.hash('manager123', 10);
    const manager = await prisma.user.create({
      data: {
        email: 'manager@zemenbank.com',
        name: 'Manager User',
        password: managerPassword,
        role: 'MANAGER',
      },
    });
    console.log('Created manager user:', manager.email);

    // Create regular user
    const userPassword = await bcrypt.hash('user123', 10);
    const user = await prisma.user.create({
      data: {
        email: 'user@zemenbank.com',
        name: 'Regular User',
        password: userPassword,
        role: 'USER',
      },
    });
    console.log('Created regular user:', user.email);

    // Create auditor user
    const auditorPassword = await bcrypt.hash('auditor123', 10);
    const auditor = await prisma.user.create({
      data: {
        email: 'auditor@zemenbank.com',
        name: 'Auditor User',
        password: auditorPassword,
        role: 'AUDITOR',
      },
    });
    console.log('Created auditor user:', auditor.email);

    console.log('User seeding completed successfully');
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