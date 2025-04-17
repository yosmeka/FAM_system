import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Test the connection
    await prisma.$connect();
    console.log('✅ Database connection successful!');
    
    // Try to query the database
    const result = await prisma.$queryRaw`SELECT current_database(), current_user, version();`;
    console.log('Database Info:', result);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 